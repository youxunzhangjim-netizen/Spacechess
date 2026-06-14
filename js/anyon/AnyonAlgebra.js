import {
    DEFAULT_BRAID_MEMORY_CONFIG,
    normalizeBraidMemoryConfig
} from './BraidMemory.js';
import {
    DEFAULT_BRAIDED_CAPTURE_CONFIG,
    normalizeBraidedCaptureConfig
} from './BraidedCapture.js';

export const ANYON_MODELS = Object.freeze({
    toric_code: Object.freeze(['1', 'e', 'm', 'psi']),
    ising: Object.freeze(['1', 'sigma', 'psi']),
    fibonacci: Object.freeze(['1', 'tau']),
    zn: Object.freeze(['1'])
});

export const BRAID_EFFECTS = Object.freeze([
    'add_braid_token',
    'flip_parity',
    'disable_one_turn',
    'score_bonus'
]);

export const DEFAULT_ANYON_CONFIG = Object.freeze({
    anyonModel: 'toric_code',
    phaseModel: 'off',
    generalAnyonGrade: 2,
    braidEffect: 'add_braid_token',
    enableFusionChannels: true,
    enablePathHistory: true,
    enableTopologySeamTransforms: true,
    vacuumFusionBehavior: 'remove',
    ...DEFAULT_BRAIDED_CAPTURE_CONFIG,
    ...DEFAULT_BRAID_MEMORY_CONFIG
});

const TORIC_FUSION = {
    1: { 1: ['1'], e: ['e'], m: ['m'], psi: ['psi'] },
    e: { 1: ['e'], e: ['1'], m: ['psi'], psi: ['m'] },
    m: { 1: ['m'], e: ['psi'], m: ['1'], psi: ['e'] },
    psi: { 1: ['psi'], e: ['m'], m: ['e'], psi: ['1'] }
};

const ISING_FUSION = {
    1: { 1: ['1'], sigma: ['sigma'], psi: ['psi'] },
    sigma: { 1: ['sigma'], sigma: ['1', 'psi'], psi: ['sigma'] },
    psi: { 1: ['psi'], sigma: ['sigma'], psi: ['1'] }
};

const FIBONACCI_FUSION = {
    1: { 1: ['1'], tau: ['tau'] },
    tau: { 1: ['tau'], tau: ['1', 'tau'] }
};

const FUSION_TABLES = Object.freeze({
    toric_code: TORIC_FUSION,
    ising: ISING_FUSION,
    fibonacci: FIBONACCI_FUSION
});

const TORIC_BRAID_PHASES = {
    e: { m: -1 },
    m: { e: -1 }
};

const TWIST_AUTOMORPHISM = Object.freeze({
    1: '1',
    e: 'm',
    m: 'e',
    psi: 'psi',
    sigma: 'sigma',
    tau: 'tau'
});

export function normalizeAnyonModel(model = DEFAULT_ANYON_CONFIG.anyonModel) {
    return Object.prototype.hasOwnProperty.call(ANYON_MODELS, model) ? model : DEFAULT_ANYON_CONFIG.anyonModel;
}

function normalizeZnGrade(grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade) {
    const parsed = Math.floor(Number(grade));
    return Number.isFinite(parsed)
        ? Math.max(2, Math.min(64, parsed))
        : DEFAULT_ANYON_CONFIG.generalAnyonGrade;
}

function znTypeIndex(type, grade) {
    if (String(type || '').trim() === '1') return 0;
    const match = String(type || '').trim().match(/^(?:z|q|a)_?(\d+)$/i);
    if (!match) return null;
    return Number(match[1]) % normalizeZnGrade(grade);
}

export function anyonTypes(model = DEFAULT_ANYON_CONFIG.anyonModel, grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade) {
    const anyonModel = normalizeAnyonModel(model);
    if (anyonModel === 'zn') {
        const n = normalizeZnGrade(grade);
        return ['1', ...Array.from({ length: n - 1 }, (_, index) => `z${index + 1}`)];
    }
    return [...ANYON_MODELS[anyonModel]];
}

export function normalizeAnyonType(
    type = '1',
    model = DEFAULT_ANYON_CONFIG.anyonModel,
    grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade
) {
    const anyonModel = normalizeAnyonModel(model);
    const value = String(type || '1').trim();
    if (anyonModel === 'zn') {
        const index = znTypeIndex(value, grade);
        return index ? `z${index}` : '1';
    }
    return ANYON_MODELS[anyonModel].includes(value) ? value : '1';
}

export function normalizeAnyonConfig(config = {}) {
    const anyonModel = normalizeAnyonModel(config.anyonModel);
    const braidEffect = BRAID_EFFECTS.includes(config.braidEffect) ? config.braidEffect : DEFAULT_ANYON_CONFIG.braidEffect;
    const parsedGrade = Math.floor(Number(config.generalAnyonGrade));
    const generalAnyonGrade = Number.isFinite(parsedGrade)
        ? Math.max(2, Math.min(64, parsedGrade))
        : DEFAULT_ANYON_CONFIG.generalAnyonGrade;
    const phaseModel = config.phaseModel === 'zn_phase' || anyonModel === 'zn' ? 'zn_phase' : 'off';
    const braidMemory = normalizeBraidMemoryConfig(config);
    const braidedCapture = normalizeBraidedCaptureConfig(config);
    return {
        ...DEFAULT_ANYON_CONFIG,
        ...config,
        ...braidMemory,
        ...braidedCapture,
        anyonModel,
        phaseModel,
        generalAnyonGrade,
        braidEffect,
        enableFusionChannels: config.enableFusionChannels ?? DEFAULT_ANYON_CONFIG.enableFusionChannels,
        enablePathHistory: config.enablePathHistory ?? DEFAULT_ANYON_CONFIG.enablePathHistory,
        enableTopologySeamTransforms: config.enableTopologySeamTransforms ?? DEFAULT_ANYON_CONFIG.enableTopologySeamTransforms
    };
}

export function fusionOutputs(
    a,
    b,
    model = DEFAULT_ANYON_CONFIG.anyonModel,
    grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade
) {
    const anyonModel = normalizeAnyonModel(model);
    const left = normalizeAnyonType(a, anyonModel, grade);
    const right = normalizeAnyonType(b, anyonModel, grade);
    if (anyonModel === 'zn') {
        const n = normalizeZnGrade(grade);
        const output = (znTypeIndex(left, n) + znTypeIndex(right, n)) % n;
        return [output === 0 ? '1' : `z${output}`];
    }
    return [...(FUSION_TABLES[anyonModel]?.[left]?.[right]
        || FUSION_TABLES[anyonModel]?.[right]?.[left]
        || [])];
}

export function canFuseToVacuum(
    a,
    b,
    model = DEFAULT_ANYON_CONFIG.anyonModel,
    grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade
) {
    return fusionOutputs(a, b, model, grade).includes('1');
}

export function createFusionResult(a, b, config = {}) {
    const normalized = normalizeAnyonConfig(config);
    const outputs = fusionOutputs(a, b, normalized.anyonModel, normalized.generalAnyonGrade);
    const resolved = outputs.length === 1 ? outputs[0] : null;
    return {
        input: [
            normalizeAnyonType(a, normalized.anyonModel, normalized.generalAnyonGrade),
            normalizeAnyonType(b, normalized.anyonModel, normalized.generalAnyonGrade)
        ],
        outputs,
        resolved,
        vacuum: outputs.includes('1'),
        fusionChannel: outputs.length > 1
            ? { model: normalized.anyonModel, inputs: [a, b], possibleOutputs: outputs, selected: null }
            : null
    };
}

export function mutualBraidPhase(movingType, stationaryType, model = DEFAULT_ANYON_CONFIG.anyonModel) {
    if (normalizeAnyonModel(model) !== 'toric_code') return 1;
    const moving = normalizeAnyonType(movingType, 'toric_code');
    const stationary = normalizeAnyonType(stationaryType, 'toric_code');
    return TORIC_BRAID_PHASES[moving]?.[stationary] ?? 1;
}

export function braidEffectForPhase(phase, config = {}) {
    const normalized = normalizeAnyonConfig(config);
    if (phase !== -1) return { phase, effect: 'none', delta: 0 };
    return { phase, effect: normalized.braidEffect, delta: 1 };
}

export function applyTwistAutomorphism(
    type,
    model = DEFAULT_ANYON_CONFIG.anyonModel,
    grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade
) {
    const anyonModel = normalizeAnyonModel(model);
    const normalized = normalizeAnyonType(type, anyonModel, grade);
    if (anyonModel === 'zn') return normalized;
    const mapped = TWIST_AUTOMORPHISM[normalized] || normalized;
    return normalizeAnyonType(mapped, anyonModel, grade);
}

export function applyAnyonAutomorphism(
    type,
    automorphism = 'identity',
    model = DEFAULT_ANYON_CONFIG.anyonModel,
    grade = DEFAULT_ANYON_CONFIG.generalAnyonGrade
) {
    if (!automorphism || automorphism === 'identity') return normalizeAnyonType(type, model, grade);
    if (automorphism === 'twist' || automorphism === 'em_duality') {
        return applyTwistAutomorphism(type, model, grade);
    }
    if (typeof automorphism === 'object') {
        return normalizeAnyonType(automorphism[type] || type, model, grade);
    }
    return normalizeAnyonType(type, model, grade);
}

export function previewAnyonCapture(attackerType, defenderType, config = {}) {
    const fusion = createFusionResult(attackerType, defenderType, config);
    return {
        legalCapture: fusion.vacuum,
        fusion,
        captureMode: fusion.vacuum ? 'capture' : 'fuse'
    };
}
