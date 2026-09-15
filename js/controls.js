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
let isTouchPanning = false;

let touchVelocityX = 0;
let touchVelocityY = 0;

const TOUCH_CURSOR_DELAY = 120;
let cursorActivationTimer = null;

const GAMEPAD_INNER_DEADZONE = 0.15;
const GAMEPAD_OUTER_DEADZONE = 0.90;

export function applyDeadzone(value) {
    const magnitude = Math.abs(value);

    if (magnitude <= GAMEPAD_INNER_DEADZONE) {
        return 0;
    }

    if (magnitude >= GAMEPAD_OUTER_DEADZONE) {
        return Math.sign(value);
    }

    const normalized =
        (magnitude - GAMEPAD_INNER_DEADZONE) /
        (GAMEPAD_OUTER_DEADZONE - GAMEPAD_INNER_DEADZONE);

    return Math.sign(value) * normalized;
}

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
    /*
     * Sample two-finger touch movement once per animation frame.
     *
     * This is intentionally done here instead of pointermove.
     * A browser does not send pointermove events while a finger
     * is completely stationary, so sampling every frame lets us
     * correctly detect that the current velocity has reached zero.
     */
    if (isTouchPanning) {
        const center = getTouchCenter();

        if (center === null) {
            touchVelocityX = 0;
            touchVelocityY = 0;
            return;
        }

        if (previousTouchCenter === null || deltaTime <= 0) {
            previousTouchCenter = center;

            touchVelocityX = 0;
            touchVelocityY = 0;

            return;
        }

        const dx = center.x - previousTouchCenter.x;
        const dy = center.y - previousTouchCenter.y;

        /*
         * Move the camera opposite to the finger movement.
         */
        camera.x -= dx;
        camera.y -= dy;

        /*
         * Calculate the velocity from this exact animation
         * frame.
         *
         * If the fingers have stopped moving:
         *
         *     dx = 0
         *     dy = 0
         *
         * therefore the velocity becomes exactly zero.
         */
        touchVelocityX = -dx / deltaTime;
        touchVelocityY = -dy / deltaTime;

        /*
         * Limit touch velocity to the same maximum speed used
         * by keyboard/mouse camera movement.
         */
        const speed = Math.hypot(
            touchVelocityX,
            touchVelocityY
        );

        if (speed > config.panSpeed) {
            const scale = config.panSpeed / speed;

            touchVelocityX *= scale;
            touchVelocityY *= scale;
        }

        /*
         * Moving the camera manually cancels tracking.
         */
        if (dx !== 0 || dy !== 0) {
            stopTracking();
        }

        previousTouchCenter = center;

        /*
         * Touch panning completely owns the camera this frame.
         * Do not also apply keyboard movement or camera inertia.
         */
        return;
    }

    let dx = 0;
    let dy = 0;

    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;

    // Gamepad input handling
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = Array.from(gamepads).find(gp => gp !== null);

    if (gamepad) {
        // Left joystick: camera pan (Axes 0 & 1)
        const gpPanX = applyDeadzone(gamepad.axes[0] || 0);
        const gpPanY = applyDeadzone(gamepad.axes[1] || 0);

        if (gpPanX !== 0 || gpPanY !== 0) {
            dx += gpPanX;
            dy += gpPanY;
        }

        // Right joystick: cursor move (Axes 2 & 3)
        const gpCursorX = applyDeadzone(gamepad.axes[2] || 0);
        const gpCursorY = applyDeadzone(gamepad.axes[3] || 0);

        if (gpCursorX !== 0 || gpCursorY !== 0) {
            const rect = canvas.getBoundingClientRect();

            // Initialize cursor at center if active mouse is off-screen/inactive
            if (!mouse.active || mouse.x < 0 || mouse.y < 0) {
                mouse.x = rect.width / 2;
                mouse.y = rect.height / 2;
            }

            mouse.x += gpCursorX * config.gamepadCursorSpeed * deltaTime;
            mouse.y += gpCursorY * config.gamepadCursorSpeed * deltaTime;

            // Clamp cursor to canvas boundaries
            mouse.x = Math.max(0, Math.min(rect.width, mouse.x));
            mouse.y = Math.max(0, Math.min(rect.height, mouse.y));
            mouse.active = true;
        }
    }

    if (dx !== 0 || dy !== 0) {
        if (isTracking()) {
            stopTracking();

            camera.velocityX *= 0.8;
            camera.velocityY *= 0.8;
        }

        const length = Math.hypot(dx, dy);

        // Normalize if combined magnitude exceeds 1 (e.g. diagonal keyboard or extreme analog tilt)
        if (length > 1) {
            dx /= length;
            dy /= length;
        }

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

export function getPointerCount() {
    return activePointers.size;
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

        /*
         * A single finger is not a camera pan.
         *
         * If this was previously a two-finger pan, the gesture
         * has ended as soon as one finger remains.
         */
        previousTouchCenter = null;
        isTouchPanning = false;

        return;
    }

    if (pointerCount >= 2) {
        /*
         * Two or more fingers means camera panning.
         *
         * Camera movement and velocity are sampled from the
         * animation loop rather than pointermove events so that
         * velocity becomes zero when the fingers stop moving.
         */
        isTouchPanning = true;

        cancelCursorActivation();
        deactivateMouse();

        if (previousTouchCenter === null) {
            previousTouchCenter = getTouchCenter();

            touchVelocityX = 0;
            touchVelocityY = 0;
        }
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

        /*
         * Two fingers means a new pan is beginning.
         *
         * Don't carry keyboard/tracking/inertial velocity into
         * the new gesture.
         */
        if (pointerCount === 2) {
            camera.velocityX = 0;
            camera.velocityY = 0;

            touchVelocityX = 0;
            touchVelocityY = 0;

            /*
             * Start measuring the two-finger gesture from the current
             * center rather than from the position of the first finger.
             */
            previousTouchCenter = getTouchCenter();
        }
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

    const wasTouchPanning = isTouchPanning;

    activePointers.delete(event.pointerId);

    const pointerCount = activePointers.size;

    if (pointerCount >= 2) {
        /*
         * Still panning with two or more fingers.
         */
        cancelCursorActivation();
        deactivateMouse();

        previousTouchCenter = getTouchCenter();
    } else if (pointerCount === 1) {
        /*
         * Two-finger pan has ended.
         *
         * Treat 2 → 1 exactly like 2 → 0:
         * transfer the current touch velocity to the
         * camera and let normal camera friction take over.
         */
        previousTouchCenter = null;
        isTouchPanning = false;

        if (wasTouchPanning) {
            camera.velocityX = touchVelocityX;
            camera.velocityY = touchVelocityY;
        }

        touchVelocityX = 0;
        touchVelocityY = 0;

        deactivateMouse();
        scheduleCursorActivation();
    } else {
        /*
         * No fingers remain.
         *
         * End the two-finger pan and transfer the current
         * touch velocity to the camera for inertia.
         */
        cancelCursorActivation();

        previousTouchCenter = null;
        isTouchPanning = false;

        if (wasTouchPanning) {
            camera.velocityX = touchVelocityX;
            camera.velocityY = touchVelocityY;
        }

        touchVelocityX = 0;
        touchVelocityY = 0;

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
    isTouchPanning = false;

    touchVelocityX = 0;
    touchVelocityY = 0;

    keys.clear();

    cancelCursorActivation();
    deactivateMouse();
});