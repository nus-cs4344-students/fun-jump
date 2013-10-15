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

	var mouse;

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
            socket = new SockJS("http://" + FunJump.SERVER_NAME + ":" + location.port + "/FunJump");
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
				case "fire":
					//sendToServer({type:"fire", projkey: projKey, projectile: newproj, fireTime: player.projectileTimer});
					var aProjectile = new Projectile(message.projectile.x, message.projectile.y, message.projectile.trajectory,
										message.projectile.size, message.projectile.color, message.projectile.speed,
										message.projectile.distance);
					aProjectile.updatePos((Date.now()-message.fireTime)/1000);
					opponent.projectiles.splice(message.projkey,0,aProjectile);
					break;

				case "projGone":
					//sendToServer({type:"projGone", projkey: key});
					opponent.projectiles[message.projkey].canRemove = true;
					break;

				case "hit":
					//sendToServer({type:"hit", projkey: key});
					player.isHit = true;
					opponent.projectiles.splice(message.projkey,1);
					setTimeout(function(){player.isHit=false;},4*1000/FunJump.FRAME_RATE);
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

		mouse = {
		    x: 0,
		    y: 0,
		    down: false
		};

		//Player shoots by clicking on the canvas
		playArea.addEventListener('mousedown', function(e) {
		    mouse.down = true;
		});
		playArea.addEventListener('mouseup', function(e) {
		    mouse.down = false;
		});
		//Find the coordinate of where the mouse is clicked wrt the canvas
		playArea.addEventListener('mousemove', function(e) {
		    var rect = playArea.getBoundingClientRect();
		    mouse.x = e.clientX - rect.left;
		    mouse.y = e.clientY - rect.top;
		});
	}

    this.start = function() {
        // Initialize game objects
        player = new Player(1);
		initNetwork();
        initGUI();

        player.projectileTimer = Date.now();

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
			player.projectiles.forEach(function(projectile,ind){
				projectile.y += player.jumpSpeed;
			});
			if(opponent != null){
				opponent.projectiles.forEach(function(projectile,ind){
					projectile.y += player.jumpSpeed;
				});
			}
		}

		if(opponent != null){
			renderOpponent(context);
			opponent.projectiles.forEach(function(projectile,ind){
				//Draw the bullet if it is within the player's screen
				if(Math.abs(projectile.distance+Projectile.SIZE-player.distance)<FunJump.HEIGHT/2){
					renderProjectile(projectile);
				}
   			});
		}

		player.projectiles.forEach(function(projectile,ind){
			//Draw the bullet if it is within the player's screen
			if(Math.abs(projectile.distance+Projectile.SIZE-player.distance)<FunJump.HEIGHT/2){
				renderProjectile(projectile);
			}
   		});
    }

	var renderOpponent = function(context){
		context.fillStyle = opponent.color;
		context.fillRect(opponent.x, opponent.yForOpp, Player.WIDTH, Player.HEIGHT);
	}

	// Draw the bullets
	var renderProjectile = function(context, projectile){
		context.fillStyle = projectile.color;
		context.beginPath();
		context.arc(projectile.x, projectile.y, projectile.SIZE, 0, Math.PI*2, true);
		context.closePath();
		context.fill();
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

		if (mouse.down && Date.now() - player.projectileTimer > Player.SHOOTDELAY) {
	        var newproj = new Projectile(
	                player.x + Player.WIDTH / 2,
	                player.y + Player.HEIGHT / 2,
	                new Trajectory(player.x + Player.WIDTH / 2, player.y + Player.HEIGHT / 2, mouse.x, mouse.y),
	                Projectile.SIZE,
	                Projectile.COLOR,
	                Projectile.SPEED,
	                player.distance-Player.HEIGHT/2
	           );

	        var projKey = player.projectiles.push(newproj) - 1;
	        player.projectileTimer = Date.now();

	        sendToServer({type:"fire", projkey: projKey, projectile: newproj, fireTime: player.projectileTimer});
    	}

		for (var key in player.projectiles) {
	        player.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);
	        if (player.projectiles[key].x-player.projectiles[key].size > FunJump.WIDTH || player.projectiles[key].x+player.projectiles[key].size <0)
	        {
	            player.projectiles.splice(key, 1);
	            sendToServer({type:"projGone", projkey: key});
	        }
	    }

	    if(opponent != null){
		    for (var key in opponent.projectiles) {
		        opponent.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);
		        if (opponent.projectiles[key].canRemove==true && (opponent.projectiles[key].x-opponent.projectiles[key].size > FunJump.WIDTH || opponent.projectiles[key].x+opponent.projectiles[key].size <0))
		        {
		            opponent.projectiles.splice(key, 1);
		        }
		    }
		}

		collisionDetect();

		if(player.isHit == false){
			checkMovement();
			checkPlayerFall();
			checkCollision();
		}

		if(opponent.isHit == false){
			checkOpponentFall();
		}

		setTimeout(GameLoop, 1000/FunJump.FRAME_RATE);

	};

	//detect a bullet hit
	var collisionDetect = function(){
		if (player.projectiles.length > 0) {
		    for (var key in player.projectiles) {
		        if (player.projectiles[key] != undefined) {
		 				if(opponent != null && opponent.isHit == false){
		 					if(((Math.abs(player.projectiles[key].x-opponent.x)<player.projectiles[key].size)
		 					|| (Math.abs(player.projectiles[key].x-opponent.x-Player.WIDTH)<player.projectiles[key].size))
		 					&& ((Math.abs(player.projectiles[key].distance-opponent.distance)<player.projectiles[key].size)
		 					|| (Math.abs(player.projectiles[key].distance-opponent.distance+Player.HEIGHT)<player.projectiles[key].size)))
		 					{
		 						opponent.isHit = true;
		 						player.projectiles.splice(key,1);
		 						sendToServer({type:"hit", projkey: key});
		 						setTimeout(function(){opponent.isHit=false;},4*1000/FunJump.FRAME_RATE);
		 					}
		 				}
		        }
		    }
		}
	}

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
setTimeout(function() {client.start();}, 1500);