import assert from 'node:assert/strict';
import { COLORS, GoGameLogic } from '../js/GoGame.js';
import {
    SPHERE_GO_TOPOLOGY,
    sphereLatitudeRingNeighbors,
    sphereVertexPosition
} from '../js/SphereGoTopology.js';

const key = (coord) => coord.join(',');
const neighbors = (coord, width = 19, height = 19) =>
    new Set(sphereLatitudeRingNeighbors(coord, width, height).map(key));

const sphere = new GoGameLogic({
    topology: SPHERE_GO_TOPOLOGY,
    dimension: 2,
    size: 19,
    width: 19,
    height: 19
});

assert.equal(sphere.total, 361, '19 x 19 sphere should have 361 playable vertices');
assert.equal(sphere.board.length, 361, 'sphere board storage should match its graph vertices');
assert.deepEqual(
    [...neighbors([0, 0])].sort(),
    ['0,1', '1,0', '18,0'],
    'south-most latitude ring should have degree 3 with horizontal wrap'
);
assert.deepEqual(
    [...neighbors([0, 18])].sort(),
    ['0,17', '1,18', '18,18'],
    'north-most latitude ring should have degree 3 with horizontal wrap'
);
assert.equal(neighbors([7, 9]).size, 4, 'middle latitude vertices should have degree 4');
assert.equal(
    [...neighbors([0, 0])].some((coord) => coord.endsWith(',18')),
    false,
    'there must be no special through-pole edge'
);

const configurable = new GoGameLogic({
    topology: SPHERE_GO_TOPOLOGY,
    dimension: 2,
    size: 9,
    width: 9,
    height: 13
});
assert.equal(configurable.total, 117, 'sphere width and height should be independently configurable');
assert.deepEqual(configurable.coordFromIndex(116), [8, 12], 'rectangular sphere index conversion should use width');

const capture = new GoGameLogic({
    topology: SPHERE_GO_TOPOLOGY,
    dimension: 2,
    size: 19,
    width: 19,
    height: 19
});
capture.board[capture.indexFromCoord([0, 0])] = COLORS.white;
capture.board[capture.indexFromCoord([18, 0])] = COLORS.black;
capture.board[capture.indexFromCoord([1, 0])] = COLORS.black;
capture.currentPlayer = 'black';
const captureResult = capture.tryPlay([0, 1], 'black');
assert.equal(captureResult.ok, true, 'graph capture move should be legal');
assert.equal(captureResult.captured, 1, 'top-ring stone should be captured using its three graph liberties');
assert.equal(capture.board[capture.indexFromCoord([0, 0])], COLORS.empty, 'captured stone should be removed');

const suicide = new GoGameLogic({
    topology: SPHERE_GO_TOPOLOGY,
    dimension: 2,
    size: 19,
    width: 19,
    height: 19
});
for (const coord of [[18, 0], [1, 0], [0, 1]]) {
    suicide.board[suicide.indexFromCoord(coord)] = COLORS.black;
}
suicide.currentPlayer = 'white';
assert.equal(suicide.tryPlay([0, 0], 'white').ok, false, 'sphere graph should reject suicide');

const territory = new GoGameLogic({
    topology: SPHERE_GO_TOPOLOGY,
    dimension: 2,
    size: 9,
    width: 9,
    height: 9,
    komi: 0
});
territory.board.fill(COLORS.black);
territory.board[territory.indexFromCoord([0, 0])] = COLORS.empty;
const score = territory.computeAreaScore();
assert.equal(score.black, 81, 'graph territory should count enclosed empty components without boundary bonuses');

const south = sphereVertexPosition([0, 0], 19, 19);
const north = sphereVertexPosition([0, 18], 19, 19);
assert.ok(south.y > 0 && south.y < 3.45, 'first latitude ring should be near but not at a pole');
assert.ok(north.y < 0 && north.y > -3.45, 'last latitude ring should be near but not at a pole');

console.log('S2 latitude-ring Go topology verification passed.');
