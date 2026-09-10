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

    const axes = [
        {
            x: Math.cos(a.angle),
            y: Math.sin(a.angle)
        },
        {
            x: -Math.sin(a.angle),
            y: Math.cos(a.angle)
        },
        {
            x: Math.cos(b.angle),
            y: Math.sin(b.angle)
        },
        {
            x: -Math.sin(b.angle),
            y: Math.cos(b.angle)
        }
    ];

    let minimumOverlap = Infinity;
    let collisionNormal = null;

    for (const axis of axes) {
        const projectionA =
            a.halfWidth * Math.abs(axis.x * Math.cos(a.angle) + axis.y * Math.sin(a.angle)) +
            a.halfHeight * Math.abs(axis.x * -Math.sin(a.angle) + axis.y * Math.cos(a.angle));

        const projectionB =
            b.halfWidth * Math.abs(axis.x * Math.cos(b.angle) + axis.y * Math.sin(b.angle)) +
            b.halfHeight * Math.abs(axis.x * -Math.sin(b.angle) + axis.y * Math.cos(b.angle));

        const distance = Math.abs(dx * axis.x + dy * axis.y);
        const overlap = projectionA + projectionB - distance;

        if (overlap <= 0) {
            return null;
        }

        if (overlap < minimumOverlap) {
            minimumOverlap = overlap;

            const direction = dx * axis.x + dy * axis.y;

            collisionNormal = direction >= 0
                ? axis
                : { x: -axis.x, y: -axis.y };
        }
    }

    return {
        depth: minimumOverlap,
        nx: collisionNormal.x,
        ny: collisionNormal.y
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