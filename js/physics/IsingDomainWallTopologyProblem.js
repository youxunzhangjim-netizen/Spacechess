import { SeededRandom } from '../probability/SeededRandom.js';

export const ISING_DOMAIN_WALL_TOPOLOGY_ID = 'ising_domain_wall_topology';

export const ISING_DOMAIN_WALL_COMPATIBLE_MODES = Object.freeze([
    'reversi',
    'clifford_reversi',
    'domain_wall_reversi',
    'spin_flip',
    'floquet_reversi'
]);

const DEFAULT_CONFIG = Object.freeze({
    id: ISING_DOMAIN_WALL_TOPOLOGY_ID,
    topology: 'torus',
    boardSize: 8,
    J: 1,
    temperature: 0,
    enableMetropolis: false,
    enableFloquetJ: false,
    initialState: 'infer_current',
    stableWallTurns: 5,
    seed: 'ising-domain-wall'
});

function integer(value, fallback, min = 1, max = 128) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function number(value, fallback, min = -1e9, max = 1e9) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
    }
    return value;
}

function keyOf(coord) {
    return coord.join(',');
}

function normalizeProblemTopology(topology = DEFAULT_CONFIG.topology) {
    const value = String(topology || DEFAULT_CONFIG.topology).toLowerCase();
    if (value === 'flat' || value === 'open' || value === 'obc') return 'flat';
    if (value === 'sphere' || value === 's2' || value === 'sphere_latitude' || value === 'sphere_latitude_ring') return 'sphere_latitude';
    if (value === 'klein' || value === 'klein_bottle' || value === 'klein-bottle') return 'klein_bottle';
    if (value === 'rp2' || value === 'rp' || value === 'real_projective_plane') return 'rp2';
    return 'torus';
}

export function normalizeIsingDomainWallTopologyConfig(config = {}) {
    const initialState = [
        'infer_current',
        'random',
        'half_black_half_white',
        'single_domain_seed',
        'checkerboard'
    ].includes(config.initialState)
        ? config.initialState
        : DEFAULT_CONFIG.initialState;
    return {
        ...DEFAULT_CONFIG,
        ...config,
        id: ISING_DOMAIN_WALL_TOPOLOGY_ID,
        topology: normalizeProblemTopology(config.topology),
        boardSize: integer(config.boardSize ?? config.size, DEFAULT_CONFIG.boardSize, 2, 64),
        J: number(config.J, DEFAULT_CONFIG.J),
        temperature: number(config.temperature, DEFAULT_CONFIG.temperature, 0),
        enableMetropolis: Boolean(config.enableMetropolis ?? DEFAULT_CONFIG.enableMetropolis),
        enableFloquetJ: Boolean(config.enableFloquetJ ?? DEFAULT_CONFIG.enableFloquetJ),
        initialState,
        stableWallTurns: integer(config.stableWallTurns ?? config.K, DEFAULT_CONFIG.stableWallTurns, 1, 64),
        seed: String(config.seed || DEFAULT_CONFIG.seed)
    };
}

export function topologyOptionsForIsingDomainWallTopology(config = {}) {
    const normalized = normalizeIsingDomainWallTopologyConfig(config);
    return {
        topology: normalized.topology,
        width: normalized.boardSize,
        height: normalized.boardSize
    };
}

export function isIsingDomainWallCompatibleMode(mode) {
    return ISING_DOMAIN_WALL_COMPATIBLE_MODES.includes(String(mode || ''));
}

function topologyName(game) {
    const topology = game?.topology || {};
    const name = topology.name || topology.topology || 'flat';
    if (name === 'pbc' || name === 't2') return 'torus';
    if (name === 'klein') return 'klein_bottle';
    if (name === 'sphere') return 'sphere_latitude';
    if (name === 'open2d') return 'flat';
    return String(name).toLowerCase();
}

function topologySizes(game) {
    const topology = game?.topology || {};
    if (Array.isArray(topology.sizes)) return [...topology.sizes];
    return [
        topology.width || topology.size || 8,
        topology.height || topology.size || 8,
        ...(topology.dimension === 3 ? [topology.depth || topology.size || 8] : [])
    ];
}

function topologyDimension(game) {
    return game?.topology?.dimensions || game?.topology?.dimension || topologySizes(game).length || 2;
}

function axisDirections(dimension) {
    const directions = [];
    for (let axis = 0; axis < dimension; axis += 1) {
        const positive = Array(dimension).fill(0);
        const negative = Array(dimension).fill(0);
        positive[axis] = 1;
        negative[axis] = -1;
        directions.push(positive, negative);
    }
    return directions;
}

function vertices(game) {
    if (typeof game?.topology?.vertices === 'function') return game.topology.vertices();
    if (typeof game?.topology?.allCoords === 'function') return game.topology.allCoords();
    return [];
}

function topologyKey(game, coord) {
    return game?.topology?.key?.(coord) || keyOf(coord);
}

function stepTopology(game, coord, direction) {
    const topology = game?.topology;
    if (!topology?.step) return null;
    const result = topology.step(coord, direction);
    if (!result) return null;
    if (Array.isArray(result)) {
        return {
            coord: result,
            edge: fallbackEdge(game, coord, direction, result)
        };
    }
    return {
        coord: result.coord,
        edge: result.edge || fallbackEdge(game, coord, direction, result.coord)
    };
}

function fallbackEdge(game, from, direction, to) {
    const sizes = topologySizes(game);
    const rawTo = from.map((value, index) => value + (direction[index] || 0));
    const wrap = (axis) => {
        const size = sizes[axis] || 0;
        if (!size) return 0;
        if (rawTo[axis] < 0) return -1;
        if (rawTo[axis] >= size) return 1;
        return 0;
    };
    const name = topologyName(game);
    const wrapX = wrap(0);
    const wrapY = wrap(1);
    const twisted = ['klein_bottle', 'rp2', 'mobius'].includes(name) && (wrapX !== 0 || wrapY !== 0);
    return {
        from: [...from],
        rawTo,
        to: [...to],
        direction: [...direction],
        wrapX,
        wrapY,
        twisted,
        homology: { x: wrapX, y: wrapY },
        anyonAutomorphism: twisted ? 'twist' : 'identity'
    };
}

function graphEdges(game) {
    const result = [];
    const seen = new Set();
    const dimension = topologyDimension(game);
    const directions = typeof game?.topology?.directions === 'function'
        ? game.topology.directions()
        : axisDirections(dimension);
    for (const from of vertices(game)) {
        for (const direction of directions) {
            const step = stepTopology(game, from, direction);
            if (!step?.coord) continue;
            const fromKey = topologyKey(game, from);
            const toKey = topologyKey(game, step.coord);
            if (fromKey === toKey) continue;
            const edgeKey = [fromKey, toKey].sort().join('|');
            if (seen.has(edgeKey)) continue;
            seen.add(edgeKey);
            result.push({
                from: [...from],
                to: [...step.coord],
                fromKey,
                toKey,
                edge: step.edge
            });
        }
    }
    return result;
}

function boardMap(game) {
    return game?.board instanceof Map ? game.board : new Map();
}

function spinFromStone(stone) {
    if (!stone) return null;
    if (stone.color === 'black') return 1;
    if (stone.color === 'white') return -1;
    return null;
}

function spinMap(game) {
    const map = new Map();
    for (const coord of vertices(game)) {
        const key = topologyKey(game, coord);
        const spin = spinFromStone(boardMap(game).get(key));
        if (spin) map.set(key, spin);
    }
    return map;
}

function writeSpin(game, coord, color) {
    if (typeof game?.setStone === 'function') {
        game.setStone(coord, { color, pauliLabel: color === 'black' ? 'X' : 'Z' });
        return;
    }
    if (typeof game?.set === 'function') {
        game.set(coord, { color });
        return;
    }
    boardMap(game).set(topologyKey(game, coord), { color });
}

function cloneBoard(game) {
    return new Map([...boardMap(game).entries()].map(([key, stone]) => [key, { ...stone }]));
}

function restoreBoard(game, snapshot) {
    game.board = new Map([...snapshot.entries()].map(([key, stone]) => [key, { ...stone }]));
}

function effectiveJ(config, tick = 0) {
    if (!config.enableFloquetJ) return config.J;
    const phase = Math.abs(Math.floor(Number(tick) || 0)) % 4;
    if (phase === 0) return 1;
    if (phase === 1) return 0.5;
    if (phase === 2) return -0.5;
    return config.J;
}

function edgeHomology(edge = {}) {
    return {
        x: Number(edge.homology?.x ?? edge.wrapX ?? 0) || 0,
        y: Number(edge.homology?.y ?? edge.wrapY ?? 0) || 0
    };
}

function edgeIsTwisted(edge = {}) {
    return Boolean(edge.twisted || edge.anyonAutomorphism === 'twist');
}

function domainComponents(game, spins) {
    const edges = graphEdges(game);
    const adjacency = new Map();
    for (const edge of edges) {
        if (!spins.has(edge.fromKey) || !spins.has(edge.toKey)) continue;
        if (!adjacency.has(edge.fromKey)) adjacency.set(edge.fromKey, []);
        if (!adjacency.has(edge.toKey)) adjacency.set(edge.toKey, []);
        adjacency.get(edge.fromKey).push(edge.toKey);
        adjacency.get(edge.toKey).push(edge.fromKey);
    }
    const seen = new Set();
    const components = [];
    for (const [key, spin] of spins.entries()) {
        if (seen.has(key)) continue;
        const queue = [key];
        seen.add(key);
        let size = 0;
        while (queue.length) {
            const current = queue.shift();
            size += 1;
            for (const neighbor of adjacency.get(current) || []) {
                if (seen.has(neighbor) || spins.get(neighbor) !== spin) continue;
                seen.add(neighbor);
                queue.push(neighbor);
            }
        }
        components.push({ spin, size });
    }
    return components;
}

function sectorFromDomainWalls(name, domainWallEdges) {
    if (name === 'sphere_latitude' || name === 'sphere') {
        return {
            windingX: 0,
            windingY: 0,
            noncontractibleDomainWallCount: 0,
            twistedSector: false
        };
    }
    let windingX = 0;
    let windingY = 0;
    let twistedCrossings = 0;
    for (const wall of domainWallEdges) {
        const homology = edgeHomology(wall.edge);
        if (homology.x) windingX += homology.x;
        if (homology.y) windingY += homology.y;
        if (edgeIsTwisted(wall.edge)) twistedCrossings += 1;
    }
    const xCycle = windingX !== 0;
    const yCycle = windingY !== 0;
    const twistedSector = twistedCrossings > 0 || (['klein_bottle', 'rp2', 'mobius'].includes(name) && (xCycle || yCycle));
    return {
        windingX,
        windingY,
        noncontractibleDomainWallCount: name === 'torus' ? Number(xCycle) + Number(yCycle) : twistedCrossings,
        twistedSector
    };
}

export function computeIsingDomainWallObservables(game, config = {}, options = {}) {
    const normalized = normalizeIsingDomainWallTopologyConfig(config);
    const tick = Number(game?.moveNumber ?? game?.turn ?? options.tick ?? 0);
    const J = effectiveJ(normalized, tick);
    const spins = spinMap(game);
    const edges = graphEdges(game);
    const occupiedEdges = [];
    const domainWallEdges = [];
    let spinProductSum = 0;
    for (const edge of edges) {
        const left = spins.get(edge.fromKey);
        const right = spins.get(edge.toKey);
        if (left == null || right == null) continue;
        occupiedEdges.push(edge);
        const product = left * right;
        spinProductSum += product;
        if (left !== right) domainWallEdges.push(edge);
    }
    const energy = -J * spinProductSum;
    const magnetization = [...spins.values()].reduce((sum, spin) => sum + spin, 0);
    const components = domainComponents(game, spins);
    const componentSizes = components.map((component) => component.size);
    const blackDomains = components.filter((component) => component.spin === 1).length;
    const whiteDomains = components.filter((component) => component.spin === -1).length;
    const largestDomainSize = componentSizes.length ? Math.max(...componentSizes) : 0;
    const topologySector = sectorFromDomainWalls(topologyName(game), domainWallEdges);
    const N = spins.size || 1;
    const numberOfEdges = occupiedEdges.length || 1;
    return {
        tick,
        source: options.source || 'state',
        J,
        floquetPhase: normalized.enableFloquetJ ? tick % 4 : null,
        energy,
        deltaEnergy: Number(options.deltaEnergy || 0),
        magnetization,
        absMagnetization: Math.abs(magnetization),
        normalizedMagnetization: magnetization / N,
        domainWallLength: domainWallEdges.length,
        domainWallDensity: domainWallEdges.length / numberOfEdges,
        numConnectedBlackDomains: blackDomains,
        numConnectedWhiteDomains: whiteDomains,
        largestDomainSize,
        averageDomainSize: componentSizes.length
            ? componentSizes.reduce((sum, size) => sum + size, 0) / componentSizes.length
            : 0,
        ...topologySector,
        correlationEstimate: occupiedEdges.length ? spinProductSum / occupiedEdges.length : 0,
        acceptedMove: options.acceptedMove ?? null,
        metropolisProbability: options.metropolisProbability ?? null,
        numberOfSpins: spins.size,
        numberOfEdges: occupiedEdges.length
    };
}

function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stableTopologicalWall(history, turns) {
    let run = 0;
    for (const entry of history) {
        if ((entry.observables?.noncontractibleDomainWallCount || 0) > 0) {
            run += 1;
            if (run >= turns) return true;
        } else {
            run = 0;
        }
    }
    return false;
}

function relaxationTime(history, finalEnergy, turns) {
    const tolerance = Math.max(1, Math.abs(finalEnergy) * 0.05);
    for (let index = 0; index <= history.length - turns; index += 1) {
        const window = history.slice(index, index + turns);
        if (window.every((entry) => Math.abs((entry.observables?.energy || 0) - finalEnergy) <= tolerance)) {
            return window[0].tick;
        }
    }
    return history[history.length - 1]?.tick || 0;
}

function returnProbabilityAfterPeriod(history, period = 4) {
    const periodEntries = history.filter((entry) => entry.observables?.floquetPhase === 0);
    if (periodEntries.length < 2) return 0;
    let returns = 0;
    let comparisons = 0;
    for (let index = 1; index < periodEntries.length; index += 1) {
        comparisons += 1;
        if (periodEntries[index].observables.twistedSector === periodEntries[index - 1].observables.twistedSector
            && periodEntries[index].observables.noncontractibleDomainWallCount === periodEntries[index - 1].observables.noncontractibleDomainWallCount) {
            returns += 1;
        }
    }
    return comparisons ? returns / comparisons : 0;
}

export function calculateIsingDomainWallTopologyAnswer({
    config,
    initialObservables,
    finalObservables,
    history
} = {}) {
    const normalized = normalizeIsingDomainWallTopologyConfig(config);
    const domainWallLengths = history.map((entry) => entry.observables?.domainWallLength || 0);
    const finalEnergy = finalObservables?.energy || 0;
    const stableWall = stableTopologicalWall(history, normalized.stableWallTurns);
    const orderedStateReached = Math.abs(finalObservables?.normalizedMagnetization || 0) > 0.9;
    const disorderedStateReached = (finalObservables?.domainWallDensity || 0) > 0.4;
    let topologyEffectLabel = 'metastable';
    if (finalObservables?.twistedSector) topologyEffectLabel = 'twisted_sector';
    else if (stableWall) topologyEffectLabel = 'topological_domain_wall';
    else if (orderedStateReached) topologyEffectLabel = 'ordered';
    else if (disorderedStateReached) topologyEffectLabel = 'disordered';
    const metropolisMoves = history.filter((entry) => entry.observables?.acceptedMove != null);
    const accepted = metropolisMoves.filter((entry) => entry.observables.acceptedMove).length;
    return {
        finalEnergy,
        energyDrop: (initialObservables?.energy || 0) - finalEnergy,
        finalMagnetization: finalObservables?.normalizedMagnetization || 0,
        finalDomainWallLength: finalObservables?.domainWallLength || 0,
        averageDomainWallLengthOverGame: average(domainWallLengths),
        maxDomainWallLength: domainWallLengths.length ? Math.max(...domainWallLengths) : 0,
        finalLargestDomainSize: finalObservables?.largestDomainSize || 0,
        orderedStateReached,
        disorderedStateReached,
        stableTopologicalWall: stableWall,
        topologyEffectLabel,
        relaxationTime: relaxationTime(history, finalEnergy, normalized.stableWallTurns),
        acceptanceRate: normalized.enableMetropolis
            ? (metropolisMoves.length ? accepted / metropolisMoves.length : 0)
            : null,
        returnProbabilityAfterPeriod: normalized.enableFloquetJ ? returnProbabilityAfterPeriod(history) : null,
        summary: humanReadableIsingDomainWallAnswer({
            config: normalized,
            initialObservables,
            finalObservables,
            stableWall,
            topologyEffectLabel
        })
    };
}

export function humanReadableIsingDomainWallAnswer({
    config,
    initialObservables,
    finalObservables,
    stableWall,
    topologyEffectLabel
} = {}) {
    const topology = normalizeProblemTopology(config?.topology);
    const impossibleHint = topology === 'sphere_latitude'
        ? ''
        : ' This suggests the topology can stabilize domain-wall sectors that are absent on S2.';
    return `The Ising-Reversi game on ${topology} ended in a ${topologyEffectLabel} state. Energy changed from ${(initialObservables?.energy || 0).toFixed(3)} to ${(finalObservables?.energy || 0).toFixed(3)}, magnetization reached ${(finalObservables?.normalizedMagnetization || 0).toFixed(3)}, and a noncontractible domain wall ${stableWall ? 'survived' : 'did not persist'} over the stability window.${impossibleHint}`;
}

export class IsingDomainWallTopologyProblem {
    constructor(config = {}) {
        this.id = ISING_DOMAIN_WALL_TOPOLOGY_ID;
        this.config = normalizeIsingDomainWallTopologyConfig(config);
        this.rng = new SeededRandom(this.config.seed);
        this.initialObservables = null;
        this.history = [];
        this.metropolisLog = [];
    }

    setupInitialState(game) {
        if (this.config.initialState === 'infer_current' && boardMap(game).size > 0) return;
        const state = this.config.initialState === 'infer_current' ? 'random' : this.config.initialState;
        const allVertices = vertices(game);
        const sizes = topologySizes(game);
        const center = sizes.map((size) => Math.floor(size / 2));
        for (const coord of allVertices) {
            let color = 'white';
            if (state === 'random') color = this.rng.next() < 0.5 ? 'black' : 'white';
            else if (state === 'half_black_half_white') color = coord[0] < sizes[0] / 2 ? 'black' : 'white';
            else if (state === 'single_domain_seed') color = keyOf(coord) === keyOf(center.slice(0, coord.length)) ? 'black' : 'white';
            else if (state === 'checkerboard') color = coord.reduce((sum, value) => sum + value, 0) % 2 === 0 ? 'black' : 'white';
            writeSpin(game, coord, color);
        }
    }

    start(game) {
        this.initialObservables = computeIsingDomainWallObservables(game, this.config, { source: 'initial' });
        this.history = [{
            tick: this.initialObservables.tick,
            source: 'initial',
            observables: cloneValue(this.initialObservables)
        }];
    }

    beforeMove(game) {
        return {
            board: cloneBoard(game),
            observables: computeIsingDomainWallObservables(game, this.config, { source: 'before_move' })
        };
    }

    afterMove(game, { event = null, beforeState = null } = {}) {
        const before = beforeState?.observables || computeIsingDomainWallObservables(game, this.config, { source: 'before_move' });
        const afterCandidate = computeIsingDomainWallObservables(game, this.config, { source: 'candidate' });
        const deltaEnergy = afterCandidate.energy - before.energy;
        let acceptedMove = true;
        let metropolisProbability = null;
        if (this.config.enableMetropolis) {
            if (deltaEnergy <= 0) {
                metropolisProbability = 1;
            } else if (this.config.temperature <= 0) {
                metropolisProbability = 0;
                acceptedMove = false;
            } else {
                metropolisProbability = Math.exp(-deltaEnergy / this.config.temperature);
                acceptedMove = this.rng.next() < metropolisProbability;
            }
            if (!acceptedMove && beforeState?.board) restoreBoard(game, beforeState.board);
        }
        const observables = computeIsingDomainWallObservables(game, this.config, {
            source: acceptedMove ? 'move' : 'metropolis_rejected',
            deltaEnergy,
            acceptedMove: this.config.enableMetropolis ? acceptedMove : null,
            metropolisProbability: this.config.enableMetropolis ? metropolisProbability : null
        });
        const entry = {
            tick: observables.tick,
            source: observables.source,
            event: event ? cloneValue(event) : null,
            observables
        };
        this.history.push(entry);
        if (this.config.enableMetropolis) {
            this.metropolisLog.push({
                tick: observables.tick,
                deltaEnergy,
                probability: metropolisProbability,
                accepted: acceptedMove
            });
        }
        return entry;
    }

    record(game, source = 'state') {
        const observables = computeIsingDomainWallObservables(game, this.config, {
            source: typeof source === 'string' ? source : source?.type || 'state'
        });
        const entry = {
            tick: observables.tick,
            source: observables.source,
            event: typeof source === 'object' ? cloneValue(source.event || source) : null,
            observables
        };
        this.history.push(entry);
        return entry;
    }

    export(game) {
        const finalObservables = computeIsingDomainWallObservables(game, this.config, { source: 'final' });
        const initialObservables = this.initialObservables
            || computeIsingDomainWallObservables(game, this.config, { source: 'initial' });
        const history = this.history.length
            ? this.history.map(cloneValue)
            : [{ tick: finalObservables.tick, source: 'final', observables: cloneValue(finalObservables) }];
        const answer = calculateIsingDomainWallTopologyAnswer({
            config: this.config,
            initialObservables,
            finalObservables,
            history
        });
        return {
            problemId: this.id,
            config: { ...this.config, rng: this.rng.exportState() },
            compatibleGameModes: [...ISING_DOMAIN_WALL_COMPATIBLE_MODES],
            physicalSystem: {
                model: 'classical Ising spins on graph',
                spinEncoding: { black: '+1', white: '-1' },
                energy: 'E = -J * sum_<i,j> s_i s_j',
                domainWall: 'edge with s_i != s_j'
            },
            physicalQuestion: [
                'How does topology affect domain-wall stability, magnetization, energy relaxation, and noncontractible domain-wall formation?',
                'Can a player create stable noncontractible domain walls?',
                'Does the game relax to ordered, disordered, or topologically twisted sectors?'
            ],
            initialObservables,
            finalObservables,
            answer,
            fullHistory: history,
            domainStatistics: {
                finalLargestDomainSize: answer.finalLargestDomainSize,
                averageDomainWallLengthOverGame: answer.averageDomainWallLengthOverGame,
                maxDomainWallLength: answer.maxDomainWallLength,
                metropolisLog: this.metropolisLog.map(cloneValue)
            },
            topologyStatistics: {
                finalTwistedSector: finalObservables.twistedSector,
                finalNoncontractibleDomainWallCount: finalObservables.noncontractibleDomainWallCount,
                windingX: finalObservables.windingX,
                windingY: finalObservables.windingY,
                stableTopologicalWall: answer.stableTopologicalWall
            }
        };
    }
}

export function createIsingDomainWallTopologyProblem(config = {}) {
    return new IsingDomainWallTopologyProblem(config);
}
