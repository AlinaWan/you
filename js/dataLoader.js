export let wordData = [];

export async function loadWordsFromRepository() {
    const response = await fetch("./words.txt", {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Could not load words.txt: HTTP ${response.status}`
        );
    }

    const text = await response.text();

    wordData = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split("\t");

            return {
                id: (parts[0] || "").trim(),
                word: (parts[1] || "").trim(),
                date: (parts[2] || "").trim(),
                tags: (parts[3] || "")
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(Boolean),
                description: (parts[4] || "").trim()
            };
        })
        .filter(item =>
            item.id.length > 0 &&
            item.word.length > 0
        );
}