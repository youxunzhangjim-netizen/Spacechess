import assert from 'node:assert/strict';
import { AnyonJumpGame } from '../js/localgames/AnyonJump.js';
import { nextRequiredUnbraidGenerator } from '../js/anyon/BraidMemory.js';
import {
    calculateToricCodeMemoryUnbraidAnswer,
    computeToricCodeMemoryUnbraidObservables,
    TORIC_CODE_MEMORY_UNBRAID_ID,
    topologyOptionsForToricCodeMemoryUnbraid
} from '../js/physics/ToricCodeMemoryUnbraidProblem.js';

const topologyOptions = topologyOptionsForToricCodeMemoryUnbraid({
    topology: 'RP2',
    boardSize: 6
});
assert.equal(topologyOptions.topology, 'rp2', 'Physical problem normalizes RP2 topology for graph topology.');
assert.equal(topologyOptions.width, 6);
assert.equal(topologyOptions.height, 6);

const initialized = new AnyonJumpGame({
    physicalProblem: {
        id: TORIC_CODE_MEMORY_UNBRAID_ID,
        topology: 'torus',
        boardSize: 6,
        numPairsE: 1,
        numPairsM: 1
    }
});
const initializedExport = initialized.exportState().physicalProblem;
assert.equal(initializedExport.problemId, TORIC_CODE_MEMORY_UNBRAID_ID);
assert.equal(initializedExport.initialObservables.numE, 2, 'One local e pair creates two e anyons.');
assert.equal(initializedExport.initialObservables.numM, 2, 'One local m pair creates two m anyons.');
assert.equal(initializedExport.initialObservables.totalFusionCharge, '1', 'Initial local pairs have total vacuum charge.');
assert.equal(initializedExport.config.boardSize, 6);
assert.ok(initializedExport.physicalQuestion.length >= 3);

const game = new AnyonJumpGame({
    topology: { topology: 'torus', width: 4, height: 4 },
    config: { braidMemoryMode: 'word_exact', braidEffect: 'add_braid_token' },
    physicalProblem: {
        id: TORIC_CODE_MEMORY_UNBRAID_ID,
        createPairsLocally: false
    }
});
game.tokens.clear();
game.worldlines.clear();
game.addToken({ id: 'b1', owner: 'black', coord: [0, 0], anyonType: 'e' });
game.addToken({ id: 'w1', owner: 'white', coord: [1, 0], anyonType: 'm' });
game.currentPlayer = 'black';
game.physicalProblem.start(game);

const jump = game.move('b1', [2, 0]);
assert.equal(jump.ok, true, 'Jump over m anyon succeeds.');
let exportAfterBraid = game.exportState().physicalProblem;
assert.equal(exportAfterBraid.finalObservables.braidParityTotal, 0, 'Word-exact mode stores braid word rather than parity.');
assert.equal(exportAfterBraid.finalObservables.maxBraidWordLength, 1);
assert.equal(exportAfterBraid.finalObservables.numberOfBraidedTokens, 1);
assert.equal(exportAfterBraid.finalObservables.topologicalMemoryAlive, true);
assert.equal(exportAfterBraid.eventCounts.braidEvents, 1);

const nextInverse = nextRequiredUnbraidGenerator(game.tokens.get('b1').braidWord);
game.currentPlayer = 'black';
const unbraid = game.attemptUnbraid('b1', 'w1', {
    player: 'black',
    sign: nextInverse.sign,
    index: nextInverse.index
});
assert.equal(unbraid.ok, true, 'Exact inverse unbraid action succeeds.');
const finalExport = game.exportState().physicalProblem;
assert.equal(finalExport.finalObservables.maxBraidWordLength, 0, 'Successful unbraid clears braid word.');
assert.equal(finalExport.finalObservables.topologicalMemoryAlive, false, 'No braid memory or logical sector remains.');
assert.equal(finalExport.eventCounts.successfulUnbraids, 1);
assert.equal(finalExport.eventCounts.failedUnbraids, 0);
assert.equal(finalExport.answer.exactUnbraidSuccessRate, 1);
assert.equal(finalExport.answer.finalAnswerLabel, 'memory_lost');
assert.match(finalExport.answer.summary, /toric-code memory/);
assert.ok(finalExport.fullHistory.length >= 3, 'Problem records initial, braid, and unbraid observations.');

const observables = computeToricCodeMemoryUnbraidObservables(game);
assert.equal(observables.totalFusionCharge, 'psi', 'Remaining e and m fuse to psi total charge.');
assert.equal(observables.returnedToVacuum, false);

const answer = calculateToricCodeMemoryUnbraidAnswer({
    initialObservables: finalExport.initialObservables,
    finalObservables: finalExport.finalObservables,
    history: finalExport.fullHistory,
    eventCounts: finalExport.eventCounts
});
assert.equal(answer.logicalErrorOccurred, false);
assert.equal(answer.finalTotalCharge, 'psi');

console.log('Physical problem verification passed.');
