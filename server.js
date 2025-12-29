const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = [];
let board = Array(9).fill('');
let currentPlayer = 'X';

const winningCombinations = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWin(player) {
  return winningCombinations.some(combo =>
    combo.every(i => board[i] === player)
  );
}

io.on('connection', socket => {
  if (players.length >= 2) {
    socket.emit('roomFull');
    return;
  }

  const symbol = players.length === 0 ? 'X' : 'O';
  players.push({ id: socket.id, symbol });

  socket.emit('assignSymbol', symbol);
  io.emit('updateBoard', board);
  io.emit('turn', currentPlayer);

  socket.on('makeMove', index => {
    if (board[index] !== '') return;
    if (players.find(p => p.id === socket.id)?.symbol !== currentPlayer) return;

    board[index] = currentPlayer;

    if (checkWin(currentPlayer)) {
      io.emit('updateBoard', board);
      io.emit('gameOver', `Player ${currentPlayer} wins!`);
      return;
    }

    if (board.every(cell => cell !== '')) {
      io.emit('updateBoard', board);
      io.emit('gameOver', "It's a draw!");
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    io.emit('updateBoard', board);
    io.emit('turn', currentPlayer);
  });

  socket.on('resetGame', () => {
    board = Array(9).fill('');
    currentPlayer = 'X';
    io.emit('updateBoard', board);
    io.emit('turn', currentPlayer);
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    board = Array(9).fill('');
    currentPlayer = 'X';
    io.emit('playerLeft');
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
