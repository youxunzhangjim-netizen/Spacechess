import { TorusNetworkManager } from './TorusNetworkManager.js';

const ROOM_STORAGE_PREFIX = '3dchess:sphere:room:';

export class SphereNetworkManager extends TorusNetworkManager {
    variantKey() {
        return 'sphere';
    }

    storageKey(roomId = this.roomId) {
        return `${ROOM_STORAGE_PREFIX}${roomId}`;
    }
}
