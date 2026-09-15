import { camera, isTracking, getTrackedWord, screenToWorld, worldToScreen } from "./camera.js";
import { config } from "./config.js";
import { ctx } from "./canvas.js";
import { keys, mouse, getPointerCount, applyDeadzone } from "./controls.js";
import { wordObjects, getVisibleObjects } from "./word.js";
import { spatialHash } from "./spatialHash.js";
import { debugCollisions } from "./physics.js";

const params = new URLSearchParams(window.location.search);

const debugModes = new Set(
    (params.get("debug") ?? "")
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean)
);

export const debugStats =
    debugModes.has("stats");

export const debugPhysics =
    debugModes.has("physics");

export const debugHash =
    debugModes.has("hash");

export const debugEnabled =
    debugStats ||
    debugPhysics ||
    debugHash;

let debugElement = null;

let fps = 0;
let frameTime = 0;

function drawHitbox(word) {
    const screen = worldToScreen(word.x, word.y);

    ctx.save();

    ctx.translate(screen.x, screen.y);
    ctx.rotate(word.angle);

    ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
    ctx.lineWidth = 1;

    ctx.strokeRect(
        -word.halfWidth,
        -word.halfHeight,
        word.width,
        word.height
    );

    ctx.restore();
}

function drawBoundingRadius(word) {
    const screen = worldToScreen(word.x, word.y);

    ctx.beginPath();

    ctx.arc(
        screen.x,
        screen.y,
        word.boundingRadius,
        0,
        Math.PI * 2
    );

    ctx.strokeStyle = "rgba(0, 180, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawCenter(word) {
    const screen = worldToScreen(word.x, word.y);

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 2, 0, Math.PI * 2);

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fill();
}

function drawVector(x, y, vx, vy, scale, color) {
    const endX = x + vx * scale;
    const endY = y + vy * scale;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const angle = Math.atan2(vy, vx);
    const headLength = 6;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - Math.cos(angle - Math.PI / 6) * headLength,
        endY - Math.sin(angle - Math.PI / 6) * headLength
    );
    ctx.lineTo(
        endX - Math.cos(angle + Math.PI / 6) * headLength,
        endY - Math.sin(angle + Math.PI / 6) * headLength
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function drawVelocity(word) {
    const screen = worldToScreen(word.x, word.y);

    drawVector(
        screen.x,
        screen.y,
        word.vx,
        word.vy,
        15,
        "rgba(255, 255, 255, 0.7)"
    );
}

function drawCurrentForce(word) {
    const screen = worldToScreen(word.x, word.y);

    drawVector(
        screen.x,
        screen.y,
        word.debug.currentForceX,
        word.debug.currentForceY,
        30,
        "rgba(100, 180, 255, 0.8)"
    );
}

function drawMouseForce(word) {
    const screen = worldToScreen(word.x, word.y);

    drawVector(
        screen.x,
        screen.y,
        word.debug.mouseForceX,
        word.debug.mouseForceY,
        30,
        "rgba(255, 100, 180, 0.9)"
    );
}

function drawMouseRadius() {
    if (mouse.x <= -1000) {
        return;
    }

    const mouseWorld = screenToWorld(mouse.x, mouse.y);
    const screen = worldToScreen(mouseWorld.x, mouseWorld.y);

    ctx.beginPath();
    ctx.arc(
        screen.x,
        screen.y,
        config.mouseRadius,
        0,
        Math.PI * 2
    );

    ctx.strokeStyle = "rgba(255, 100, 180, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawCollisions() {
    for (const collision of debugCollisions) {
        const point = worldToScreen(
            collision.contactX,
            collision.contactY
        );

        // Contact point.
        ctx.beginPath();
        ctx.arc(
            point.x,
            point.y,
            4,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "red";
        ctx.fill();

        // Collision normal.
        drawVector(
            point.x,
            point.y,
            collision.nx,
            collision.ny,
            30,
            "red"
        );

        // Collision impulse.
        if (collision.impulse !== 0) {
            drawVector(
                point.x,
                point.y,
                collision.impulseX,
                collision.impulseY,
                10,
                "orange"
            );
        }
    }
}

function drawSpatialHash() {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    const minWorldX = camera.x - halfWidth;
    const maxWorldX = camera.x + halfWidth;
    const minWorldY = camera.y - halfHeight;
    const maxWorldY = camera.y + halfHeight;

    const startX =
        Math.floor(minWorldX / spatialHash.cellSize);

    const endX =
        Math.floor(maxWorldX / spatialHash.cellSize);

    const startY =
        Math.floor(minWorldY / spatialHash.cellSize);

    const endY =
        Math.floor(maxWorldY / spatialHash.cellSize);

    const cellSize = spatialHash.cellSize;
    const markerSize = cellSize * 0.05;
    const markerOffset = (cellSize - markerSize) / 2;

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            const minCellX = x * cellSize;
            const minCellY = y * cellSize;

            const screen = worldToScreen(
                minCellX,
                minCellY
            );

            // Draw the actual cell walls.
            ctx.strokeStyle = "rgba(0, 200, 255, 0.12)";
            ctx.lineWidth = 1;

            ctx.strokeRect(
                screen.x,
                screen.y,
                cellSize,
                cellSize
            );

            // Mark occupied cells.
            const key = spatialHash.key(x, y);

            if (!spatialHash.cells.has(key)) {
                continue;
            }

            // Draw a small marker in the center of the cell.
            ctx.fillStyle = "rgba(0, 200, 255, 0.12)";
            ctx.fillRect(
                screen.x + markerOffset,
                screen.y + markerOffset,
                markerSize,
                markerSize
            );

            ctx.strokeStyle = "rgba(0, 200, 255, 0.35)";
            ctx.strokeRect(
                screen.x + markerOffset,
                screen.y + markerOffset,
                markerSize,
                markerSize
            );
        }
    }
}

export function initDebug() {
    if (!debugStats) {
        return;
    }

    debugElement = document.createElement("div");
    debugElement.id = "debugInfo";

    document.body.appendChild(debugElement);
}

export function drawDebug(visibleObjects) {
    if (!debugEnabled) {
        return;
    }

    if (debugHash) {
        drawSpatialHash();
    }

    if (debugPhysics) {
        drawMouseRadius();

        for (const word of visibleObjects) {
            drawBoundingRadius(word);
            drawHitbox(word);
            drawCenter(word);
            drawVelocity(word);
            drawCurrentForce(word);
            drawMouseForce(word);
        }

        drawCollisions();
    }
}

export function updateDebug(deltaTime, visibleObjects) {
    if (!debugStats || !debugElement) {
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

    // Displays raw, unadjusted input values (before deadzone or clamping).
    // Note: Values may exceed 1.0 if multiple input sources (e.g., keyboard + controller)
    // are active simultaneously. controls.js will clamp and process these
    // values before applying them to panning logic.
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

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = Array.from(gamepads).find(gp => gp !== null);

    if (gamepad) {
        inputX += (gamepad.axes[0] ?? 0);
        inputY += (gamepad.axes[1] ?? 0);
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