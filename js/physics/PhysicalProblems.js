import {
    createToricCodeMemoryUnbraidProblem,
    TORIC_CODE_MEMORY_UNBRAID_ID,
    topologyOptionsForToricCodeMemoryUnbraid
} from './ToricCodeMemoryUnbraidProblem.js';

export const PHYSICAL_PROBLEM_IDS = Object.freeze([
    TORIC_CODE_MEMORY_UNBRAID_ID
]);

export function normalizePhysicalProblemId(value = '') {
    const id = typeof value === 'object' ? value?.id : value;
    return PHYSICAL_PROBLEM_IDS.includes(String(id || '')) ? String(id) : '';
}

export function createPhysicalProblem(problem = null, config = {}) {
    const source = typeof problem === 'object' && problem ? problem : { id: problem };
    const id = normalizePhysicalProblemId(source);
    if (id === TORIC_CODE_MEMORY_UNBRAID_ID) {
        return createToricCodeMemoryUnbraidProblem({ ...source, ...config });
    }
    return null;
}

export function topologyOptionsForPhysicalProblem(problem = null, config = {}) {
    const source = typeof problem === 'object' && problem ? problem : { id: problem };
    const id = normalizePhysicalProblemId(source);
    if (id === TORIC_CODE_MEMORY_UNBRAID_ID) {
        return topologyOptionsForToricCodeMemoryUnbraid({ ...source, ...config });
    }
    return null;
}

export { TORIC_CODE_MEMORY_UNBRAID_ID } from './ToricCodeMemoryUnbraidProblem.js';
