import { createFusionResult, normalizeAnyonType } from '../anyon/AnyonAlgebra.js';

export const TORIC_CODE_MEMORY_UNBRAID_ID = 'toric_code_memory_unbraid';

export const TORIC_CODE_MEMORY_UNBRAID_COMPATIBLE_MODES = Object.freeze([
    'anyon_jump',
    'braided_jump',
    'braided_capture',
    'toric_anyon_loops'
]);

const TORIC_TYPES = Object.freeze(['1', 'e', 'm', 'psi']);
const DEFAULT_CONFIG = Object.freeze({
    id: TORIC_CODE_MEMORY_UNBRAID_ID,
    topology: 'torus',
    boardSize: 8,
    numPairsE: 2,
    numPairsM: 2,
    createPairsLocally: true,
    enableTwistSeam: true
});

function integer(value, fallback, min = 0, max = 64) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function mod2(value) {
    return Math.abs(Number(value) || 0) % 2;
}

function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
    }
    return value;
}

function normalizeProblemTopology(topology = DEFAULT_CONFIG.topology) {
    const value = String(topology || DEFAULT_CONFIG.topology).toLowerCase();
    if (value === 'rp2' || value === 'rp' || value === 'real_projective_plane') return 'rp2';
    if (value === 'klein' || value === 'klein_bottle' || value === 'klein-bottle') return 'klein_bottle';
    if (value === 'sphere' || value === 's2' || value === 'sphere_latitude' || value === 'sphere_latitude_ring') {
        return 'sphere_latitude';
    }
    return 'torus';
}

export function normalizeToricCodeMemoryUnbraidConfig(config = {}) {
    return {
        ...DEFAULT_CONFIG,
        ...config,
        id: TORIC_CODE_MEMORY_UNBRAID_ID,
        topology: normalizeProblemTopology(config.topology),
        boardSize: integer(config.boardSize ?? config.size, DEFAULT_CONFIG.boardSize, 2, 32),
        numPairsE: integer(config.numPairsE, DEFAULT_CONFIG.numPairsE, 0, 32),
        numPairsM: integer(config.numPairsM, DEFAULT_CONFIG.numPairsM, 0, 32),
        createPairsLocally: config.createPairsLocally ?? DEFAULT_CONFIG.createPairsLocally,
        enableTwistSeam: config.enableTwistSeam ?? DEFAULT_CONFIG.enableTwistSeam
    };
}

export function topologyOptionsForToricCodeMemoryUnbraid(config = {}) {
    const normalized = normalizeToricCodeMemoryUnbraidConfig(config);
    return {
        topology: normalized.topology,
        width: normalized.boardSize,
        height: normalized.boardSize
    };
}

export function isToricCodeMemoryUnbraidCompatibleMode(mode) {
    return TORIC_CODE_MEMORY_UNBRAID_COMPATIBLE_MODES.includes(String(mode || ''));
}

function keyOf(coord) {
    return coord.join(',');
}

function tokenWordLength(token) {
    return Array.isArray(token?.braidWord) ? token.braidWord.length : 0;
}

function tokenIsBraided(token) {
    return tokenWordLength(token) > 0
        || Number(token?.braidParity || 0) === 1
        || Boolean(token?.isBraided);
}

function toricChargeFromCounts({ numE = 0, numM = 0, numPsi = 0 } = {}) {
    const eParity = mod2(numE + numPsi);
    const mParity = mod2(numM + numPsi);
    if (eParity === 0 && mParity === 0) return '1';
    if (eParity === 1 && mParity === 0) return 'e';
    if (eParity === 0 && mParity === 1) return 'm';
    return 'psi';
}

function toricFusionLabel(a, b) {
    return createFusionResult(a, b, { anyonModel: 'toric_code' }).resolved || '1';
}

function totalCharge(tokens = []) {
    return tokens.reduce((charge, token) => toricFusionLabel(charge, token.anyonType), '1');
}

function normalizeTokenType(type) {
    return normalizeAnyonType(type, 'toric_code');
}

function sumWinding(game) {
    const entries = Array.isArray(game?.topologicalSectors)
        ? game.topologicalSectors
        : [];
    return entries.reduce((sum, sector) => {
        const winding = sector?.winding || {};
        return {
            x: sum.x + (Number(winding.x) || 0),
            y: sum.y + (Number(winding.y) || 0)
        };
    }, { x: 0, y: 0 });
}

function logicalSectorFromWinding(winding = {}) {
    return `(${mod2(winding.x)},${mod2(winding.y)})`;
}

function countEvents(game) {
    const braidEvents = Array.isArray(game?.braidEventLog) ? game.braidEventLog : [];
    const unbraids = braidEvents.filter((event) => event.type === 'unbraid' || event.type === 'attempt_unbraid');
    const fusionOutcomes = Array.isArray(game?.fusionOutcomes) ? game.fusionOutcomes : [];
    const history = Array.isArray(game?.history) ? game.history : [];
    return {
        braidEvents: braidEvents.filter((event) => event.type === 'braid' && !event.skipped).length,
        unbraidAttempts: unbraids.length,
        successfulUnbraids: unbraids.filter((event) => event.cancellationOccurred || event.fullyUnbraided).length,
        failedUnbraids: unbraids.filter((event) => event.wrongOrder || (!event.cancellationOccurred && !event.fullyUnbraided)).length,
        fusionEvents: fusionOutcomes.length,
        vacuumFusions: fusionOutcomes.filter((event) => event.vacuum || event.resolved === '1' || event.removed?.length).length,
        seamTransforms: history.reduce((count, event) => count + (Array.isArray(event.seamTransforms) ? event.seamTransforms.length : 0), 0),
        noiseEvents: history.reduce((count, event) => count + (Array.isArray(event.noise) ? event.noise.length : 0), 0),
        measurements: history.filter((event) => event.type === 'measurement' || event.measurement).length
    };
}

export function computeToricCodeMemoryUnbraidObservables(game, options = {}) {
    const tokens = [...(game?.tokens?.values?.() || [])]
        .map((token) => ({ ...token, anyonType: normalizeTokenType(token.anyonType) }));
    const counts = {
        numE: tokens.filter((token) => token.anyonType === 'e').length,
        numM: tokens.filter((token) => token.anyonType === 'm').length,
        numPsi: tokens.filter((token) => token.anyonType === 'psi').length
    };
    const braidWordLengthByToken = Object.fromEntries(tokens.map((token) => [token.id, tokenWordLength(token)]));
    const totalBraidWordLength = Object.values(braidWordLengthByToken).reduce((sum, length) => sum + length, 0);
    const winding = sumWinding(game);
    const logicalSector = logicalSectorFromWinding(winding);
    const totalFusionCharge = totalCharge(tokens);
    const totalNonVacuumCount = tokens.filter((token) => token.anyonType !== '1').length;
    const braidParityTotal = tokens.reduce((sum, token) => (sum + Number(token.braidParity || 0)) % 2, 0);
    const numberOfBraidedTokens = tokens.filter(tokenIsBraided).length;
    const eventCounts = countEvents(game);
    const topologicalMemoryAlive = Boolean(
        braidParityTotal
        || numberOfBraidedTokens > 0
        || logicalSector !== '(0,0)'
    );

    return {
        tick: Number(game?.moveNumber || 0),
        source: options.source || 'state',
        numE: counts.numE,
        numM: counts.numM,
        numPsi: counts.numPsi,
        totalFusionCharge,
        totalNonVacuumCount,
        braidParityTotal,
        braidWordLengthByToken,
        averageBraidWordLength: tokens.length ? totalBraidWordLength / tokens.length : 0,
        maxBraidWordLength: tokens.length ? Math.max(0, ...Object.values(braidWordLengthByToken)) : 0,
        numberOfBraidedTokens,
        numberOfSuccessfulUnbraids: eventCounts.successfulUnbraids,
        numberOfFailedUnbraids: eventCounts.failedUnbraids,
        numberOfFusionEvents: eventCounts.fusionEvents,
        numberOfVacuumFusions: eventCounts.vacuumFusions,
        windingX: winding.x,
        windingY: winding.y,
        logicalSector,
        topologicalMemoryAlive,
        returnedToVacuum: totalFusionCharge === '1' && totalNonVacuumCount === 0
    };
}

function firstMemoryLifetime(history, finalTick) {
    const entries = Array.isArray(history) ? history : [];
    const firstAliveIndex = entries.findIndex((entry) => entry.observables?.topologicalMemoryAlive);
    if (firstAliveIndex < 0) return entries[0]?.observables?.topologicalMemoryAlive === false ? entries[0].tick : finalTick;
    const lost = entries.slice(firstAliveIndex + 1).find((entry) => !entry.observables?.topologicalMemoryAlive);
    return lost ? lost.tick : finalTick;
}

function mostBraidedTokenFromObservables(observables) {
    const entries = Object.entries(observables?.braidWordLengthByToken || {});
    if (!entries.length) return { id: null, braidWordLength: 0 };
    const [id, braidWordLength] = entries.reduce((best, entry) => entry[1] > best[1] ? entry : best, entries[0]);
    return { id, braidWordLength };
}

export function calculateToricCodeMemoryUnbraidAnswer({ initialObservables, finalObservables, history, eventCounts } = {}) {
    const finalTick = finalObservables?.tick || 0;
    const totalUnbraidAttempts = eventCounts?.unbraidAttempts || 0;
    const successfulUnbraids = eventCounts?.successfulUnbraids || 0;
    const failedUnbraids = eventCounts?.failedUnbraids || 0;
    const logicalErrorOccurred = Boolean(
        initialObservables
        && finalObservables
        && finalObservables.logicalSector !== initialObservables.logicalSector
    );
    const vacuumRecovery = Boolean((history || []).some((entry) => entry.observables?.returnedToVacuum));
    const mostBraidedToken = mostBraidedTokenFromObservables(finalObservables);

    let finalAnswerLabel = finalObservables?.topologicalMemoryAlive ? 'memory_survived' : 'memory_lost';
    if (failedUnbraids > successfulUnbraids && totalUnbraidAttempts > 0) finalAnswerLabel = 'unbraid_failed';
    if (vacuumRecovery) finalAnswerLabel = 'vacuum_recovered';
    if (logicalErrorOccurred) finalAnswerLabel = 'logical_error';

    return {
        memoryLifetime: firstMemoryLifetime(history, finalTick),
        vacuumRecovery,
        exactUnbraidSuccessRate: totalUnbraidAttempts ? successfulUnbraids / totalUnbraidAttempts : 0,
        logicalErrorOccurred,
        finalTotalCharge: finalObservables?.totalFusionCharge || '1',
        finalLogicalSector: finalObservables?.logicalSector || '(0,0)',
        finalAverageBraidWordLength: finalObservables?.averageBraidWordLength || 0,
        finalMaxBraidWordLength: finalObservables?.maxBraidWordLength || 0,
        mostBraidedToken,
        finalAnswerLabel,
        summary: humanReadableToricCodeMemoryUnbraidAnswer({
            initialObservables,
            finalObservables,
            eventCounts,
            logicalErrorOccurred,
            memoryLifetime: firstMemoryLifetime(history, finalTick)
        })
    };
}

export function humanReadableToricCodeMemoryUnbraidAnswer({
    initialObservables,
    finalObservables,
    eventCounts,
    logicalErrorOccurred,
    memoryLifetime
} = {}) {
    const survived = finalObservables?.topologicalMemoryAlive ? 'survived' : 'was lost';
    const finalCharge = finalObservables?.totalFusionCharge || '1';
    const vacuumText = finalObservables?.returnedToVacuum
        ? 'the system returned to vacuum'
        : `the final total charge was ${finalCharge}, so the system did not return to vacuum`;
    const initialSector = initialObservables?.logicalSector || '(0,0)';
    const finalSector = finalObservables?.logicalSector || '(0,0)';
    const sectorText = logicalErrorOccurred
        ? `The final logical sector changed from ${initialSector} to ${finalSector}, so a logical error occurred.`
        : `The logical sector remained ${finalSector}.`;
    return `The toric-code memory ${survived} for ${memoryLifetime ?? finalObservables?.tick ?? 0} turns. ${vacuumText}. There were ${eventCounts?.braidEvents || 0} braid events, ${eventCounts?.successfulUnbraids || 0} successful unbraids, and ${eventCounts?.failedUnbraids || 0} failed inverse attempts. ${sectorText}`;
}

export class ToricCodeMemoryUnbraidProblem {
    constructor(config = {}) {
        this.id = TORIC_CODE_MEMORY_UNBRAID_ID;
        this.config = normalizeToricCodeMemoryUnbraidConfig(config);
        this.initialObservables = null;
        this.history = [];
    }

    setupInitialState(game) {
        if (!this.config.createPairsLocally || !game?.tokens || typeof game.addToken !== 'function') return;
        game.tokens.clear();
        game.worldlines?.clear?.();
        game.fusionSites?.clear?.();
        const center = game.topology.dimensions === 4
            ? game.topology.sizes.map((size) => Math.floor(size / 2))
            : [Math.floor(game.topology.width / 2), Math.floor(game.topology.height / 2)];
        game.fusionSites?.add?.(keyOf(center));
        this.placePairs(game, 'e', this.config.numPairsE);
        this.placePairs(game, 'm', this.config.numPairsM);
    }

    placePairs(game, type, count) {
        const occupied = new Set([...game.tokens.values()].map((token) => keyOf(token.coord)));
        const directions = game.topology.directions();
        let pairIndex = 0;
        for (const vertex of game.topology.vertices()) {
            if (pairIndex >= count) break;
            if (occupied.has(keyOf(vertex))) continue;
            const neighbor = directions
                .map((direction) => game.topology.step(vertex, direction)?.coord)
                .find((coord) => coord && !occupied.has(keyOf(coord)));
            if (!neighbor) continue;
            const owner = pairIndex % 2 === 0 ? 'black' : 'white';
            const baseId = `${type}${pairIndex + 1}`;
            const first = game.addToken({ id: `${baseId}a`, owner, coord: vertex, anyonType: type });
            const second = game.addToken({ id: `${baseId}b`, owner, coord: neighbor, anyonType: type });
            if (first && second) {
                occupied.add(keyOf(first.coord));
                occupied.add(keyOf(second.coord));
                pairIndex += 1;
            }
        }
    }

    start(game) {
        this.initialObservables = computeToricCodeMemoryUnbraidObservables(game, { source: 'initial' });
        this.history = [{
            tick: this.initialObservables.tick,
            source: 'initial',
            observables: cloneValue(this.initialObservables)
        }];
    }

    record(game, source = 'move') {
        const observables = computeToricCodeMemoryUnbraidObservables(game, {
            source: typeof source === 'string' ? source : source?.type || 'move'
        });
        const entry = {
            tick: observables.tick,
            source: typeof source === 'string' ? source : source?.type || 'move',
            event: typeof source === 'object' ? cloneValue(source.event || source) : null,
            observables
        };
        this.history.push(entry);
        return entry;
    }

    export(game) {
        const finalObservables = computeToricCodeMemoryUnbraidObservables(game, { source: 'final' });
        const initialObservables = this.initialObservables
            || computeToricCodeMemoryUnbraidObservables(game, { source: 'initial' });
        const eventCounts = countEvents(game);
        const history = this.history.length
            ? this.history.map(cloneValue)
            : [{ tick: finalObservables.tick, source: 'final', observables: cloneValue(finalObservables) }];
        const answer = calculateToricCodeMemoryUnbraidAnswer({
            initialObservables,
            finalObservables,
            history,
            eventCounts
        });
        return {
            problemId: this.id,
            config: { ...this.config },
            compatibleGameModes: [...TORIC_CODE_MEMORY_UNBRAID_COMPATIBLE_MODES],
            physicalSystem: {
                anyonModel: 'toric_code',
                anyonTypes: [...TORIC_TYPES],
                fusionRules: {
                    '1xa': 'a',
                    'exe': '1',
                    'mxm': '1',
                    'psixpsi': '1',
                    'exm': 'psi',
                    'expsi': 'm',
                    'mxpsi': 'e'
                },
                braiding: {
                    'e around m': 'nontrivial Z2 phase/parity',
                    'm around e': 'nontrivial Z2 phase/parity',
                    default: 'trivial'
                },
                twistSeam: this.config.enableTwistSeam ? { e: 'm', m: 'e', psi: 'psi', 1: '1' } : null
            },
            physicalQuestion: [
                'How long does topological braid memory survive under legal moves, unbraiding attempts, noise, and measurements?',
                'Can the system return to total vacuum charge?',
                'Can an opponent exactly unbraid a braided token?'
            ],
            initialObservables,
            finalObservables,
            answer,
            fullHistory: history,
            eventCounts
        };
    }
}

export function createToricCodeMemoryUnbraidProblem(config = {}) {
    return new ToricCodeMemoryUnbraidProblem(config);
}
