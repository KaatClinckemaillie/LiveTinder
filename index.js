require('dotenv').config();
const isDevelopment = (process.env.NODE_ENV === 'development');
const express = require('express');
const app = express();
const fs = require('fs');

let options = {};
if (isDevelopment) {
  options = {
    key: fs.readFileSync('./localhost.key'),
    cert: fs.readFileSync('./localhost.crt')
  };
}

const server = require(isDevelopment ? 'https' : 'http').Server(options, app);
const port = process.env.PORT || 443;

app.use(express.static('public'));



const { Server } = require("socket.io");
const io = new Server(server);



const clients = {};
io.on('connection', socket => {
  clients[socket.id] = { id: socket.id };
  console.log('Socket connected', socket.id);

  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  socket.on('signal', (peerId, signal) => {
    console.log(`Received signal from ${socket.id} to ${peerId}`);
    io.to(peerId).emit('signal', peerId, signal, socket.id);
  });


  socket.on('disconnect', () => {
    io.emit('client-disconnect', clients[socket.id]);
    delete clients[socket.id];
    io.emit('clients', clients);
  });

  socket.on('tag' , (data) => {
    socket.broadcast.emit('tag', data);
  });

  socket.on('input', (data) => {
    socket.broadcast.emit('input', data);
  });

  io.emit('clients', clients);
  io.emit('client-connection', clients[socket.id]);

});



server.listen(port, () => {
  console.log(`App listening on port ${port}!`);

  setInterval(() => {
    io.sockets.emit('update', clients);
  }, 100);
});