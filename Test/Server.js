"use strict"; 

var LIB_PATH = "./";
require(LIB_PATH + "FunJump.js");
require(LIB_PATH + "Platform.js");




function Server() {
    var port;         // Game port 
    var count;        // Keeps track how many people are connected to server 
    var nextPID;      // PID to assign to next connected player (i.e. which player slot is open) 
    var gameInterval; // Interval variable used for gameLoop 
    var sockets;      // Associative array for sockets, indexed via player ID
    var players;      // Associative array for players, indexed via socket ID
    var p1, p2;       // Player 1 and 2.
	var totalNoOfPlatforms = 20;
	var noOfPlatforms = 5;
	var platformDist = (FunJump.HEIGHT/ noOfPlatforms);
	var platforms = [];
	
	var broadcast = function (msg) {
		var id;
		for (id in sockets) {
			sockets[id].write(JSON.stringify(msg));
			console.log(id);
		}
	}
	
    var unicast = function (socket, msg) {
        socket.write(JSON.stringify(msg));
    }
	
    this.start = function () {
        try {
            var express = require('express');
            var http = require('http');
            var sockjs = require('sockjs');
            var sock = sockjs.createServer();

            // reinitialize 
            count = 0;
            nextPID = 1;
            gameInterval = undefined;
            players = new Object;
            sockets = new Object;
            
            // Upon connection established from a client socket
            sock.on('connection', function (conn) {
			sockets[nextPID] = conn;
                console.log("connected");
                // Sends to client
                broadcast({type:"message", content:"There is now " + count + " players"});
				broadcast({type:"map", content:platforms});
                if (count == 2) {
                    // Send back message that game is full
                    unicast(conn, {type:"message", content:"The game is full.  Come back later"});
                    // TODO: force a disconnect
                } else {
					
                    // create a new player
                    //newPlayer(conn);
                }
            }); // socket.on("connection"

            // Standard code to starts the Pong server and listen
            // for connection
            var app = express();
            var httpServer = http.createServer(app);
            sock.installHandlers(httpServer, {prefix:'/FunJump'});
            httpServer.listen(FunJump.PORT, '0.0.0.0');
            app.use(express.static(__dirname));
			generatePlatforms();
			console.log(platforms[0]);

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
			//console.log(type);
			if (type == 0) type = 1;
			else type = 0;
			platforms[i] = new Platform(Math.random()*(FunJump.WIDTH-Platform.WIDTH),position,type);
			//random X position
			//if (position < FunJump.HEIGHT - Platform.HEIGHT)
			position = position - platformDist;
			//console.log(platforms[i]);
		}
		//and Y position interval
	};
	
}
var gameServer = new Server();
gameServer.start();
console.log("SERVER LOADED");