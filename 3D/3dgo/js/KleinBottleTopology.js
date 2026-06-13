export const KLEIN_BOTTLE_TOPOLOGY = 'klein_bottle';

function modulo(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
}

export function normalizeKlein(x, y, width, height) {
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        throw new RangeError('Klein bottle width and height must be positive integers.');
    }

    const verticalCrossings = Math.floor(y / height);
    const normalizedY = modulo(y, height);
    let normalizedX = modulo(x, width);
    if (modulo(verticalCrossings, 2) === 1) {
        normalizedX = width - 1 - normalizedX;
    }
    return [normalizedX, normalizedY];
}

export function kleinContainsCoord(coord, width, height) {
    return Array.isArray(coord)
        && coord.length === 2
        && Number.isInteger(coord[0])
        && Number.isInteger(coord[1])
        && coord[0] >= 0
        && coord[0] < width
        && coord[1] >= 0
        && coord[1] < height;
}

export function kleinBottleNeighbors(coord, width, height) {
    if (!kleinContainsCoord(coord, width, height)) return [];

    const [x, y] = coord;
    const candidates = [
        normalizeKlein(x + 1, y, width, height),
        normalizeKlein(x - 1, y, width, height),
        normalizeKlein(x, y + 1, width, height),
        normalizeKlein(x, y - 1, width, height)
    ];
    const unique = new Map();
    for (const neighbor of candidates) {
        unique.set(neighbor.join(','), neighbor);
    }
    return [...unique.values()];
}
