import { wordData } from "./dataLoader.js";
import { wordObjects } from "./word.js";
import {
    startTracking,
    stopTracking,
    isTracking
} from "./camera.js";

const searchInput = document.getElementById("searchInput");
const resultsWrapper = document.getElementById("resultsWrapper");
const resultsScroll = document.getElementById("resultsScroll");

export function normalize(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function escapeHTML(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function searchScore(item, query) {
    const word = normalize(item.word);

    if (word === query) {
        return 0;
    }

    if (word.startsWith(query)) {
        return 10 + word.length;
    }

    const wordIndex = word.indexOf(query);

    if (wordIndex !== -1) {
        return 100 + wordIndex * 10 + word.length;
    }

    if (item.tags?.some(tag => normalize(tag).includes(query))) {
        return 500 + item.tags.join("").length;
    }

    const description = item.description
        ? normalize(item.description)
        : "";

    if (description.includes(query)) {
        return 1000 + description.length;
    }

    return Infinity;
}

export function highlightMatch(text, query) {
    if (!query) {
        return escapeHTML(text);
    }

    const escapedQuery = query.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const regex = new RegExp(`(${escapedQuery})`, "gi");

    return text
        .split(regex)
        .map(part => {
            if (normalize(part) === query) {
                return `<span class="match">${escapeHTML(part)}</span>`;
            }

            return escapeHTML(part);
        })
        .join("");
}

export function updateSearch() {
    const raw = searchInput.value.trim();
    const query = normalize(raw);

    if (!query) {
        resultsWrapper.classList.remove("open");
        return;
    }

    const matches = wordData
        .map((item, index) => ({
            item,
            index,
            score: searchScore(item, query)
        }))
        .filter(result => result.score !== Infinity)
        .sort((a, b) => {
            if (a.score !== b.score) {
                return a.score - b.score;
            }

            return a.item.word.length - b.item.word.length;
        });

    resultsWrapper.classList.add("open");

    if (matches.length === 0) {
        resultsScroll.innerHTML = `
            <div style="padding: 14px 15px; color: #555; font-size: 12px;">
                No matches
            </div>
        `;

        return;
    }

    const wordCounts = {};

    for (const result of matches) {
        const key = normalize(result.item.word);
        wordCounts[key] = (wordCounts[key] || 0) + 1;
    }

    const runningPositions = {};

    resultsScroll.innerHTML = matches
        .map(result => {
            const item = result.item;
            const key = normalize(item.word);
            const wordObj = wordObjects[result.index];
            const tracking = isTracking(wordObj);

            let duplicateBadge = "";

            if (wordCounts[key] > 1) {
                runningPositions[key] =
                    (runningPositions[key] || 0) + 1;

                duplicateBadge = `
                    <span class="resultNumber">
                        #${runningPositions[key]}
                    </span>
                `;
            }

            return `
                <div class="result" data-index="${result.index}">
                    <div class="resultWord">
                        ${highlightMatch(item.word, query)}
                        ${duplicateBadge}
                    </div>

                    <div class="resultDetails">
                        <div class="detailsInner">
                            ${item.date ? `
                                <div class="detailRow">
                                    <span class="detailLabel">date</span>
                                    <span>
                                        ${escapeHTML(item.date)}
                                    </span>
                                </div>
                            ` : ""}

                            ${item.tags?.length ? `
                                <div class="detailRow">
                                    <span class="detailLabel">tags</span>
                                    <span>
                                        ${item.tags
                        .map(tag => `
                                                <span class="tag">
                                                    #${escapeHTML(tag)}
                                                </span>
                                            `)
                        .join("")}
                                    </span>
                                </div>
                            ` : ""}

                            ${item.description ? `
                                <div class="detailRow">
                                    <span class="detailLabel">note</span>
                                    <span>
                                        ${escapeHTML(item.description)}
                                    </span>
                                </div>
                            ` : ""}
                            <div class="resultActions">
                                <button
                                    class="copyButton"
                                    type="button"
                                    data-word-id="${escapeHTML(item.id)}"
                                    aria-label="Copy tracking link for ${escapeHTML(item.word)}"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                    </svg>
                                </button>

                                <button
                                    class="trackButton ${tracking ? "tracking" : ""}"
                                    type="button"
                                    data-word-id="${escapeHTML(item.id)}"
                                    aria-label="${tracking ? `Stop tracking ${escapeHTML(item.word)}` : `Track ${escapeHTML(item.word)}`}"
                                >
                                ${tracking ? `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94"></path>
                                        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.06 3.19"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
                                    </svg>
                                ` : `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                `}
                                </button>
                            </div>
                    </div>
                </div>
            </div>
        `;
        })
        .join("");

    requestAnimationFrame(() => {
        resultsWrapper.classList.add("open");
    });
}

function updateTrackingButtons(trackedWord) {
    document.querySelectorAll(".trackButton").forEach(button => {
        const wordId = button.dataset.wordId;
        const word = wordObjects.find(
            word => word.id === wordId
        );

        const tracking = word === trackedWord;

        button.innerHTML = tracking
            ? `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94"></path>
                    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.06 3.19"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
                </svg>
            `
            : `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;

        button.setAttribute(
            "aria-label",
            tracking
                ? `Stop tracking ${word?.text ?? ""}`
                : `Track ${word?.text ?? ""}`
        );

        button.classList.toggle("tracking", tracking);
    });
}

export function initSearchListeners() {
    if (searchInput) {
        searchInput.addEventListener("input", updateSearch);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            searchInput.value = "";
            resultsWrapper.classList.remove("open");
            searchInput.blur();
        }
    });

    window.addEventListener("trackingchange", event => {
        updateTrackingButtons(event.detail.word);
    });

    if (!resultsScroll) {
        return;
    }

    resultsScroll.addEventListener("click", async event => {
        const copyButton = event.target.closest(".copyButton");

        if (copyButton) {
            event.stopPropagation();
            copyButton.blur();

            const wordId = copyButton.dataset.wordId;
            if (!wordId) return;

            const url = new URL(window.location.href);
            url.search = "";
            url.hash = "";
            url.searchParams.set("track", wordId);

            try {
                await navigator.clipboard.writeText(url.href);

                const originalIcon = copyButton.innerHTML;

                copyButton.innerHTML = `
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                `;

                copyButton.classList.add("copied");

                setTimeout(() => {
                    copyButton.innerHTML = originalIcon;
                    copyButton.classList.remove("copied");
                }, 1000);
            } catch {
                // Clipboard access failed
            }

            return;
        }

        const trackButton = event.target.closest(".trackButton");

        if (trackButton) {
            event.stopPropagation();

            // Prevent the button from retaining keyboard focus.
            trackButton.blur();

            const wordId = trackButton.dataset.wordId;
            const word = wordObjects.find(
                word => word.id === wordId
            );

            if (!word) {
                return;
            }

            if (isTracking(word)) {
                stopTracking();
            } else {
                startTracking(word);
            }

            return;
        }

        const result = event.target.closest(".result");

        if (!result) {
            return;
        }

        const isExpanded = result.classList.toggle("expanded");

        result.setAttribute(
            "aria-expanded",
            isExpanded
        );
    });
}