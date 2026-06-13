import assert from 'node:assert/strict';
import {
    appendBraidGenerator,
    attachBraidMemory,
    braidGeneratorIndex,
    generatorsAreInverse,
    inverseGenerator,
    simplifyBraidWord
} from '../js/anyon/BraidMemory.js';
import { createToricAnyonLoopsGame } from '../js/anyon/AnyonEngine.js';
import { AnyonJumpGame } from '../js/localgames/AnyonJump.js';

const generator = { generator: 'sigma', index: 2, sign: 1, targetId: 'm1', tick: 7 };
const inverse = inverseGenerator(generator);
assert.deepEqual(inverse, { ...generator, sign: -1 });
assert.equal(generatorsAreInverse(generator, inverse), true);
assert.equal(generatorsAreInverse(generator, { ...inverse, targetId: 'other' }), false);
assert.deepEqual(simplifyBraidWord([generator, inverse]), []);
assert.deepEqual(simplifyBraidWord([inverse, generator]), []);
assert.deepEqual(simplifyBraidWord([
    generator,
    { generator: 'sigma', index: 3, sign: 1, targetId: 'm1', tick: 8 },
    inverse
]).map((entry) => entry.index), [2, 3, 2], 'Non-adjacent inverse pairs do not cancel.');

const token = attachBraidMemory({ id: 'e1', owner: 'black', anyonType: 'e', vertex: [0, 0] });
assert.equal(token.isBraided, false);
appendBraidGenerator(token, generator);
assert.equal(token.isBraided, true);
assert.equal(token.braidWord.length, 1);
assert.deepEqual(token.braidedWith, ['m1']);
appendBraidGenerator(token, inverse);
assert.equal(token.isBraided, false);
assert.equal(token.braidWord.length, 0);
assert.equal(token.braidHistory.length, 2, 'History preserves both events after word cancellation.');

const parityToken = attachBraidMemory({ id: 'p1', owner: 'black', anyonType: 'e', vertex: [0, 0] });
appendBraidGenerator(parityToken, generator, { braidMemoryMode: 'abelian_parity' });
appendBraidGenerator(parityToken, inverse, { braidMemoryMode: 'abelian_parity' });
assert.equal(parityToken.braidWord.length, 0, 'Abelian parity mode toggles matching generators.');

assert.equal(braidGeneratorIndex(['c', 'a', 'b'], 'c', 'b'), 1);

const jump = new AnyonJumpGame({ topology: { topology: 'torus', width: 4, height: 4 } });
jump.tokens.clear();
jump.worldlines.clear();
jump.addToken({ id: 'b1', owner: 'black', coord: [0, 0], anyonType: 'e' });
jump.addToken({ id: 'w1', owner: 'white', coord: [1, 0], anyonType: 'm' });
const jumpResult = jump.move('b1', [2, 0]);
assert.equal(jumpResult.ok, true);
assert.equal(jump.tokens.get('b1').braidWord.length, 1);
assert.equal(jump.tokens.get('b1').braidedWith[0], 'w1');
assert.equal(jump.exportState().tokens.find((entry) => entry.id === 'b1').isBraided, true);

const loopGame = createToricAnyonLoopsGame({ width: 4, height: 4 });
loopGame.addToken({ id: 'e1', owner: 'black', vertex: [3, 0], anyonType: 'e' });
loopGame.addToken({ id: 'm1', owner: 'white', vertex: [1, 0], anyonType: 'm' });
const loopMove = loopGame.moveToken('e1', [0, 0], { player: 'black' });
assert.equal(loopMove.ok, true);
assert.equal(loopGame.tokens.get('e1').braidWord.length, 1);
assert.equal(loopGame.tokens.get('e1').braidWord[0].targetId, 'm1');
assert.equal(loopGame.exportState().tokens.find((entry) => entry.id === 'e1').isBraided, true);

console.log('Braid memory verification passed.');
