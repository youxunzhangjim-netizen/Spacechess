import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS, GoGameLogic, otherColor, valueToColor } from './GoGame.js';
import { GoNetworkManager } from './NetworkManager.js';

const PUBLIC_GAME_URL = 'https://youxunzhangjim-netizen.github.io/Spacechess/3D/3dgo/';
const STORAGE_PREFIX = '3dgo:room:';
const KOMI = 7.5;
const LANGUAGE_STORAGE_KEY = '3dgo:language';

const I18N = {
    en: {
        language: { label: 'Language', english: 'English', chinese: 'Chinese' },
        app: { title: '3D Go', tagline: 'R3 lattice Go and T2 torus Go with 9, 13, and 19 scale options.' },
        colors: { black: 'Black', white: 'White' },
        captured: { byBlack: 'Captured by Black', byWhite: 'Captured by White', stones: ({ count }) => count + ' ' + (count === 1 ? 'stone' : 'stones') },
        controls: { title: 'Game Controls', gameMode: 'Game Mode', local: 'Local Pass and Play', online: 'Online Multiplayer', goSpace: 'Go Space', boardScale: 'Board Scale', timer: 'Timer per Player', resetCamera: 'Reset Camera', pass: 'Pass', agreeCount: 'Agree Count', newGame: 'New Game', surrender: 'Surrender' },
        online: { localStatus: 'Local pass and play', findMatch: 'Find Match', privateRoom: 'PRIVATE ROOM', createRoom: 'Create Room', or: 'OR', roomInput: '5-digit room code or shared link', joinRoom: 'Join Room', roomCode: 'Room Code', copy: 'Copy', copied: 'Copied', onlineAs: ({ color }) => 'Online as ' + color },
        mode: { r3Option: 'R3 Go', t2Option: 'T2 Torus Go', r3Display: ({ size }) => size + '^3 R3 Go', t2Display: ({ size }) => size + ' x ' + size + ' T2 Go', r3Info: 'R3 uses open boundaries in x, y, and z.', t2Info: 'T2 wraps both directions on the torus board.' },
        timer: { none: 'No Timer', five: '5 Minutes', ten: '10 Minutes', fifteen: '15 Minutes', thirty: '30 Minutes', hour: '1 Hour' },
        history: { title: 'Move History', started: 'Game started.' },
        rules: { title: 'Rules', text: 'Area scoring with 7.5 komi. R3 groups use six face-adjacent liberties. T2 groups use four torus-adjacent liberties with both directions periodic.' },
        status: { start: 'Select a glowing node for Black.', waitingForColor: ({ color }) => 'Waiting for ' + color + '.', toPlay: ({ color }) => color + ' to play', countingPending: 'Counting pending', twoPasses: 'Two passes. Both players must agree to count.', agreed: ({ color, other }) => color + ' agreed. Waiting for ' + other + '.', surrendered: ({ color, winner }) => color + ' surrendered. ' + winner + ' wins.', timedOut: ({ color, winner }) => color + ' ran out of time. ' + winner + ' wins.', synced: 'Synced online game.', finalCount: 'Final count:' },
        score: { draw: 'Draw', wins: ({ color }) => color + ' wins', winsBy: ({ color, margin }) => color + ' wins by ' + margin, summary: ({ black, white, komi, result }) => 'Black ' + black + ', White ' + white + ' including ' + komi + ' komi. ' + result }
    },
    zh: {
        language: { label: '语言', english: 'English', chinese: '中文' },
        app: { title: '3D 围棋', tagline: 'R3 格点围棋与 T2 环面围棋，支持 9、13、19 尺寸。' },
        colors: { black: '黑方', white: '白方' },
        captured: { byBlack: '黑方提子', byWhite: '白方提子', stones: ({ count }) => count + ' 子' },
        controls: { title: '游戏控制', gameMode: '游戏模式', local: '本地轮流', online: '在线多人', goSpace: '围棋空间', boardScale: '棋盘尺度', timer: '每方时间', resetCamera: '重置视角', pass: '停一手', agreeCount: '同意数目', newGame: '新游戏', surrender: '认输' },
        online: { localStatus: '本地轮流', findMatch: '寻找匹配', privateRoom: '私人房间', createRoom: '创建房间', or: '或', roomInput: '5 位房间码或分享链接', joinRoom: '加入房间', roomCode: '房间码', copy: '复制', copied: '已复制', onlineAs: ({ color }) => '在线身份：' + color },
        mode: { r3Option: 'R3 围棋', t2Option: 'T2 环面围棋', r3Display: ({ size }) => size + '^3 R3 围棋', t2Display: ({ size }) => size + ' x ' + size + ' T2 围棋', r3Info: 'R3 在 x、y、z 三个方向使用开放边界。', t2Info: 'T2 在环面棋盘的两个方向都周期连接。' },
        timer: { none: '无计时', five: '5 分钟', ten: '10 分钟', fifteen: '15 分钟', thirty: '30 分钟', hour: '1 小时' },
        history: { title: '走法记录', started: '游戏开始。' },
        rules: { title: '规则', text: '面积计分，贴目 7.5。R3 棋串使用六个面相邻气；T2 棋串使用环面上四个周期相邻气。' },
        status: { start: '请选择一个发光节点让黑方落子。', waitingForColor: ({ color }) => '等待' + color + '。', toPlay: ({ color }) => color + '落子', countingPending: '等待数目确认', twoPasses: '双方连续停一手。两位玩家都需要同意数目。', agreed: ({ color, other }) => color + '已同意，等待' + other + '。', surrendered: ({ color, winner }) => color + '认输，' + winner + '获胜。', timedOut: ({ color, winner }) => color + '超时，' + winner + '获胜。', synced: '已同步在线棋局。', finalCount: '终局数目：' },
        score: { draw: '平局', wins: ({ color }) => color + '获胜', winsBy: ({ color, margin }) => color + '胜 ' + margin, summary: ({ black, white, komi, result }) => '黑方 ' + black + '，白方 ' + white + '，含贴目 ' + komi + '。' + result }
    }
};

let currentLanguage = (() => {
    try {
        const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        return Object.prototype.hasOwnProperty.call(I18N, stored) ? stored : 'en';
    } catch {
        return 'en';
    }
})();

function readTranslation(lang, key) {
    return key.split('.').reduce((node, part) => node?.[part], I18N[lang]);
}

function tr(key, params = {}) {
    const value = readTranslation(currentLanguage, key) ?? readTranslation('en', key) ?? key;
    return typeof value === 'function' ? value(params) : String(value);
}

function applyLanguage(root = document) {
    document.documentElement.lang = currentLanguage;
    document.title = tr('app.title');
    root.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = tr(element.dataset.i18n); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.setAttribute('placeholder', tr(element.dataset.i18nPlaceholder)); });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', tr(element.dataset.i18nAriaLabel)); });
    root.querySelectorAll('[data-i18n-title]').forEach((element) => { element.setAttribute('title', tr(element.dataset.i18nTitle)); });
    root.querySelectorAll('[data-lang-option]').forEach((button) => {
        const active = button.dataset.langOption === currentLanguage;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function setLanguage(language) {
    if (!Object.prototype.hasOwnProperty.call(I18N, language) || language === currentLanguage) return;
    currentLanguage = language;
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch {}
    applyLanguage();
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
}

class Go3DRenderer {
    constructor(app) {
        this.app = app;
        this.canvas = document.getElementById('goCanvas');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b0f14);
        this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.zoomSpeed = 0.7;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 0.12;
        this.pointer = new THREE.Vector2();
        this.boardGroup = new THREE.Group();
        this.stoneGroup = new THREE.Group();
        this.hoverGroup = new THREE.Group();
        this.scene.add(this.boardGroup, this.stoneGroup, this.hoverGroup);
        this.pointCoords = [];
        this.pointPositions = [];
        this.nodePoints = null;
        this.mode = '';
        this.size = 0;
        this.clock = new THREE.Clock();
        this.initLights();
        this.bind();
        this.resize();
        this.resetCamera();
        this.animate();
    }

    initLights() {
        const hemi = new THREE.HemisphereLight(0xdff6ff, 0x15110d, 1.6);
        this.scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(5, 9, 7);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        this.scene.add(key);
        const fill = new THREE.PointLight(0x38bdf8, 1.4, 28);
        fill.position.set(-6, 3, -5);
        this.scene.add(fill);
    }

    bind() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
        this.canvas.addEventListener('pointerleave', () => this.setHover(null));
        this.canvas.addEventListener('click', (event) => this.handleClick(event));
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const width = Math.max(320, rect.width);
        const height = Math.max(360, rect.height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    clearGroup(group) {
        while (group.children.length) {
            const child = group.children.pop();
            child.geometry?.dispose?.();
            if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose?.());
            else child.material?.dispose?.();
        }
    }

    buildBoard(logic) {
        if (this.mode === logic.topology && this.size === logic.size) return;
        this.mode = logic.topology;
        this.size = logic.size;
        this.clearGroup(this.boardGroup);
        this.clearGroup(this.hoverGroup);
        this.pointCoords = [];
        this.pointPositions = [];
        this.nodePoints = null;
        if (logic.topology === 'r3') this.buildR3(logic.size);
        else this.buildTorus(logic.size);
        this.resetCamera();
    }

    buildR3(size) {
        const linePositions = [];
        const scale = this.r3Scale(size);
        const material = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.26 });
        const addSegment = (a, b) => {
            linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        };
        for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) addSegment(this.r3Position([0, y, z], size), this.r3Position([size - 1, y, z], size));
            for (let x = 0; x < size; x++) addSegment(this.r3Position([x, 0, z], size), this.r3Position([x, size - 1, z], size));
        }
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) addSegment(this.r3Position([x, y, 0], size), this.r3Position([x, y, size - 1], size));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        this.boardGroup.add(new THREE.LineSegments(geometry, material));

        const pointPositions = [];
        for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const coord = [x, y, z];
                    const p = this.r3Position(coord, size);
                    this.pointCoords.push(coord);
                    this.pointPositions.push(p);
                    pointPositions.push(p.x, p.y, p.z);
                }
            }
        }
        this.addNodePoints(pointPositions, size <= 9 ? 0.06 : size <= 13 ? 0.045 : 0.034);
        const axes = new THREE.AxesHelper(scale * (size - 1) * 0.65);
        axes.material.depthTest = false;
        axes.renderOrder = 3;
        this.boardGroup.add(axes);
    }

    buildTorus(size) {
        const torus = new THREE.Mesh(
            new THREE.TorusGeometry(3.35, 1.22, 44, 144),
            new THREE.MeshPhysicalMaterial({ color: 0x4f3826, roughness: 0.64, metalness: 0.08, transparent: true, opacity: 0.28 })
        );
        torus.receiveShadow = true;
        this.boardGroup.add(torus);

        const lineMaterialA = new THREE.LineBasicMaterial({ color: 0xf6d58b, transparent: true, opacity: 0.42 });
        const lineMaterialB = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.42 });
        for (let y = 0; y < size; y++) this.boardGroup.add(this.torusLine(size, (i) => [i % size, y], lineMaterialA));
        for (let x = 0; x < size; x++) this.boardGroup.add(this.torusLine(size, (i) => [x, i % size], lineMaterialB));

        const pointPositions = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const coord = [x, y];
                const p = this.torusPosition(coord, size, 0.045).position;
                this.pointCoords.push(coord);
                this.pointPositions.push(p);
                pointPositions.push(p.x, p.y, p.z);
            }
        }
        this.addNodePoints(pointPositions, size <= 9 ? 0.075 : size <= 13 ? 0.06 : 0.048);
    }

    torusLine(size, coordFor, material) {
        const points = [];
        for (let i = 0; i <= size; i++) points.push(this.torusPosition(coordFor(i), size, 0.02).position);
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    }

    addNodePoints(positions, pointSize) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0xdff8ff,
            size: pointSize,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.86,
            depthWrite: false
        });
        this.nodePoints = new THREE.Points(geometry, material);
        this.boardGroup.add(this.nodePoints);
    }

    renderStones(logic) {
        this.buildBoard(logic);
        this.clearGroup(this.stoneGroup);
        const black = [];
        const white = [];
        for (let index = 0; index < logic.board.length; index++) {
            const value = logic.board[index];
            if (!value) continue;
            const coord = logic.coordFromIndex(index);
            const p = this.positionForCoord(coord, logic);
            if (value === COLORS.black) black.push(p);
            else white.push(p);
        }
        this.addStoneInstances(black, 'black', logic);
        this.addStoneInstances(white, 'white', logic);
    }

    addStoneInstances(positions, color, logic) {
        if (!positions.length) return;
        const radius = logic.topology === 'r3'
            ? (logic.size <= 9 ? 0.18 : logic.size <= 13 ? 0.13 : 0.095)
            : (logic.size <= 9 ? 0.16 : logic.size <= 13 ? 0.13 : 0.105);
        const stoneGeometry = new THREE.SphereGeometry(radius, 24, 16);
        const dotGeometry = new THREE.SphereGeometry(radius * 0.28, 16, 10);
        const stoneMaterial = new THREE.MeshPhysicalMaterial({
            color: color === 'black' ? 0x05070a : 0xf5f7fb,
            roughness: color === 'black' ? 0.3 : 0.18,
            metalness: 0.05,
            transparent: true,
            opacity: color === 'black' ? 0.78 : 0.72,
            transmission: 0.15
        });
        const dotMaterial = new THREE.MeshStandardMaterial({
            color: color === 'black' ? 0x38bdf8 : 0xfacc15,
            emissive: color === 'black' ? 0x38bdf8 : 0xfacc15,
            emissiveIntensity: 1.6
        });
        const stoneMesh = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, positions.length);
        const dotMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, positions.length);
        const matrix = new THREE.Matrix4();
        positions.forEach((pos, index) => {
            matrix.makeTranslation(pos.x, pos.y, pos.z);
            stoneMesh.setMatrixAt(index, matrix);
            dotMesh.setMatrixAt(index, matrix);
        });
        stoneMesh.castShadow = true;
        dotMesh.castShadow = true;
        this.stoneGroup.add(stoneMesh, dotMesh);
    }

    setHover(coord, logic = this.app.logic) {
        this.clearGroup(this.hoverGroup);
        if (!coord || logic.gameOver || logic.scoringPending) return;
        const index = logic.indexFromCoord(coord);
        if (index < 0 || logic.board[index] !== COLORS.empty) return;
        const p = this.positionForCoord(coord, logic);
        const radius = logic.topology === 'r3'
            ? (logic.size <= 9 ? 0.2 : logic.size <= 13 ? 0.145 : 0.105)
            : (logic.size <= 9 ? 0.18 : logic.size <= 13 ? 0.145 : 0.115);
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 20, 12),
            new THREE.MeshBasicMaterial({ color: logic.currentPlayer === 'black' ? 0x111827 : 0xffffff, transparent: true, opacity: 0.38 })
        );
        mesh.position.copy(p);
        this.hoverGroup.add(mesh);
    }

    pickCoord(event) {
        if (!this.nodePoints) return null;
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObject(this.nodePoints, false);
        if (!hits.length) return null;
        return this.pointCoords[hits[0].index] || null;
    }

    handlePointerMove(event) {
        const coord = this.pickCoord(event);
        this.setHover(coord);
    }

    handleClick(event) {
        const coord = this.pickCoord(event);
        if (coord) this.app.playAt(coord);
    }

    positionForCoord(coord, logic) {
        if (logic.topology === 't2') return this.torusPosition(coord, logic.size, 0.18).position;
        return this.r3Position(coord, logic.size);
    }

    r3Scale(size) {
        return 7.8 / Math.max(1, size - 1);
    }

    r3Position(coord, size) {
        const scale = this.r3Scale(size);
        const center = (size - 1) / 2;
        return new THREE.Vector3((coord[0] - center) * scale, (coord[2] - center) * scale, (coord[1] - center) * scale);
    }

    torusPosition(coord, size, lift = 0) {
        const u = (coord[0] / size) * Math.PI * 2;
        const v = (coord[1] / size) * Math.PI * 2;
        const R = 3.35;
        const r = 1.22;
        const normal = new THREE.Vector3(Math.cos(u) * Math.cos(v), Math.sin(v), Math.sin(u) * Math.cos(v)).normalize();
        const position = new THREE.Vector3(
            (R + (r + lift) * Math.cos(v)) * Math.cos(u),
            (r + lift) * Math.sin(v),
            (R + (r + lift) * Math.cos(v)) * Math.sin(u)
        );
        return { position, normal };
    }

    resetCamera() {
        if (this.app?.logic?.topology === 't2') {
            this.camera.position.set(0, 5.6, 8.2);
            this.controls.target.set(0, 0, 0);
        } else {
            this.camera.position.set(7.8, 7.4, 8.2);
            this.controls.target.set(0, 0, 0);
        }
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const elapsed = this.clock.getElapsedTime();
        this.stoneGroup.children.forEach((child) => {
            if (child.material?.emissive) child.material.emissiveIntensity = 1.25 + Math.sin(elapsed * 2.2) * 0.22;
        });
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

class Go3DApp {
    constructor() {
        this.modeSelect = document.getElementById('goModeSelect');
        this.sizeSelect = document.getElementById('boardSizeSelect');
        this.timerSelect = document.getElementById('timerSelect');
        this.gameModeSelect = document.getElementById('gameModeSelect');
        this.onlineControls = document.getElementById('onlineControls');
        this.statusEl = document.getElementById('gameStatus');
        this.onlineColorEl = document.getElementById('onlineColorStatus');
        this.turnEl = document.getElementById('playerTurn');
        this.modeDisplay = document.getElementById('modeDisplay');
        this.modeInfo = document.getElementById('modeInfo');
        this.blackTimerEl = document.getElementById('blackTimer');
        this.whiteTimerEl = document.getElementById('whiteTimer');
        this.blackTimerBox = document.getElementById('blackTimerBox');
        this.whiteTimerBox = document.getElementById('whiteTimerBox');
        this.blackCapturedEl = document.getElementById('blackCaptured');
        this.whiteCapturedEl = document.getElementById('whiteCaptured');
        this.historyEl = document.getElementById('moveHistoryList');
        this.scorePanel = document.getElementById('scorePanel');
        this.scoreResult = document.getElementById('scoreResult');
        this.passBtn = document.getElementById('passBtn');
        this.countBtn = document.getElementById('countBtn');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.surrenderBtn = document.getElementById('surrenderBtn');
        this.roomIdInput = document.getElementById('roomIdInput');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.shareLinkInput = document.getElementById('shareLinkInput');
        this.applyUrlSettings();
        this.logic = this.createLogic();
        this.renderer = new Go3DRenderer(this);
        this.network = new GoNetworkManager(this, { publicGameUrl: PUBLIC_GAME_URL, storagePrefix: STORAGE_PREFIX });
        this.myColor = null;
        this.settingsLocked = false;
        this.gameStarted = false;
        this.timeLimit = Number(this.timerSelect.value) || 0;
        this.timeRemaining = { black: this.timeLimit, white: this.timeLimit };
        this.timerInterval = null;
        this.bindEvents();
        applyLanguage();
        this.setStatus(tr('status.start'));
        this.updateUI();
        this.tryJoinSharedRoomFromUrl();
    }

    applyUrlSettings() {
        const params = new URLSearchParams(window.location.search);
        const mode = String(params.get('mode') || '').toLowerCase();
        if (mode === 'r3' || mode === 't2') this.modeSelect.value = mode;

        const size = params.get('size');
        if (['9', '13', '19'].includes(size)) this.sizeSelect.value = size;

        const timer = params.get('timer');
        if ([...this.timerSelect.options].some((option) => option.value === timer)) {
            this.timerSelect.value = timer;
        }
    }

    tryJoinSharedRoomFromUrl() {
        const roomId = new URLSearchParams(window.location.search).get('room');
        if (!roomId) return;
        this.gameModeSelect.value = 'online';
        this.updateOnlineControls();
        this.roomIdInput.value = roomId;
        this.lockSettings();
        this.setStatus('Joining shared online room...');
        window.setTimeout(() => this.network.resumeOrJoinRoom(roomId), 150);
    }

    createLogic() {
        const mode = this.modeSelect?.value || 'r3';
        const size = Number(this.sizeSelect?.value) || 19;
        return new GoGameLogic({ size, dimension: mode === 'r3' ? 3 : 2, topology: mode === 'r3' ? 'r3' : 't2', komi: KOMI });
    }

    bindEvents() {
        this.modeSelect.addEventListener('change', () => this.resetGame());
        this.sizeSelect.addEventListener('change', () => this.resetGame());
        this.timerSelect.addEventListener('change', () => this.resetGame());
        this.gameModeSelect.addEventListener('change', () => this.updateOnlineControls());
        document.getElementById('cameraReset').addEventListener('click', () => this.renderer.resetCamera());
        this.passBtn.addEventListener('click', () => this.passTurn());
        this.countBtn.addEventListener('click', () => this.agreeCount());
        this.newGameBtn.addEventListener('click', () => this.resetGame({ broadcast: true }));
        this.surrenderBtn.addEventListener('click', () => this.surrender());
        document.getElementById('createRoomBtn').addEventListener('click', () => { this.lockSettings(); this.network.createRoom(); });
        document.getElementById('findMatchBtn').addEventListener('click', () => { this.lockSettings(); this.network.findMatch(); });
        document.getElementById('joinRoomBtn').addEventListener('click', () => { this.lockSettings(); this.network.joinRoom(this.roomIdInput.value); });
        this.copyLinkBtn.addEventListener('click', async () => {
            if (!this.shareLinkInput.value) return;
            await navigator.clipboard?.writeText(this.shareLinkInput.value);
            this.copyLinkBtn.textContent = tr('online.copied');
            window.setTimeout(() => { this.copyLinkBtn.textContent = tr('online.copy'); }, 1000);
        });
        document.querySelectorAll('[data-lang-option]').forEach((button) => {
            button.addEventListener('click', () => setLanguage(button.dataset.langOption));
        });
        window.addEventListener('languagechange', () => {
            this.updateUI();
            if (!this.network?.isConnected && this.gameModeSelect.value !== 'online') this.setOnlineColor(null);
        });
    }

    playAt(coord) {
        if (!this.canActFor(this.logic.currentPlayer)) {
            this.setStatus(tr('status.waitingForColor', { color: this.colorName(this.logic.currentPlayer) }));
            return;
        }
        const result = this.logic.tryPlay(coord, this.logic.currentPlayer);
        if (!result.ok) {
            this.setStatus(result.error);
            return;
        }
        this.afterLocalAction(tr('status.toPlay', { color: this.colorName(this.logic.currentPlayer) }));
    }

    passTurn() {
        if (!this.canActFor(this.logic.currentPlayer)) {
            this.setStatus(tr('status.waitingForColor', { color: this.colorName(this.logic.currentPlayer) }));
            return;
        }
        const color = this.logic.currentPlayer;
        const result = this.logic.pass(color);
        if (!result.ok) {
            this.setStatus(result.error);
            return;
        }
        this.afterLocalAction(this.logic.scoringPending ? tr('status.twoPasses') : tr('status.toPlay', { color: this.colorName(this.logic.currentPlayer) }));
    }

    agreeCount() {
        const color = this.gameModeSelect.value === 'online'
            ? this.myColor
            : (!this.logic.countAgreements.black ? 'black' : 'white');
        const result = this.logic.agreeToCount(color);
        if (!result.ok) {
            this.setStatus(result.error);
            return;
        }
        if (this.logic.gameOver) {
            this.stopTimer();
            this.setStatus(this.resultText());
        } else {
            this.setStatus(tr('status.agreed', { color: this.colorName(color), other: this.colorName(otherColor(color)) }));
        }
        this.broadcastState();
        this.updateUI();
    }

    surrender() {
        const color = this.gameModeSelect.value === 'online' && this.myColor ? this.myColor : this.logic.currentPlayer;
        this.logic.gameOver = true;
        this.logic.winner = otherColor(color);
        this.logic.moveHistory.unshift({ type: 'surrender', color, number: this.logic.moveNumber });
        this.stopTimer();
        this.setStatus(tr('status.surrendered', { color: this.colorName(color), winner: this.colorName(this.logic.winner) }));
        this.broadcastState();
        this.updateUI();
    }

    afterLocalAction(message) {
        this.gameStarted = true;
        this.lockSettings();
        this.startTimer();
        this.setStatus(message);
        this.broadcastState();
        this.updateUI();
    }

    resetGame({ broadcast = false } = {}) {
        if (this.settingsLocked && !broadcast && this.gameStarted) return;
        this.logic = this.createLogic();
        this.gameStarted = false;
        this.settingsLocked = this.network?.isConnected || false;
        this.timeLimit = Number(this.timerSelect.value) || 0;
        this.timeRemaining = { black: this.timeLimit, white: this.timeLimit };
        this.stopTimer();
        this.setStatus(tr('status.start'));
        if (broadcast) this.broadcastState();
        this.updateUI();
    }

    startTimer() {
        if (this.timerInterval || this.timeLimit <= 0 || this.logic.gameOver || this.logic.scoringPending) return;
        this.timerInterval = window.setInterval(() => {
            if (this.logic.gameOver || this.logic.scoringPending) {
                this.stopTimer();
                return;
            }
            const color = this.logic.currentPlayer;
            this.timeRemaining[color] = Math.max(0, this.timeRemaining[color] - 1);
            if (this.timeRemaining[color] <= 0) {
                this.logic.gameOver = true;
                this.logic.winner = otherColor(color);
                this.stopTimer();
                this.setStatus(tr('status.timedOut', { color: this.colorName(color), winner: this.colorName(this.logic.winner) }));
                this.broadcastState();
            }
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (!this.timerInterval) return;
        window.clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    canActFor(color) {
        if (this.gameModeSelect.value !== 'online') return true;
        return this.network.isConnected && this.myColor === color;
    }

    lockSettings() {
        this.settingsLocked = true;
        this.modeSelect.disabled = true;
        this.sizeSelect.disabled = true;
        this.timerSelect.disabled = true;
    }

    unlockSettingsIfLocal() {
        if (this.gameStarted || this.network.isConnected) return;
        this.settingsLocked = false;
        this.modeSelect.disabled = false;
        this.sizeSelect.disabled = false;
        this.timerSelect.disabled = false;
    }

    updateOnlineControls() {
        const online = this.gameModeSelect.value === 'online';
        this.onlineControls.classList.toggle('active', online);
        if (!online) {
            this.network.close({ silent: true });
            this.myColor = null;
            this.onlineColorEl.textContent = tr('online.localStatus');
            this.unlockSettingsIfLocal();
        }
        this.updateUI();
    }

    updateUI() {
        const isR3 = this.logic.topology === 'r3';
        this.modeDisplay.textContent = tr(isR3 ? 'mode.r3Display' : 'mode.t2Display', { size: this.logic.size });
        this.modeInfo.textContent = tr(isR3 ? 'mode.r3Info' : 'mode.t2Info');
        this.turnEl.textContent = this.logic.gameOver ? this.resultText() : this.logic.scoringPending ? tr('status.countingPending') : tr('status.toPlay', { color: this.colorName(this.logic.currentPlayer) });
        this.blackCapturedEl.textContent = tr('captured.stones', { count: this.logic.captures.black });
        this.whiteCapturedEl.textContent = tr('captured.stones', { count: this.logic.captures.white });
        this.blackTimerBox.classList.toggle('active', this.logic.currentPlayer === 'black' && !this.logic.gameOver);
        this.whiteTimerBox.classList.toggle('active', this.logic.currentPlayer === 'white' && !this.logic.gameOver);
        this.countBtn.disabled = !this.logic.scoringPending || this.logic.gameOver || (this.gameModeSelect.value === 'online' && !this.myColor);
        this.passBtn.disabled = this.logic.gameOver || this.logic.scoringPending;
        this.updateTimerDisplay();
        this.renderHistory();
        this.renderScore();
        this.renderer.renderStones(this.logic);
    }

    updateTimerDisplay() {
        this.blackTimerEl.textContent = this.formatTime(this.timeRemaining.black);
        this.whiteTimerEl.textContent = this.formatTime(this.timeRemaining.white);
    }

    renderHistory() {
        if (!this.logic.moveHistory.length) {
            this.historyEl.innerHTML = `<div class="move-history-item muted">${tr('history.started')}</div>`;
            return;
        }
        this.historyEl.innerHTML = this.logic.moveHistory.slice(0, 80).map((move) => {
            if (move.type === 'play') return `<div class="move-history-item">${move.number}. ${this.capitalize(move.color)} (${move.coord.map((v) => v + 1).join(',')})${move.captured ? ` captures ${move.captured}` : ''}</div>`;
            if (move.type === 'pass') return `<div class="move-history-item">${move.number}. ${this.capitalize(move.color)} passes</div>`;
            if (move.type === 'surrender') return `<div class="move-history-item">${this.capitalize(move.color)} surrendered</div>`;
            if (move.type === 'score') return `<div class="move-history-item">${tr('status.finalCount')} ${this.resultText()}</div>`;
            return '';
        }).join('');
    }

    renderScore() {
        if (!this.logic.score) {
            this.scorePanel.hidden = true;
            this.scoreResult.textContent = '';
            return;
        }
        this.scorePanel.hidden = false;
        this.scoreResult.textContent = tr('score.summary', { black: this.logic.score.black, white: this.logic.score.white, komi: this.logic.score.komi, result: this.resultText() });
    }

    resultText() {
        if (!this.logic.gameOver) return '';
        if (this.logic.winner === 'draw') return tr('score.draw');
        if (this.logic.score) return tr('score.winsBy', { color: this.colorName(this.logic.winner), margin: this.logic.score.margin });
        return tr('score.wins', { color: this.colorName(this.logic.winner) });
    }

    formatTime(value) {
        const seconds = Math.max(0, Number(value) || 0);
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;
        return `${minutes}:${String(rest).padStart(2, '0')}`;
    }

    capitalize(value) {
        return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
    }

    colorName(color) {
        return tr('colors.' + color);
    }

    setStatus(text) {
        this.statusEl.textContent = text;
    }

    setOnlineColor(color) {
        this.myColor = color;
        this.onlineColorEl.textContent = color ? tr('online.onlineAs', { color: this.colorName(color) }) : tr('online.localStatus');
    }

    getNetworkSettings() {
        const mode = this.modeSelect.value === 't2' ? 't2' : 'r3';
        return {
            variant: mode === 't2' ? 't2go' : 'r3go',
            mode,
            size: Number(this.sizeSelect.value) || 19,
            timer: Number(this.timerSelect.value) || 0
        };
    }

    exportNetworkState() {
        return {
            logic: this.logic.exportState(),
            gameStarted: this.gameStarted,
            timeLimit: this.timeLimit,
            timeRemaining: { ...this.timeRemaining },
            timerValue: Number(this.timerSelect.value) || 0,
            modeValue: this.modeSelect.value
        };
    }

    importNetworkState(state) {
        if (!state?.logic) return;
        this.stopTimer();
        this.logic.importState(state.logic);
        this.modeSelect.value = this.logic.topology === 't2' ? 't2' : 'r3';
        this.sizeSelect.value = String(this.logic.size);
        this.timerSelect.value = String(state.timerValue ?? state.timeLimit ?? 0);
        this.timeLimit = Number(state.timeLimit) || 0;
        this.timeRemaining = {
            black: Number(state.timeRemaining?.black) || this.timeLimit,
            white: Number(state.timeRemaining?.white) || this.timeLimit
        };
        this.gameStarted = Boolean(state.gameStarted);
        this.lockSettings();
        if (this.gameStarted && !this.logic.gameOver && !this.logic.scoringPending) this.startTimer();
        this.setStatus(this.logic.gameOver ? this.resultText() : tr('status.synced'));
        this.updateUI();
    }

    broadcastState() {
        if (this.network.isConnected) this.network.sendState();
    }
}

window.go3dApp = new Go3DApp();