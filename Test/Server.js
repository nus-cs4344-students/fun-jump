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

	var readyPlayers = new Array(maxNoOfPlayers);	//Game state for ready.
	var connectedPlayers = new Array(maxNoOfPlayers);	//Game state for connected players
	var latencyPlayers = new Array(maxNoOfPlayers);
	var timeDiffPlayers = new Array(maxNoOfPlayers);

	var ready = 0;
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
				var noOfLatencyCheckPacket = 0;
				var totalLatencyAfterThreePackets = 0;
				var clientTimeDiffAfterThreePackets = 0;
				var initialServerTime = 0;
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

					//Get Client RTT & Sync the time (3 packets at 1 second interval diff)
					setTimeout(function(){unicast(sockets[playerID], {type:"latencyCheck", content:0, serverTime:Date.now()});},1000);
					setTimeout(function(){unicast(sockets[playerID], {type:"latencyCheck", content:0, serverTime:Date.now()});},2000);
					setTimeout(function(){unicast(sockets[playerID], {type:"latencyCheck", content:0, serverTime:Date.now()});},3000);

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
								/*	Server decides on whom will get the powerup based on
									
									Rules are as follows
									1) When a server receives a message that the client has received a powerup,
									2) it will wait for 300ms before giving the powerup to the player.
									3) During the wait, it will check for any other person trying to get the powerup
									4) If there are, it will check the time received. 
									5) Assume playerA took it at 5500ms and playerB took it at 5400ms.
										However, playerA command got received by the server first while playerB command received second.
										This is within the 'safe 300ms' zone. 
									6) Server should give playerB the benefit of having the shield as they took it first despite server receiving the taking shield second. [ENSURE FAIRNESS]
									
								*/
							
								if(powerups[message.powerupid].taken == false){
									if(powerups[message.powerupid].touchTime == 0){	//When the powerup has been taken up first, the timer will start and best time/player will be set.
										powerups[message.powerupid].touchTime = message.pTime - timeDiffPlayers[message.pid];	//Get the time based on the server that it touched the shield.
										
										powerups[message.powerupid].pid = message.pid;
										
										setTimeout(function(){
											powerups[message.powerupid].taken = true;
											message.pid = powerups[message.powerupid].pid;	//Latest PID update.
											broadcast(message);	//broadcast to all!
										},300);	// 300 milisecond
									}
									
									
									//If it detects a message where the case is similar to (5), the current player will have priority.
									else if(powerups[message.powerupid].touchtime > message.pTime - timeDiffPlayers[message.pid]){
										powerups[message.powerupid].touchTime = message.pTime - timeDiffPlayers[message.pid];
										powerups[message.powerupid].pid = message.pid;
									}
								}
								else{	//ignore.
								}
								break;
							case "removeshield":
								broadcast(message);
								break;
							case "latencyCheck":
								noOfLatencyCheckPacket++;
								totalLatencyAfterThreePackets = totalLatencyAfterThreePackets + (Date.now() - message.serverTime);
								
								//Server - Client time - RTT/2
								//(If -ve means Client time is SLOWER than Server Time)
								//(If +ve means Client time is FASTER than Server Time)
								//Final Server Time: 10:17,	Final Client Time: 10:31	, One Way RTT is 1 minute.
								//10:30 - 10:17 + 1 minute = +14 minute difference.
								clientTimeDiffAfterThreePackets = clientTimeDiffAfterThreePackets + 
											message.content - Date.now() + ((Date.now() - message.serverTime) / 2) ;
											
								if(noOfLatencyCheckPacket == 3){	//average of three packets.
									latencyPlayers[playerID] = totalLatencyAfterThreePackets / 3;
									timeDiffPlayers[playerID] = clientTimeDiffAfterThreePackets / 3;
									//console.log("3 packets captured.AVE RTT LATENCY IS " + latencyPlayers[playerID] + " " + timeDiffPlayers[playerID]);
								}
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