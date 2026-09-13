import { config } from "./config.js";
import { camera, stopTracking, isTracking } from "./camera.js";
import { canvas } from "./canvas.js";

export const keys = new Set();

export const mouse = {
    x: -10000,
    y: -10000,
    vx: 0,
    vy: 0,
    lastX: -10000,
    lastY: -10000,
    active: false
};

const activePointers = new Map();

let previousTouchCenter = null;

const TOUCH_CURSOR_DELAY = 120;
let cursorActivationTimer = null;

export function isTyping() {
    const active = document.activeElement;

    if (!active) {
        return false;
    }

    return (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
    );
}

window.addEventListener("keydown", event => {
    if (isTyping()) {
        const searchInput = document.getElementById("searchInput");

        if (event.key === "Escape" && searchInput) {
            searchInput.value = "";
            searchInput.blur();
            event.preventDefault();
        }

        return;
    }

    const key = event.key.toLowerCase();

    const movementKeys = [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright"
    ];

    if (movementKeys.includes(key)) {
        keys.add(key);
        event.preventDefault();
    }
});

window.addEventListener("keyup", event => {
    keys.delete(event.key.toLowerCase());
});

export function updateCamera(deltaTime) {
    if (isTyping()) {
        return;
    }

    let dx = 0;
    let dy = 0;

    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;

    if (dx !== 0 || dy !== 0) {
        if (isTracking()) {
            stopTracking();

            camera.velocityX *= 0.8;
            camera.velocityY *= 0.8;
        }

        const length = Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        const acceleration = 1800;

        camera.velocityX += dx * acceleration * deltaTime;
        camera.velocityY += dy * acceleration * deltaTime;
    } else {
        const friction = Math.exp(config.panFriction * deltaTime);

        camera.velocityX *= friction;
        camera.velocityY *= friction;
    }

    const speed = Math.hypot(
        camera.velocityX,
        camera.velocityY
    );

    if (speed > config.panSpeed) {
        const scale = config.panSpeed / speed;

        camera.velocityX *= scale;
        camera.velocityY *= scale;
    }

    camera.x += camera.velocityX * deltaTime;
    camera.y += camera.velocityY * deltaTime;
}

export function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();

    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.active = true;
}

export function deactivateMouse() {
    mouse.active = false;
    mouse.x = -10000;
    mouse.y = -10000;
    mouse.vx = 0;
    mouse.vy = 0;
}

function cancelCursorActivation() {
    if (cursorActivationTimer !== null) {
        clearTimeout(cursorActivationTimer);
        cursorActivationTimer = null;
    }
}

function scheduleCursorActivation() {
    cancelCursorActivation();

    cursorActivationTimer = setTimeout(() => {
        cursorActivationTimer = null;

        if (activePointers.size !== 1) {
            return;
        }

        const pointer = activePointers.values().next().value;

        if (pointer) {
            updateMouse(pointer);
        }
    }, TOUCH_CURSOR_DELAY);
}

function getTouchCenter() {
    const rect = canvas.getBoundingClientRect();
    const pointers = [...activePointers.values()];

    if (pointers.length < 2) {
        return null;
    }

    const centerX =
        (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left;

    const centerY =
        (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top;

    return {
        x: centerX,
        y: centerY
    };
}

function updateTouchInteraction() {
    const pointerCount = activePointers.size;

    if (pointerCount === 1) {
        const pointer = activePointers.values().next().value;

        /*
         * If the cursor is already active, this is normal
         * single-finger movement.
         *
         * If it is inactive, activation is being handled by
         * scheduleCursorActivation().
         */
        if (mouse.active) {
            updateMouse(pointer);
        }

        previousTouchCenter = null;
        return;
    }

    if (pointerCount >= 2) {
        /*
         * A second finger means this is now a pan.
         *
         * Cancel any pending single-finger cursor activation
         * so the cursor never flashes underneath the pan.
         */
        cancelCursorActivation();
        deactivateMouse();

        const center = getTouchCenter();

        if (!center) {
            return;
        }

        if (previousTouchCenter) {
            stopTracking();

            camera.x -= center.x - previousTouchCenter.x;
            camera.y -= center.y - previousTouchCenter.y;
        }

        previousTouchCenter = center;
    }
}

canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse") {
        updateMouse(event);
        return;
    }

    activePointers.set(event.pointerId, event);

    canvas.setPointerCapture(event.pointerId);

    const pointerCount = activePointers.size;

    if (pointerCount === 1) {
        /*
         * Don't show the cursor immediately.
         *
         * This gives a second finger a short window to arrive
         * and turn the interaction into a two-finger pan.
         */
        deactivateMouse();
        scheduleCursorActivation();
    } else {
        /*
         * Second finger arrived before the delay expired,
         * so this is definitely a two-finger interaction.
         */
        cancelCursorActivation();
        deactivateMouse();
    }

    updateTouchInteraction();

    event.preventDefault();
});

canvas.addEventListener("pointermove", event => {
    if (event.pointerType === "mouse") {
        updateMouse(event);
        return;
    }

    if (!activePointers.has(event.pointerId)) {
        return;
    }

    activePointers.set(event.pointerId, event);

    updateTouchInteraction();

    event.preventDefault();
});

function endPointer(event) {
    if (event.pointerType === "mouse") {
        return;
    }

    activePointers.delete(event.pointerId);

    const pointerCount = activePointers.size;

    if (pointerCount >= 2) {
        /*
         * Still panning with two or more fingers.
         */
        cancelCursorActivation();

        previousTouchCenter = getTouchCenter();
        deactivateMouse();
    } else if (pointerCount === 1) {
        /*
         * One finger remains after a two-finger pan.
         *
         * Don't immediately show the cursor because the user
         * may be lifting the second finger slightly before the
         * first one. Give another finger 120ms to arrive.
         */
        previousTouchCenter = null;
        deactivateMouse();
        scheduleCursorActivation();
    } else {
        /*
         * No fingers remain.
         */
        cancelCursorActivation();

        previousTouchCenter = null;
        deactivateMouse();
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }

    event.preventDefault();
}

canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

canvas.addEventListener("pointerleave", event => {
    if (event.pointerType !== "mouse") {
        return;
    }

    deactivateMouse();
});

window.addEventListener("blur", () => {
    activePointers.clear();
    previousTouchCenter = null;
    keys.clear();

    cancelCursorActivation();
    deactivateMouse();
});