export let wordData = [];

export async function loadWordsFromRepository() {
    // 1. Fetch both files at the same time
    const [wordsRes, attributionsRes] = await Promise.all([
        fetch("./words.txt", { cache: "no-store" }),
        fetch("./attributions.txt", { cache: "no-store" })
    ]);

    if (!wordsRes.ok) {
        throw new Error(`Could not load words.txt: HTTP ${wordsRes.status}`);
    }

    if (!attributionsRes.ok) {
        throw new Error(`Could not load attributions.txt: HTTP ${attributionsRes.status}`);
    }

    const wordsText = await wordsRes.text();

    // Parse Attributions into a map: wordId -> array of attribution names
    const donorMap = {};
    if (attributionsRes && attributionsRes.ok) {
        const attrText = await attributionsRes.text();
        attrText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .forEach(line => {
                const parts = line.split("\t");
                const wordId = (parts[0] || "").trim();
                const name = (parts[1] || "").trim();
                const color = (parts[4] || "").trim();

                if (wordId && name) {
                    if (!donorMap[wordId]) donorMap[wordId] = [];

                    donorMap[wordId].push({
                        name,
                        color: /^#[0-9a-f]{6}$/.test(color)
                            ? color
                            : null
                    });
                }
            });
    }

    // Parse Words and attach matching donors
    wordData = wordsText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split("\t");
            const id = (parts[0] || "").trim();

            return {
                id,
                word: (parts[1] || "").trim(),
                date: (parts[2] || "").trim(),
                tags: (parts[3] || "")
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(Boolean),
                description: (parts[4] || "").trim(),
                donors: donorMap[id] || [] // Attached list of attribution names
            };
        })
        .filter(item =>
            item.id.length > 0 &&
            item.word.length > 0
        );
}