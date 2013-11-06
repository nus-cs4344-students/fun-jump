"use strict";
function Client(){
	var that = this;
	var socket;         // socket used to connect to server

	//FOR GUI
	var playArea;
	var mouse;
	var imageRepository;

	//For player / opponent objects
	var player;
	var opponentArr;
	var playerStopped = true;
	var connected = false;
	var moveCount = 0;

	//For global objects
	var debugTxt;
	var convMaxXThres = 50;
	var	convMaxYThres = 50;
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
					noOfPlayers --;
					opponentArr[message.pid] = null;
					console.log(player.start+"Player "+message.pid+" disconnected");
					if(playerStopped){
						$("#player"+message.pid+"_ready").text("Empty Slot");
					}else{
						$("#player"+message.pid+"_ready").text("Disconnected");	
					}
					break;

				case "onConnect":	//Map also includes that the player has joined!
					player = new Player(message.pid);
					player.type = "player";
					player.projectileTimer = Date.now();
					noOfPlayers ++;
					that.pid = message.pid;

					$("#player"+message.pid+"_ready").text("You");
					var connectedPlayers = message.otherPlayers;
					opponentArr = new Array(message.maxPlayers);
					for(var i = 0; i < message.maxPlayers; i ++){
						if(connectedPlayers[i] == true){
							opponentArr[i] = new Player(i);
							opponentArr[i].type = "opponent";
							noOfPlayers++;
							$("#player"+i+"_ready").text("Not Ready");
						}
					}

					convertToPlatforms(message.content);
					render();
					connected = true;
					break;

				case "newplayer":
					opponentArr[message.pid] = new Player(message.pid);
					opponentArr[message.pid].type = "opponent";
					$("#player"+message.pid+"_ready").text("Not Ready");
					render();
					break;

				case "updateOpponent":
					updateOpponent(message);
					break;

				case "updateOpponentDirection":
					opponentArr[message.pid].directionUpdates++;
					
					//The client on the other side has rendered wrongly. Need to do convergence to fix it. [ONLY X AXIS]
					if(message.playerDirection == "stop" && message.playerStepMove!=opponentArr[message.pid].stepMove){
						convergeOpponentMovement(message.playerDirection, opponentArr[message.pid].directionUpdates,message.pid,message.playerStepMove,message.playerDirMove);
					}
					else{
						renderOpponentMovement(message.playerDirection,opponentArr[message.pid].directionUpdates,message.pid);
					}
					break;

				case "fire":
					//sendToServer({type:"fire", projkey: projKey, projectile: newproj, fireTime: player.projectileTimer});
					var aProjectile = new Projectile(message.projectile.x, message.projectile.y, message.projectile.trajectory,
										message.projectile.size, message.projectile.color, message.projectile.speed,
										message.projectile.distance);
					aProjectile.updatePos((Date.now()-message.fireTime)/1000);
					aProjectile.y = player.distance-aProjectile.distance+player.y;

					opponentArr[message.pid].shoot = true;
					opponentArr[message.pid].projectiles.splice(message.projkey,0,aProjectile);

					break;

				case "projGone":
					//sendToServer({type:"projGone", projkey: key});

					opponentArr[message.pid].projectiles[message.projkey].canRemove = true;

					break;

				case "hit":
					//sendToServer({type:"hit", projkey: key, shooterID: player.id, shootedID: opponent.id});
					//Player is the one that gets hit
					if(player.id == message.shootedID){
						player.isHit = true;
						player.canMove = false;

						opponentArr[message.shooterID].projectiles.splice(message.projkey,1);
						setTimeout(function(){player.isHit=false;player.canMove = true;},Player.FREEZE*1000/FunJump.FRAME_RATE);
					}
					else{//someone else gets hit
						opponentArr[message.shootedID].isHit = true;
						opponentArr[message.shootedID].canMove = false;

						opponentArr[message.shooterID].projectiles.splice(message.projkey,1);
						setTimeout(function(){opponentArr[message.shootedID].isHit=false;
											opponentArr[message.shootedID].canMove = true;},Player.FREEZE*1000/FunJump.FRAME_RATE);
					}


					break;

				case "ready":
					var id = message.pid;
					$("#player"+id+"_ready").text("Ready");
					break;

				case "start":
					var timeToWait = message.timeToStart - (new Date()).getMilliseconds();
					console.log("time to wait: "+ timeToWait);
					// setTimeout(functon(){},timeToWait);
					setInterval(function(){GameLoop();},1000/FunJump.FRAME_RATE);
					break;

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
	var renderOpponentMovement = function(direction,noOfUpdates,oid){
		if(noOfUpdates == opponentArr[oid].directionUpdates && opponentArr[oid].canMove == true){
			opponentArr[oid].move(direction);
			if(direction == "stop"){
				opponentArr[oid].stepMove = 0;
			}
			if(!(direction == "stop" && opponentArr[oid].vx == 0))
				setTimeout(function(){renderOpponentMovement(direction,noOfUpdates,oid);}, 1000/FunJump.FRAME_RATE);	//Similar to game looping
		}
	}

	//If the client rendered the opponent to have moved more or less than the actual movement, it will do IMMEDIATE adjustments.
	var convergeOpponentMovement = function(direction,noOfUpdates,oid,stepMove,dirMove){
		var difference = Math.abs(stepMove - opponentArr[oid].stepMove);
		if(opponentArr[oid].stepMove > stepMove){	//If the opponent rendered moved more than required, we have to push him back.
			if(dirMove == "right"){	//Move him to the left.
				for(var i = 0; i < difference; i ++){
					opponentArr[oid].x = opponentArr[oid].x - (stepMove + i);
				}
			}
			else if(dirMove == "left"){
				for(var i = 0; i < difference; i ++){
					opponentArr[oid].x = opponentArr[oid].x + (stepMove + i);
				}
			}
		}
		
		else if(opponentArr[oid].stepMove < stepMove){
			if(dirMove == "right"){	//Move him to the right.
				for(var i = 0; i < difference; i ++){
					opponentArr[oid].x = opponentArr[oid].x + (stepMove + i);
				}
			}
			else if(dirMove == "left"){
				for(var i = 0; i < difference; i ++){
					opponentArr[oid].x = opponentArr[oid].x - (stepMove + i);
				}
			}
		}
		renderOpponentMovement(direction,noOfUpdates,oid);
	}
	
	var initGUI = function() {
		playArea = document.getElementById('mycanvas');
		playArea.width = FunJump.WIDTH;
		playArea.height = FunJump.HEIGHT;

		window.addEventListener("keydown", function(e) {
			//playerStopped = true cause the last action should be stopped! Otherwise, there can be multiple movements which will be erratic!
			if((e.which == 37 || e.which == 39) && playerStopped == true){
				if(player.canMove == true){
					playerStopped = false;
					movePlayer(e,true);
				}
			}

			if(e.which == 38)
				debugFn();

		}, false);

		window.addEventListener("keyup", function(e) {
			if (e.which == 37 || e.which == 39){
				if(player.canMove == true){
					playerStopped = true;
					stopPlayer(true);
				}
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
		    fireBullet(mouse.x,mouse.y);
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

		// listen for touches
		// Player shoots by touching the canvas
		playArea.addEventListener('touchstart', function(e) {
		    e.preventDefault();
		    // the event object has an array
		    // named touches; we just want
		    // the first touch
		    var touch = e.touches[0];
		    //Find the coordinate of touch wrt the canvas
		    var rect = playArea.getBoundingClientRect();
		    var touchX = touch.clientX - rect.left;
		    var touchY = touch.clientY - rect.top;
		    fireBullet(touchX,touchY);
		}, false);
		playArea.addEventListener('touchmove', function(e) {
		    // Not interested in this,
		    // but prevent default behaviour
		    // so the screen doesn't scroll
		    // or zoom
		    e.preventDefault();
		}, false);
		playArea.addEventListener('touchend', function(e) {
		    // as above
		    e.preventDefault();
		}, false);
	}

    this.start = function() {
		initNetwork();	//Initilizes player object too!
		initGUI();	//Initialize listeners and context etc.
        imageRepository = new ImageRepository();	//Initialize images
        checkImgLoaded();
    }

    var checkImgLoaded = function(){
    	if(imageRepository.allImgLoaded === false || connected == false)
    		setTimeout(checkImgLoaded, 500);
		else
			render();	//Render once.
    }


	var render = function() {
        // Get context
        var context = playArea.getContext("2d");

		// Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);
   		context.drawImage(imageRepository.background, 0, 0, playArea.width, playArea.height);

		if(player!=null){
			drawProgressBar(context);
		}

		//Projectile should be drawn behind player so that missed projectile would look more natural
		for(var i = 0; i < opponentArr.length; i ++){
			var opponent = opponentArr[i];
			if(opponent != null){

				if(player.screenMove == true){
						opponent.projectiles.forEach(function(projectile,ind){
							projectile.y += player.jumpSpeed;
						});
				}

				opponent.projectiles.forEach(function(projectile,ind){
					//Draw the bullet if it is within the player's screen
					if(projectile.distance+Projectile.SIZE>player.yRel){
						renderProjectile(context,projectile);
					}
				});
			}
		}
		player.projectiles.forEach(function(projectile,ind){
			//Draw the bullet if it is within the player's screen
			if(projectile.distance+Projectile.SIZE>player.yRel){
				renderProjectile(context,projectile);
				console.log(projectile);
			}
   		});

		//draw opponent. Loop through array to find all valid opponents. then draw it out.
		for(var i = 0; i < opponentArr.length; i ++){
			if(opponentArr[i] != null){
				if(opponentArr[i].finish == true)
					renderPlayer(context, opponentArr[i].id, opponentArr[i].x, platforms[platforms.length-1].y-Player.HEIGHT, opponentArr[i].isHit, opponentArr[i].shoot, opponentArr[i]);
				else
					renderPlayer(context, opponentArr[i].id, opponentArr[i].x, opponentArr[i].yForOpp, opponentArr[i].isHit, opponentArr[i].shoot, opponentArr[i]);
			}

		}

		//draw player
		renderPlayer(context, player.id, player.x,(FunJump.HEIGHT - (player.distance - player.yRel)), player.isHit, player.shoot, player);
		drawPlatforms(context);


    }

	//Draw the progress bar for everyone.
    var drawProgressBar = function(context){

    	var progressX = FunJump.WIDTH-ImageRepository.PROGRESS_WIDTH;
    	var progressY = (FunJump.HEIGHT-ImageRepository.PROGRESS_HEIGHT)/2;
		context.drawImage(imageRepository.progress, progressX, progressY, ImageRepository.PROGRESS_WIDTH, ImageRepository.PROGRESS_HEIGHT);

		for(var i = 0; i < opponentArr.length; i++){
			if(opponentArr[i]!=null)
				drawPlayerIcon(context, opponentArr[i], progressX, progressY);
		}
		drawPlayerIcon(context, player, progressX, progressY);
	}

	var drawPlayerIcon = function(context, player, progressx, progressy){

		var difference = ImageRepository.PROGRESS_HEIGHT-ImageRepository.PROGRESS_LENGTH;
		var positionY = progressy-5+ImageRepository.PROGRESS_LENGTH+(difference/2)-((player.distance-Player.HEIGHT)/((totalNoOfPlatforms+1)* platformDist))*ImageRepository.PROGRESS_LENGTH;

		positionY = Math.max(positionY, progressy+(difference/2));

		switch(player.id){

		case 0:
			//context.drawImage(imageRepository.girlya, playerx, playery, Player.WIDTH, Player.HEIGHT);
			context.fillStyle = 'pink';

			break;
		case 1:
			//context.drawImage(imageRepository.normalguya, playerx, playery-ImageRepository.NORMAL_HEIGHTDIFF, Player.WIDTH, Player.HEIGHT+ImageRepository.NORMAL_HEIGHTDIFF);
			context.fillStyle = 'green';
			break;
		case 2:
			//context.drawImage(imageRepository.angela, playerx, playery, Player.WIDTH, Player.HEIGHT);
			context.fillStyle = 'yellow';
			break;
		case 3:
			//context.drawImage(imageRepository.evila, playerx, playery, Player.WIDTH, Player.HEIGHT);
			context.fillStyle = 'red';
			break;
		default:
			console.log("Invalid player id: "+ playerid);
			context.fillStyle = 'black';
		}

		context.fillRect(progressx, positionY, ImageRepository.PROGRESS_WIDTH, 5);
	}

	var renderPlayer = function(context, playerid, playerx, playery, playerIsHit, playerShoot, player){
		var condition = playerShoot||playerIsHit;

		switch(condition){
			case true:
				switch(playerid){

				case 0:
					context.drawImage(imageRepository.girlya, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 1:	//@ Kathy, why is this so complicated compared to the rest??
					context.drawImage(imageRepository.normalguya, playerx, playery-ImageRepository.NORMAL_HEIGHTDIFF, Player.WIDTH, Player.HEIGHT+ImageRepository.NORMAL_HEIGHTDIFF);
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
				case 1: //@ Kathy, why is this so complicated compared to the rest??
					context.drawImage(imageRepository.normalguy, playerx, playery-ImageRepository.NORMAL_HEIGHTDIFF, Player.WIDTH, Player.HEIGHT+ImageRepository.NORMAL_HEIGHTDIFF);
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
		var oID = message.pid;	//Opponent ID
		var tempYForOpp = FunJump.HEIGHT - (message.distance - player.yRel);

		if(message.playerFinish == true){
			opponentArr[oID].distance = message.playerDistance;
			opponentArr[oID].x = message.playerX;
			opponentArr[oID].y = message.playerY;
			opponentArr[oID].yForOpp = platforms[platforms.length-1].y - Player.HEIGHT;
			opponentArr[oID].canMove = message.playerCanMove;
			opponentArr[oID].finish = true;
		}
		//TELEPORT NEEDS TO HAPPEN! TOO FAR
		else if( ((opponentArr[oID].x + convMaxXThres) < message.playerX )||
			((opponentArr[oID].x - convMaxXThres) > message.playerX ) ||
			((opponentArr[oID].distance - convMaxYThres) > message.playerDistance)||
			((opponentArr[oID].distance + convMaxYThres) < message.playerDistance)	){

			/*console.log("RESET POS " +
				((opponent.x + convXThres) < message.playerX ) + " " +
				((opponent.x - convXThres) > message.playerX ) + " " +
				((opponent.distance - convYThres) > message.playerDistance) + " " +
				((opponent.distance + convYThres) < message.playerDistance))

			console.log("PREV DISTANCE " + opponent.distance + " NEW DIST " +  message.playerDistance);*/
				opponentArr[oID].distance = message.playerDistance;
				opponentArr[oID].isFalling = message.playerIsFalling;
				opponentArr[oID].isJumping = message.playerIsJumping;
				opponentArr[oID].x = message.playerX;
				opponentArr[oID].y = message.playerY;
				opponentArr[oID].jumpSpeed = message.playerJumpSpeed;
				opponentArr[oID].fallSpeed = message.playerFallSpeed;
				opponentArr[oID].yForOpp = tempYForOpp;
				opponentArr[oID].canMove = message.playerCanMove;
		}

		else{	//It is within the range, so do simple convergence.
			//Did convergence of X-axis at convergeOpponentMovement during player movement update.
		}
	}

	var GameLoop = function(){

		//console.log(player.projectiles);
		//update projectile status of the player
		for (var key in player.projectiles) {
			player.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);

	        if (player.projectiles[key].landedTimer >= 8)
	        {
	            player.projectiles.splice(key, 1);
	            sendToServer({type:"projGone", projkey: key, pid:player.id});
	        }
	    }

		//update projectile status of opponent
		for(var i = 0; i < opponentArr.length; i ++){
			var opponent = opponentArr[i];
		    if(opponent != null){
			    for (var key in opponent.projectiles) {
			        opponent.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);
			        if (opponent.projectiles[key].canRemove==true && opponent.projectiles[key].landedTimer >= 10)
			        {
			            opponent.projectiles.splice(key, 1);
			        }
			    }
			}
		}

		/*
			If the player can move, we should check his jumping, check collision with platform
			Also, if he gets frozen, we stop him so that this if statement never runs till he can move again.
		*/
		if(player.canMove == true){
			checkPlayerFall();
			checkPlatformCollisionForPlayer();

			if(player.start == false && player.y >= FunJump.HEIGHT - Player.HEIGHT){
				player.canMove = false;
				player.vx = 0;
				setTimeout(function(){
					getNearestPlatform(player);
					updatePlayerVariables();
					playerStopped = true;
					stopPlayer(true);
				}, 2000);
			}
		}

		for(var i = 0; i < opponentArr.length; i ++){
			if(opponentArr[i]!=null && opponentArr[i].canMove == true){
				checkOpponentFall(opponentArr[i]);
				checkCollisionForOpponent(opponentArr[i]);
				collisionDetect(opponentArr[i]);

				if(opponentArr[i].start == false && opponentArr[i].y >= FunJump.HEIGHT - Player.HEIGHT){
					opponentArr[i].canMove = false;
					opponentArr[i].vx = 0;
					setTimeout(function(){
						getNearestPlatform(opponentArr[i]);
					}, 2000);
				}
			}
		}

		render();
	};

	var getNearestPlatform = function(player){

		//GetNearestPlatform
		var nearestPlatform;
		for(var i = 0; i < platforms.length; i ++){
			if(platforms[i].gameY >= player.distance){
				nearestPlatform = platforms[i];
				break;
			}
		}

		//Set player to nearest platform
		player.distance = nearestPlatform.gameY + 10 + Player.HEIGHT;
		if(player.type == "opponent"){

			var diff = player.yForOpp - player.y;
			player.yForOpp = nearestPlatform.y - 10 - Player.HEIGHT;
			player.y = player.yForOpp - diff;

		}
		else{
			player.y = nearestPlatform.y - 10 - Player.HEIGHT;
		}

		player.x = nearestPlatform.x;	//Adjust the position such that its half of the platform
		player.fallSpeed = 5;
		player.isJumping = false;
		player.isFalling = true;
		player.vx = 0;

		player.canMove = true;

	}

	var fireBullet = function(endX, endY){

		if (Date.now() - player.projectileTimer > Player.SHOOTDELAY && player.canMove == true) {
	        var newproj = new Projectile(
	                player.x + Player.WIDTH / 2,
	                player.y + Player.HEIGHT / 2,
	                new Trajectory(player.x + Player.WIDTH / 2, player.y + Player.HEIGHT / 2, endX, endY, player.distance-Player.HEIGHT/2),
	                Projectile.SIZE,
	                Projectile.COLOR,
	                Projectile.SPEED,
	                player.distance-Player.HEIGHT/2
	           );

	        var projKey = player.projectiles.length;
	        player.projectiles[projKey] = newproj;

	        player.projectileTimer = Date.now();
	        player.shoot = true;

	        sendToServer({type:"fire", projkey: projKey, projectile: newproj, fireTime: player.projectileTimer, pid: player.id});
    	}
	}

	//detect a bullet hit
	var collisionDetect = function(opponent){
		if (player.projectiles.length > 0) {
		    for (var key in player.projectiles) {
		        if (player.projectiles[key] != undefined && player.projectiles[key].landedTimer<=1) {
		 				if(opponent != null && opponent.canMove == true){

							if(player.projectiles[key].x - Projectile.SIZE < opponent.x + Player.WIDTH &&
         						player.projectiles[key].x + Projectile.SIZE > opponent.x &&
         						player.projectiles[key].distance + Projectile.SIZE > opponent.distance - Player.HEIGHT &&
         						player.projectiles[key].distance - Projectile.SIZE < opponent.distance)
		 					{
		 						console.log("Hit");
		 						opponent.isHit = true;
		 						opponent.canMove = false;
		 						player.projectiles.splice(key,1);
		 						sendToServer({type:"hit", projkey: key, shooterID: player.id, shootedID: opponent.id});	//@Kathy what should be pid?
		 						setTimeout(function(){opponent.isHit=false;opponent.canMove = true;},Player.FREEZE*1000/FunJump.FRAME_RATE);
		 					}
					}
		        }
		    }
		}
	}

	var jumping = 0;
	var falling = 0;

	var checkOpponentFall = function(opponent){
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
			playerFallSpeed: player.fallSpeed,
			playerCanMove: player.canMove,
			playerFinish: player.finish,
			pid: player.id});
	}

	var updatePlayerDirection = function(){
		if(player.direction == "stop")
			console.log("UPDATE DIRECTION " + player.direction + " " + player.dirMove + " " + player.stepMove);
		sendToServer({type:"updatePlayerDirection",
			playerDirection: player.direction,
			playerStepMove: player.stepMove,
			playerDirMove: player.dirMove,
			pid:player.id});
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

			setTimeout(function(){movePlayer(e,updateDirection);}, 1000/FunJump.FRAME_RATE);	//move the player again after framerate
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
				player.stepMove = 0;
				setTimeout(function(){stopPlayer(updateDirection);}, 1000/FunJump.FRAME_RATE);
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

	var checkPlatformCollisionForPlayer = function(){
		platforms.forEach(function(platform, no){
			//Client will render player position when platform collision happens based on requirements
			switch(platform.type){
				case 3:	//Finish line
					if(player.y + Player.HEIGHT < platform.y){
						player.finish = true;
						player.canMove = false;
						player.y = platform.y-Player.HEIGHT;
						updatePlayerVariables();
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

					if(opponent.distance - Player.HEIGHT > platform.gameY){
						opponent.finish = true;
						opponent.canMove = false;
						var diff = opponent.yForOpp - opponent.y;
						opponent.yForOpp = platform.y-Player.HEIGHT;
						opponent.y = opponent.yForOpp-diff;
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