import assert from 'node:assert/strict';
import { COLORS, GoGameLogic } from '../js/GoGame.js';
import {
    KLEIN_BOTTLE_TOPOLOGY,
    kleinBottleNeighbors,
    normalizeKlein
} from '../js/KleinBottleTopology.js';

const key = (coord) => coord.join(',');
const WIDTH = 9;
const HEIGHT = 19;

assert.deepEqual(normalizeKlein(9, 0, WIDTH, HEIGHT), [0, 0], 'x should wrap normally');
assert.deepEqual(normalizeKlein(-1, 0, WIDTH, HEIGHT), [8, 0], 'negative x should wrap normally');
assert.deepEqual(normalizeKlein(2, 19, WIDTH, HEIGHT), [6, 0], 'crossing the top should flip x');
assert.deepEqual(normalizeKlein(2, -1, WIDTH, HEIGHT), [6, 18], 'crossing the bottom should flip x');
assert.deepEqual(normalizeKlein(2, 38, WIDTH, HEIGHT), [2, 0], 'two positive seam crossings should cancel the flip');
assert.deepEqual(normalizeKlein(2, -38, WIDTH, HEIGHT), [2, 0], 'two negative seam crossings should cancel the flip');
assert.deepEqual(normalizeKlein(20, 57, WIDTH, HEIGHT), [6, 0], 'large x and y offsets should normalize together');

for (const width of [9, 13, 19]) {
    const game = new GoGameLogic({
        topology: KLEIN_BOTTLE_TOPOLOGY,
        dimension: 2,
        size: width,
        width,
        height: HEIGHT
    });
    assert.equal(game.total, width * HEIGHT, `${width} x ${HEIGHT} Klein board should use every graph vertex`);
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < width; x++) {
            const neighbors = kleinBottleNeighbors([x, y], width, HEIGHT);
            assert.equal(neighbors.length, 4, `normal Klein vertex (${x},${y}) should have degree 4`);
            assert.equal(new Set(neighbors.map(key)).size, neighbors.length, 'neighbors should be deduplicated');
        }
    }
}

assert.deepEqual(
    new Set(kleinBottleNeighbors([2, 18], WIDTH, HEIGHT).map(key)),
    new Set(['1,18', '3,18', '2,17', '6,0']),
    'top seam should enter the mirrored bottom coordinate'
);
assert.deepEqual(
    new Set(kleinBottleNeighbors([2, 0], WIDTH, HEIGHT).map(key)),
    new Set(['1,0', '3,0', '2,1', '6,18']),
    'bottom seam should enter the mirrored top coordinate'
);

const capture = new GoGameLogic({
    topology: KLEIN_BOTTLE_TOPOLOGY,
    dimension: 2,
    size: WIDTH,
    width: WIDTH,
    height: HEIGHT
});
capture.board[capture.indexFromCoord([2, 18])] = COLORS.white;
for (const coord of [[1, 18], [3, 18], [2, 17]]) {
    capture.board[capture.indexFromCoord(coord)] = COLORS.black;
}
capture.currentPlayer = 'black';
const captureResult = capture.tryPlay([6, 0], 'black');
assert.equal(captureResult.ok, true, 'a capture through the flipped seam should be legal');
assert.equal(captureResult.captured, 1, 'the seam-connected stone should be captured');

const suicide = new GoGameLogic({
    topology: KLEIN_BOTTLE_TOPOLOGY,
    dimension: 2,
    size: WIDTH,
    width: WIDTH,
    height: HEIGHT
});
for (const coord of [[1, 18], [3, 18], [2, 17], [6, 0]]) {
    suicide.board[suicide.indexFromCoord(coord)] = COLORS.black;
}
suicide.currentPlayer = 'white';
assert.equal(suicide.tryPlay([2, 18], 'white').ok, false, 'Klein graph should reject suicide across the seam');

const territory = new GoGameLogic({
    topology: KLEIN_BOTTLE_TOPOLOGY,
    dimension: 2,
    size: WIDTH,
    width: WIDTH,
    height: HEIGHT,
    komi: 0
});
territory.board.fill(COLORS.black);
territory.board[territory.indexFromCoord([2, 18])] = COLORS.empty;
assert.equal(territory.computeAreaScore().black, WIDTH * HEIGHT, 'territory should use graph regions without edge bonuses');

const exported = capture.exportState();
const imported = new GoGameLogic();
imported.importState(exported);
assert.equal(imported.topology, KLEIN_BOTTLE_TOPOLOGY, 'network state should preserve Klein topology');
assert.equal(imported.width, WIDTH, 'network state should preserve Klein width');
assert.equal(imported.height, HEIGHT, 'network state should preserve Klein height');

console.log('Klein bottle Go topology verification passed.');
