document.addEventListener('DOMContentLoaded', () => {
    let board = null;
    const game = new Chess();
    const moveHistory = document.getElementById('move-history');
    let moveCount = 1;
    let userColor = 'w';
    let gameMode = null;
    let selectedSquare = null;

    const modeScreen = document.getElementById('mode-screen');
    const gameScreen = document.getElementById('game-screen');

    document.querySelector('.vs-computer').addEventListener('click', () => {
        gameMode = 'computer';
        modeScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        initBoard();
    });

    document.querySelector('.vs-friend').addEventListener('click', () => {
        gameMode = 'friend';
        modeScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        initBoard();
    });

    const initBoard = () => {
        if (board) board.destroy();
        game.reset();
        moveHistory.textContent = '';
        moveCount = 1;
        userColor = 'w';
        selectedSquare = null;

        board = Chessboard('board', {
            showNotation: true,
            draggable: true,
            position: 'start',
            pieceTheme: 'images/{piece}.png',
            onDragStart,
            onDrop,
            onSnapEnd,
            moveSpeed: 'fast',
            snapBackSpeed: 500,
            snapSpeed: 100,
        });

        attachTouchHandlers();
    };

    // Block page scroll while touching the board
    const attachTouchHandlers = () => {
        const boardEl = document.getElementById('board');

        boardEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });

        boardEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        boardEl.addEventListener('touchend', handleTap, { passive: false });
    };

    // Tap-to-move logic
    const getSquareFromTouch = (e) => {
        const touch = e.changedTouches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const squareEl = el && el.closest('[data-square]');
        return squareEl ? squareEl.getAttribute('data-square') : null;
    };

    const isMyPiece = (square) => {
        const piece = game.get(square);
        if (!piece) return false;
        if (gameMode === 'computer') return piece.color === userColor;
        return piece.color === game.turn();
    };

    const clearHighlights = () => {
        document.querySelectorAll('[data-square]').forEach(el => {
            el.style.removeProperty('background');
            el.style.removeProperty('box-shadow');
            el.style.removeProperty('border-radius');
        });
    };

    const highlightSelected = (square) => {
        const el = document.querySelector(`[data-square="${square}"]`);
        if (el) el.style.background = 'rgba(20, 85, 30, 0.5)';
    };

    const highlightMoves = (square) => {
        game.moves({ square, verbose: true }).forEach(m => {
            const el = document.querySelector(`[data-square="${m.to}"]`);
            if (!el) return;
            if (game.get(m.to)) {
                el.style.boxShadow = 'inset 0 0 0 4px rgba(20,85,30,0.7)';
            } else {
                el.style.background = 'radial-gradient(circle, rgba(20,85,30,0.5) 36%, transparent 40%)';
            }
        });
    };

    const handleTap = (e) => {
        e.preventDefault();
        if (game.game_over()) return;
        if (gameMode === 'computer' && game.turn() !== userColor) return;

        const square = getSquareFromTouch(e);
        if (!square) return;

        if (selectedSquare) {
            if (square === selectedSquare) {
                clearHighlights();
                selectedSquare = null;
                return;
            }

            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            clearHighlights();

            if (move) {
                board.position(game.fen());
                selectedSquare = null;
                recordMove(move.san, moveCount);
                moveCount++;
                checkGameOver();
                if (gameMode === 'computer' && !game.game_over()) {
                    setTimeout(makeRandomMove, 250);
                }
            } else {
                if (isMyPiece(square)) {
                    selectedSquare = square;
                    highlightSelected(square);
                    highlightMoves(square);
                } else {
                    selectedSquare = null;
                }
            }
        } else {
            if (isMyPiece(square)) {
                selectedSquare = square;
                highlightSelected(square);
                highlightMoves(square);
            }
        }
    };

    const makeRandomMove = () => {
        const possibleMoves = game.moves();
        if (game.game_over()) return;
        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        game.move(move);
        board.position(game.fen());
        recordMove(move, moveCount);
        moveCount++;
        checkGameOver();
    };

    const recordMove = (move, count) => {
        const formatted = count % 2 === 1 ? `${Math.ceil(count / 2)}. ${move}` : `${move} -`;
        moveHistory.textContent += formatted + ' ';
        moveHistory.scrollTop = moveHistory.scrollHeight;
    };

    const checkGameOver = () => {
        if (!game.game_over()) return;
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            setTimeout(() => alert(`Checkmate! ${winner} wins!`), 100);
        } else if (game.in_draw()) {
            setTimeout(() => alert("It's a draw!"), 100);
        } else if (game.in_stalemate()) {
            setTimeout(() => alert("Stalemate!"), 100);
        }
    };

    const onDragStart = (source, piece) => {
        if (game.game_over()) return false;
        if (gameMode === 'computer') return piece.search(userColor) === 0;
        return (game.turn() === 'w' && piece.search(/^w/) !== -1) ||
               (game.turn() === 'b' && piece.search(/^b/) !== -1);
    };

    const onDrop = (source, target) => {
        clearHighlights();
        selectedSquare = null;
        const move = game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
        recordMove(move.san, moveCount);
        moveCount++;
        checkGameOver();
        if (gameMode === 'computer' && !game.game_over()) {
            setTimeout(makeRandomMove, 250);
        }
    };

    const onSnapEnd = () => { board.position(game.fen()); };

    document.querySelector('.play-again').addEventListener('click', () => {
        game.reset();
        board.start();
        moveHistory.textContent = '';
        moveCount = 1;
        userColor = 'w';
        selectedSquare = null;
        clearHighlights();
    });

    document.querySelector('.set-pos').addEventListener('click', () => {
        const fen = prompt("Enter the FEN notation for the desired position!");
        if (fen !== null) {
            if (game.load(fen)) {
                board.position(fen);
                moveHistory.textContent = '';
                moveCount = 1;
                userColor = 'w';
                selectedSquare = null;
                clearHighlights();
            } else {
                alert("Invalid FEN notation. Please try again.");
            }
        }
    });

    document.querySelector('.flip-board').addEventListener('click', () => {
        board.flip();
        if (gameMode === 'computer') {
            makeRandomMove();
            userColor = userColor === 'w' ? 'b' : 'w';
        }
    });

    document.querySelector('.change-mode').addEventListener('click', () => {
        game.reset();
        moveHistory.textContent = '';
        moveCount = 1;
        userColor = 'w';
        gameMode = null;
        selectedSquare = null;
        clearHighlights();
        gameScreen.style.display = 'none';
        modeScreen.style.display = 'flex';
    });
});
