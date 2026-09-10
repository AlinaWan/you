import { config } from "./config.js";
import { camera } from "./camera.js";
import { spatialHash } from "./spatialHash.js";
import { wordObjects } from "./word.js";

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

export function checkCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const radius = a.boundingRadius + b.boundingRadius;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq > radius * radius) {
        return null;
    }

    const distance = Math.sqrt(distanceSq) || 0.001;

    return {
        depth: radius - distance,
        nx: dx / distance,
        ny: dy / distance
    };
}

export function handleCollisions() {
    const objects = getVisibleObjects(config.simulationPadding);
    const processed = new Set();

    for (const a of objects) {
        const nearby = spatialHash.getNearby(a.x, a.y, 1);

        for (const b of nearby) {
            if (a === b) continue;

            const pairKey = a.index < b.index
                ? `${a.index}:${b.index}`
                : `${b.index}:${a.index}`;

            if (processed.has(pairKey)) continue;
            processed.add(pairKey);

            const collision = checkCollision(a, b);
            if (!collision) continue;

            const { depth, nx, ny } = collision;
            const totalMass = a.mass + b.mass;

            a.x -= nx * depth * (b.mass / totalMass);
            a.y -= ny * depth * (b.mass / totalMass);
            b.x += nx * depth * (a.mass / totalMass);
            b.y += ny * depth * (a.mass / totalMass);

            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const velocityAlongNormal = rvx * nx + rvy * ny;

            if (velocityAlongNormal < 0) {
                const impulse =
                    -(1 + config.collisionRestitution) *
                    velocityAlongNormal /
                    (1 / a.mass + 1 / b.mass);

                a.vx -= (impulse / a.mass) * nx;
                a.vy -= (impulse / a.mass) * ny;
                b.vx += (impulse / b.mass) * nx;
                b.vy += (impulse / b.mass) * ny;
            }
        }
    }
}