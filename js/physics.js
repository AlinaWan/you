import { config } from "./config.js";
import { camera } from "./camera.js";
import { spatialHash } from "./spatialHash.js";
import { wordObjects } from "./word.js";
import { playCollision } from "./audio.js";

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
            a.halfWidth * Math.abs(
                axis.x * Math.cos(a.angle) +
                axis.y * Math.sin(a.angle)
            ) +
            a.halfHeight * Math.abs(
                axis.x * -Math.sin(a.angle) +
                axis.y * Math.cos(a.angle)
            );

        const projectionB =
            b.halfWidth * Math.abs(
                axis.x * Math.cos(b.angle) +
                axis.y * Math.sin(b.angle)
            ) +
            b.halfHeight * Math.abs(
                axis.x * -Math.sin(b.angle) +
                axis.y * Math.cos(b.angle)
            );

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

    /*
     * Approximate the contact point as the midpoint between the
     * nearest points on the two rectangles along the collision normal.
     */
    const contactA = getSupportPoint(a, collisionNormal);
    const contactB = getSupportPoint(b, {
        x: -collisionNormal.x,
        y: -collisionNormal.y
    });

    return {
        depth: minimumOverlap,
        nx: collisionNormal.x,
        ny: collisionNormal.y,
        contactX: (contactA.x + contactB.x) * 0.5,
        contactY: (contactA.y + contactB.y) * 0.5
    };
}

function getSupportPoint(object, direction) {
    const cos = Math.cos(object.angle);
    const sin = Math.sin(object.angle);

    const localX =
        direction.x * cos +
            direction.y * sin >= 0
            ? object.halfWidth
            : -object.halfWidth;

    const localY =
        -direction.x * sin +
            direction.y * cos >= 0
            ? object.halfHeight
            : -object.halfHeight;

    return {
        x: object.x + localX * cos - localY * sin,
        y: object.y + localX * sin + localY * cos
    };
}

const activeCollisions = new Set();

export function handleCollisions() {
    const objects = getVisibleObjects(config.simulationPadding);
    const processed = new Set();
    const currentCollisions = new Set();

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

            if (!collision) {
                continue;
            }

            currentCollisions.add(pairKey);

            if (!activeCollisions.has(pairKey)) {
                playCollision();
            }

            const { depth, nx, ny } = collision;
            const totalMass = a.mass + b.mass;

            a.x -= nx * depth * (b.mass / totalMass);
            a.y -= ny * depth * (b.mass / totalMass);
            b.x += nx * depth * (a.mass / totalMass);
            b.y += ny * depth * (a.mass / totalMass);

            const {
                contactX,
                contactY
            } = collision;

            // Vector from each center of mass to the contact point.
            const rax = contactX - a.x;
            const ray = contactY - a.y;

            const rbx = contactX - b.x;
            const rby = contactY - b.y;

            // Velocity at the contact point, including rotational velocity.
            //
            // In 2D:
            // angular velocity × radius = (-ω * ry, ω * rx)
            const avx = a.vx - a.angularVelocity * ray;
            const avy = a.vy + a.angularVelocity * rax;

            const bvx = b.vx - b.angularVelocity * rby;
            const bvy = b.vy + b.angularVelocity * rbx;

            const rvx = bvx - avx;
            const rvy = bvy - avy;

            const velocityAlongNormal = rvx * nx + rvy * ny;

            if (velocityAlongNormal < 0) {
                const raCrossN = rax * ny - ray * nx;
                const rbCrossN = rbx * ny - rby * nx;

                const inverseMassSum =
                    1 / a.mass +
                    1 / b.mass +
                    (raCrossN * raCrossN) / a.inertia +
                    (rbCrossN * rbCrossN) / b.inertia;

                const impulse =
                    -(1 + config.collisionRestitution) *
                    velocityAlongNormal /
                    inverseMassSum;

                const impulseX = impulse * nx;
                const impulseY = impulse * ny;

                // Linear response.
                a.vx -= impulseX / a.mass;
                a.vy -= impulseY / a.mass;

                b.vx += impulseX / b.mass;
                b.vy += impulseY / b.mass;

                // Angular response.
                a.angularVelocity -=
                    (rax * impulseY - ray * impulseX) / a.inertia;

                b.angularVelocity +=
                    (rbx * impulseY - rby * impulseX) / b.inertia;
            }
        }

        activeCollisions.clear();

        for (const pairKey of currentCollisions) {
            activeCollisions.add(pairKey);
        }
    }
}