import { wordData } from "./dataLoader.js";
import { wordObjects } from "./word.js";
import {
    startTracking,
    stopTracking,
    isTracking
} from "./camera.js";

const copyLinkIcon = `
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
`;

const checkmarkIcon = `
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M20 6 9 17l-5-5"/>
    </svg>
`;

const searchInput = document.getElementById("searchInput");
const clearSearchButton = document.getElementById("clearSearchButton");
const resultsWrapper = document.getElementById("resultsWrapper");
const resultsScroll = document.getElementById("resultsScroll");

let wordCounts = {};
let currentMatches = [];
let displayedCount = 0;
const BATCH_SIZE = 20;
const threshold = 300;
let isLoadingMore = false;

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

    const donorIndex = item.donors?.findIndex(
        donor => normalize(donor.name).includes(query)
    );

    if (donorIndex !== undefined && donorIndex !== -1) {
        const donor = item.donors[donorIndex];

        return 500 +
            donorIndex +
            normalize(donor.name).length;
    }

    if (item.tags?.some(tag => normalize(tag).includes(query))) {
        return 600 + item.tags.join("").length;
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
function donorHash(value) {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function donorRandom(seed) {
    seed += 0x6D2B79F5;

    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);

    return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function layoutDonorNames(container) {
    const names = [...container.querySelectorAll(".donorName")];

    if (names.length === 0) {
        return;
    }

    const padding = 5;
    const gap = 7;
    const containerWidth = container.clientWidth;

    const entries = names
        .map((element, index) => ({
            element,
            index
        }))
        .sort((a, b) => {
            const widthDifference =
                b.element.offsetWidth - a.element.offsetWidth;

            if (widthDifference !== 0) {
                return widthDifference;
            }

            return a.index - b.index;
        });

    /*
     * Start small and increase until every name fits.
     */
    let containerHeight = 32;

    while (true) {
        const placed = [];
        let failed = false;

        for (const entry of entries) {
            const name = entry.element;

            const seed = donorHash(
                `${name.textContent.trim()}:${entry.index}`
            );

            const angle =
                -0.175 +
                donorRandom(seed) * 0.35;

            name.style.transform = `rotate(${angle}rad)`;

            const nameWidth = name.offsetWidth;
            const nameHeight = name.offsetHeight;

            const sin = Math.abs(Math.sin(angle));
            const cos = Math.abs(Math.cos(angle));

            const rotatedWidth =
                nameWidth * cos +
                nameHeight * sin;

            const rotatedHeight =
                nameWidth * sin +
                nameHeight * cos;

            const randomSeed = donorHash(
                `${name.textContent.trim()}:${entry.index}:position`
            );

            const availableWidth =
                Math.max(
                    0,
                    containerWidth -
                    rotatedWidth -
                    padding * 2
                );

            const availableHeight =
                Math.max(
                    0,
                    containerHeight -
                    rotatedHeight -
                    padding * 2
                );

            let found = false;

            /*
             * Try deterministic positions throughout the available
             * area. The same donor/index always gets the same result.
             */
            for (let attempt = 0; attempt < 500; attempt++) {
                const xRandom = donorRandom(
                    randomSeed + attempt * 0x9E3779B9
                );

                const yRandom = donorRandom(
                    randomSeed + attempt * 0x85EBCA6B
                );

                const x =
                    padding +
                    xRandom * availableWidth;

                const y =
                    padding +
                    yRandom * availableHeight;

                const rect = {
                    left: x - gap,
                    top: y - gap,
                    right: x + rotatedWidth + gap,
                    bottom: y + rotatedHeight + gap
                };

                const overlaps = placed.some(other =>
                    rect.right > other.left &&
                    rect.left < other.right &&
                    rect.bottom > other.top &&
                    rect.top < other.bottom
                );

                if (overlaps) {
                    continue;
                }

                name.style.left =
                    `${x + (rotatedWidth - nameWidth) / 2}px`;

                name.style.top =
                    `${y + (rotatedHeight - nameHeight) / 2}px`;

                placed.push(rect);
                found = true;
                break;
            }

            if (!found) {
                failed = true;
                break;
            }
        }

        if (!failed) {
            container.style.height = `${containerHeight}px`;
            return;
        }

        /*
         * There wasn't enough room. Give the container more height
         * and try again.
         */
        containerHeight += 8;
    }
}

function appendNextBatch(query) {
    if (displayedCount >= currentMatches.length || isLoadingMore) {
        return;
    }

    isLoadingMore = true;

    const nextBatch = currentMatches.slice(
        displayedCount,
        displayedCount + BATCH_SIZE
    );

    displayedCount += nextBatch.length;

    const fragment = document.createDocumentFragment();
    const newElements = [];

    for (const result of nextBatch) {
        const item = result.item;
        const key = normalize(item.word);
        const wordObj = wordObjects[result.index];
        const tracking = isTracking(wordObj);

        let duplicateBadge = "";

        if (wordCounts[key] > 1) {
            duplicateBadge = `
                <span class="resultNumber">
                    #${result.duplicateNumber}
                </span>
            `;
        }

        const resultElement = document.createElement("div");
        resultElement.className = "result";
        resultElement.dataset.index = result.index;

        resultElement.innerHTML = `
            <div class="resultMain">
                <div class="resultWord">
                    ${highlightMatch(item.word, query)}
                    ${duplicateBadge}
                </div>

                <div class="resultDetails">
                    <div class="detailsInner">
                        ${item.date ? `
                            <div class="detailRow">
                                <span class="detailLabel">date</span>
                                <span>${escapeHTML(item.date)}</span>
                            </div>
                        ` : ""}

                        ${item.tags?.length ? `
                            <div class="detailRow">
                                <span class="detailLabel">tags</span>
                                <span>
                                    ${item.tags.map(tag => `
                                        <span class="tag">#${escapeHTML(tag)}</span>
                                    `).join("")}
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

                        ${item.donors?.length ? `
                            <div class="resultDonors">
                                ${item.donors.map(donor => `
                                    <span
                                        class="donorName"
                                        ${donor.color
                ? `style="--donor-color: ${escapeHTML(donor.color)}"`
                : ""}
                                    >${escapeHTML(donor.name)}</span>
                                `).join("")}
                            </div>
                        ` : ""}

                        <div class="resultActions">
                            <button
                                class="copyButton"
                                type="button"
                                data-word-id="${escapeHTML(item.id)}"
                                aria-label="Copy link for ${escapeHTML(item.word)}"
                            >
                                ${copyLinkIcon}
                            </button>

                            <button
                                class="trackButton"
                                type="button"
                                data-word-id="${escapeHTML(item.id)}"
                                aria-label="${tracking
                ? `Stop tracking ${escapeHTML(item.word)}`
                : `Track ${escapeHTML(item.word)}`
            }"
                            >
                                ${tracking
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
                                        `
            }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        newElements.push(resultElement);
        fragment.appendChild(resultElement);
    }

    resultsScroll.appendChild(fragment);

    requestAnimationFrame(() => {
        resultsScroll.querySelectorAll(".resultDonors").forEach(layoutDonorNames);

        isLoadingMore = false;

        if (
            resultsScroll.scrollTop + resultsScroll.clientHeight >=
            resultsScroll.scrollHeight - threshold
        ) {
            appendNextBatch(query);
        }
    });
}

function parseDateQuery(query) {
    const match = query.match(
        /^(\d{4}|\*)-(\d{1,2}|\*)-(\d{1,2}|\*)$/
    );

    if (!match) {
        return null;
    }

    const [, year, month, day] = match;

    if (year === "*" && month === "*" && day === "*") {
        return ["*", "*", "*"];
    }

    const normalizedMonth =
        month === "*" ? "*" : month.padStart(2, "0");

    const normalizedDay =
        day === "*" ? "*" : day.padStart(2, "0");

    if (normalizedMonth !== "*" &&
        (+normalizedMonth < 1 || +normalizedMonth > 12)) {
        return null;
    }

    if (normalizedDay !== "*" &&
        (+normalizedDay < 1 || +normalizedDay > 31)) {
        return null;
    }

    return [year, normalizedMonth, normalizedDay];
}

function matchesDate(date, dateQuery) {
    if (!date || !dateQuery) {
        return false;
    }

    const parts = date.split("-");

    if (parts.length !== 3) {
        return false;
    }

    return dateQuery.every((part, index) =>
        part === "*" || part === parts[index]
    );
}

export function updateSearch() {
    const raw = searchInput.value.trim();
    const query = normalize(raw);
    const dateQuery = parseDateQuery(query);

    if (!query) {
        resultsWrapper.classList.remove("open");
        currentMatches = [];
        displayedCount = 0;
        return;
    }

    const showAllReverse = query === "*-";
    const showAll = query === "*" || showAllReverse || query === "*-*-*";

    currentMatches = wordData
        .map((item, index) => {
            const dateMatch = matchesDate(item.date, dateQuery);

            return {
                item,
                index,
                score: showAll
                    ? 0
                    : dateMatch
                        ? -1
                        : searchScore(item, query)
            };
        })
        .filter(result => result.score !== Infinity)
        .sort((a, b) => {
            if (a.score !== b.score) {
                return a.score - b.score;
            }

            if (showAll) {
                return showAllReverse
                    ? b.index - a.index
                    : a.index - b.index;
            }

            return a.index - b.index;
        });

    resultsWrapper.classList.add("open");
    resultsScroll.innerHTML = "";
    displayedCount = 0;

    if (currentMatches.length === 0) {
        resultsScroll.innerHTML = `
            <div class="noMatches">
                <span>No matches</span>
                <span class="noMatchesHint">
                    Try searching <button type="button" class="searchHintButton">*</button>
                </span>
            </div>
        `;

        return;
    }

    // Calculate duplicate information once for this search.
    wordCounts = {};
    const runningPositions = {};

    for (const result of currentMatches) {
        const key = normalize(result.item.word);

        wordCounts[key] = (wordCounts[key] || 0) + 1;

        runningPositions[key] = (runningPositions[key] || 0) + 1;
        result.duplicateNumber = runningPositions[key];
    }

    appendNextBatch(query);
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

        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                searchInput.blur();
            }
        });
    }

    const clearSearch = () => {
        searchInput.value = "";
        resultsWrapper.classList.remove("open");
        searchInput.blur();
    };

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            clearSearch();
        }
    });

    if (clearSearchButton) {
        clearSearchButton.addEventListener("click", () => {
            clearSearchButton.blur();
            clearSearch();
        });
    }

    window.addEventListener("trackingchange", event => {
        updateTrackingButtons(event.detail.word);
    });

    if (!resultsScroll) {
        return;
    }

    resultsScroll.addEventListener("click", event => {
        const button = event.target.closest(".searchHintButton");

        if (!button) {
            return;
        }

        searchInput.value = "*";
        updateSearch();
    });

    resultsScroll.addEventListener("scroll", () => {
        if (resultsScroll.scrollTop + resultsScroll.clientHeight >= resultsScroll.scrollHeight - threshold) {
            const raw = searchInput.value.trim();
            appendNextBatch(normalize(raw));
        }
    });

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

                clearTimeout(copyButton.copyTimeout);

                copyButton.innerHTML = checkmarkIcon;
                copyButton.classList.add("copied");

                copyButton.copyTimeout = setTimeout(() => {
                    copyButton.innerHTML = copyLinkIcon;
                    copyButton.classList.remove("copied");
                    copyButton.copyTimeout = null;
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