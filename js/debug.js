import {
    camera,
    isTracking,
    getTrackedWord,
    screenToWorld
} from "./camera.js";

import {
    keys,
    mouse,
    getPointerCount
} from "./controls.js";

import {
    wordObjects,
    getVisibleObjects
} from "./word.js";

import {
    spatialHash
} from "./spatialHash.js";

const params = new URLSearchParams(window.location.search);

export const debugEnabled =
    params.get("debug") === "true" || params.get("debug") === "1";

let debugElement = null;

let fps = 0;
let frameTime = 0;

export function initDebug() {
    if (!debugEnabled) {
        return;
    }

    debugElement = document.createElement("div");
    debugElement.id = "debugInfo";

    document.body.appendChild(debugElement);
}

export function updateDebug(deltaTime, visibleObjects) {
    if (!debugEnabled || !debugElement) {
        return;
    }

    /*
     * Smooth the FPS value so it doesn't jump around every frame.
     */
    const currentFrameTime = deltaTime * 1000;

    frameTime +=
        (currentFrameTime - frameTime) * 0.1;

    if (frameTime > 0) {
        fps = 1000 / frameTime;
    }

    let inputX = 0;
    let inputY = 0;

    if (keys.has("a") || keys.has("arrowleft")) {
        inputX -= 1;
    }

    if (keys.has("d") || keys.has("arrowright")) {
        inputX += 1;
    }

    if (keys.has("w") || keys.has("arrowup")) {
        inputY -= 1;
    }

    if (keys.has("s") || keys.has("arrowdown")) {
        inputY += 1;
    }

    const pointerCount = getPointerCount();

    const inputLines = navigator.maxTouchPoints > 0
        ? [`  Fingers      ${pointerCount}`]
        : [
            `  X            ${inputX}`,
            `  Y            ${inputY}`
        ];

    const speed = Math.hypot(
        camera.velocityX,
        camera.velocityY
    );

    const trackedWord = getTrackedWord();

    let mouseWorld = null;

    if (mouse.x > -1000) {
        mouseWorld = screenToWorld(
            mouse.x,
            mouse.y
        );
    }

    debugElement.textContent = [
        "CAMERA",
        `  Position     ${formatPair(camera.x, camera.y)}`,
        `  Velocity     ${formatPair(camera.velocityX, camera.velocityY)}`,
        `  Speed        ${speed.toFixed(2)}`,
        "TRACKING",
        `  Active       ${isTracking() ? "true" : "false"}`,
        `  Target       ${trackedWord ? trackedWord.text : "null"}`,
        "INPUT",
        ...inputLines,
        "MOUSE",
        `  Screen       ${formatPair(mouse.x, mouse.y)}`,
        `  World        ${mouseWorld ? formatPair(mouseWorld.x, mouseWorld.y) : "inactive"}`,
        "WORLD",
        `  Objects      ${wordObjects.length.toLocaleString()}`,
        `  Visible      ${visibleObjects.size.toLocaleString()}`,
        `  Hash Cells   ${spatialHash.cells.size.toLocaleString()}`,
        "PERFORMANCE",
        `  FPS          ${fps.toFixed(0)}`,
        `  Frame        ${frameTime.toFixed(2)} ms`
    ].join("\n");
}

function formatPair(x, y) {
    return `${x.toFixed(2)}, ${y.toFixed(2)}`;
}