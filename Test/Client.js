"use strict"; 
function Client(){
	var socket;         // socket used to connect to server 
	var playArea;
	var counter;
	var initGUI;
	var player;
	var opponent = new Player(2);
	var counter = 0;
	var playerStopped = true;
	var keyState = {};
	var pid = 0;
	var connected = false;
	var xMaxDist = 15;
	var xCurr = 0;
	
    var sendToServer = function (msg) {
        socket.send(JSON.stringify(msg));
    }
	
    var appendMessage = function(location, msg) {
		if(location=="clientMsg"){
			document.getElementById(location).innerHTML = msg;
		}
		else{
			var prev_msgs = document.getElementById(location).innerHTML;
			document.getElementById(location).innerHTML = "[" + new Date().toString() + "] " + msg + "<br />" + prev_msgs;
		}
    }
	
    var initNetwork = function() {
        // Attempts to connect to game server
        try {
            socket = new SockJS("http://" + FunJump.SERVER_NAME + ":" + FunJump.PORT + "/FunJump");
            socket.onmessage = function (e) {
                var message = JSON.parse(e.data);
                switch (message.type) {
                case "message": 
                    appendMessage("serverMsg", message.content);
                    break;
				case "map":
					convertToPlatforms(message.content);
								connected = true;
					break;
				case "newplayer":
					pid = message.pid;
					opponent = new Player(2);
					break;
				case "updateOpponent":
					updateOpponent(message);
					break;
                default: 
					appendMessage("serverMsg", "unhandled meesage type " + message.type);
					break;
                }
            }
        } catch (e) {
            console.log("Failed to connect to " + "http://" + FunJump.SERVER_NAME + ":" + FunJump.PORT);
        }
    }
	
	
	var initGUI = function() {
		playArea = document.getElementById('mycanvas');
		playArea.width = FunJump.WIDTH;
		playArea.height = FunJump.HEIGHT;
		
		window.addEventListener("keydown", function(e) {
			keyState[e.keyCode || e.which] = true;
		}, false);
		
		window.addEventListener("keyup", function(e) {
			keyState[e.keyCode || e.which] = false;
		}, false);
	}
	
    this.start = function() {
        // Initialize game objects
        player = new Player(1);
		initNetwork();
        initGUI();
		setTimeout(function() {
			GameLoop();
			setInterval(function() {render();}, 1000/FunJump.FRAME_RATE);
		}, 1000);
    }
	
	var render = function() {
        // Get context
        var context = playArea.getContext("2d");
        // Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);

        // Draw playArea border
        context.fillStyle = "#000000";
        context.fillRect(0, 0, playArea.width, playArea.height);

		context.fillStyle = player.color;
		//context.fillRect(player.x,player.y,Player.WIDTH,Player.HEIGHT);
		context.fillRect(player.x,(FunJump.HEIGHT - (player.distance - player.yRel)),Player.WIDTH,Player.HEIGHT);
		//context.drawImage(player.image,player.x,player.y,Player.WIDTH,Player.HEIGHT);
		
		drawPlatforms(context);
		if(player.screenMove == true){
			platforms.forEach(function(platform,ind){
				platform.y += player.jumpSpeed;	//Move the platform accordingly.
			});
		}
		if(opponent != null){
			renderOpponent(context);
		}
    }

	var renderOpponent = function(context){
		context.fillStyle = opponent.color;
		context.fillRect(opponent.x, opponent.yForOpp, Player.WIDTH, Player.HEIGHT);
	}
	
	var updateOpponent = function(message){
		opponent.distance = message.playerDistance;
		opponent.isFalling = message.playerIsFalling;
		opponent.isJumping = message.playerIsJumping;
		//opponent.y = message.playerY;
		opponent.x = message.playerX;
		opponent.vx = message.playerVX;
		opponent.jumpSpeed = message.playerJumpSpeed;
		opponent.fallSpeed = message.playerFallSpeed;
		opponent.yForOpp = FunJump.HEIGHT - (opponent.distance - player.yRel);
		opponent.receivedDirection = message.playerDirection;
	}
	
	var GameLoop = function(){
		checkMovement();
		checkPlayerFall();
		checkCollision();
		checkOpponentFall();
		setTimeout(GameLoop, 1000/FunJump.FRAME_RATE);
		
	};

	var jumping = 0;
	var falling = 0;

	var checkOpponentFall = function(){
		if (opponent.isJumping){
			opponent.checkJump();
		}
		if (opponent.isFalling){
			opponent.checkFall();
		}
		
		opponent.move(opponent.receivedDirection);
		opponent.yForOpp = FunJump.HEIGHT - (opponent.distance - player.yRel);
	}
	
	var checkPlayerFall = function(){
		if (player.isJumping){
			player.checkJump();
			jumping ++;
			falling = 0;
		}
		if (player.isFalling){
			player.checkFall();
			falling ++;
			jumping = 0;
		}
		if(connected && (falling == 1 || jumping == 1)){
			updatePlayerVariables();
		}
	}
	
	var updatePlayerVariables = function(){
		sendToServer({type:"updatePlayerPosition",
			playerX: player.x,
			playerY: player.y,
			playerVX: player.vx,
			playerIsFalling: player.isFalling,
			playerIsJumping: player.isJumping,
			playerDistance: player.distance,
			playerJumpSpeed: player.jumpSpeed,
			playerFallSpeed: player.fallSpeed,
			playerDirection: player.direction});
	}
	
	var stopped = 0;
	var checkMovement = function(e){
		if	((keyState[37] || keyState[65]) && (keyState[39] || keyState[68]))	//Press both left and right!
			player.move('stop');
		else if (keyState[37] || keyState[65]){
			player.move('left');
			if(player.x >= (xCurr + xMaxDist) || player.x <= (xCurr- xMaxDist)){
				xCurr = player.x;
				updatePlayerVariables();
			}
			stopped = 0;
		}
		else if (keyState[39] || keyState[68]){
			player.move('right');
			if(player.x >= (xCurr + xMaxDist) || player.x <= (xCurr- xMaxDist)){
				xCurr = player.x;
				updatePlayerVariables();
			}
			stopped = 0;
		}
		else{	//Player Stopped
			player.move('stop');
			if(stopped == 1)
				updatePlayerVariables();
			stopped ++;
		}
	}
	
	var totalNoOfPlatforms = 20;
	var noOfPlatforms = 5;
	var platformDist = (FunJump.HEIGHT/ noOfPlatforms);
	var platforms = [];
	
	var convertToPlatforms = function(p){
		for(var i = 0; i < p.length; i++){
			platforms[i] = new Platform(p[i].x, p[i].y, p[i].type);
		}
	}
	
	var drawPlatforms = function(context){
		platforms.forEach(function (platform){
			context.fillStyle = platform.color;
			context.fillRect(platform.x, platform.y, Platform.WIDTH, Platform.HEIGHT);
		});
	}
	
	var checkCollision = function(){
		platforms.forEach(function(platform, no){
			if(player.isFalling && 
			(player.x < platform.x + Platform.WIDTH) &&
			(player.x + Player.WIDTH > platform.x) &&
			(player.y + Player.HEIGHT > platform.y) &&
			(player.y + Player.HEIGHT < platform.y + Platform.HEIGHT)){
				platform.onCollide(player);
				//console.log("Player Distance: " + player.distance + "Platform Y : " + (500- platform.origY));
				player.distance = (500-platform.origY) + Player.HEIGHT;
			}
/*			if(opponent.isFalling && 
			(opponent.x < platform.x + Platform.WIDTH) &&
			(opponent.x + Player.WIDTH > platform.x) &&
			(opponent.y + Player.HEIGHT > platform.y) &&
			(opponent.y + Player.HEIGHT < platform.y + Platform.HEIGHT)){
				platform.onCollide(opponent);
			}*/ //NEED TO FIX YREL forplatforms 
		});
	}
}

var client = new Client();
console.log("CLIENT Loaded");
setTimeout(function() {client.start();}, 0);