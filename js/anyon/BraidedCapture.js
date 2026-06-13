import { attachBraidMemory } from './BraidMemory.js';

export const DEFAULT_BRAIDED_CAPTURE_CONFIG = Object.freeze({
    captureRequiresUnbraid: false,
    braidedPieceShield: false,
    braidedPiecePenalty: false
});

export function normalizeBraidedCaptureConfig(config = {}) {
    return {
        captureRequiresUnbraid: Boolean(config.captureRequiresUnbraid ?? DEFAULT_BRAIDED_CAPTURE_CONFIG.captureRequiresUnbraid),
        braidedPieceShield: Boolean(config.braidedPieceShield ?? DEFAULT_BRAIDED_CAPTURE_CONFIG.braidedPieceShield),
        braidedPiecePenalty: Boolean(config.braidedPiecePenalty ?? DEFAULT_BRAIDED_CAPTURE_CONFIG.braidedPiecePenalty)
    };
}

export function isBraidTrivial(entity) {
    if (!entity) return true;
    const wordTrivial = !Array.isArray(entity.braidWord) || entity.braidWord.length === 0;
    const parityTrivial = Number(entity.braidParity || 0) === 0;
    return wordTrivial && parityTrivial && !entity.isBraided;
}

export function attachBraidedCaptureState(entity, values = {}, config = {}) {
    if (!entity) return entity;
    attachBraidMemory(entity, { ...entity, ...values }, config);
    entity.captureUnlocks = Array.isArray(values.captureUnlocks)
        ? [...new Set(values.captureUnlocks.map(String))]
        : (Array.isArray(entity.captureUnlocks) ? entity.captureUnlocks : []);
    return entity;
}

export function grantCaptureUnlock(attacker, targetId) {
    if (!attacker || !targetId) return attacker;
    attacker.captureUnlocks = Array.isArray(attacker.captureUnlocks) ? attacker.captureUnlocks : [];
    const id = String(targetId);
    if (!attacker.captureUnlocks.includes(id)) attacker.captureUnlocks.push(id);
    return attacker;
}

export function hasCaptureUnlock(attacker, targetId) {
    return Array.isArray(attacker?.captureUnlocks) && attacker.captureUnlocks.includes(String(targetId || ''));
}

export function consumeCaptureUnlock(attacker, targetId) {
    if (!Array.isArray(attacker?.captureUnlocks)) return false;
    const id = String(targetId || '');
    const index = attacker.captureUnlocks.indexOf(id);
    if (index < 0) return false;
    attacker.captureUnlocks.splice(index, 1);
    return true;
}

export function canCaptureBraidedEntity(attacker, defender, config = {}, { consume = false } = {}) {
    const normalized = normalizeBraidedCaptureConfig(config);
    const targetId = defender?.id || defender?.pieceId || defender?.key || '';
    const defenderBraided = !isBraidTrivial(defender);

    if (normalized.braidedPieceShield && defenderBraided) {
        return {
            legal: false,
            reason: 'braided_piece_shield',
            defenderBraided,
            requiresUnbraid: false
        };
    }

    if (normalized.captureRequiresUnbraid && defenderBraided && !hasCaptureUnlock(attacker, targetId)) {
        return {
            legal: false,
            reason: 'capture_requires_unbraid',
            defenderBraided,
            requiresUnbraid: true
        };
    }

    if (consume && normalized.captureRequiresUnbraid && defenderBraided) {
        consumeCaptureUnlock(attacker, targetId);
    }

    return {
        legal: true,
        reason: 'ok',
        defenderBraided,
        requiresUnbraid: normalized.captureRequiresUnbraid && defenderBraided
    };
}

export function movementPenaltyActive(entity, config = {}) {
    const normalized = normalizeBraidedCaptureConfig(config);
    return normalized.braidedPiecePenalty && !isBraidTrivial(entity);
}

export function recordUnbraidCaptureUnlock(attacker, targetId, unbraidResult = {}) {
    const success = Boolean(unbraidResult.successfulPartialUnbraid || unbraidResult.fullyUnbraided);
    if (success) grantCaptureUnlock(attacker, targetId);
    return success;
}

export function braidedChessCaptureStatus(attacker, defender, config = {}) {
    return canCaptureBraidedEntity(attacker, defender, config);
}
