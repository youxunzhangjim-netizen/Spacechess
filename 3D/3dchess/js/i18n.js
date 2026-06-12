const DEFAULT_LANGUAGE = 'en';

const DICTIONARY = {
    en: {
        language: {
            label: 'Language',
            english: 'English',
            chinese: 'Chinese'
        },
        app: {
            title: 'Torus Chess',
            tagline: '2D chess on a longer 3D torus: 8 cells around the short side and a 14-row route through the extended direction.',
            canvasLabel: '3D torus chess board',
            movePickerLabel: 'Move picker'
        },
        colors: {
            white: 'White',
            black: 'Black'
        },
        pieces: {
            K: 'King',
            Q: 'Queen',
            R: 'Rook',
            B: 'Bishop',
            N: 'Knight',
            P: 'Pawn',
            piece: 'Piece'
        },
        sides: {
            kingside: 'kingside',
            queenside: 'queenside'
        },
        turn: {
            gameOver: 'Game over',
            toMove: ({ color }, lang) => `${label(lang, `colors.${color}`)} to move`
        },
        captured: {
            byWhite: 'Captured by White',
            byBlack: 'Captured by Black',
            none: 'none'
        },
        picker: {
            movablePieces: 'Movable Pieces',
            availableMoves: 'Available Moves',
            initialSummary: 'White pieces with legal moves',
            selectPiece: 'Select a piece',
            noActiveSelection: 'No active selection',
            destinationsOnTurn: 'Destinations appear on your turn.',
            selectPieceDestinations: 'Select a movable piece to list destinations.',
            gameOver: 'Game over',
            connectOnline: 'Connect online to move',
            waitingForColor: ({ color }, lang) => `Waiting for ${label(lang, `colors.${color}`)}`,
            movableSummary: ({ color, count }, lang) => `${label(lang, `colors.${color}`)} has ${count} movable piece${count === 1 ? '' : 's'}`,
            noMovable: 'No movable pieces.',
            selectedSummary: ({ type, coord, count }, lang) => `${label(lang, `pieces.${type}`)} ${coord} -> ${count} destination${count === 1 ? '' : 's'}`,
            noDestinations: 'This piece has no legal destinations.',
            castleMove: ({ side }) => `castle ${side === 'kingside' ? 'K' : 'Q'}`
        },
        controls: {
            title: 'Game Controls',
            gameMode: 'Game Mode',
            local: 'Local Pass and Play',
            online: 'Online Multiplayer',
            boardGame: 'Board Game',
            boundary: 'Boundary Condition',
            topology: 'Topology',
            timer: 'Timer per Player',
            resetCamera: 'Reset Camera',
            newGame: 'New Game',
            offerDraw: 'Offer Draw',
            surrender: 'Surrender'
        },
        online: {
            localStatus: 'Local pass and play',
            selectedStatus: 'Online mode selected.',
            youAre: ({ color }, lang) => `You are ${label(lang, `colors.${color}`)}.`,
            disconnected: 'Disconnected',
            connectingRoom: 'Creating online room...',
            roomCodeRetry: 'That room code is busy. Trying another 5-digit code...',
            roomReadyConnection: 'Room ready. Share the link with Black.',
            roomReadyGame: 'Room ready. You are White. Waiting for Black to join.',
            resumingRoom: 'Resuming the same room...',
            holdingRoom: ({ room }) => `Connection lost. Keeping room ${room || ''} open for reconnect.`,
            reconnecting: 'Reconnecting signaling...',
            enterRoom: 'Enter a room ID or shared room link.',
            joiningRoom: 'Joining room...',
            joiningAsWhite: 'Joining online room as White...',
            joiningAsBlack: 'Joining online room as Black...',
            joiningShared: 'Joining shared room...',
            joiningSharedGame: 'Joining shared online room...',
            matchmakingSearch: 'Searching shared match space...',
            matchmakingWaiting: 'Waiting in shared match space...',
            matchmakingRetry: 'That match slot is busy. Trying another...',
            matchmakingTimeout: 'No opponent answered yet. Searching another slot...',
            timeoutJoin: 'Could not open that room. Keep White on the room page and try again.',
            timeoutAccept: 'Opponent opened the room but did not finish connecting.',
            webrtcChecking: 'Finding an internet path between both players...',
            webrtcFailed: 'WebRTC could not connect these two networks. Keep White open and try another network if needed.',
            connectedWhite: 'Connected as White',
            connectedBlack: 'Connected as Black',
            opponentJoined: 'Opponent joined. Continue the same game.',
            playerRejoined: 'Opponent rejoined. Game restored.',
            connectedGame: ({ color }, lang) => `Connected. You are ${label(lang, `colors.${color}`)}.`,
            opponentDisconnected: 'Opponent disconnected',
            opponentDisconnectedGame: 'Opponent disconnected. Create or join a new room to continue online.',
            moveSyncFailed: 'Move sync failed',
            moveSyncFailedGame: 'Move sync failed. Start a new online room.',
            opponentSurrendered: 'Opponent surrendered. You win.',
            drawOfferPrompt: 'Opponent offers a draw. Accept?',
            drawDeclined: 'Draw offer declined.',
            wrongGame: 'That room is for another board game mode.',
            wrongGameMatch: 'Matched with another board mode. Searching again...',
            roomFull: 'Room already has two players',
            roomFullGame: 'That room already has two players.',
            peerUnavailable: 'Room not found. Ask White to create a new room link.',
            networkError: 'Network error. Check internet connection and try again.',
            browserIncompatible: 'This browser cannot use WebRTC online play.',
            sslUnavailable: 'Online play needs HTTPS.',
            serverError: 'Peer server error. Try creating a new room.',
            peerMissing: 'PeerJS did not load. Check your internet connection and reload the page.',
            roomCodeUnavailable: 'Could not reserve a 5-digit room code. Try Create Room again.',
            signalClosed: 'Signaling connection closed. Reload both pages and create a new room.',
            connectionError: ({ detail }) => `Connection error: ${detail || 'unknown error'}`,
            findMatch: 'Find Match',
            privateRoom: 'PRIVATE ROOM',
            createRoom: 'Create Room',
            joinRoom: 'Join Room',
            or: 'OR',
            roomInput: '5-digit room code or shared link',
            roomId: 'Room Code',
            copy: 'Copy'
        },
        topology: {
            names: {
                periodic: 'T2 periodic',
                rp2: 'RP2 antipodal',
                mobius: 'Mobius twist'
            },
            info: {
                periodic: 'T2 uses 112 playable blocks shown as an 8-cell short winding and a 14-row long direction. The six extra blank rows sit between the initial armies, and both directions wrap periodically.',
                rp2: 'RP2 uses one 12x14 fundamental board. Crossing a boundary lands on the opposite edge with the matched coordinate reversed, and the raised cage arrows show the antipodal gluing.',
                mobius: 'Mobius uses two full 8x8 surface sides. The lateral x edges are open; crossing the winding y edge reverses x and lands on the opposite side. The armies start on matching coordinates on opposite normals.'
            }
        },
        boundary: {
            names: {
                forbidden: 'Forbidden',
                reflection: 'Reflection',
                periodic: 'Periodic',
                rp2: 'RP2 antipodal',
                mobius: 'Mobius twist'
            },
            info: {
                forbidden: 'Forbidden: pieces cannot move outside the 8x8x8 cube.',
                reflection: 'Reflection: a move that reaches an edge bounces back into the cube.',
                periodic: 'Periodic: leaving one side wraps the move to the opposite side.'
            }
        },
        timer: {
            noTimer: 'No Timer',
            fiveMinutes: '5 Minutes',
            tenMinutes: '10 Minutes',
            fifteenMinutes: '15 Minutes',
            thirtyMinutes: '30 Minutes',
            oneHour: '1 Hour',
            twoHours: '2 Hours',
            threeHours: '3 Hours',
            twentyFourHours: '24 Hours'
        },
        history: {
            title: 'Move History',
            started: 'Game started.',
            castle: ({ color, side, from, to }, lang) =>
                `${label(lang, `colors.${color}`)} ${label(lang, 'pieces.K')} castles ${label(lang, `sides.${side}`)} ${from} -> ${to}`,
            move: ({ color, type, from, to, capturedType, promotionType }, lang) => {
                const capture = capturedType ? ` captures ${label(lang, `pieces.${capturedType}`)}` : '';
                const promotion = promotionType ? ` promotes to ${label(lang, `pieces.${promotionType}`)}` : '';
                return `${label(lang, `colors.${color}`)} ${label(lang, `pieces.${type}`)} ${from} -> ${to}${capture}${promotion}`;
            }
        },
        rules: {
            title: 'Torus Rules',
            text: 'Rooks, bishops, queens, knights, kings, castling, en passant, check, and mate use 2D chess movement on 112 torus blocks. The board is 8 columns by 14 periodic rows, with the six extra blank rows placed between the initial armies so the king rows start opposite each other. Pawns promote when they reach the opponent home row.'
        },
        hints: {
            label: 'Move Hints'
        },
        promotion: {
            title: 'Promote Pawn To'
        },
        status: {
            start: 'Select a white piece to begin.',
            connectBeforeMove: 'Connect to an opponent before moving online.',
            waitingForMove: ({ color }, lang) => `Waiting for ${label(lang, `colors.${color}`)} to move.`,
            selectionCleared: 'Selection cleared.',
            choosePieceFirst: 'Choose one of your pieces first.',
            turnOnly: ({ color }, lang) => `It is ${label(lang, `colors.${color}`)}'s turn.`,
            pieceSelected: ({ color, type, coord, count }, lang) =>
                `${label(lang, `colors.${color}`)} ${label(lang, `pieces.${type}`)} selected at ${coord}. ${count} legal move${count === 1 ? '' : 's'}.`,
            targetSelected: ({ coord }) => `${coord} selected. Click the same yellow destination again to move.`,
            movePlayed: ({ color }, lang) => `Move played. ${label(lang, `colors.${color}`)} to move.`,
            checkmateWin: ({ color }, lang) => `${label(lang, `colors.${color}`)} wins by checkmate.`,
            stalemate: 'Stalemate. Game drawn.',
            inCheck: ({ color }, lang) => `${label(lang, `colors.${color}`)} is in check.`,
            timeWin: ({ color }, lang) => `${label(lang, `colors.${color}`)} wins on time.`,
            newGame: 'New game started. Select a white piece.',
            roomLinkCopied: 'Room link copied.',
            resignationWin: ({ color }, lang) => `${label(lang, `colors.${color}`)} wins by resignation.`,
            drawOfferSent: 'Draw offer sent.',
            drawAgreed: 'Game drawn by agreement.',
            drawAccepted: 'Draw accepted.',
            hintsHidden: 'Move hints hidden.',
            hintsShown: 'Move hints shown.'
        },
        alerts: {
            modeLocked: 'Game mode cannot change after the game starts or after online connection.',
            boundaryLocked: 'Boundary cannot change after the game starts or after online connection.',
            topologyLocked: 'Topology cannot change after the game starts or after online connection.',
            timerLocked: 'Timer cannot change after the game starts or after online connection.',
            drawPrompt: 'Agree to a draw?'
        }
    },
    zh: {
        language: {
            label: '语言',
            english: 'English',
            chinese: '中文'
        },
        app: {
            title: 'T2 环面棋',
            tagline: '在加长三维环面上的二维国际象棋：短方向 8 格，长方向 14 行。',
            canvasLabel: '三维环面棋盘',
            movePickerLabel: '走法选择器'
        },
        colors: {
            white: '白方',
            black: '黑方'
        },
        pieces: {
            K: '王',
            Q: '后',
            R: '车',
            B: '象',
            N: '马',
            P: '兵',
            piece: '棋子'
        },
        sides: {
            kingside: '王翼',
            queenside: '后翼'
        },
        turn: {
            gameOver: '游戏结束',
            toMove: ({ color }, lang) => label(lang, 'colors.' + color) + '走棋'
        },
        captured: {
            byWhite: '白方吃子',
            byBlack: '黑方吃子',
            none: '无'
        },
        picker: {
            movablePieces: '可移动棋子',
            availableMoves: '可用走法',
            initialSummary: '白方有合法走法的棋子',
            selectPiece: '选择棋子',
            noActiveSelection: '未选择棋子',
            destinationsOnTurn: '轮到你时显示目标格。',
            selectPieceDestinations: '选择一个可移动棋子来列出目标格。',
            gameOver: '游戏结束',
            connectOnline: '连接在线对手后才能移动',
            waitingForColor: ({ color }, lang) => '等待' + label(lang, 'colors.' + color),
            movableSummary: ({ color, count }, lang) => label(lang, 'colors.' + color) + '有 ' + count + ' 个可移动棋子',
            noMovable: '没有可移动棋子。',
            selectedSummary: ({ type, coord, count }, lang) => label(lang, 'pieces.' + type) + ' ' + coord + ' -> ' + count + ' 个目标格',
            noDestinations: '这个棋子没有合法目标格。',
            castleMove: ({ side }) => '易位 ' + (side === 'kingside' ? '王翼' : '后翼')
        },
        controls: {
            title: '游戏控制',
            gameMode: '游戏模式',
            local: '本地轮流',
            online: '在线多人',
            boardGame: '棋盘模式',
            boundary: '边界条件',
            topology: '拓扑',
            timer: '每方时间',
            resetCamera: '重置视角',
            newGame: '新游戏',
            offerDraw: '提和',
            surrender: '认输'
        },
        online: {
            localStatus: '本地轮流',
            selectedStatus: '已选择在线模式。',
            youAre: ({ color }, lang) => '你是' + label(lang, 'colors.' + color) + '。',
            disconnected: '未连接',
            connectingRoom: '正在创建在线房间...',
            roomCodeRetry: '房间码被占用，正在重试...',
            roomReadyConnection: '房间已准备好，请分享链接。',
            roomReadyGame: '房间已准备好。你是白方，等待黑方加入。',
            resumingRoom: '正在恢复同一房间...',
            holdingRoom: ({ room }) => '连接断开。继续保持房间 ' + (room || '') + ' 等待重连。',
            reconnecting: '正在重连信令...',
            enterRoom: '请输入房间 ID 或分享链接。',
            joiningRoom: '正在加入房间...',
            joiningAsWhite: '作为白方加入房间...',
            joiningAsBlack: '作为黑方加入房间...',
            joiningShared: '正在加入分享房间...',
            joiningSharedGame: '正在加入分享的在线房间...',
            matchmakingSearch: '正在搜索匹配空间...',
            matchmakingWaiting: '正在匹配空间等待...',
            matchmakingRetry: '该匹配槽忙，正在尝试另一个...',
            matchmakingTimeout: '还没有对手回应，继续搜索...',
            webrtcChecking: '正在寻找两位玩家之间的网络路径...',
            webrtcFailed: 'WebRTC 无法连接这两个网络。请保持白方房间开启，必要时换网络。',
            connectedWhite: '已连接为白方',
            connectedBlack: '已连接为黑方',
            connectedGame: ({ color }, lang) => '已连接。你是' + label(lang, 'colors.' + color) + '。',
            opponentDisconnected: '对手已断线',
            opponentDisconnectedGame: '对手已断线。请创建或加入新房间继续。',
            wrongGame: '该房间属于另一个棋盘模式。',
            wrongGameMatch: '匹配到不同棋盘模式，继续搜索...',
            roomFull: '房间已满',
            roomFullGame: '该房间已有两名玩家。',
            peerUnavailable: '找不到房间。请让白方重新创建链接。',
            networkError: '网络错误，请检查连接后重试。',
            peerMissing: 'PeerJS 未加载，请检查网络并刷新。',
            findMatch: '寻找匹配',
            privateRoom: '私人房间',
            createRoom: '创建房间',
            joinRoom: '加入房间',
            or: '或',
            roomInput: '5 位房间码或分享链接',
            roomId: '房间码',
            copy: '复制'
        },
        topology: {
            names: {
                periodic: 'T2 周期',
                rp2: 'RP2 对映',
                mobius: 'Mobius 扭转'
            },
            info: {
                periodic: 'T2 使用 112 个可用格：短方向 8 格、长方向 14 行。初始双方之间加入六行空格，两个方向都周期连接。',
                rp2: 'RP2 使用一个 12x14 基本棋盘。越过边界会到达对边并反转对应坐标，升起的箭头显示对映粘合。',
                mobius: 'Mobius 使用两个完整 8x8 表面。横向 x 边界开放；穿过缠绕 y 边界会反转 x 并到达另一面。'
            }
        },
        boundary: {
            names: {
                forbidden: '禁止越界',
                reflection: '反射',
                periodic: '周期',
                rp2: 'RP2 对映',
                mobius: 'Mobius 扭转'
            },
            info: {
                forbidden: '禁止越界：棋子不能走出 8x8x8 立方体。',
                reflection: '反射：到达边界的走法会反弹回棋盘。',
                periodic: '周期：从一侧离开会从相对侧进入。'
            }
        },
        timer: {
            noTimer: '无计时',
            fiveMinutes: '5 分钟',
            tenMinutes: '10 分钟',
            fifteenMinutes: '15 分钟',
            thirtyMinutes: '30 分钟',
            oneHour: '1 小时',
            twoHours: '2 小时',
            threeHours: '3 小时',
            twentyFourHours: '24 小时'
        },
        history: {
            title: '走法记录',
            started: '游戏开始。',
            castle: ({ color, side, from, to }, lang) => label(lang, 'colors.' + color) + label(lang, 'pieces.K') + ' ' + label(lang, 'sides.' + side) + '易位 ' + from + ' -> ' + to,
            move: ({ color, type, from, to, capturedType, promotionType }, lang) => {
                const capture = capturedType ? ' 吃 ' + label(lang, 'pieces.' + capturedType) : '';
                const promotion = promotionType ? ' 升变为 ' + label(lang, 'pieces.' + promotionType) : '';
                return label(lang, 'colors.' + color) + label(lang, 'pieces.' + type) + ' ' + from + ' -> ' + to + capture + promotion;
            }
        },
        rules: {
            title: '环面规则',
            text: '车、象、后、马、王、易位、吃过路兵、将军与将死都使用 112 个环面格上的二维国际象棋走法。棋盘为 8 列 x 14 个周期行，双方初始阵之间有六行空格。兵到达对方底线时升变。'
        },
        hints: {
            label: '走法提示'
        },
        promotion: {
            title: '兵升变为'
        },
        status: {
            start: '请选择一个白方棋子开始。',
            connectBeforeMove: '在线模式需要先连接对手。',
            waitingForMove: ({ color }, lang) => '等待' + label(lang, 'colors.' + color) + '走棋。',
            selectionCleared: '选择已清除。',
            choosePieceFirst: '请先选择你的棋子。',
            turnOnly: ({ color }, lang) => '现在是' + label(lang, 'colors.' + color) + '回合。',
            pieceSelected: ({ color, type, coord, count }, lang) => label(lang, 'colors.' + color) + label(lang, 'pieces.' + type) + '已选中于 ' + coord + '，有 ' + count + ' 个合法走法。',
            targetSelected: ({ coord }) => '已选择 ' + coord + '。再次点击同一黄色目标格以移动。',
            movePlayed: ({ color }, lang) => '已走棋。轮到' + label(lang, 'colors.' + color) + '。',
            checkmateWin: ({ color }, lang) => label(lang, 'colors.' + color) + '将死获胜。',
            stalemate: '逼和，游戏平局。',
            inCheck: ({ color }, lang) => label(lang, 'colors.' + color) + '被将军。',
            timeWin: ({ color }, lang) => label(lang, 'colors.' + color) + '超时获胜。',
            newGame: '新游戏开始。请选择白方棋子。',
            roomLinkCopied: '房间链接已复制。',
            resignationWin: ({ color }, lang) => label(lang, 'colors.' + color) + '因对手认输获胜。',
            drawOfferSent: '已发送和棋请求。',
            drawAgreed: '双方同意和棋。',
            drawAccepted: '已接受和棋。',
            hintsHidden: '已隐藏走法提示。',
            hintsShown: '已显示走法提示。'
        },
        alerts: {
            modeLocked: '游戏开始或在线连接后不能更改模式。',
            boundaryLocked: '游戏开始或在线连接后不能更改边界。',
            topologyLocked: '游戏开始或在线连接后不能更改拓扑。',
            timerLocked: '游戏开始或在线连接后不能更改计时。',
            drawPrompt: '同意和棋吗？'
        }
    }
};

export const I18N = {
    current: DEFAULT_LANGUAGE,
    languages: Object.keys(DICTIONARY)
};

function read(lang, key) {
    return key.split('.').reduce((node, part) => node?.[part], DICTIONARY[lang]);
}

function label(lang, key) {
    const value = read(lang, key) ?? read(DEFAULT_LANGUAGE, key);
    return typeof value === 'function' ? value({}, lang) : value ?? key;
}

function formatString(text, params) {
    return text.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');
}

export function hasTranslation(key) {
    return read(I18N.current, key) !== undefined || read(DEFAULT_LANGUAGE, key) !== undefined;
}

export function t(key, params = {}) {
    const lang = I18N.current;
    const value = read(lang, key) ?? read(DEFAULT_LANGUAGE, key);

    if (typeof value === 'function') return value(params, lang);
    if (typeof value === 'string') return formatString(value, params);
    return key;
}

export function applyLanguage(root = document) {
    document.documentElement.lang = I18N.current;
    document.title = t('app.title');

    root.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
        element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });

    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
        element.setAttribute('title', t(element.dataset.i18nTitle));
    });

    root.querySelectorAll('[data-lang-option]').forEach((button) => {
        const active = button.dataset.langOption === I18N.current;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

export function setLanguage(language) {
    if (!I18N.languages.includes(language) || language === I18N.current) return;
    I18N.current = language;
    applyLanguage();
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
}
