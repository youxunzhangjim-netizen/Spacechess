import assert from 'node:assert/strict';
import {
    anticommute,
    commute,
    defaultSeamTransport,
    edgeTransport,
    pauliToPair,
    pairToPauli,
    symplecticProduct,
    transformPauliLabel,
    transportLabelAcrossEdges
} from '../js/algebra/PauliAlgebra.js';
import { KleinBottleChessGame } from '../3D/3dchess/js/KleinBottleChessGame.js';
import { GoGameLogic as Go3DLogic } from '../3D/3dgo/js/GoGame.js';
import { GoGameLogic as Go2DLogic } from '../2D/2dgo/js/GoGame.js';

assert.deepEqual(pauliToPair('I'), { x: 0, z: 0 });
assert.deepEqual(pauliToPair('X'), { x: 1, z: 0 });
assert.deepEqual(pauliToPair('Z'), { x: 0, z: 1 });
assert.deepEqual(pauliToPair('Y'), { x: 1, z: 1 });
assert.equal(pairToPauli({ x: 1, z: 1 }), 'Y');

assert.equal(symplecticProduct('X', 'Z'), 1);
assert.equal(symplecticProduct('X', 'Y'), 1);
assert.equal(symplecticProduct('Z', 'Y'), 1);
assert.equal(symplecticProduct('X', 'X'), 0);
assert.equal(anticommute('X', 'Z'), true);
assert.equal(commute('Y', 'Y'), true);

assert.equal(transformPauliLabel('X', 'H'), 'Z');
assert.equal(transformPauliLabel('Z', 'H'), 'X');
assert.equal(transformPauliLabel('Y', 'H'), 'Y');
assert.equal(transformPauliLabel('X', 'S'), 'Y');
assert.equal(transformPauliLabel('Y', 'S'), 'X');
assert.equal(transformPauliLabel('Z', 'S'), 'Z');
assert.equal(transportLabelAcrossEdges('X', [{ transport: 'H' }, { transport: 'S' }]), 'Z');
assert.equal(defaultSeamTransport({ topology: 'klein_bottle', side: 'top' }), 'H');
assert.equal(edgeTransport({ topology: 't2', side: 'left' }), 'identity');

const chess = Object.create(KleinBottleChessGame.prototype);
chess.cliffordChessEnabled = true;
chess.board = chess.createEmptyBoard();
chess.currentPlayer = 'white';
chess.gameMode = 'local';
chess.renderer = { renderPieces3D() {} };
chess.network = { persistState() {} };
chess.updateUI = () => {};
const attacker = { color: 'white', type: 'R', hasMoved: false, pauli: 'X' };
const defender = { color: 'black', type: 'N', hasMoved: false, pauli: 'Z' };
chess.setPiece(0, 5, 0, attacker);
chess.setPiece(11, 5, 0, defender);
assert.equal(chess.getLineMoves(0, 5, 0, [[-1, 0]], false).some((move) => move.x === 11 && move.y === 5), true);
defender.pauli = 'X';
assert.equal(chess.getLineMoves(0, 5, 0, [[-1, 0]], false).some((move) => move.x === 11 && move.y === 5), false);

attacker.pauli = 'X';
chess.applyMoveCliffordTransport(attacker, { boundaryCrossings: [{ transport: 'H' }] });
assert.equal(attacker.pauli, 'Z');
chess.currentPlayer = 'white';
assert.deepEqual(chess.applyCliffordAction(0, 5, 0, 'S', 'white'), { ok: true, pauli: 'Z' });

const go3 = new Go3DLogic({ topology: 'open2d', size: 3 });
assert.equal(go3.tryPlay([1, 1], 'black', { pauli: 'X' }).ok, true);
assert.equal(go3.tryPlay([1, 2], 'white', { pauli: 'Z' }).ok, true);
assert.equal(go3.algebraicPressureAt([1, 1]), 1);
go3.setPauliAt([1, 2], 'X');
assert.equal(go3.algebraicPressureAt([1, 1]), 0);

const go2 = new Go2DLogic({ topology: 'open2d', size: 3 });
assert.equal(go2.tryPlay([0, 0], 'black', { pauli: 'Y' }).ok, true);
assert.equal(go2.getPauliAt([0, 0]), 'Y');

console.log('Pauli/Clifford algebra verification passed.');
