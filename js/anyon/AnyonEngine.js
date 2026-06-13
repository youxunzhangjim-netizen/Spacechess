import {
    braidEffectForPhase,
    createFusionResult,
    mutualBraidPhase,
    normalizeAnyonConfig,
    normalizeAnyonType,
    previewAnyonCapture
} from './AnyonAlgebra.js';
import {
    applySeamTransforms,
    createRectTorusTopology,
    isClosedLoop,
    localEncirclement,
    noncontractibleCycleCrossed,
    sameVertex,
    vertexKey,
    windingNumbers
} from './AnyonTopology.js';
import {
    appendBraidGenerator,
    attachBraidMemory,
    braidGeneratorIndex,
    braidSignFromWinding,
    mergeBraidMemory
} from './BraidMemory.js';

export class AnyonGameEngine {
    constructor({ topology = createRectTorusTopology(), config = {}, players = ['black', 'white'] } = {}) {
        this.topology = topology;
        this.config = normalizeAnyonConfig(config);
        this.players = [...players];
        this.currentPlayer = this.players[0] || 'black';
        this.tokens = new Map();
        this.worldlines = new Map();
        this.braidTokens = Object.fromEntries(this.players.map((player) => [player, 0]));
        this.parity = Object.fromEntries(this.players.map((player) => [player, 0]));
        this.score = Object.fromEntries(this.players.map((player) => [player, 0]));
        this.disabledUntilTurn = Object.fromEntries(this.players.map((player) => [player, 0]));
        this.turn = 0;
        this.fusionChannels = [];
        this.events = [];
    }

    addToken({ id, owner = this.currentPlayer, vertex, anyonType = '1', metadata = {} }) {
        const tokenId = id || `a${this.tokens.size + 1}`;
        const normalizedVertex = this.normalizeVertex(vertex);
        const token = {
            id: tokenId,
            owner,
            vertex: normalizedVertex,
            anyonType: normalizeAnyonType(anyonType, this.config.anyonModel),
            metadata: { ...metadata },
            disabledTurns: 0
        };
        attachBraidMemory(token, metadata);
        this.tokens.set(tokenId, token);
        this.worldlines.set(tokenId, [normalizedVertex]);
        return token;
    }

    normalizeVertex(vertex) {
        return this.topology?.normalize ? this.topology.normalize(vertex) : vertex;
    }

    tokenAt(vertex, exceptId = '') {
        const key = vertexKey(this.normalizeVertex(vertex));
        return [...this.tokens.values()].find((token) => token.id !== exceptId && vertexKey(token.vertex) === key) || null;
    }

    neighbors(vertex) {
        return this.topology?.neighbors?.(vertex) || [];
    }

    moveToken(id, toVertex, { player = this.currentPlayer, confirmFusion = true } = {}) {
        const token = this.tokens.get(id);
        if (!token) return { ok: false, error: 'Unknown anyon token.' };
        if (token.owner !== player) return { ok: false, error: 'That anyon belongs to another player.' };
        if (this.disabledUntilTurn[player] > this.turn) return { ok: false, error: 'Player is disabled this turn.' };

        const normalizedTo = this.normalizeVertex(toVertex);
        const legal = this.neighbors(token.vertex).some((neighbor) => sameVertex(neighbor, normalizedTo));
        if (!legal) return { ok: false, error: 'Anyon moves must follow one graph edge.' };

        const from = token.vertex;
        const rawPath = [from, normalizedTo];
        const beforeType = token.anyonType;
        if (this.config.enableTopologySeamTransforms) {
            token.anyonType = applySeamTransforms(token.anyonType, rawPath, this.topology, this.config.anyonModel);
        }
        token.vertex = normalizedTo;
        if (this.config.enablePathHistory) this.worldlines.get(id)?.push(normalizedTo);

        const braid = this.evaluateBraids(token, rawPath, player);
        const occupant = this.tokenAt(normalizedTo, id);
        const fusion = occupant && confirmFusion ? this.fuseTokens(id, occupant.id) : null;

        this.turn++;
        this.currentPlayer = this.nextPlayer(player);
        const event = {
            type: 'move',
            id,
            player,
            from,
            to: normalizedTo,
            beforeType,
            afterType: token.anyonType,
            braid,
            fusion
        };
        this.events.push(event);
        return { ok: true, event };
    }

    evaluateBraids(movingToken, path, player) {
        const movingLine = this.worldlines.get(movingToken.id) || path;
        const winding = windingNumbers(movingLine, this.topology);
        const noncontractible = noncontractibleCycleCrossed(movingLine, this.topology);
        const localBraids = [];
        const tokenIds = [...this.tokens.keys()];
        const sign = braidSignFromWinding(winding);

        for (const target of this.tokens.values()) {
            if (target.id === movingToken.id) continue;
            if (!localEncirclement(movingLine, target.vertex, this.topology) && !noncontractible) continue;
            const phase = mutualBraidPhase(movingToken.anyonType, target.anyonType, this.config.anyonModel);
            const effect = braidEffectForPhase(phase, this.config);
            if (effect.effect !== 'none') this.applyBraidEffect(player, effect);
            const memory = appendBraidGenerator(movingToken, {
                generator: 'sigma',
                index: braidGeneratorIndex(tokenIds, movingToken.id, target.id),
                sign,
                targetId: target.id,
                tick: this.turn
            }, this.config);
            localBraids.push({
                around: target.id,
                targetType: target.anyonType,
                phase,
                effect,
                braidGenerator: memory.appended,
                braidWord: memory.braidWord
            });
        }

        return {
            closedLoop: isClosedLoop(movingLine),
            winding,
            noncontractible,
            localBraids
        };
    }

    applyBraidEffect(player, effect) {
        switch (effect.effect) {
            case 'add_braid_token':
                this.braidTokens[player] = (this.braidTokens[player] || 0) + effect.delta;
                break;
            case 'flip_parity':
                this.parity[player] = this.parity[player] ? 0 : 1;
                break;
            case 'disable_one_turn':
                this.disabledUntilTurn[player] = Math.max(this.disabledUntilTurn[player] || 0, this.turn + 2);
                break;
            case 'score_bonus':
                this.score[player] = (this.score[player] || 0) + effect.delta;
                break;
            default:
                break;
        }
    }

    fuseTokens(firstId, secondId) {
        const first = this.tokens.get(firstId);
        const second = this.tokens.get(secondId);
        if (!first || !second) return null;
        const fusion = createFusionResult(first.anyonType, second.anyonType, this.config);
        const result = { firstId, secondId, ...fusion };

        if (fusion.fusionChannel) {
            this.fusionChannels.push({ ...fusion.fusionChannel, tokenIds: [firstId, secondId] });
            result.pending = true;
            return result;
        }

        if (fusion.resolved === '1') {
            if (this.config.vacuumFusionBehavior === 'replace') {
                mergeBraidMemory(first, second, this.config);
                first.anyonType = '1';
                this.tokens.delete(secondId);
            } else {
                this.tokens.delete(firstId);
                this.tokens.delete(secondId);
            }
            result.removed = this.config.vacuumFusionBehavior !== 'replace';
            return result;
        }

        mergeBraidMemory(first, second, this.config);
        first.anyonType = fusion.resolved;
        first.vertex = second.vertex;
        this.tokens.delete(secondId);
        return result;
    }

    previewCapture(attackerId, defenderId) {
        const attacker = this.tokens.get(attackerId);
        const defender = this.tokens.get(defenderId);
        if (!attacker || !defender) return { legalCapture: false, error: 'Unknown token.' };
        return previewAnyonCapture(attacker.anyonType, defender.anyonType, this.config);
    }

    nextPlayer(player) {
        const index = this.players.indexOf(player);
        return this.players[(index + 1 + this.players.length) % this.players.length] || player;
    }

    exportState() {
        return {
            config: { ...this.config },
            players: [...this.players],
            currentPlayer: this.currentPlayer,
            tokens: [...this.tokens.values()].map((token) => ({ ...token, vertex: [...token.vertex], metadata: { ...token.metadata } })),
            worldlines: Object.fromEntries([...this.worldlines.entries()].map(([id, path]) => [id, path.map((vertex) => [...vertex])])),
            braidTokens: { ...this.braidTokens },
            parity: { ...this.parity },
            score: { ...this.score },
            disabledUntilTurn: { ...this.disabledUntilTurn },
            turn: this.turn,
            fusionChannels: this.fusionChannels.map((channel) => ({ ...channel })),
            events: this.events.map((event) => ({ ...event }))
        };
    }
}

export function createToricAnyonLoopsGame(options = {}) {
    return new AnyonGameEngine({
        topology: options.topology || createRectTorusTopology(options),
        config: {
            anyonModel: 'toric_code',
            braidEffect: 'add_braid_token',
            ...options.config
        },
        players: options.players || ['black', 'white']
    });
}
