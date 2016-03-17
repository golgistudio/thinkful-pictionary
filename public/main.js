

function drawingManager() {

    this.lastX = -1;
    this.lastY = -1;

    this.canvas = $('canvas');
    this.context = this.canvas[0].getContext('2d');

    this.canvas[0].width = this.canvas[0].offsetWidth;
    this.canvas[0].height = this.canvas[0].offsetHeight;
}

drawingManager.prototype.draw = function(position) {

    this.context.beginPath();

    if (position.lastX === -1) {
        position.lastX = position.x
    }

    if (position.lastY === -1) {
        position.lastY = position.y
    }
    this.context.moveTo(position.lastX, position.lastY);
    this.context.strokeStyle = $('#selColor').val();
    this.context.lineWidth = $('#selWidth').val();
    this.context.lineJoin = "round";
    this.context.lineTo(position.x, position.y);
    this.context.closePath();
    this.context.stroke();
}

drawingManager.prototype.clearDrawing = function () {
    this.context.clearRect(0,0, this.canvas.width(), this.canvas.height());
}

drawingManager.prototype.getPosition = function(pageX,pageY) {
    var offset = this.canvas.offset();
    return {
        x: pageX - offset.left,
        y: pageY - offset.top,
        lastX: this.lastX,
        lastY: this.lastY
    };
}

drawingManager.prototype.endDrawing = function() {
    this.lastX = -1;
    this.lastY = -1;
}

drawingManager.prototype.saveLastPosition = function(x,y) {
    this.lastX = x;
    this.lastY = y;
}
var canvasEventManager = function(socket, drawingManager) {
    var drawing = false;
    var canvas;

    canvas = $('canvas');

    canvas.on('mousedown', function(event) {
        var position = drawingManager.getPosition(event.pageX, event.pageY)
        drawingManager.draw(position);
        drawing = true;
        socket.emit("draw", position)
        drawingManager.saveLastPosition(position.x, position.y);
    });

    canvas.on('mouseup', function(event) {
        var position = drawingManager.getPosition(event.pageX, event.pageY)
        drawingManager.draw(position);
        drawing = false;
        socket.emit("draw", position)
        drawingManager.endDrawing(position.x, position.y);
    });
    canvas.on('mousemove', function(event) {
        if (drawing) {
            var position = drawingManager.getPosition(event.pageX, event.pageY)
            drawingManager.draw(position);
            socket.emit("draw", position);
            drawingManager.saveLastPosition(position.x, position.y);
        }
    });

    canvas.on("mouseleave", function(event) {
        if (drawing) {
            var position = drawingManager.getPosition(event.pageX, event.pageY)
            drawingManager.draw(position);
            drawing = false;
            socket.emit("draw", position)
            drawingManager.endDrawing()
        }
    })
}

var currentWord = "apple";
var myName = "";

var gameManager = function(socket, drawingManager) {
    this.drawButton = $('#draw-button');
    this.newGame = $('#new-game');
    this.newWord = $('#new-word');
    this.word = $('#current-word');
    var input = $('input');

    var isTyping = false;
    var timeout = undefined;

    this.drawButton.on("click", function(event) {
        socket.emit("drawer-selected", "")
        this.drawButton.addClass('active');
        $('#drawer').empty();
        $('#drawer').append(myName);
        drawingManager.clearDrawing()
    }.bind(this))

    this.newGame.on("click", function(event) {
        socket.emit("new-game", "")
        this.drawButton.prop('disabled', false)
        this.drawButton.removeClass('disabled')
        this.drawButton.removeClass('active')
        $('#drawer').empty();
        drawingManager.clearDrawing()
    }.bind(this))

    this.newWord.on("click", function(event) {
        var WORDS = [
                "word", "letter", "number", "person", "pen", "class", "people",
                "sound", "water", "side", "place", "man", "men", "woman", "women", "boy",
                "girl", "year", "day", "week", "month", "name", "sentence", "line", "air",
                "land", "home", "hand", "house", "picture", "animal", "mother", "father",
                "brother", "sister", "world", "head", "page", "country", "question",
                "answer", "school", "plant", "food", "sun", "state", "eye", "city", "tree",
                "farm", "story", "sea", "night", "day", "life", "north", "south", "east",
                "west", "child", "children", "example", "paper", "music", "river", "car",
                "foot", "feet", "book", "science", "room", "friend", "idea", "fish",
                "mountain", "horse", "watch", "color", "face", "wood", "list", "bird",
                "body", "dog", "family", "song", "door", "product", "wind", "ship", "area",
                "rock", "order", "fire", "problem", "piece", "top", "bottom", "king",
                "space"
        ];

        var index = Math.floor((Math.random() * 100));
        currentWord = WORDS[index];

        this.word.empty();
        this.word.append(currentWord)
    }.bind(this))

    // Send stopped typing message
    function stoppedTypingNotification() {
        isTyping = false;
        socket.emit("stopped typing", myName);
    }

    // send typing notification
    function isTypingNotification() {
        isTyping = true;
        socket.emit('typing message', myName);
    }

    //
    input.on('keydown', function(event) {

        // If it is not the enter key, send typing notification
        if (event.keyCode != 13) {

            // If already typing, just set the notification
            if (!isTyping) {
                isTypingNotification();
            } else {
                clearTimeout(timeout);
                timeout = setTimeout(stoppedTypingNotification, 3000);
            }
            return;
        }

        // Send clear typing notification
        clearTimeout(timeout);
        stoppedTypingNotification();


        var message = $("#message-input").val();

        if (message.trim().length > 0) {
            var messagePacket = {
                contents: message
            }

            socket.emit('message', messagePacket);
            input.val('');
        }
    });
}

var socketManager = function(socket, drawingManager) {

    var messages = $('#messages');
    var namesID = $('#usernames');
    var userList = $('#userList');
    var notifications = $('#notifications');
    var updates = $('#updates');

    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // get localized date in json format from a date string
    function getJSONDate(dateString) {
        var newDate = new Date(dateString);
        var dayString = days[newDate.getDay()]
        var dateString = newDate.toLocaleDateString()
        var timeString = newDate.toLocaleTimeString()
        return {
            day: dayString,
            dateString: dateString,
            timeString: timeString
        }
    }

    socket.on('draw', function(position) {
        drawingManager.draw(position)
    }.bind(this))

    socket.on('drawer-selected', function(data) {
        console.log(name)
        $('#draw-button').addClass('disabled')
        $('#draw-button').removeClass('active')
        $('#drawer').empty();
        $('#drawer').append(data.drawer);
        drawingManager.clearDrawing()
    }.bind(this))

    socket.on('winner', function(name) {
        console.log(name)
        $('#draw-button').addClass('disabled')
        $('#draw-button').removeClass('active')
        $('#drawer').empty();
        $('#drawer').append(name);
        drawingManager.clearDrawing()
    }.bind(this))

    socket.on('new-game', function() {
        $('#draw-button').removeClass('disabled')
        $('#draw-button').removeClass('active')
        $('#drawer').empty();
        drawingManager.clearDrawing()
    }.bind(this))

    // Show current users on the side bar
    function showCurrentUsers(data) {
        var namesList = data.namesList;
        var userCount = data.userCount;

        // Empty the current list and title
        namesID.empty()
        userList.empty()

        // Add the current users
        for (var index in namesList) {
            namesID.append('<li>' + namesList[index] + '</li>');
        }

        // Update the title with the current user count
        userList.append('Users Online (' + userCount + ')');
    }

    // Socket event handlers
    var listNames = function(data) {
        showCurrentUsers(data)
    }

    var addMessage = function(message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.sender +  ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'
        messageString += '<div class="message">' + message.contents + '</div>'
        messages.prepend(messageString);
    };


    var userJoined = function (message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.name +  ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'
        messageString += '<div class="message">' + message.name + ' joined the discussion</div>'
        messageString += '<div class="message">' + message.userCount + ' users in chat</div>'
        updates.prepend(messageString);

    }

    var userLeft = function (message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.name +  ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'

        messageString += '<div class="message">' + message.name + ' left the discussion</div>'
        messageString += '<div class="message">' + message.userCount + ' users remaining in chat room</div>'
        updates.prepend(messageString);
    }

    var typingMessage = function (message) {
        var messageString = '<div><span class="update">' + message.sender +  ' is typing a message.... </span></div>'
        notifications.append(messageString);
    }

    var clearTypingMessage = function (message) {
        notifications.empty();
    }

    // Register for socket messages
    socket.on('message', addMessage);
    socket.on('user joined', userJoined);
    socket.on('user left', userLeft);
    socket.on('user list', listNames);
    socket.on('typing message', typingMessage);
    socket.on('stopped typing', clearTypingMessage);
}

var main = function() {

    var socket = io();
    var mgr = new drawingManager();

    gameManager(socket, mgr);;
    canvasEventManager(socket, mgr);
    socketManager(socket, mgr);

    function updateNickName(data) {
        myName = data.results[0].user.name.first
        myName = myName.trim();
        $("#name").empty();
        $("#name").append(myName);
        socket.emit('new user',  myName);
    }

    // Get a random user name and register it
    $.ajax({
        url: 'https://randomuser.me/api/',
        dataType: 'json',
        success: updateNickName
    });
}

$(document).ready(function() {
    main();
});
