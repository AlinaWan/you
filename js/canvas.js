export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");

export let dpr = Math.min(window.devicePixelRatio || 1, 2);

export function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();