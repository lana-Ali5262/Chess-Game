// ============================================
// SMART CHESS AI CLASS
// ============================================
class SmartChessAI {
    constructor(difficulty = 'medium') {
        this.difficulties = {
            'harmless': { depth: 1, randomMistake: 0.6 },
            'easy': { depth: 1, randomMistake: 0.3 },
            'medium': { depth: 2, randomMistake: 0.12 },
            'hard': { depth: 2, randomMistake: 0.05 },
            'expert': { depth: 3, randomMistake: 0 },
            'master': { depth: 3, randomMistake: 0 }
        };
        this.setDifficulty(difficulty);
    }

    setDifficulty(level) {
        this.difficulty = level;
        this.depth = this.difficulties[level]?.depth || 2;
        this.randomMistake = this.difficulties[level]?.randomMistake || 0;
    }

    getPieceValue(piece) {
        if (!piece) return 0;
        const valMap = { 'p': 10, 'n': 32, 'b': 33, 'r': 50, 'q': 90, 'k': 900 };
        let value = valMap[piece.type] || 0;
        return (piece.color === 'w' ? value : -value);
    }

    evaluateBoard(game) {
        let score = 0;
        const board = game.board();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece) {
                    score += this.getPieceValue(piece);
                    if ((i === 3 || i === 4) && (j === 3 || j === 4)) {
                        score += piece.color === 'w' ? 6 : -6;
                    }
                    if (piece.type === 'n') {
                        const distToCenter = Math.abs(3.5 - i) + Math.abs(3.5 - j);
                        score += piece.color === 'w' ? (8 - distToCenter) : -(8 - distToCenter);
                    }
                }
            }
        }
        return score;
    }

    minimax(game, depth, isMaximizing) {
        if (depth === 0 || game.game_over()) return this.evaluateBoard(game);
        const moves = game.moves({ verbose: true });
        if (isMaximizing) {
            let best = -Infinity;
            for (const mv of moves) {
                game.move(mv);
                let val = this.minimax(game, depth - 1, false);
                game.undo();
                best = Math.max(best, val);
            }
            return best;
        } else {
            let best = Infinity;
            for (const mv of moves) {
                game.move(mv);
                let val = this.minimax(game, depth - 1, true);
                game.undo();
                best = Math.min(best, val);
            }
            return best;
        }
    }

    getBestMove(game) {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;
        if (Math.random() < this.randomMistake) {
            const rand = moves[Math.floor(Math.random() * moves.length)];
            return rand.san || (rand.from + rand.to);
        }
        let bestMove = null;
        let bestEval = -Infinity;
        for (const mv of moves) {
            game.move(mv);
            let evalScore = this.minimax(game, this.depth - 1, false);
            game.undo();
            if (evalScore > bestEval) {
                bestEval = evalScore;
                bestMove = mv;
            }
        }
        return bestMove ? (bestMove.san || bestMove.from + bestMove.to) : null;
    }
}

// ============================================
// POINTS CALCULATION (MATERIAL COUNT)
// ============================================
const PIECE_VALUES = {
    'p': 1,   // pawn
    'n': 3,   // knight
    'b': 3,   // bishop
    'r': 5,   // rook
    'q': 9,   // queen
    'k': 0    // king (not counted for material)
};

function calculatePoints(game) {
    let whitePoints = 0;
    let blackPoints = 0;

    const board = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const pieceValue = PIECE_VALUES[piece.type] || 0;
                if (piece.color === 'w') {
                    whitePoints += pieceValue;
                } else {
                    blackPoints += pieceValue;
                }
            }
        }
    }

    return { white: whitePoints, black: blackPoints };
}

function updatePointsDisplay(game) {
    const points = calculatePoints(game);
    const whiteSpan = document.getElementById('white-points');
    const blackSpan = document.getElementById('black-points');
    const advantageDiv = document.getElementById('advantage');

    if (whiteSpan) whiteSpan.textContent = points.white;
    if (blackSpan) blackSpan.textContent = points.black;

    if (advantageDiv) {
        const diff = points.white - points.black;
        if (diff > 0) {
            advantageDiv.innerHTML = `♔ White is winning by +${diff} points ♔`;
            advantageDiv.className = 'advantage white-advantage';
        } else if (diff < 0) {
            advantageDiv.innerHTML = `♚ Black is winning by ${diff} points ♚`;
            advantageDiv.className = 'advantage black-advantage';
        } else {
            advantageDiv.innerHTML = `⚖️ Material is equal ⚖️`;
            advantageDiv.className = 'advantage equal';
        }
    }
}

// ============================================
// MAIN GAME CONTROLLER
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    let board = null;
    const game = new Chess();
    const moveHistoryDiv = document.getElementById('move-history');
    let moveCount = 1;
    let userColor = 'w';
    let gameMode = null;
    let ai = null;
    let isAIThinking = false;
    let currentDifficulty = 'medium';

    const modeScreen = document.getElementById('mode-screen');
    const gameScreen = document.getElementById('game-screen');
    const difficultyContainer = document.getElementById('difficulty-container');
    const thinkingIndicator = document.getElementById('thinking-indicator');
    const difficultySelect = document.getElementById('difficulty-select');

    const setDifficultyVisibility = (visible) => {
        if (difficultyContainer) difficultyContainer.style.display = visible ? 'flex' : 'none';
    };

    // Mode buttons
    document.querySelector('.vs-computer').addEventListener('click', () => {
        gameMode = 'computer';
        userColor = 'w';
        currentDifficulty = difficultySelect ? difficultySelect.value : 'medium';
        ai = new SmartChessAI(currentDifficulty);
        modeScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        setDifficultyVisibility(true);
        initBoard();
    });

    document.querySelector('.vs-friend').addEventListener('click', () => {
        gameMode = 'friend';
        modeScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        setDifficultyVisibility(false);
        initBoard();
    });

    const initBoard = () => {
        if (board) board.destroy();
        game.reset();
        moveHistoryDiv.textContent = '';
        moveCount = 1;
        userColor = 'w';
        isAIThinking = false;

        if (gameMode === 'computer' && ai) {
            const newDiff = difficultySelect ? difficultySelect.value : 'medium';
            if (newDiff !== currentDifficulty) {
                currentDifficulty = newDiff;
                ai.setDifficulty(currentDifficulty);
            }
        }

        const config = {
            draggable: true,
            position: 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            pieceTheme: 'images/{piece}.png'  // Your local images folder
        };
        board = Chessboard('board', config);
        attachTouchHandlers();
        updatePointsDisplay(game);  // ← UPDATE POINTS ON INIT
    };

    // Touch handlers for mobile
    const attachTouchHandlers = () => {
        const boardEl = document.getElementById('board');
        if (!boardEl) return;
        boardEl.removeEventListener('touchstart', handleTouchStart);
        boardEl.removeEventListener('touchend', handleTouchEnd);
        boardEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        boardEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    };

    let touchOrigin = null;

    const handleTouchStart = (e) => {
        e.preventDefault();
        if (game.game_over()) return;
        if (gameMode === 'computer' && game.turn() !== userColor) return;
        if (isAIThinking) return;
        const sq = getSquareFromTouchEvent(e);
        if (sq) touchOrigin = sq;
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        if (!touchOrigin) return;
        if (game.game_over()) return;
        if (gameMode === 'computer' && game.turn() !== userColor) return;
        if (isAIThinking) {
            touchOrigin = null;
            return;
        }
        const targetSq = getSquareFromTouchEvent(e);
        if (targetSq && touchOrigin) {
            attemptMove(touchOrigin, targetSq);
        }
        touchOrigin = null;
    };

    const getSquareFromTouchEvent = (e) => {
        const touch = e.changedTouches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        const squareDiv = elem?.closest('.square-55d63');
        if (squareDiv) {
            const classes = squareDiv.className.split(' ');
            for (let cls of classes) {
                if (cls.startsWith('square-')) {
                    const idx = parseInt(cls.split('-')[1], 10);
                    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
                    const file = files[idx % 8];
                    const rank = ranks[Math.floor(idx / 8)];
                    if (file && rank) return `${file}${rank}`;
                }
            }
        }
        return null;
    };

    const attemptMove = (from, to) => {
        try {
            const move = game.move({ from, to, promotion: 'q' });
            if (move) {
                board.position(game.fen());
                recordMoveSAN(move.san);
                moveCount++;
                updatePointsDisplay(game);  // ← UPDATE POINTS AFTER MOVE
                checkGameEnd();
                if (gameMode === 'computer' && !game.game_over() && game.turn() !== userColor) {
                    setTimeout(() => makeAIMove(), 180);
                }
                return true;
            }
        } catch (err) { }
        return false;
    };

    const makeAIMove = async () => {
        if (game.game_over()) return;
        if (gameMode !== 'computer') return;
        if (game.turn() === userColor) return;
        if (isAIThinking) return;
        isAIThinking = true;
        if (thinkingIndicator) thinkingIndicator.style.display = 'block';

        await new Promise(r => setTimeout(r, 40));
        try {
            const best = ai.getBestMove(game);
            if (best) {
                const moveObj = game.move(best);
                if (moveObj) {
                    board.position(game.fen());
                    recordMoveSAN(moveObj.san);
                    moveCount++;
                    updatePointsDisplay(game);  // ← UPDATE POINTS AFTER AI MOVE
                    checkGameEnd();
                }
            } else {
                const moves = game.moves();
                if (moves.length) {
                    game.move(moves[Math.floor(Math.random() * moves.length)]);
                    board.position(game.fen());
                    recordMoveSAN('?');
                    moveCount++;
                    updatePointsDisplay(game);  // ← UPDATE POINTS AFTER FALLBACK MOVE
                    checkGameEnd();
                }
            }
        } catch (e) {
            const moves = game.moves();
            if (moves.length) {
                game.move(moves[Math.floor(Math.random() * moves.length)]);
                board.position(game.fen());
                moveCount++;
                updatePointsDisplay(game);  // ← UPDATE POINTS AFTER ERROR MOVE
                checkGameEnd();
            }
        }
        isAIThinking = false;
        if (thinkingIndicator) thinkingIndicator.style.display = 'none';
    };

    const recordMoveSAN = (moveSAN) => {
        const moveNum = Math.ceil(moveCount / 2);
        if (moveCount % 2 === 1) {
            moveHistoryDiv.textContent += `${moveNum}. ${moveSAN} `;
        } else {
            moveHistoryDiv.textContent += `${moveSAN} `;
        }
        moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
    };

    const checkGameEnd = () => {
        if (!game.game_over()) return;
        setTimeout(() => {
            if (game.in_checkmate()) {
                const loser = game.turn() === 'w' ? 'White' : 'Black';
                const winner = loser === 'White' ? 'Black' : 'White';
                alert(`🏆 Checkmate! ${winner} wins! 🏆`);
            } else if (game.in_stalemate()) {
                alert(`♟️ Stalemate! Game drawn.`);
            } else {
                alert(`Game over – draw.`);
            }
        }, 30);
    };

    const onDragStart = (source, piece) => {
        if (game.game_over()) return false;
        if (isAIThinking) return false;
        if (gameMode === 'computer') {
            const isUserPiece = (userColor === 'w' && piece[0] === 'w') || (userColor === 'b' && piece[0] === 'b');
            if (!isUserPiece) return false;
            if (game.turn() !== userColor) return false;
        } else {
            const isWhiteTurn = game.turn() === 'w';
            const isWhitePiece = piece[0] === 'w';
            if (isWhiteTurn !== isWhitePiece) return false;
        }
        return true;
    };

    const onDrop = (source, target) => {
        const move = game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
        board.position(game.fen());
        recordMoveSAN(move.san);
        moveCount++;
        updatePointsDisplay(game);  // ← UPDATE POINTS AFTER DRAG DROP MOVE
        checkGameEnd();
        if (gameMode === 'computer' && !game.game_over() && game.turn() !== userColor) {
            setTimeout(() => makeAIMove(), 180);
        }
    };

    const onSnapEnd = () => {
        board.position(game.fen());
    };

    // UI Buttons
    document.querySelector('.play-again').addEventListener('click', () => {
        game.reset();
        board.position('start');
        moveHistoryDiv.textContent = '';
        moveCount = 1;
        isAIThinking = false;
        if (gameMode === 'computer') {
            userColor = 'w';
            if (ai && difficultySelect) {
                currentDifficulty = difficultySelect.value;
                ai.setDifficulty(currentDifficulty);
            }
        }
        if (thinkingIndicator) thinkingIndicator.style.display = 'none';
        updatePointsDisplay(game);  // ← UPDATE POINTS ON NEW GAME
    });

    document.querySelector('.set-pos').addEventListener('click', () => {
        const fen = prompt("Enter FEN position:", game.fen());
        if (fen && fen.trim()) {
            try {
                if (game.load(fen)) {
                    board.position(fen);
                    moveHistoryDiv.textContent = '';
                    moveCount = 1;
                    isAIThinking = false;
                    updatePointsDisplay(game);  // ← UPDATE POINTS AFTER SET POSITION
                    if (gameMode === 'computer' && !game.game_over() && game.turn() !== userColor) {
                        setTimeout(() => makeAIMove(), 300);
                    }
                } else {
                    alert("Invalid FEN notation.");
                }
            } catch (e) {
                alert("Invalid FEN.");
            }
        }
    });

    document.querySelector('.flip-board').addEventListener('click', () => {
        if (board) board.flip();
    });

    document.querySelector('.change-mode').addEventListener('click', () => {
        game.reset();
        if (board) board.destroy();
        moveHistoryDiv.textContent = '';
        moveCount = 1;
        gameMode = null;
        userColor = 'w';
        isAIThinking = false;
        gameScreen.style.display = 'none';
        modeScreen.style.display = 'flex';
        if (thinkingIndicator) thinkingIndicator.style.display = 'none';
    });

    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            if (gameMode === 'computer' && ai) {
                currentDifficulty = e.target.value;
                ai.setDifficulty(currentDifficulty);
            }
        });
    }
});
