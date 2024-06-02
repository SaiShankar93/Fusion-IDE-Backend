const { Server } = require("socket.io");
const express = require("express");
const { createServer } = require("http");
const cors = require("cors");

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const rooms = {};

io.on('connection', (socket) => {

  socket.on('joinRoom', ({ roomId, username }) => {
    socket.join(roomId);
    console.log(username, 'joined');
    rooms[socket.id] = { roomId, username };
    io.to(roomId).emit('userListUpdate', Object.values(rooms).filter(user => user.roomId === roomId).map(user => user.username));
    io.to(roomId).emit('userJoined', { username });  // Notify others in the room that a user joined
  });

  socket.on('leaveRoom', ({ roomId, username }) => {
    socket.leave(roomId);
    delete rooms[socket.id];
    io.to(roomId).emit('userListUpdate', Object.values(rooms).filter(user => user.roomId === roomId).map(user => user.username));
    io.to(roomId).emit('userLeft', { username });  // Notify others in the room that a user left
    socket.emit('userDisconnected');  // Notify the user who left
  });

  socket.on('codeChange', ({ roomId, code }) => {
    socket.to(roomId).emit('codeUpdate', code);
  });

  socket.on('cursorChange', ({ roomId, username, position }) => {
    socket.to(roomId).emit('userTyping', { username, position });
  });

  socket.on('languageChange', ({ roomId, language, value }) => {
    socket.to(roomId).emit('languageUpdate', language, value);
  });
  
  socket.on('disconnect', () => {
    const user = rooms[socket.id];
    if (user) {
      const roomId = user.roomId;
      delete rooms[socket.id];
      io.to(roomId).emit('userListUpdate', Object.values(rooms).filter(user => user.roomId === roomId).map(user => user.username));
      io.to(roomId).emit('userLeft', { username: user.username });  // Notify others in the room that a user left
    }
  });
});

server.listen(5000 || process.env.PORT, () => {
  console.log("Server is running on port 5000");
});
