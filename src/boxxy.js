function Boxxy() {
    /* State */
    this.frozen       = false;
    this.notification = null;
    this.teams        = {};
    this.laps         = [];
    this.maxLaps      = 10;

    /* To be user will override this */
    this.onPutState       = function(state) {};
    this.onAddLap         = function(lap) {};
    this.onUpdatePosition = function(position) {};
    this.onUpdate         = function() {};
}

Boxxy.prototype.putState = function(state) {
    if(state.frozen != null) this.frozen = state.frozen;
    if(state.notification != null) this.notification = state.notification;
    if(!this.frozen && state.teams) this.teams = state.teams;
    if(!this.frozen && state.laps) this.laps = state.laps;

    this.onPutState(state);
    this.onUpdate();
}

Boxxy.prototype.addLap = function(lap) {
    if(!this.frozen) {
        if(this.laps.length >= this.maxLaps) this.laps.pop();
        this.laps = [lap].concat(this.laps);

        /* Just copy the total laps instead of calculating it, more robust. */
        this.teams[lap.team].laps = lap.total;
        this.teams[lap.team].lastUpdate = lap.timestamp;

        this.onAddLap(lap);
        this.onUpdate();
    }
}

Boxxy.prototype.updatePosition = function(position) {
    if(!this.frozen) {
        this.teams[position.team].position = position.station;
        this.teams[position.team].lastUpdate = position.timestamp;
        this.onUpdatePosition(position);
        this.onUpdate();
    }
}

Boxxy.prototype.teamsByScore = function() {
    var byScore = [];
    for(var i in this.teams) byScore.push(this.teams[i]);
    byScore.sort(function (a, b) {
        return b.laps - a.laps;
    });
    return byScore;
}

/* Only used on the client side: this requires sockets.io to be in scope. */
Boxxy.prototype.listen = function(uri) {
    var boxxy  = this;
    var socket = io.connect(uri);

    socket.on('/state', function(state) {
        boxxy.putState(state);
    });

    socket.on('/lap', function(lap) {
        boxxy.addLap(lap);
    });

    socket.on('/position', function(position) {
        boxxy.updatePosition(position);
    });
}

exports.initialize = function() {
    return new Boxxy();
}
