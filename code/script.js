// Wait for the DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', () => {
    let board = null;
    const game = new Chess();
    const moveHistory = document.getElementById('move-history');
    let moveCount = 1;
    let userColor = 'w';
    let gameMode = null; // 'computer' or 'friend'

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
    };

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
            // vs friend: allow whoever's turn it is
            return (game.turn() === 'w' && piece.search(/^w/) !== -1) ||
                (game.turn() === 'b' && piece.search(/^b/) !== -1);
        }
    };

    const onDrop = (source, target) => {
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
        gameScreen.style.display = 'none';
        modeScreen.style.display = 'flex';
    });
});
