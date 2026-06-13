import assert from 'node:assert/strict';
import {
    anyonTypes,
    applyAnyonAutomorphism,
    canFuseToVacuum,
    createFusionResult,
    fusionOutputs,
    mutualBraidPhase,
    previewAnyonCapture
} from '../js/anyon/AnyonAlgebra.js';
import {
    applySeamTransforms,
    createRectTorusTopology,
    isClosedLoop,
    noncontractibleCycleCrossed,
    windingNumbers
} from '../js/anyon/AnyonTopology.js';
import { AnyonGameEngine, createToricAnyonLoopsGame } from '../js/anyon/AnyonEngine.js';

assert.deepEqual(anyonTypes('toric_code'), ['1', 'e', 'm', 'psi']);
assert.deepEqual(fusionOutputs('e', 'e'), ['1']);
assert.deepEqual(fusionOutputs('m', 'e'), ['psi']);
assert.deepEqual(fusionOutputs('psi', 'm'), ['e']);
assert.equal(canFuseToVacuum('psi', 'psi'), true);
assert.equal(canFuseToVacuum('e', 'm'), false);
assert.equal(createFusionResult('sigma', 'sigma', { anyonModel: 'ising' }).fusionChannel.possibleOutputs.length, 2);
assert.deepEqual(fusionOutputs('tau', 'tau', 'fibonacci'), ['1', 'tau']);

assert.equal(mutualBraidPhase('e', 'm'), -1);
assert.equal(mutualBraidPhase('m', 'e'), -1);
assert.equal(mutualBraidPhase('e', 'e'), 1);
assert.equal(applyAnyonAutomorphism('e', 'twist'), 'm');
assert.equal(applyAnyonAutomorphism('psi', 'twist'), 'psi');
assert.deepEqual(previewAnyonCapture('e', 'e'), {
    legalCapture: true,
    fusion: createFusionResult('e', 'e'),
    captureMode: 'capture'
});

const torus = createRectTorusTopology({ width: 4, height: 4 });
const loop = [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]];
assert.equal(noncontractibleCycleCrossed(loop, torus), true);
assert.deepEqual(windingNumbers(loop, torus), { x: 1, y: 0 });
assert.equal(isClosedLoop([[1, 1], [2, 1], [2, 2], [1, 1]]), true);

const twisted = createRectTorusTopology({ width: 4, height: 4, twistSeams: true });
assert.equal(applySeamTransforms('e', [[3, 1], [4, 1]], twisted, 'toric_code'), 'm');

const game = createToricAnyonLoopsGame({ width: 4, height: 4 });
game.addToken({ id: 'e1', owner: 'black', vertex: [0, 0], anyonType: 'e' });
game.addToken({ id: 'm1', owner: 'white', vertex: [2, 0], anyonType: 'm' });
let move = game.moveToken('e1', [1, 0], { player: 'black' });
assert.equal(move.ok, true);
assert.deepEqual(game.worldlines.get('e1'), [[0, 0], [1, 0]]);
assert.equal(game.moveToken('e1', [3, 3], { player: 'white' }).ok, false, 'must move by one graph edge');

const fuseGame = new AnyonGameEngine({ topology: createRectTorusTopology({ width: 3, height: 3 }) });
fuseGame.addToken({ id: 'a', owner: 'black', vertex: [0, 0], anyonType: 'e' });
fuseGame.addToken({ id: 'b', owner: 'white', vertex: [1, 0], anyonType: 'e' });
move = fuseGame.moveToken('a', [1, 0], { player: 'black' });
assert.equal(move.ok, true);
assert.equal(move.event.fusion.vacuum, true);
assert.equal(fuseGame.tokens.has('a'), false);
assert.equal(fuseGame.tokens.has('b'), false);

const channelGame = new AnyonGameEngine({ config: { anyonModel: 'ising' }, topology: createRectTorusTopology({ width: 3, height: 3 }) });
channelGame.addToken({ id: 's1', owner: 'black', vertex: [0, 0], anyonType: 'sigma' });
channelGame.addToken({ id: 's2', owner: 'white', vertex: [1, 0], anyonType: 'sigma' });
move = channelGame.moveToken('s1', [1, 0], { player: 'black' });
assert.equal(move.event.fusion.pending, true);
assert.equal(channelGame.fusionChannels.length, 1);

console.log('Anyon braiding/fusion engine verification passed.');
