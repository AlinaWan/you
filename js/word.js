import { config } from "./config.js";
import { ctx } from "./canvas.js";
import { mouse } from "./controls.js";
import { camera, worldToScreen, screenToWorld } from "./camera.js";
import { spatialHash } from "./spatialHash.js";

export let wordObjects = [];
export let time = 0;

export function setTime(t) {
    time = t;
}

export function setWordObjects(objs) {
    wordObjects = objs;
}

export function measureWord(text) {
    ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
    const metrics = ctx.measureText(text);

    return {
        width: metrics.width + 4,
        height: config.fontSize
    };
}

export class Word {
    constructor(data, index) {
        this.data = data;
        this.text = data.word;
        this.index = index;

        const dimensions = measureWord(this.text);
        this.width = dimensions.width;
        this.height = dimensions.height;

        this.halfWidth = this.width / 2;
        this.halfHeight = this.height / 2;

        // This is used for spatial-hash broad-phase lookup, not the actual collision shape
        this.boundingRadius = Math.hypot(this.width, this.height) / 2;

        const angle = index * 2.3999632297;
        const radius = Math.sqrt(index + 1) * config.spawnDistance;

        this.x = Math.cos(angle) * radius + (Math.random() - 0.5) * 50;
        this.y = Math.sin(angle) * radius + (Math.random() - 0.5) * 50;

        const direction = Math.random() * Math.PI * 2;
        const speed = config.minSpeed + Math.random() * 0.3;

        this.vx = Math.cos(direction) * speed;
        this.vy = Math.sin(direction) * speed;

        this.angle = (Math.random() - 0.5) * 0.35;
        this.angularVelocity = (Math.random() - 0.5) * 0.015;

        this.mass = Math.max(1, (this.width * this.height) / 1000);
        this.inertia = (1 / 12) * this.mass * (this.width * this.width + this.height * this.height);

        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatFrequency = 0.7 + Math.random() * 0.5;
    }

    update() {
        const currentAngle =
            Math.sin(this.x * 0.0015 + time * 0.4) *
            Math.cos(this.y * 0.0015 + time * 0.3) *
            Math.PI * 2;

        this.vx += Math.cos(currentAngle) * config.currentSpeed;
        this.vy += Math.sin(currentAngle) * config.currentSpeed;

        if (mouse.x > -1000) {
            const mouseWorld = screenToWorld(mouse.x, mouse.y);
            const dx = this.x - mouseWorld.x;
            const dy = this.y - mouseWorld.y;

            const distanceSq = dx * dx + dy * dy;
            const radiusSq = config.mouseRadius * config.mouseRadius;

            if (distanceSq < radiusSq && distanceSq > 0) {
                const distance = Math.sqrt(distanceSq);
                const nx = dx / distance;
                const ny = dy / distance;

                const factor = Math.pow(1 - distance / config.mouseRadius, 2);
                const push = factor * config.mouseForce * 1.2;

                const dragX = mouse.vx * factor * 0.2;
                const dragY = mouse.vy * factor * 0.2;

                this.vx += (nx * push + dragX) / this.mass;
                this.vy += (ny * push + dragY) / this.mass;

                const torque = (dragX * -ny + dragY * nx) * this.width * 0.02;
                this.angularVelocity += torque / this.inertia;
            }
        }

        this.vx *= config.friction;
        this.vy *= config.friction;
        this.angularVelocity *= config.angularFriction;

        const speed = Math.hypot(this.vx, this.vy);

        if (speed < config.minSpeed) {
            if (speed === 0) {
                const a = Math.random() * Math.PI * 2;
                this.vx = Math.cos(a) * config.minSpeed;
                this.vy = Math.sin(a) * config.minSpeed;
            } else {
                const scale = config.minSpeed / speed;
                this.vx *= scale;
                this.vy *= scale;
            }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angularVelocity;
    }

    draw() {
        const screen = worldToScreen(this.x, this.y);

        if (
            screen.x < -config.renderPadding - this.width ||
            screen.x > window.innerWidth + config.renderPadding + this.width ||
            screen.y < -config.renderPadding - this.height ||
            screen.y > window.innerHeight + config.renderPadding + this.height
        ) {
            return;
        }

        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(this.angle);

        const floatY = Math.sin(time * this.floatFrequency + this.floatOffset) * 2;

        ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
        ctx.fillStyle = "rgba(235, 235, 235, 0.94)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(this.text, 0, floatY);
        ctx.restore();
    }
}

export function rebuildSpatialHash() {
    spatialHash.clear();
    for (const word of wordObjects) {
        spatialHash.insert(word);
    }
}

export function getVisibleObjects(padding) {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    return spatialHash.getRect(
        camera.x - halfWidth - padding,
        camera.y - halfHeight - padding,
        camera.x + halfWidth + padding,
        camera.y + halfHeight + padding
    );
}