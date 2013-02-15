// Other modules
// =============

var express  = require('express'),
    fs       = require('fs'),
    http     = require('http'),
    socketIO = require('socket.io');

var config = require('./config'),
    boxxy  = require('./boxxy');

// Express, node.js initialization
// ===============================

var app    = express(),
    server = http.createServer(app),
    io     = socketIO.listen(server);

// Middleware setup
// ================

app.use(express.bodyParser());         // Parse JSON request bodies
app.use(express.static('public'));  // Serve the public dir as-is

// Boxxy initialization, broadcasting                                          *
// ==================================

var boxxyState = boxxy.initialize();

io.sockets.on('connection', function(socket) {
    socket.emit('/state', boxxyState);
});

boxxyState.onPutState = function(state) {
    io.sockets.emit('/state', state);
}

boxxyState.onAddLap = function(lap) {
    io.sockets.emit('/lap', lap);
}

// count-von-count facing API
// ==========================

var basicAuth = express.basicAuth(function(user, password) {
    return user == config.BOXXY_USER && password == config.BOXXY_PASSWORD;
}, "Unauthorized");

// This one isn't currently used AFAIK but it's useful for quick testing
app.get('/state', function(req, res) {
    res.send(boxxyState);
});

app.put('/state', basicAuth, function(req, res) {
    console.log('PUT /state');
    boxxyState.putState(req.body);
    res.send('OK');
});

app.put('/lap', basicAuth, function(req, res) {
    console.log('PUT /lap (' + req.body.team.name + ')');
    boxxyState.addLap(req.body);
    res.send('OK');
});

// shared boxxy module
// ===================
//
// This is a bit hacky. We want to reuse the boxxy module. However, it's written
// in CommonJS format and this is sort of awkward for the browser. Hence, we
// edit it a little to have good scoping and assign `exports` to the `boxxy`
// variable.

app.get('/js/boxxy.js', function(req, res) {
    fs.readFile('src/boxxy.js', function(err, data) {
        res.type('application/javascript');
        res.send(
            'var boxxy = function() {\n' +
            '    var exports = {};\n' +
            data +
            '    return exports;\n' +
            '}();\n');
    });
});

// General HTML views
// ==================

app.get('/', function(req, res) {
    res.redirect('/scores');
});

// Dry
function page(route, content, locals) {
    app.get(route, function(req, res) {
        fs.readFile(content, function(err, data) {
            locals.scripts = locals.scripts || [];  // Default
            locals.content = data;                  // Loaded from file
            res.render('application.ejs', locals);
        });
    });
}

page('/dj-contest', 'content/dj-contest.html', {
    "title": "DJ Contest"
});

page('/special-laps', 'content/special-laps.html', {
    "title": "Speciale rondes"
});

page('/scores', 'content/scores.html', {
    "title": "Scores",
    "scripts": [
        "/js/boxxy.js",
        "/js/jquery-1.7.1.min.js",
        "/socket.io/socket.io.js"
    ]
});

server.listen(config.BOXXY_PORT);
