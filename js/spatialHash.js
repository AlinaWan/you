import { config } from "./config.js";

export class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    cell(value) {
        return Math.floor(value / this.cellSize);
    }

    key(x, y) {
        return `${x},${y}`;
    }

    clear() {
        this.cells.clear();
    }

    insert(object) {
        const minX = this.cell(object.x - object.boundingRadius);
        const maxX = this.cell(object.x + object.boundingRadius);
        const minY = this.cell(object.y - object.boundingRadius);
        const maxY = this.cell(object.y + object.boundingRadius);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = this.key(x, y);
                let cell = this.cells.get(key);

                if (!cell) {
                    cell = [];
                    this.cells.set(key, cell);
                }

                cell.push(object);
            }
        }
    }

    getNearby(x, y, radius = 1) {
        const cx = this.cell(x);
        const cy = this.cell(y);
        const found = new Set();

        for (let gx = cx - radius; gx <= cx + radius; gx++) {
            for (let gy = cy - radius; gy <= cy + radius; gy++) {
                const cell = this.cells.get(this.key(gx, gy));
                if (!cell) continue;

                for (const object of cell) {
                    found.add(object);
                }
            }
        }

        return found;
    }

    getRect(minX, minY, maxX, maxY) {
        const startX = this.cell(minX);
        const endX = this.cell(maxX);
        const startY = this.cell(minY);
        const endY = this.cell(maxY);
        const found = new Set();

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const cell = this.cells.get(this.key(x, y));
                if (!cell) continue;

                for (const object of cell) {
                    found.add(object);
                }
            }
        }

        return found;
    }
}

export const spatialHash = new SpatialHash(config.gridSize);