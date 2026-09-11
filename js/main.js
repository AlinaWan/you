import { config } from "./config.js";
import { ctx } from "./canvas.js";
import { mouse, updateCamera } from "./controls.js";
import { camera, updateTracking, startTracking } from "./camera.js";
import { loadWordsFromRepository, wordData } from "./dataLoader.js";
import { Word, wordObjects, time, setTime, setWordObjects } from "./word.js";
import { rebuildSpatialHash, getVisibleObjects, handleCollisions } from "./physics.js";
import { initSearchListeners } from "./search.js";
import { toggleMute } from "./audio.js";

function initWordObjects() {
    const objs = [];
    for (let i = 0; i < wordData.length; i++) {
        objs.push(new Word(wordData[i], i));
    }
    setWordObjects(objs);
    rebuildSpatialHash();
}

function drawBackground() {
    ctx.fillStyle = "#090909";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

let lastTimestamp = performance.now();

function animate(timestamp) {
    const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    setTime(time + delta);

    updateCamera(delta);
    updateTracking(delta);

    if (mouse.lastX > -1000) {
        mouse.vx = (mouse.x - mouse.lastX) * 0.4;
        mouse.vy = (mouse.y - mouse.lastY) * 0.4;
    }

    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
    mouse.vx *= 0.8;
    mouse.vy *= 0.8;

    rebuildSpatialHash();

    const simulation = getVisibleObjects(config.simulationPadding);
    for (const word of simulation) {
        word.update();
    }

    rebuildSpatialHash();
    handleCollisions();

    const visible = getVisibleObjects(config.renderPadding);
    drawBackground();

    for (const word of visible) {
        word.draw();
    }

    requestAnimationFrame(animate);
}

function trackWordFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const wordId = params.get("track");

    if (!wordId) {
        return;
    }

    const word = wordObjects.find(
        word => word.id === wordId
    );

    if (!word) {
        return;
    }

    startTracking(word);
}

async function start() {
    initSearchListeners();

    document
        .getElementById("muteButton")
        .addEventListener("click", toggleMute);

    await loadWordsFromRepository();
    initWordObjects();

    trackWordFromUrl();

    requestAnimationFrame(animate);
}

start();