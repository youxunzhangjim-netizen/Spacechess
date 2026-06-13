import assert from 'node:assert/strict';
import { COLORS, GoGameLogic, normalizeTopology } from '../js/GoGame.js';

const coordKey = (coord) => coord.join(',');
const neighborKeys = (game, coord) => new Set(game.neighborsFromCoord(coord).map(coordKey));

assert.equal(normalizeTopology('pbc'), 'pbc');
assert.equal(normalizeTopology('pbc-x'), 'pbc');
assert.equal(normalizeTopology('pbcx'), 'pbc');
assert.equal(normalizeTopology('t2'), 'pbc');

const periodic = new GoGameLogic({ size: 9, dimension: 2, topology: 'pbc' });
assert.deepEqual(
    [...neighborKeys(periodic, [0, 0])].sort(),
    ['0,1', '0,8', '1,0', '8,0'],
    'PBC corner should wrap across both x and y seams'
);

for (let y = 0; y < periodic.size; y++) {
    for (let x = 0; x < periodic.size; x++) {
        assert.equal(periodic.neighborsFromCoord([x, y]).length, 4, `PBC degree should be 4 at (${x},${y})`);
    }
}

const seamGroupBoard = new Uint8Array(periodic.total);
for (const coord of [[0, 0], [8, 0], [0, 8]]) {
    seamGroupBoard[periodic.indexFromCoord(coord)] = COLORS.black;
}
const seamGroup = periodic.getGroupAndLiberties(seamGroupBoard, periodic.indexFromCoord([0, 0]));
assert.equal(seamGroup.group.size, 3, 'same-color stones should connect through both PBC seams');

const open = new GoGameLogic({ size: 9, dimension: 2, topology: 'open2d' });
assert.equal(open.neighborsFromCoord([0, 0]).length, 2, 'OBC corner should keep ordinary open edges');

const honeycomb = new GoGameLogic({ size: 9, dimension: 2, topology: 'pbc', lattice: 'honeycomb' });
assert.equal(honeycomb.neighborsFromCoord([4, 4]).length, 3, 'Honeycomb Go vertices should have three graph neighbors');
assert.deepEqual(
    [...neighborKeys(honeycomb, [4, 4])].sort(),
    ['3,4', '4,5', '5,4'],
    'Even honeycomb columns should connect to the next row'
);

const imported = new GoGameLogic();
imported.importState({ ...periodic.exportState(), topology: 'pbc-x' });
assert.equal(imported.topology, 'pbc', 'legacy pbc-x states should normalize to full PBC');

console.log('2D Go full PBC verification passed.');
