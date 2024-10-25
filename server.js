const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = {};
let rooms = { general: [] };

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join room', ({ room, username }) => {
        if (!rooms[room]) rooms[room] = [];
        
        // Track user in specific room
        users[socket.id] = { username, room };
        socket.join(room);
        
        // Add user to the room and notify others
        rooms[room].push(username);
        io.to(room).emit('user list', rooms[room]); // Emit updated user list
        socket.to(room).emit('user joined', `${username} joined the room: ${room}`);
    });

    socket.on('chat message', (msg) => {
        const { username, room } = users[socket.id];
        const timestamp = new Date().toLocaleTimeString();
        const messageData = { msg, user: username, time: timestamp };
        
        rooms[room].push(messageData);
        io.to(room).emit('chat message', messageData);
    });

    socket.on('disconnect', () => {
        const { username, room } = users[socket.id] || {};
        if (username && room) {
            rooms[room] = rooms[room].filter(user => user !== username); // Remove user from room
            io.to(room).emit('user list', rooms[room]); // Update user list
            io.to(room).emit('user left', `${username} left the room`);
            delete users[socket.id];
        }
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
