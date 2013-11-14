//CS4344 Fun Jump
// This is the Application Server, handle request to index (the menu of Fun Jump game), and create different GameServer on demand
var LIB_PATH    = "./";
require(LIB_PATH + "Server.js");

var port        = 4344;
var gamePorts   =[4345, 4346, 4347, 4348];

var gameServers =[];
var players     = [0,0,0,0];
var gameStarted = [false, false,false, false];
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
app.use(express.bodyParser());
for (var i = 0; i < gamePorts.length; i++){
	if (gameServers[i] == null){
		gameServers[i] = new Server(gamePorts[i]);
		gameServers[i].start();
		// players[roomID]=0;
	}
}
var broadcast = function (msg) {
	var id;
	for (id in connections) {
		if (connections[id] != null)
		{
			connections[id].write(JSON.stringify(msg));
		}
	}
}

var unicast = function (socket, msg) {
	//socket may be null, in timeout function as players may disconnect during that period.
	if(socket!=null){
    	socket.write(JSON.stringify(msg));	
    }
 }

try{

	sock.on('connection', function(conn){
		connections.push(conn);
		//send to new connections
		console.log("New player connected in AppServer");
		unicast(conn, {type:"report",players:players, started: gameStarted});
		conn.on("close", function(){
			connections.pop(conn);
		});

	});

}catch (e) {
	console.log("Cannot listen to " + port);
	console.log("Error: " + e);
}



// app.get("/", function(req, res) {
  // res.sendfile(__dirname+"/index.html");
// });

app.get("/join/:rmID", function(req, res){
	var roomID = req.params.rmID;
	console.log("request to join room "+roomID + "  " + gamePorts[roomID]);
	if (gameServers[roomID] == null){
		gameServers[roomID] = new Server(gamePorts[roomID]);
		gameServers[roomID].start();
		// players[roomID]=0;
	}
	console.log(gameServers[roomID].gameStarted);
	if (!gameServers[roomID].gameStarted){
		// players[roomID] = gameServers[roomID].numOfPlayers+1;
		res.send({	status:'ok', 
					port:gamePorts[roomID],
					numOfPlayers:gameServers[roomID].numOfPlayers+1
				});
		broadcast({type:"report",players:players, started: gameStarted});
	}else{
		console.log("Gamestarted");
		res.send(500, {status: "started"});
	}


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
	players[roomID] = gameServers[roomID].numOfPlayers;
	// if (players[roomID]==0){
	// 	gameServers[roomID] = null;
	// }
	broadcast({type:"report",players:players, started: gameStarted});
});

app.get("/:rmID", function(req, res){
	var roomID = req.params.rmID;
	res.send(
			{
				numOfPlayers:gameServers[roomID].numOfPlayers
			}

		);
});


app.post("/report", function(req, res){
	console.log(req.body);
	var index = gamePorts.indexOf(parseInt(req.body.port));
	console.log(index+" "+req.body.numofplayer);
	players[index] = parseInt(req.body.numofplayer);
	gameStarted[index] = req.body.started; 
	broadcast({type:"report",players:players, started: gameStarted});
	res.send(200, JSON.stringify(players));
});
// app.listen(port, function() {
//    console.log("Listening on " + port);
//  });

 /* serves all the static files */
 app.get(/^(.+)$/, function(req, res){ 
     console.log('static file request : ' + req.params);
     res.sendfile( __dirname + req.params[0]); 
 });