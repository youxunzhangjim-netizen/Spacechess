import { applyAnyonAutomorphism } from './AnyonAlgebra.js';

export function vertexKey(vertex) {
    return Array.isArray(vertex) ? vertex.join(',') : String(vertex);
}

export function sameVertex(a, b) {
    return vertexKey(a) === vertexKey(b);
}

export function createRectTorusTopology({ width = 8, height = 8, twistSeams = false } = {}) {
    const w = Math.max(1, Math.floor(Number(width) || 8));
    const h = Math.max(1, Math.floor(Number(height) || 8));
    const normalize = ([x, y]) => [((x % w) + w) % w, ((y % h) + h) % h];
    return {
        name: twistSeams ? 'twisted_rect_torus' : 'rect_torus',
        width: w,
        height: h,
        normalize,
        neighbors(vertex) {
            const [x, y] = normalize(vertex);
            return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].map(normalize);
        },
        edgeWrapInfo(edge) {
            const from = normalize(edge.from);
            const rawTo = edge.to;
            const to = normalize(rawTo);
            const dx = rawTo[0] - from[0];
            const dy = rawTo[1] - from[1];
            const wrapX = rawTo[0] < 0 || rawTo[0] >= w || Math.abs(dx) > 1;
            const wrapY = rawTo[1] < 0 || rawTo[1] >= h || Math.abs(dy) > 1;
            return { from, to, wrapX, wrapY };
        },
        homologyCycleCrossing(edge) {
            const info = this.edgeWrapInfo(edge);
            return {
                x: info.wrapX ? signedWrap(edge.from[0], edge.to[0], w) : 0,
                y: info.wrapY ? signedWrap(edge.from[1], edge.to[1], h) : 0
            };
        },
        seamTransform(edge) {
            const crossing = this.homologyCycleCrossing(edge);
            return twistSeams && (crossing.x || crossing.y) ? 'twist' : 'identity';
        }
    };
}

export function signedWrap(from, to, size) {
    if (to < 0 || to - from < -1) return -1;
    if (to >= size || to - from > 1) return 1;
    return 0;
}

export function pathEdges(path = []) {
    const edges = [];
    for (let index = 1; index < path.length; index++) {
        edges.push({ from: path[index - 1], to: path[index] });
    }
    return edges;
}

export function isClosedLoop(path = []) {
    return path.length > 2 && sameVertex(path[0], path[path.length - 1]);
}

export function windingNumbers(path = [], topology) {
    const total = { x: 0, y: 0 };
    if (!topology?.homologyCycleCrossing) return total;
    for (const edge of pathEdges(path)) {
        const crossing = topology.homologyCycleCrossing(edge);
        total.x += crossing.x || 0;
        total.y += crossing.y || 0;
    }
    return total;
}

export function noncontractibleCycleCrossed(path = [], topology) {
    const winding = windingNumbers(path, topology);
    return winding.x !== 0 || winding.y !== 0;
}

export function applySeamTransforms(type, path = [], topology, model) {
    if (!topology?.seamTransform) return type;
    return pathEdges(path).reduce((current, edge) =>
        applyAnyonAutomorphism(current, topology.seamTransform(edge), model), type);
}

export function loopWindsAroundDefect(path = [], defect, topology) {
    if (!isClosedLoop(path) || !Array.isArray(defect)) return false;
    const normalizedPath = topology?.normalize ? path.map((vertex) => topology.normalize(vertex)) : path;
    const xs = normalizedPath.map((vertex) => vertex[0]);
    const ys = normalizedPath.map((vertex) => vertex[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const [dx, dy] = topology?.normalize ? topology.normalize(defect) : defect;
    return dx > minX && dx < maxX && dy > minY && dy < maxY;
}

export function localEncirclement(path = [], targetVertex, topology) {
    return loopWindsAroundDefect(path, targetVertex, topology);
}

export function topologyEdgeSummary(edge, topology) {
    const wrapInfo = topology?.edgeWrapInfo?.(edge) || {};
    const homology = topology?.homologyCycleCrossing?.(edge) || { x: 0, y: 0 };
    const transform = topology?.seamTransform?.(edge) || 'identity';
    return { wrapInfo, homology, transform };
}
