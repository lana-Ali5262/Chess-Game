// Wait for the DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', () => {
    let board = null;
    const game = new Chess();
    const moveHistory = document.getElementById('move-history');
    let moveCount = 1;
    let userColor = 'w';
    let gameMode = null; // 'computer' or 'friend'

    // Touch/tap-to-move state
    let selectedSquare = null;

    const modeScreen = document.getElementById('mode-screen');
    const gameScreen = document.getElementById('game-screen');

    // vs Computer button
    document.querySelector('.vs-computer').addEventListener('click', () => {
        gameMode = 'computer';
        modeScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        initBoard();
    });

    // vs Friend button
    document.querySelector('.vs-friend').addEventListener('click', () => {
        gameMode = 'friend';
        modeScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        initBoard();
    });

    // Function to initialize the board
    const initBoard = () => {
        if (board) {
            board.destroy();
        }
        game.reset();
        moveHistory.textContent = '';
        moveCount = 1;
        userColor = 'w';
        selectedSquare = null;

        const boardConfig = {
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
        };
        board = Chessboard('board', boardConfig);

        // Attach touch/click handlers after board is created
        attachTapToMove();
    };

    // ── Tap-to-move (mobile fix) ──────────────────────────────────────────────
    const attachTapToMove = () => {
        const boardEl = document.getElementById('board');

        // Use 'touchend' for mobile, 'click' as fallback for desktop
        boardEl.addEventListener('touchend', handleSquareTap, { passive: false });
        boardEl.addEventListener('click', handleSquareTap);
    };

    const getSquareFromEvent = (e) => {
        // For touch events, use changedTouches
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!target) return null;

        // chessboard.js marks squares with data-square attribute
        const squareEl = target.closest('[data-square]');
        return squareEl ? squareEl.getAttribute('data-square') : null;
    };

    const isMyPiece = (square) => {
        const piece = game.get(square);
        if (!piece) return false;
        if (gameMode === 'computer') return piece.color === userColor;
        // vs friend: whoever's turn it is
        return piece.color === game.turn();
    };

    const clearHighlights = () => {
        document.querySelectorAll('[data-square]').forEach(el => {
            el.style.removeProperty('background');
            el.style.removeProperty('border-radius');
            el.style.removeProperty('box-shadow');
        });
    };

    const highlightSquare = (square) => {
        const el = document.querySelector(`[data-square="${square}"]`);
        if (el) {
            el.style.background = 'radial-gradient(circle, rgba(20,85,30,0.5) 36%, transparent 40%)';
        }
    };

    const highlightLegalMoves = (square) => {
        const moves = game.moves({ square, verbose: true });
        moves.forEach(m => {
            const el = document.querySelector(`[data-square="${m.to}"]`);
            if (el) {
                const hasPiece = game.get(m.to);
                if (hasPiece) {
                    // Ring highlight for captures
                    el.style.boxShadow = 'inset 0 0 0 4px rgba(20,85,30,0.6)';
                    el.style.borderRadius = '0';
                } else {
                    // Dot highlight for empty squares
                    el.style.background = 'radial-gradient(circle, rgba(20,85,30,0.5) 36%, transparent 40%)';
                }
            }
        });
    };

    const handleSquareTap = (e) => {
        // Prevent the event from firing twice (touchend + click)
        if (e.type === 'click' && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        if (e.cancelable) e.preventDefault();

        if (game.game_over()) return;

        // Block moves when it's the computer's turn
        if (gameMode === 'computer' && game.turn() !== userColor) return;

        const square = getSquareFromEvent(e);
        if (!square) return;

        if (selectedSquare) {
            if (square === selectedSquare) {
                // Tapped same square: deselect
                clearHighlights();
                selectedSquare = null;
                return;
            }

            // Try to make the move
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });

            if (move) {
                board.position(game.fen());
                clearHighlights();
                selectedSquare = null;
                recordMove(move.san, moveCount);
                moveCount++;
                checkGameOver();
                if (gameMode === 'computer' && !game.game_over()) {
                    window.setTimeout(makeRandomMove, 250);
                }
            } else {
                // Invalid move — check if tapped a different own piece
                clearHighlights();
                if (isMyPiece(square)) {
                    selectedSquare = square;
                    highlightSquare(square);
                    highlightLegalMoves(square);
                } else {
                    selectedSquare = null;
                }
            }
        } else {
            // No piece selected yet
            if (isMyPiece(square)) {
                selectedSquare = square;
                highlightSquare(square);
                highlightLegalMoves(square);
            }
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    // Function to make a random move for the computer
    const makeRandomMove = () => {
        const possibleMoves = game.moves();
        if (game.game_over()) return;
        const randomIdx = Math.floor(Math.random() * possibleMoves.length);
        const move = possibleMoves[randomIdx];
        game.move(move);
        board.position(game.fen());
        recordMove(move, moveCount);
        moveCount++;
        checkGameOver();
    };

    // Function to record and display a move in the move history
    const recordMove = (move, count) => {
        const formattedMove = count % 2 === 1 ? `${Math.ceil(count / 2)}. ${move}` : `${move} -`;
        moveHistory.textContent += formattedMove + ' ';
        moveHistory.scrollTop = moveHistory.scrollHeight;
    };

    // Check if game is over
    const checkGameOver = () => {
        if (game.game_over()) {
            if (game.in_checkmate()) {
                const winner = game.turn() === 'w' ? 'Black' : 'White';
                setTimeout(() => alert(`Checkmate! ${winner} wins!`), 100);
            } else if (game.in_draw()) {
                setTimeout(() => alert("It's a draw!"), 100);
            } else if (game.in_stalemate()) {
                setTimeout(() => alert("Stalemate!"), 100);
            }
        }
    };

    const onDragStart = (source, piece) => {
        if (game.game_over()) return false;
        if (gameMode === 'computer') {
            return piece.search(userColor) === 0;
        } else {
            return (game.turn() === 'w' && piece.search(/^w/) !== -1) ||
                (game.turn() === 'b' && piece.search(/^b/) !== -1);
        }
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
            window.setTimeout(makeRandomMove, 250);
        }
    };

    const onSnapEnd = () => { board.position(game.fen()); };

    // Play Again button
    document.querySelector('.play-again').addEventListener('click', () => {
        game.reset();
        board.start();
        moveHistory.textContent = '';
        moveCount = 1;
        userColor = 'w';
        selectedSquare = null;
        clearHighlights();
    });

    // Set Position button
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

    // Flip Board button
    document.querySelector('.flip-board').addEventListener('click', () => {
        board.flip();
        if (gameMode === 'computer') {
            makeRandomMove();
            userColor = userColor === 'w' ? 'b' : 'w';
        }
    });

    // Change Mode button
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
