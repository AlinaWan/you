import * as Tone from "https://cdn.jsdelivr.net/npm/tone@15.1.22/+esm";

import { config } from "./config.js";

const volumeOffIcon = `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
    </svg>
`;

const volumeOnIcon = `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
`;

const leftHandSynth = new Tone.PolySynth(Tone.Synth).toDestination();
const rightHandSynth = new Tone.PolySynth(Tone.Synth).toDestination();

const synthSettings = {
    oscillator: {
        type: "triangle"
    },
    envelope: {
        attack: 0.04,
        decay: 0.1,
        sustain: 0.4,
        release: 1.4
    }
};

leftHandSynth.set(synthSettings);
rightHandSynth.set(synthSettings);

leftHandSynth.volume.value = -6;
rightHandSynth.volume.value = -6;

// die on this hill
const leftHandSequence = [
    ["Bb3", "F3"],
    ["Bb3", "F3"],
    ["Bb3", "F3"],
    ["Bb3", "F3"],

    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],

    ["Bb3", "Eb3", "G3"],

    ["Db3", "F3", "Ab3"],
    ["Db3", "F3", "Ab3"],
    ["Db3", "F3", "Ab3"],
    ["Db3", "F3", "Ab3"],

    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],

    ["C3", "F3", "Ab3"],
    ["C3", "F3", "Ab3"],
    ["C3", "F3", "Ab3"],
    ["C3", "F3", "Ab3"],

    ["Eb3", "G3", "Bb3"],
    ["Eb3", "G3", "Bb3"],
    ["Eb3", "G3", "Bb3"],
    ["Eb3", "G3", "Bb3"],

    ["Db3", "F3", "Ab3"],
    ["Db3", "F3", "Ab3"],
    ["Db3", "F3", "Ab3"],
    ["Db3", "F3", "Ab3"],

    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],
    ["C3", "Eb3", "G3"],

    ["C3", "F3", "Ab3"],
    ["C3", "F3", "Ab3"],
    ["C3", "F3", "Ab3"],
    ["C3", "F3", "Ab3"],

    ["Bb3", "D3", "F3"],
    ["Db3", "Ab3", "Bb3"],
    ["Ab3"]
];

const rightHandNotes = [
    "Ab4", "Eb4", "C5", "Db5", "C5", "Ab4", "Ab4", "Eb4",
    "Eb4", "C5", "Db5", "C5", "Ab4", "Ab4",
    "Bb4", "Bb4", "Bb4", "C5", "Db5", "Eb5", "C5", "Eb5",
    "C5", "C5", "Bb4", "Ab4", "Db5", "C5",
    "Ab4", "G4", "Db5", "C5", "Ab4", "Bb4", "Ab4", "Ab4",
    "Db5", "C5", "Ab4", "Bb4", "C5", "Bb4",
    "Eb5", "F5", "Eb5", "C5", "Bb4", "Ab4", "Bb4", "F4",
    "Eb4", "G4", "F4", "Eb4", "Eb4", "Db4",
    "C4", "Ab4", "Ab4", "Db5", "C5", "Ab4", "Bb4", "C5",
    "Bb4", "Ab4", "Eb4", "Ab4", "Eb4", "B4",
    "Bb4", "Ab4", "F4", "Eb4", "F4", "Ab4", "Bb4", "Bb4",
    "Eb4", "Ab4", "Bb4", "B4", "Bb4", "Ab4", "Ab4"
];

let noteIndex = 0;
let lastCollisionTime = 0;
let started = false;
let muted = true;

export async function startAudio() {
    if (started) {
        return;
    }

    await Tone.start();
    started = true;
}

export async function toggleMute() {
    if (!started) {
        await Tone.start();
        started = true;
    }

    muted = !muted;

    updateMuteButton();
}

export function isMuted() {
    return muted;
}

function updateMuteButton() {
    const button = document.getElementById("muteButton");

    if (!button) {
        return;
    }

    button.innerHTML = muted ? volumeOffIcon : volumeOnIcon;

    button.setAttribute(
        "aria-label",
        muted ? "Unmute audio" : "Mute audio"
    );
}

export function playCollision() {
    if (muted || !started) {
        return;
    }

    const now = performance.now();

    if (now - lastCollisionTime < config.collisionDebounce) {
        return;
    }

    lastCollisionTime = now;

    const leftHandNotes =
        leftHandSequence[noteIndex % leftHandSequence.length];

    const rightHandNote =
        rightHandNotes[noteIndex % rightHandNotes.length];

    leftHandSynth.triggerAttackRelease(leftHandNotes, "8n");
    rightHandSynth.triggerAttackRelease(rightHandNote, "8n");

    noteIndex++;
}