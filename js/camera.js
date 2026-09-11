let trackedWord = null;

export const camera = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0
};

export function worldToScreen(x, y) {
    return {
        x: x - camera.x + window.innerWidth / 2,
        y: y - camera.y + window.innerHeight / 2
    };
}

export function screenToWorld(x, y) {
    return {
        x: x + camera.x - window.innerWidth / 2,
        y: y + camera.y - window.innerHeight / 2
    };
}

export function startTracking(word) {
    camera.velocityX = 0;
    camera.velocityY = 0;

    trackedWord = word;

    window.dispatchEvent(new CustomEvent("trackingchange", {
        detail: {
            word
        }
    }));
}

export function stopTracking() {
    if (trackedWord === null) {
        return;
    }

    trackedWord = null;

    window.dispatchEvent(new CustomEvent("trackingchange", {
        detail: {
            word: null
        }
    }));
}

export function isTracking(word = null) {
    if (word === null) {
        return trackedWord !== null;
    }

    return trackedWord === word;
}

export function updateTracking(deltaTime) {
    if (!trackedWord) {
        return;
    }

    const smoothing = 1 - Math.exp(-8 * deltaTime);

    camera.x += (trackedWord.x - camera.x) * smoothing;
    camera.y += (trackedWord.y - camera.y) * smoothing;
}