import { createPiece } from '../js/BoardSetup.js';
import { PieceMovement } from '../js/PieceMovement.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function makeGame(boundaryCondition = 'open') {
    const game = {
        boundaryCondition,
        currentPlayer: 'white',
        board: Array.from({ length: 8 }, () => Array(8).fill(null)),
        enPassantTarget: null,
        getPiece(row, col) {
            return this.board[row]?.[col] || null;
        }
    };
    game.board[7][4] = createPiece('white', 'K');
    game.board[0][4] = createPiece('black', 'K');
    return game;
}

{
    const game = makeGame();
    game.board[0][4] = null;
    game.board[1][7] = createPiece('black', 'K');
    game.board[0][3] = createPiece('white', 'R');
    const moves = new PieceMovement(game).getLegalMoves(0, 3);
    assert(moves.some((move) => move.suicide && move.r === -1 && move.c === 3), 'rook should exit through top edge');
    assert(moves.some((move) => move.suicide && move.r === 0 && move.c === -1), 'rook should exit through left edge');
    assert(moves.some((move) => move.suicide && move.r === 0 && move.c === 8), 'rook should exit through right edge');
}

{
    const game = makeGame('forbidden');
    game.board[0][3] = createPiece('white', 'R');
    const moves = new PieceMovement(game).getLegalMoves(0, 3);
    assert(!moves.some((move) => move.suicide), 'forbidden boundary must not generate suicide moves');
}

{
    const game = makeGame();
    game.board[0][0] = createPiece('white', 'N');
    const moves = new PieceMovement(game).getLegalMoves(0, 0);
    assert(moves.some((move) => move.suicide && move.r === -2 && move.c === -1), 'knight should be able to jump out across two axes');
}

{
    const game = makeGame();
    game.board[0][4] = null;
    game.board[0][7] = createPiece('black', 'K');
    game.board[0][4] = createPiece('black', 'R');
    game.board[6][4] = createPiece('white', 'R');
    const moves = new PieceMovement(game).getLegalMoves(6, 4);
    assert(!moves.some((move) => move.suicide), 'a non-king suicide exposing its king must remain illegal');
}

{
    const game = makeGame();
    game.board[0][4] = createPiece('white', 'K');
    game.board[7][4] = createPiece('black', 'K');
    const moves = new PieceMovement(game).getLegalMoves(0, 4);
    assert(moves.some((move) => move.suicide && move.r === -1 && move.c === 4), 'king should be allowed to leave as an immediate-loss move');
}

console.log('Open-boundary suicide rule checks passed.');
