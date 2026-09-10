export let wordData = [];

export async function loadWordsFromRepository() {
    // The server should be tested locally by npx serve . due to CORS
    const isDevelopment =
        window.location.hostname === "localhost";

    if (isDevelopment) {
        wordData = [
            // Duplicate words to test #N handling
            {
                word: "TestWordA",
                date: "2026-01-01",
                tags: ["test", "dev"],
                description: "Development test word A1."
            },
            {
                word: "TestWordA",
                date: "2026-01-02",
                tags: ["test", "dev"],
                description: "Development test word A2."
            },
            // Additional unique words for testing
            {
                word: "TestWord1",
                date: "2026-01-03",
                tags: ["test", "dev"],
                description: "Development test word 1."
            },
            {
                word: "TestWord2",
                date: "2026-01-04",
                tags: ["test", "dev"],
                description: "Development test word 2."
            },
            {
                word: "TestWord3",
                date: "2026-01-05",
                tags: ["test", "dev"],
                description: "Development test word 3."
            }
        ];
        return;
    }

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
                word: (parts[0] || "").trim(),
                date: (parts[1] || "").trim(),
                tags: (parts[2] || "")
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(Boolean),
                description: (parts[3] || "").trim()
            };
        })
        .filter(item => item.word.length > 0);
}