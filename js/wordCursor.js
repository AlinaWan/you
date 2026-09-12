import { mouse } from "./controls.js";
import { screenToWorld } from "./camera.js";
import { spatialHash } from "./spatialHash.js";

const wordCursor = document.getElementById("wordCursor");

const CURSOR_DISTANCE = 150;
const CURSOR_FULL_DISTANCE = 40;

const FAR_COLOR = {
    r: 119,
    g: 119,
    b: 119
};

const NEAR_COLOR = {
    r: 255,
    g: 70,
    b: 120
};

export function updateWordCursor() {
    if (!mouse.active) {
        wordCursor.style.display = "none";
        return;
    }

    wordCursor.style.left = `${mouse.x}px`;
    wordCursor.style.top = `${mouse.y}px`;

    const mouseWorld = screenToWorld(mouse.x, mouse.y);

    const nearby = spatialHash.getRect(
        mouseWorld.x - CURSOR_DISTANCE,
        mouseWorld.y - CURSOR_DISTANCE,
        mouseWorld.x + CURSOR_DISTANCE,
        mouseWorld.y + CURSOR_DISTANCE
    );

    let closestDistanceSq = Infinity;

    for (const word of nearby) {
        const dx = word.x - mouseWorld.x;
        const dy = word.y - mouseWorld.y;

        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < closestDistanceSq) {
            closestDistanceSq = distanceSq;
        }
    }

    if (closestDistanceSq === Infinity) {
        setCursorColor(0);
        wordCursor.style.display = "block";
        return;
    }

    const distance = Math.sqrt(closestDistanceSq);

    const proximity = Math.max(
        0,
        Math.min(
            1,
            (CURSOR_DISTANCE - distance) /
            (CURSOR_DISTANCE - CURSOR_FULL_DISTANCE)
        )
    );

    // Makes the color change more gradual farther away
    // and stronger as the cursor approaches the word.
    const eased = proximity * proximity;

    setCursorColor(eased);

    // Only reveal the cursor after its position and color
    // have been updated for this frame.
    wordCursor.style.display = "block";
}

function setCursorColor(amount) {
    const r = FAR_COLOR.r +
        (NEAR_COLOR.r - FAR_COLOR.r) * amount;

    const g = FAR_COLOR.g +
        (NEAR_COLOR.g - FAR_COLOR.g) * amount;

    const b = FAR_COLOR.b +
        (NEAR_COLOR.b - FAR_COLOR.b) * amount;

    wordCursor.style.color = `rgb(${r}, ${g}, ${b})`;
}