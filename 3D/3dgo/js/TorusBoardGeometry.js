const TWO_PI = Math.PI * 2;

export const TORUS_MAJOR_RADIUS = 3.35;
export const TORUS_MINOR_RADIUS = 1.22;

export function torusFrameFromAngles(
    u,
    v,
    lift = 0,
    majorRadius = TORUS_MAJOR_RADIUS,
    minorRadius = TORUS_MINOR_RADIUS
) {
    const tubeRadius = minorRadius + lift;
    const ringRadius = majorRadius + tubeRadius * Math.cos(v);

    return {
        position: {
            x: ringRadius * Math.cos(u),
            y: ringRadius * Math.sin(u),
            z: tubeRadius * Math.sin(v)
        },
        normal: {
            x: Math.cos(u) * Math.cos(v),
            y: Math.sin(u) * Math.cos(v),
            z: Math.sin(v)
        }
    };
}

export function torusFrame(
    coord,
    size,
    lift = 0,
    majorRadius = TORUS_MAJOR_RADIUS,
    minorRadius = TORUS_MINOR_RADIUS
) {
    const boardSize = Math.max(1, Number(size) || 1);
    const u = (Number(coord?.[0]) / boardSize) * TWO_PI;
    const v = (Number(coord?.[1]) / boardSize) * TWO_PI;
    return torusFrameFromAngles(u, v, lift, majorRadius, minorRadius);
}

export function createTorusSurfaceData(
    majorSegments = 192,
    minorSegments = 64,
    majorRadius = TORUS_MAJOR_RADIUS,
    minorRadius = TORUS_MINOR_RADIUS
) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let major = 0; major <= majorSegments; major++) {
        const u = (major / majorSegments) * TWO_PI;
        for (let minor = 0; minor <= minorSegments; minor++) {
            const v = (minor / minorSegments) * TWO_PI;
            const frame = torusFrameFromAngles(u, v, 0, majorRadius, minorRadius);
            positions.push(frame.position.x, frame.position.y, frame.position.z);
            normals.push(frame.normal.x, frame.normal.y, frame.normal.z);
            uvs.push(major / majorSegments, minor / minorSegments);
        }
    }

    const stride = minorSegments + 1;
    for (let major = 0; major < majorSegments; major++) {
        for (let minor = 0; minor < minorSegments; minor++) {
            const a = major * stride + minor;
            const b = (major + 1) * stride + minor;
            const c = b + 1;
            const d = a + 1;
            indices.push(a, b, d, b, c, d);
        }
    }

    return { positions, normals, uvs, indices };
}
