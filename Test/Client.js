"use strict";
function Client(){
	var that = this;
	var socket;         // socket used to connect to server
	var playArea;
	var initGUI;
	var player;
	var opponent = new Player(2);
	var counter = 0;
	var playerStopped = true;
	that.pid = 0;
	var connected = false;
	var mouse;
	var imageRepository;
	var debugTxt;
	var convMaxXThres = 50;
	var	convMaxYThres = 50;
	var readyBtn;
	var noOfPlayers = 0;

    var sendToServer = function (msg) {
        socket.send(JSON.stringify(msg));
    }

    that.sendToServer = sendToServer;
    var appendMessage = function(location, msg) {
		/*if(location=="clientMsg"){
			document.getElementById(location).innerHTML = msg;
		}
		else{
			var prev_msgs = document.getElementById(location).innerHTML;
			document.getElementById(location).innerHTML = "[" + new Date().toString() + "] " + msg + "<br />" + prev_msgs;
		}*/
    }

    var initNetwork = function() {
        // Attempts to connect to game server
        try {
            socket = new SockJS("http://" + FunJump.SERVER_NAME + ":" + location.port + "/FunJump");

			// --------------- Commands Client Receives From Server ------------------
            socket.onmessage = function (e) {
                var message = JSON.parse(e.data);
                switch (message.type) {
                case "message":
                    appendMessage("serverMsg", message.content);
                    break;

				case "updateReady":
					break;

				case "playerDC":	//Player has disconnected....
					var playerDisconnected = message.pid;
					//noOfPlayers --;
					//opponent[playerDisconnected] = null;
					break;

				case "onConnect":	//Map also includes that the player has joined!
					player = new Player(message.pid);
					player.type = "player";
					player.projectileTimer = Date.now();
					noOfPlayers ++;
					that.pid = message.pid;

					$("#player"+message.pid+"_ready").text("You");
					var connectedPlayers = message.otherPlayers;
					for(var i = 0; i < message.maxPlayers; i ++){
						if(connectedPlayers[i] == true){
							/*opponent[i] = new Player(message.pid);
							opponent.type = "opponent";*/
							//noOfPlayers++;
							$("#player"+i+"_ready").text("Not Ready");
						}
					}
					console.log(connectedPlayers);
					convertToPlatforms(message.content);
					connected = true;
					break;

				case "newplayer":
					opponent = new Player(message.pid);
					$("#player"+message.pid+"_ready").text("Not Ready");
					opponent.type = "opponent";
					break;
				case "nwejoiner":
					var id = message.pid;
					if (id != that.id){
						$("#player"+id+"_ready").text("Not Ready");
					}
				case "updateOpponent":
					updateOpponent(message);
					break;

				case "updateOpponentDirection":
					opponent.directionUpdates++;
					renderOpponentMovement(message.playerDirection,opponent.directionUpdates);
					break;

				case "fire":
					//sendToServer({type:"fire", projkey: projKey, projectile: newproj, fireTime: player.projectileTimer});
					var aProjectile = new Projectile(message.projectile.x, message.projectile.y, message.projectile.trajectory,
										message.projectile.size, message.projectile.color, message.projectile.speed,
										message.projectile.distance);
					aProjectile.updatePos((Date.now()-message.fireTime)/1000);
					aProjectile.y = player.distance-aProjectile.distance+player.y;
					opponent.shoot = true;
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
					setTimeout(function(){player.isHit=false;},Player.FREEZE*1000/FunJump.FRAME_RATE);
					break;
				case "ready":
					var id = message.pid;
					$("#player"+id+"_ready").text("Ready");
					break;

				case "start":

					var timeToWait = message.timeToStart - (new Date()).getMilliseconds();
					console.log("time to wait: "+ timeToWait);
					// setTimeout(functon(){},timeToWait);
					setInterval(function(){
								GameLoop();
							},
							1000/FunJump.FRAME_RATE
					);
                default:
					appendMessage("serverMsg", "unhandled meesage type " + message.type);
					break;
                }
				// ------------END of Commands Client Receives From Server ------------------
            }
        } catch (e) {
            console.log("Failed to connect to " + "http://" + FunJump.SERVER_NAME + ":" + loction.port);
        }
    }

	//This function is needed to reduce the number of updates by the client for movement!
	//The opponent will render accordingly to an update. If i receive 1xleft and receive 1xstop after 4 seconds later, it will render left for 4 seconds. During this 4 seconds, there should not be any updates by the opponent.
	var renderOpponentMovement = function(direction,noOfUpdates){
		if(noOfUpdates == opponent.directionUpdates){
			opponent.move(direction);
			if(!(direction == "stop" && opponent.vx == 0))
				setTimeout(function(){renderOpponentMovement(direction,noOfUpdates);}, 1000/FunJump.FRAME_RATE);
		}
	}

	/*var playerReady = function(){

	}*/

	var initGUI = function() {
		playArea = document.getElementById('mycanvas');
		playArea.width = FunJump.WIDTH;
		playArea.height = FunJump.HEIGHT;

		readyBtn = document.getElementById('readyBtn');
		readyBtn.onclick = function() {alert('alert');};

		window.addEventListener("keydown", function(e) {
			//playerStopped = true cause the last action should be stopped! Otherwise, there can be multiple movements which will be erratic!
			if((e.which == 37 || e.which == 39) && playerStopped == true){
				playerStopped = false;
				movePlayer(e,true);
			}

			if(e.which == 38)
				debugFn();

		}, false);

		window.addEventListener("keyup", function(e) {
			if (e.which == 37 || e.which == 39){
				playerStopped = true;
				stopPlayer(true);
			}
		}, false);

		mouse = {
		    x: 0,
		    y: 0,
		    down: false
		};

		//Player shoots by clicking on the canvas
		playArea.addEventListener('mousedown', function(e) {
		    mouse.down = true;
		    fireBullet();
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
		initNetwork();	//Initilizes player object too!

        setTimeout(function() {initGUI();});

		//Start game loop inside function loading images to ensure that all images are loaded beforehand
        imageRepository = new ImageRepository();
        checkImgLoaded();
    }

    var checkImgLoaded = function(){
    	if(imageRepository.allImgLoaded === false){
    		setTimeout(checkImgLoaded, 500);
    	}
    	else{
			if(connected == false)
				setTimeout(checkImgLoaded, 500);
			else{	//Piggy backing here
				// console.log("Game loop starts");
				// setTimeout(function(){
				// 	setInterval(function() {GameLoop();render();}, 1000/FunJump.FRAME_RATE);
				// });
				render();
			}
    	}
    }


	var render = function() {
        // Get context
        var context = playArea.getContext("2d");

		// Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);
   		context.drawImage(imageRepository.background, 0, 0, playArea.width, playArea.height);
		renderPlayer(context, player.id, player.x,(FunJump.HEIGHT - (player.distance - player.yRel)), player.isHit, player.shoot, player);

		drawPlatforms(context);
	if(player.screenMove == true){
			if(opponent != null){
				opponent.projectiles.forEach(function(projectile,ind){
					projectile.y += player.jumpSpeed;
				});
			}
		}
		if(opponent != null){
			renderPlayer(context, opponent.id, opponent.x, opponent.yForOpp, opponent.isHit, opponent.shoot, opponent);
			opponent.projectiles.forEach(function(projectile,ind){
				//Draw the bullet if it is within the player's screen
				if(projectile.distance+Projectile.SIZE>player.yRel){
					renderProjectile(context,projectile);
				}
   			});
		}

		player.projectiles.forEach(function(projectile,ind){
			//Draw the bullet if it is within the player's screen
			if(projectile.distance+Projectile.SIZE>player.yRel){
				renderProjectile(context,projectile);
				console.log(projectile);
			}
   		});
    }

	var renderOpponent = function(context){
		context.fillStyle = opponent.color;
		context.fillRect(opponent.x, opponent.yForOpp, Player.WIDTH, Player.HEIGHT);
	}

	var renderPlayer = function(context, playerid, playerx, playery, playerIsHit, playerShoot, player){

		switch(playerShoot){
			case true:
				switch(playerid){

				case 0:
					context.drawImage(imageRepository.girlya, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 1:
					context.drawImage(imageRepository.normalguya, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 2:
					context.drawImage(imageRepository.angela, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 3:
					context.drawImage(imageRepository.evila, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				default:
					console.log("Invalid player id: "+ playerid);}
				player.shoot = false;
				break;
			case false:
				switch(playerid){

				case 0:
					context.drawImage(imageRepository.girly, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 1:
					context.drawImage(imageRepository.normalguy, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 2:
					context.drawImage(imageRepository.angel, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 3:
					context.drawImage(imageRepository.evil, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				default:
					console.log("Invalid player id: "+ playerid);}

		}

		if(playerIsHit == true){
			context.drawImage(imageRepository.splash, playerx - (Projectile.SPLASH_SIZE - Player.WIDTH)/2, playery - (Projectile.SPLASH_SIZE - Player.HEIGHT)/2, Projectile.SPLASH_SIZE, Projectile.SPLASH_SIZE);
		}
	}

	// Draw the bullets
	var renderProjectile = function(context, projectile){
		if(projectile.landedTimer > 0){
			context.drawImage(imageRepository.splash, projectile.x - Projectile.SPLASH_SIZE/2, projectile.y - Projectile.SPLASH_SIZE/2, Projectile.SPLASH_SIZE, Projectile.SPLASH_SIZE);
		}
		else{
			context.fillStyle = projectile.color;
			context.beginPath();
			context.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI*2, true);
			context.closePath();
			context.fill();
		}
	}


	//NEED TO ADD IN JITTER OPTION HERE!
	var updateOpponent = function(message){
		var tempYForOpp = FunJump.HEIGHT - (message.distance - player.yRel);

		//TELEPORT NEEDS TO HAPPEN! TOO FAR
		if( ((opponent.x + convMaxXThres) < message.playerX )||
			((opponent.x - convMaxXThres) > message.playerX ) ||
			((opponent.distance - convMaxYThres) > message.playerDistance)||
			((opponent.distance + convMaxYThres) < message.playerDistance)	){

			/*console.log("RESET POS " +
				((opponent.x + convXThres) < message.playerX ) + " " +
				((opponent.x - convXThres) > message.playerX ) + " " +
				((opponent.distance - convYThres) > message.playerDistance) + " " +
				((opponent.distance + convYThres) < message.playerDistance))

			console.log("PREV DISTANCE " + opponent.distance + " NEW DIST " +  message.playerDistance);*/
				opponent.distance = message.playerDistance;
				opponent.isFalling = message.playerIsFalling;
				opponent.isJumping = message.playerIsJumping;
				opponent.x = message.playerX;
				opponent.jumpSpeed = message.playerJumpSpeed;
				opponent.fallSpeed = message.playerFallSpeed;
				opponent.yForOpp = tempYForOpp;
		}

		else{	//It is within the range, so do simple convergence.
			//CONVERGENCE OVER HERE
			//Move to x position properly

			//Move to y position properly

			//Set falling / jumping
			//opponent.isFalling = message.playerIsFalling;
			//opponent.isJumping = message.playerIsJumping;

			//Set Jump Speed
			/*opponent.jumpSpeed = message.playerJumpSpeed;
			opponent.fallSpeed = message.playerFallSpeed;*/
		}
	}

	var GameLoop = function(){

		//console.log(player.projectiles);
		for (var key in player.projectiles) {
			player.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);

	        if (player.projectiles[key].landedTimer >= 5)
	        {
	            player.projectiles.splice(key, 1);
	            sendToServer({type:"projGone", projkey: key});
	        }
	    }

	    if(opponent != null){
		    for (var key in opponent.projectiles) {
		        opponent.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);
		        if (opponent.projectiles[key].canRemove==true && opponent.projectiles[key].landedTimer >= 10)
		        {
		            opponent.projectiles.splice(key, 1);
		        }
		    }
		}


		if(player.isHit == false && player.finish == false){
			//checkMovement();
			checkPlayerFall();
			checkCollisionForPlayer();
		}

		if(opponent.isHit == false && opponent.finish == false){

			checkOpponentFall();
			checkCollisionForOpponent(opponent);
		}

		collisionDetect();

		render();
		//setTimeout(GameLoop, 1000/FunJump.FRAME_RATE);

	};

	var fireBullet = function(){

		if (Date.now() - player.projectileTimer > Player.SHOOTDELAY && player.isHit == false) {
	        var newproj = new Projectile(
	                player.x + Player.WIDTH / 2,
	                player.y + Player.HEIGHT / 2,
	                new Trajectory(player.x + Player.WIDTH / 2, player.y + Player.HEIGHT / 2, mouse.x, mouse.y, player.distance-Player.HEIGHT/2),
	                Projectile.SIZE,
	                Projectile.COLOR,
	                Projectile.SPEED,
	                player.distance-Player.HEIGHT/2
	           );

	        var projKey = player.projectiles.length;
	        player.projectiles[projKey] = newproj;

	        player.projectileTimer = Date.now();
	        player.shoot = true;

	        sendToServer({type:"fire", projkey: projKey, projectile: newproj, fireTime: player.projectileTimer});
    	}
	}

	//detect a bullet hit
	var collisionDetect = function(){
		if (player.projectiles.length > 0) {
		    for (var key in player.projectiles) {
		        if (player.projectiles[key] != undefined && player.projectiles[key].landedTimer<=1) {
		 				if(opponent != null && opponent.isHit == false){

							if(player.projectiles[key].x - Projectile.SIZE < opponent.x + Player.WIDTH &&
         						player.projectiles[key].x + Projectile.SIZE > opponent.x &&
         						player.projectiles[key].y - Projectile.SIZE < opponent.y + Player.HEIGHT &&
         						player.projectiles[key].y + Projectile.SIZE > opponent.y)
		 					{
		 						console.log("Hit");
		 						opponent.isHit = true;
		 						player.projectiles.splice(key,1);
		 						sendToServer({type:"hit", projkey: key});
		 						setTimeout(function(){opponent.isHit=false;},Player.FREEZE*1000/FunJump.FRAME_RATE);
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
		opponent.yForOpp = FunJump.HEIGHT - (opponent.distance - player.yRel);
	}

	var checkPlayerFall = function(){
		if (player.isJumping){
			player.checkJump(platforms);
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
			//Reupdate player after 0.25second (something like local lag)
			setTimeout(function(){updatePlayerVariables();}, 250);
		}
	}

	var updatePlayerVariables = function(){
		sendToServer({type:"updatePlayerPosition",
			playerX: player.x,
			playerY: player.y,
			playerIsFalling: player.isFalling,
			playerIsJumping: player.isJumping,
			playerDistance: player.distance,
			playerJumpSpeed: player.jumpSpeed,
			playerFallSpeed: player.fallSpeed});
	}

	var updatePlayerDirection = function(){
		sendToServer({type:"updatePlayerDirection",playerDirection: player.direction});
	}

	var movePlayer = function(e,updateDirection){
		if(playerStopped == false){
			if (e.which == 37)
				player.move('left');
			else if (e.which == 39)
				player.move('right');
			if(updateDirection == true)	//Update only once to server!
				updatePlayerDirection();
			updateDirection = false;

			setTimeout(function(){movePlayer(e);}, 1000/FunJump.FRAME_RATE);	//move the player again after framerate
		}
	}

	var stopPlayer = function(updateDirection){
		if(playerStopped == true){ //Need to constantly check if person has keydown or not.
			if(player.vx == 0)	//once player has stopped, we don't have to do anything.
				return ;
			else{
				player.move('stop');
				if(updateDirection == true)
					updatePlayerDirection();
				updateDirection = false;
				setTimeout(stopPlayer, 1000/FunJump.FRAME_RATE);
			}
		}
	}

	var totalNoOfPlatforms = 20;
	var noOfPlatforms = 5;
	var platformDist = (FunJump.HEIGHT/ noOfPlatforms);
	var platforms = [];

	var convertToPlatforms = function(p){
		for(var i = 0; i < p.length; i++)
			platforms[i] = new Platform(p[i].x, p[i].y, p[i].type);
		player.platforms = platforms;
	}

	var drawPlatforms = function(context){
		platforms.forEach(function (platform){
			if(platform.type == 0)
				context.drawImage(imageRepository.normalplatform,platform.x,platform.y)
			else if(platform.type == 1)
				context.drawImage(imageRepository.trampoline,platform.x,platform.y)
			else if(platform.type == 3)
				context.drawImage(imageRepository.finishline,platform.x,platform.y)
		});
	}

	var checkCollisionForPlayer = function(){
		platforms.forEach(function(platform, no){
			//Client will render player position when platform collision happens based on requirements
			switch(platform.type){
				case 3:
					if(player.isFalling &&
					(player.y + Player.HEIGHT > platform.y) &&
					(player.y + Player.HEIGHT < platform.y + Platform.HEIGHT)){
						player.finish = true;
						player.y = platform.y-Player.HEIGHT;
					}
					break;
				default:
					if(player.isFalling &&
					(player.x < platform.x + Platform.WIDTH) &&
					(player.x + Player.WIDTH > platform.x) &&
					(player.y + Player.HEIGHT > platform.y) &&
					(player.y + Player.HEIGHT < platform.y + Platform.HEIGHT)){
						platform.onCollide(player);
					}
			}

		});
	}

	var checkCollisionForOpponent = function(opponent){
		platforms.forEach(function(platform, no){
			//Client will render opponent collision
			switch(platform.type){
				case 3:

					if(opponent.isFalling &&
					(opponent.distance - Player.HEIGHT < platform.gameY) &&
					(opponent.distance > platform.gameY)){
						opponent.finish = true;
						opponent.y = platform.y-Player.HEIGHT;
					}

					break;
				default:
					if(opponent.isFalling &&
					(opponent.x < platform.x + Platform.WIDTH) &&
					(opponent.x + Player.WIDTH > platform.x) &&
					(opponent.distance - Player.HEIGHT < platform.gameY) &&
					(opponent.distance > platform.gameY)){
						platform.onCollide(opponent);
					}
			}

		});
	}
	var debugFn = function(x){
		console.log("Dist " + opponent.distance + " Opponent x " + opponent.x);
	}
}

var client = new Client();
console.log("CLIENT Loaded");
setTimeout(function() {client.start();}, 1500);