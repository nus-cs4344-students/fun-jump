"use strict";

var LIB_PATH = "./";
require(LIB_PATH + "FunJump.js");
require(LIB_PATH + "Powerup.js");
require(LIB_PATH + "Platform.js");

function Server(PORT) {
    var port;         // Game port
    var gameInterval; // Interval variable used for gameLoop
    var sockets;      // Associative array for sockets, indexed via player ID
	var totalNoOfPlatforms = 20;
	var noOfPlatforms      = 6;
	var platformDist       = (FunJump.HEIGHT/ noOfPlatforms);
	var platforms          = [];
	var powerups           = [];
	var maxNoOfPlayers     = Server.MAXPLAYERS;	//Set ur max number of players here. CURRENTLY ITS 4 due to 4 images!

	var readyPlayers       = new Array(maxNoOfPlayers);	//Game state for ready.
	var connectedPlayers   = new Array(maxNoOfPlayers);	//Game state for connected players
	var ready              = 0;
	var gameStarted;
	var nextAvailSlot;
	var numOfPlayers       = 0;

	var broadcast = function (msg) {
		var id;
		for (id in sockets) {
			if(id!=null)	//We need this check cause player may disconnect during the game.
				sockets[id].write(JSON.stringify(msg));
		}
	}

	//Write to everyone except the person whom the packet was sent from.
	var broadcastToRest = function (msg,id) {
		var i;
		for	(i in sockets)	{
			if((i != id) && (i !=null) && sockets[i] != null)
				sockets[i].write(JSON.stringify(msg));
		}
	}

    var unicast = function (socket, msg) {
        socket.write(JSON.stringify(msg));
    }

	//Function to find the next available slot.
	var nextAvailSlot = function(){
		for(var i = 0; i < connectedPlayers.length; i++){
			if(connectedPlayers[i] == false)
				return i;
		}
		return null;
	}

    this.start = function () {
    	console.log("To start a game server on port " + PORT);
        try {
            var express = require('express');
            var http = require('http');
            var sockjs = require('sockjs');
            var sock = sockjs.createServer();
            var app = express();
            var httpServer = http.createServer(app);

            //----------------INITIALIZING-----------------//
			for(var i = 0; i < connectedPlayers.length; i++){
				connectedPlayers[i] = false;
			}

            gameInterval = undefined;
            sockets = new Object;
            generatePlatforms();	//Generate the platforms for all players.
			generatePowerups();	//Generates powerup for all players.
			gameStarted = false;
			//---------------------------------------------//


			// Upon connection established from a client socket
            sock.on('connection', function (conn) {
				var playerID = nextAvailSlot();

				//FULL! cannot join! Appserver should do the checking but just in case...
				if(playerID == null){
					unicast(conn, {type:"error", content:"Game is full!"});
					return ;
				}

				//Game has started! No one else can join.
				else if(gameStarted == true){
					unicast(conn, {type:"error", content:"Game has started! You are not able to join it."});
					return ;
				}

				else{
					sockets[playerID] = conn;
					console.log("New Player ID: " + playerID + " has connected");


					//Server sends the map and the new players id to him
					unicast(sockets[playerID], {type:"onConnect", content:platforms, contentp:powerups, pid:playerID, otherPlayers:connectedPlayers, maxPlayers:Server.MAXPLAYERS, ready:ready});
					connectedPlayers[playerID] = true;

					//Server sends to everyone else that a new player has joined, together with his playerID
					broadcastToRest({type:"newplayer", pid:playerID},playerID);
					numOfPlayers++;


					// --------------- Commands Server Receives From Client ------------------
					conn.on('close', function () {
						console.log("Player ID: " + playerID + " has DISCONNECTED!");
						connectedPlayers[playerID] = false;	//Remove player from array.
						sockets[playerID] = null;	//set the socket to be null.

						//Send a player disconnected command ALL clients for them to remove the player.
						var message = {type:"playerDC", pid:playerID};
						broadcastToRest(message,playerID);
						numOfPlayers--;
						console.log("NumberOfPlayers: "+numOfPlayers);

						// TODO  Close server when all players left the room, need to cancle port binding to socket.

						// if (numOfPlayers < 1){
						// 	// sock.destroy();
						// 	httpServer.close(function(){
						// 		console.log("Closed server at port: "+PORT);
						// 	});
						// }
						var httpReq = require("http");
						httpReq.request({
									host: FunJump.SERVER_NAME,
									port: FunJump.PORT,
									path: "/removeuser/"+PORT,
									method: "GET"
								},
									function(res){}).end();
						
					});

					conn.on('data', function (data) {
						var message = JSON.parse(data);
						switch (message.type) {
							// one of the player starts the game.
							case "updatePlayerPosition":
								message.type = "updateOpponent";
								broadcastToRest(message,playerID);
								break;

							case "updatePlayerDirection":
								message.type = "updateOpponentDirection";
								broadcastToRest(message,playerID);
								break;

							case "hit":
								broadcastToRest(message,playerID);
								break;

							case "fire":
								broadcastToRest(message,playerID);
								break;

							case "projGone":
								broadcastToRest(message,playerID);
								break;
								
							case "ready":
								ready = ready | (1<<message.pid);
								broadcastToRest(message, message.pid);
								if (numOfPlayers > 1 && ready == Math.pow(2, numOfPlayers)-1){
									broadcast({type:"start", timeToStart:new Date().getMilliseconds()+2000})
								}
								break;
							case "powerup":
								//TODO: SERVER DECICISION ON WHO SHOULD GET SHIELD
								if(powerups[message.powerupid].taken == false){
									powerups[message.powerupid].taken = true;
									broadcast(message);	//broadcast to all!
								}
								else{	//ignore.
								}
								break;
							case "removeshield":
								broadcast(message);
								break;
							default:
								console.log("Unhandled " + message.type);
						}
					});
				}
            }); // socket.on("connection"

            // Standard code to starts the Pong server and listen
            // for connection
            sock.installHandlers(httpServer, {prefix:'/FunJump'});
            httpServer.listen(PORT, '0.0.0.0');
            app.use(express.static(__dirname));

            console.log("Started listen to: "+PORT);
        } catch (e) {
            console.log("Cannot listen to " + port);
            console.log("Error: " + e);
        }
    }

	var generatePlatforms = function(){
		var position = FunJump.HEIGHT - Platform.HEIGHT - platformDist, type;
		
		//'position' is Y of the platform, to place it in quite similar intervals it starts from 0
		
		for (var i = 0; i < totalNoOfPlatforms; i++) {
			type = Math.floor(Math.random()*5);	//1:5 ratio for special:normal
			if (type == 0){	//Special Platform Generated.
				type = 1;
				platforms[i] = new Platform(Math.random()*(FunJump.WIDTH-Platform.WIDTH),position,type);
				
				//Now we generate a normal platform near this platform.
				var incorrectlyGenerated = true;
				while(incorrectlyGenerated){
					var x = Math.random()*(FunJump.WIDTH-Platform.WIDTH);
					if((x < platforms[i].x && ((x + Platform.WIDTH) > platforms[i].x)) || (x > platforms[i].x && (x < (platforms[i].x + Platform.WIDTH)))){
						incorrectlyGenerated = true;	//Continue till we generate a NON OVERLAPPING platform
					}
					else{
						totalNoOfPlatforms ++;
						i++;
						incorrectlyGenerated = false;
						platforms[i] = new Platform(x,position,0);
					}
				}
				
				//New Y position
				position = position - platformDist;				
			}
			else{
				type = 0;
				platforms[i] = new Platform(Math.random()*(FunJump.WIDTH-Platform.WIDTH),position,type);
				
				//New Y position
				position = position - platformDist;
			}
		}

		//The last platform is actually the finish line
		type = 3;
		platforms[totalNoOfPlatforms] = new Platform(0,position,type);
		position = position - platformDist;
	};
	
	var generatePowerups = function(){
		var powerupID = 0;
		for (var i = 0; i < totalNoOfPlatforms; i++) {	//No of powerups depends on the number of platforms.
			var chance = Math.floor(Math.random()*Powerup.CHANCE);
			if(chance == 1){
				powerups[powerupID] = new Powerup(
						(platforms[i].x + Platform.WIDTH / 2 - (Powerup.WIDTH / 4)),
						(platforms[i].y - Powerup.HEIGHT - 5),
						powerupID);
				powerupID ++;
			}
		}
	};
}


// var gameServer = new Server();
// gameServer.start();
// console.log("SERVER LOADED");
Server.MAXPLAYERS = 4;
global.Server = Server