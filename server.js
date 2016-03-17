var http = require('http');
var express = require('express');
var socket_io = require('socket.io');

var app = express();
app.use(express.static('public'));

var server = http.Server(app);
var io = socket_io(server);

var userCount = 0
var userList = []

io.on('connection', function (socket) {

    // Register a new user and let everyone know who has joined
    socket.on('new user', function (name) {
        if (nameAdded) return;

        socket.username = name;
        ++userCount;
        nameAdded = true;

        // Save this user along with their socket connection
        userList[name] = socket

        var dateJoined = new Date(Date.now());

        var broadcastMessage = {
            name: socket.username,
            userCount: userCount,
            date: dateJoined.toString()
        }

        // Send to the user and everyone else a notice who joined.
        socket.emit('user joined', broadcastMessage);
        socket.broadcast.emit('user joined', broadcastMessage);

        var userNamesList = []

        for (var i in userList) {
            userNamesList.push(i)
        }

        var userListMessage = {
            namesList: userNamesList,
            userCount: userCount
        }

        // Broadcast the list of all user's online
        socket.emit('user list', userListMessage);
        socket.broadcast.emit('user list', userListMessage);
    });

    // Handle drawing
    socket.on('draw', function(position) {
        socket.broadcast.emit('draw', position);
    });

    // Handle new game
    socket.on('new-game', function(data) {
        console.log('new game')
        socket.broadcast.emit('new-game' );
    });

    // Handle drawer selected
    socket.on('drawer-selected', function(data) {
        var broadcastMessage = {
            drawer: socket.username
        }
        console.log(broadcastMessage)
        socket.broadcast.emit('drawer-selected',broadcastMessage );
    });

    // User communications management
    var nameAdded = false

    // Register a new user and let everyone know who has joined
    socket.on('new user', function (name) {
        if (nameAdded) return;

        socket.username = name;
        ++userCount;
        nameAdded = true;

        // Save this user along with their socket connection
        userList[name] = socket

        var dateJoined = new Date(Date.now());

        var broadcastMessage = {
            name: socket.username,
            userCount: userCount,
            date: dateJoined.toString()
        }

        // Send to the user and everyone else a notice who joined.
        socket.emit('user joined', broadcastMessage);
        socket.broadcast.emit('user joined', broadcastMessage);

        var userNamesList = []

        for (var i in userList) {
            userNamesList.push(i)
        }

        var userListMessage = {
            namesList: userNamesList,
            userCount: userCount
        }

        // Broadcast the list of all user's online
        socket.emit('user list', userListMessage);
        socket.broadcast.emit('user list', userListMessage);

    });

    // Send the message to the sender and everyone else.
    socket.on('message', function(messagePacket) {

        if (nameAdded) {
            var dateJoined = new Date(Date.now());
            var broadcastMessage = {
                sender: socket.username,
                contents: messagePacket.contents,
                date: dateJoined.toString()
            }

            socket.emit('message', broadcastMessage);
            socket.broadcast.emit('message', broadcastMessage);
        }
    });

    // Handle typing message
    socket.on('typing message', function(messagePacket) {

        if (nameAdded) {
            var broadcastMessage = {
                sender: socket.username
            }

            socket.broadcast.emit('typing message', broadcastMessage);
        }
    });

    // Handle stopped typing message
    socket.on('stopped typing', function(messagePacket) {

        if (nameAdded) {
            var broadcastMessage = {
                sender: socket.username
            }

            socket.broadcast.emit('stopped typing', broadcastMessage);
        }
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (nameAdded && userCount) {
            --userCount;
            nameAdded = false;

            var dateJoined = new Date(Date.now());

            // echo globally that this client has left
            var disconnectMessage = {
                name: socket.username,
                userCount: userCount,
                date: dateJoined.toString()
            }
            socket.broadcast.emit('user left', disconnectMessage);

            for (var index in userList) {

                if (index === socket.username) {
                    delete userList[index]
                }
            }

            var userNamesList = []

            for (var i in userList) {
                userNamesList.push(i)
            }
            var userListMessage = {
                namesList: userNamesList,
                userCount: userCount
            }

            socket.broadcast.emit('user list', userListMessage);
        }
    });
});

var port = process.env.PORT || 8080
server.listen(port);
console.log('listening on port: ' + port)