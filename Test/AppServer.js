//CS4344 Fun Jump
// This is the Application Server, handle request to index (the menu of Fun Jump game), and create different GameServer on demand
var LIB_PATH    = "./";
require(LIB_PATH + "Server.js");

var port        = 4344;
var gamePorts   =[4345, 4346, 4347, 4348];

var gameServers =[];
var players     = [0,0,0,0];
var connections = [];
// var sockets     = [];

//Use SocketJS to send updates to clients.
var sockjs      = require('sockjs');
var sock        = sockjs.createServer();
var express     = require("express");
var http        = require('http');
var app         = express();
var httpServer  = http.createServer(app);
sock.installHandlers(httpServer, {prefix:"/AppServer"});
httpServer.listen(port, "0.0.0.0");

app.use(express.static(__dirname));

var broadcast = function (msg) {
	var id;
	for (id in connections) {
		connections[id].write(JSON.stringify(msg));
	}
}

try{

	sock.on('connection', function(conn){
		connections.push(conn);
		//send to new connections
		console.log("New player connected in AppServer");
		conn.write(JSON.stringify(players));
	});

}catch (e) {
	console.log("Cannot listen to " + port);
	console.log("Error: " + e);
}
    
app.get("/", function(req, res) {
  res.sendfile(__dirname+"/index.html");
});

app.get("/join/:rmID", function(req, res){
	var roomID = req.params.rmID;
	console.log("request to join room "+roomID + "  " + gamePorts[roomID]);
	if (gameServers[roomID] == null){
		gameServers[roomID] = new Server(gamePorts[roomID]);
		gameServers[roomID].start();
		players[roomID]=0;
	}
	players[roomID]++;
	res.send({	status:'ok', 
				port:gamePorts[roomID],
				numOfPlayers:players[roomID]
			});
	broadcast(players);

});

/*
	report number of players per room.
*/
app.get("/removeuser/:rmPort", function(req, res){
	var roomPort = req.params.rmPort;
	var roomID;
	for (i = 0; i < gamePorts.length; i++){
		if (gamePorts[i] == roomPort){
			roomID = i;
			break
		}
	}
	players[roomID]--;
	// if (players[roomID]==0){
	// 	gameServers[roomID] = null;
	// }
	broadcast(players);
});

app.get("/numOfPlayers", function(req, res){
	var roomID = req.params.rmID;
	res.send(
			{
				numOfPlayers:players
			}

		);
});

 /* serves all the static files */
 app.get(/^(.+)$/, function(req, res){ 
     console.log('static file request : ' + req.params);
     res.sendfile( __dirname + req.params[0]); 
 });

// app.listen(port, function() {
//    console.log("Listening on " + port);
//  });



