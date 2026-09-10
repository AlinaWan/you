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
        resultsScroll.innerHTML = "";
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

                            <button
                                class="trackButton"
                                type="button"
                                data-track-index="${result.index}"
                            >
                                Track
                            </button>
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");
}

function updateTrackingButtons(trackedWord) {
    document.querySelectorAll(".trackButton").forEach(button => {
        const index = Number(button.dataset.trackIndex);
        const word = wordObjects[index];
        const tracking = word === trackedWord;

        button.textContent = tracking
            ? "Tracking"
            : "Track";

        button.classList.toggle("tracking", tracking);
    });
}

export function initSearchListeners() {
    if (searchInput) {
        searchInput.addEventListener("input", updateSearch);
    }

    window.addEventListener("trackingchange", event => {
        updateTrackingButtons(event.detail.word);
    });

    if (!resultsScroll) {
        return;
    }

    resultsScroll.addEventListener("click", event => {
        const trackButton = event.target.closest(".trackButton");

        if (trackButton) {
            event.stopPropagation();

            // Prevent the button from retaining keyboard focus.
            trackButton.blur();

            const index = Number(trackButton.dataset.trackIndex);
            const word = wordObjects[index];

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