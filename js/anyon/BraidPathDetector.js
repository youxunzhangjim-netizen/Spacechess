import {
    braidGeneratorIndex,
    braidSignFromDirection,
    braidSignFromWinding
} from './BraidMemory.js';

const HOMOLOGY_AXES = Object.freeze(['x', 'y', 'z', 'w']);

function cloneVertex(vertex) {
    return Array.isArray(vertex) ? [...vertex] : vertex;
}

function vertexOf(target) {
    return target?.vertex || target?.coord || target?.position || null;
}

function targetIdOf(target) {
    return String(target?.id || target?.targetId || target || '');
}

function normalizeVertex(topology, vertex) {
    if (!Array.isArray(vertex)) return vertex;
    return topology?.normalize ? topology.normalize(vertex) : [...vertex];
}

function sameVertex(a, b) {
    return Array.isArray(a) && Array.isArray(b)
        ? a.join(',') === b.join(',')
        : String(a) === String(b);
}

function pathDirection(path = []) {
    if (path.length < 2 || !Array.isArray(path[0]) || !Array.isArray(path[1])) return [];
    return path[1].map((value, index) => value - path[0][index]);
}

function edgeFromPathStep(topology, from, to, direction = null) {
    if (topology?.step && Array.isArray(direction) && direction.length) {
        const stepped = topology.step(from, direction);
        if (stepped?.edge) return stepped.edge;
    }
    return {
        from: cloneVertex(from),
        rawTo: cloneVertex(to),
        to: cloneVertex(to),
        direction: direction || (Array.isArray(from) && Array.isArray(to)
            ? to.map((value, index) => value - from[index])
            : [])
    };
}

export function pathEdgesForTopology(path = [], topology, directions = []) {
    const edges = [];
    for (let index = 1; index < path.length; index++) {
        edges.push(edgeFromPathStep(topology, path[index - 1], path[index], directions[index - 1]));
    }
    return edges;
}

function edgeHomology(edge, topology) {
    const crossing = topology?.homologyCycleCrossing?.(edge) || edge?.homology || {};
    return {
        x: crossing.x || 0,
        y: crossing.y || 0,
        z: crossing.z || 0,
        w: crossing.w || 0
    };
}

function edgeSeamTransform(edge, topology) {
    return topology?.seamTransform?.(edge) || edge?.anyonAutomorphism || 'identity';
}

function edgeWrapInfo(edge, topology) {
    return topology?.edgeWrapInfo?.(edge) || {
        wrapX: edge?.wrapX || 0,
        wrapY: edge?.wrapY || 0,
        wrapZ: edge?.wrapZ || 0,
        wrapW: edge?.wrapW || 0,
        twisted: Boolean(edge?.twisted)
    };
}

function signedArea2D(path = []) {
    if (path.length < 3) return 0;
    let area = 0;
    for (let index = 0; index < path.length; index++) {
        const a = path[index];
        const b = path[(index + 1) % path.length];
        if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) return 0;
        area += a[0] * b[1] - b[0] * a[1];
    }
    return area / 2;
}

function fallbackLocalEncirclement(path = [], targetVertex, topology) {
    if (path.length < 4 || !Array.isArray(targetVertex)) return false;
    const normalizedPath = path.map((vertex) => normalizeVertex(topology, vertex)).filter(Boolean);
    const first = normalizedPath[0];
    const last = normalizedPath[normalizedPath.length - 1];
    if (!sameVertex(first, last)) return false;
    const xs = normalizedPath.map((vertex) => vertex[0]);
    const ys = normalizedPath.map((vertex) => vertex[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const normalizedTarget = normalizeVertex(topology, targetVertex);
    return normalizedTarget[0] > minX
        && normalizedTarget[0] < maxX
        && normalizedTarget[1] > minY
        && normalizedTarget[1] < maxY;
}

function localEncirclementDetected(path, target, topology) {
    const vertex = vertexOf(target);
    if (!vertex) return false;
    if (topology?.detectLocalEncirclement) return Boolean(topology.detectLocalEncirclement(path, vertex, target));
    return fallbackLocalEncirclement(path, vertex, topology);
}

function makeEvent({ movingId, targetId, index, sign, path, tick, reason, edge = null, target = null }) {
    return {
        movingId: String(movingId),
        targetId: String(targetId),
        generator: 'sigma',
        index,
        sign,
        path: path.map(cloneVertex),
        tick,
        reason,
        edge,
        target
    };
}

export function detectTopologyBraidEvents({
    movingToken,
    path = [],
    topology,
    targets = [],
    defects = [],
    explicitTargets = [],
    edges = null,
    directions = [],
    tick = 0,
    tokenIds = []
} = {}) {
    if (!movingToken || path.length < 2) return [];
    const movingId = movingToken.id;
    const normalizedPath = path.map((vertex) => normalizeVertex(topology, vertex)).filter(Boolean);
    const resolvedEdges = edges || pathEdgesForTopology(path, topology, directions);
    const targetIds = [...new Set([
        ...tokenIds.map(String),
        ...targets.map(targetIdOf),
        ...defects.map(targetIdOf),
        ...explicitTargets.map((entry) => targetIdOf(entry.target || entry))
    ].filter(Boolean))];
    const events = [];

    for (const entry of explicitTargets) {
        const target = entry.target || entry;
        const targetId = targetIdOf(target);
        if (!targetId) continue;
        events.push(makeEvent({
            movingId,
            targetId,
            index: entry.index ?? braidGeneratorIndex([...targetIds, movingId, targetId], movingId, targetId),
            sign: entry.sign ?? braidSignFromDirection(entry.direction || directions[0] || pathDirection(path)),
            path: entry.path || normalizedPath,
            tick,
            reason: entry.reason || 'explicit_path',
            target
        }));
    }

    resolvedEdges.forEach((edge, edgeIndex) => {
        const transform = edgeSeamTransform(edge, topology);
        const homology = edgeHomology(edge, topology);
        const wrapInfo = edgeWrapInfo(edge, topology);
        const edgePath = [
            cloneVertex(edge?.from || normalizedPath[edgeIndex]),
            cloneVertex(edge?.to || normalizedPath[edgeIndex + 1])
        ];
        const axis = HOMOLOGY_AXES.find((name) => homology[name] !== 0);
        if (transform && transform !== 'identity') {
            const targetId = `branch_cut:${axis || edgeIndex}`;
            events.push(makeEvent({
                movingId,
                targetId,
                index: braidGeneratorIndex([...targetIds, movingId, targetId], movingId, targetId),
                sign: axis ? Math.sign(homology[axis]) : braidSignFromDirection(edge?.direction || []),
                path: edgePath,
                tick,
                reason: 'twisted_seam',
                edge: { homology, wrapInfo, transform }
            }));
            return;
        }

        for (const homologyAxis of HOMOLOGY_AXES) {
            if (!homology[homologyAxis]) continue;
            const targetId = `cycle:${homologyAxis}`;
            events.push(makeEvent({
                movingId,
                targetId,
                index: braidGeneratorIndex([...targetIds, movingId, targetId], movingId, targetId),
                sign: Math.sign(homology[homologyAxis]),
                path: edgePath,
                tick,
                reason: 'noncontractible_cycle',
                edge: { homology, wrapInfo, transform }
            }));
        }
    });

    const localSign = signedArea2D(normalizedPath) < 0 ? -1 : 1;
    for (const target of [...targets, ...defects]) {
        const targetId = targetIdOf(target);
        if (!targetId || targetId === String(movingId)) continue;
        if (!localEncirclementDetected(normalizedPath, target, topology)) continue;
        events.push(makeEvent({
            movingId,
            targetId,
            index: braidGeneratorIndex([...targetIds, movingId, targetId], movingId, targetId),
            sign: localSign,
            path: normalizedPath,
            tick,
            reason: target.defect ? 'defect_encirclement' : 'local_encirclement',
            target
        }));
    }

    return events;
}
