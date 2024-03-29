"use strict";
function Client(){
	var that               = this;
	var socket;         // socket used to connect to server

	//FOR GUI
	var playArea;
	var mouse;
	var imageRepository;

	//For player / opponent objects
	var player;
	var opponentArr;
	var playerStopped      = true;
	var connected          = false;
	var moveCount          = 0;
	var gameStartAtTime; //the time that player starts moving
	var gameStarted        = false

	//For platform / powerups
	var totalNoOfPlatforms = 20;
	var noOfPlatforms      = 5;
	var platformDist       = (FunJump.HEIGHT/ noOfPlatforms);
	var platforms          = [];
	var powerups           = [];

	//For global objects
	var debugTxt;
	var convMaxXThres      = 50;
	var	convMaxYThres      = 50;
	var noOfPlayers        = 0;
	var GameLoopID         = null;
	var players            = []; //record which player has finished, for ranking purpose

	//Sound

    var sendToServer = function (msg) {
        socket.send(JSON.stringify(msg));
    }

    that.sendToServer = sendToServer;

    var gameEnd	= function(){
    	clearInterval(GameLoopID);
		GameLoopID = null;

    	$(".ui-btn-text").text("Restart");
    	$(".ui-btn").css("background", "#00CC00");
    	$(".ui-btn").css("display", "block");	//Hide the button .

    	$("#startBtn").tap(function(){
			$(".ui-btn-text").text("Waiting...");
			$(".ui-btn").css("background", "#FF0000");
			// $(".ui-btn").css("display", "none");	//Hide the button .
			$(this).addClass('ui-disabled');
			client.sendToServer({type:"restart", pid:client.pid});

		});
    }

    //To detect user platform, code from http://stackoverflow.com/questions/12606245/detect-if-browser-is-running-on-an-android-or-ios-device
	var isMobile = {
	    Android: function() {
	        return navigator.userAgent.match(/Android/i) ? true : false;
	    },
	    BlackBerry: function() {
	        return navigator.userAgent.match(/BlackBerry/i) ? true : false;
	    },
	    iOS: function() {
	        return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
	    },
	    Windows: function() {
	        return navigator.userAgent.match(/IEMobile/i) ? true : false;
	    },
	    any: function() {
	        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
	    }
	};

    var initNetwork = function() {
        // Attempts to connect to game server
        try {
            socket = new SockJS("http://" + FunJump.SERVER_NAME + ":" + location.port + "/FunJump");

			// --------------- Commands Client Receives From Server ------------------
            socket.onmessage = function (e) {
                var message = JSON.parse(e.data);
                switch (message.type) {
				case "updateReady":
					break;

				case "playerDC":	//Player has disconnected....
					noOfPlayers = message.numOfPlayers;
					opponentArr[message.pid] = null;
					console.log(player.start+"Player "+message.pid+" disconnected");
					if(gameStarted){
						$("#player"+message.pid+"_ready").text("Disconnected");
						//If only One player left!
						if ( noOfPlayers == 1)
						{
							$("#player"+that.pid+"_ready").text("Winner!");
							gameEnd();
						}
					}else{
						$("#player"+message.pid+"_ready").text("Empty Slot");
					}
					console.log("PLAYER DC: " + noOfPlayers);

					//the case when a player disconnects when other players have reached finish line
					//and are waiting for the result.
					//Draw the final scene if this player has finished and so do his connected opponents
					if(players.length >= noOfPlayers && player.finish == true && GameLoopID != null)//all players has reached finish line
						{

							clearInterval(GameLoopID);
							GameLoopID = null;
							setTimeout(function(){
							drawResultScence(players);},1000);

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
					for(var i = 0; i < message.maxPlayers; i++){
						if(connectedPlayers[i] == true){
							opponentArr[i] = new Player(i);
							opponentArr[i].type = "opponent";
							noOfPlayers++;
							console.log("client ready: "+message.ready+"  "+i);
							if (message.ready[i]){
								$("#player"+i+"_ready").text("Ready");
							}
							else{
								$("#player"+i+"_ready").text("Not Ready");
							}
						}
					}

					convertToPlatforms(message.content);
					convertToPowerups(message.contentp);
					render();
					connected = true;
					break;

				case "newplayer":
					opponentArr[message.pid] = new Player(message.pid);
					opponentArr[message.pid].type = "opponent";
					$("#player"+message.pid+"_ready").text("Not Ready");
					noOfPlayers++;
					render();
					break;

				case "updateOpponent":
					updateOpponent(message);

					if(message.playerFinish == true){
						addFinishPlayer(message.pid,message.playerGameDuration);
					}

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
					//sendToServer({type:"projGone", projkey: key, hitShield: false});
					if(message.hitShield == false){
						opponentArr[message.pid].projectiles[message.projkey].canRemove = true;
					}
					else{//the bullet hits the shield
						opponentArr[message.pid].projectiles.splice(message.projkey,1); //remove immediately
					}

					break;

				case "removeshield":
					if(player.id == message.pid)
						player.powerup = false;
					else
						opponentArr[message.pid].powerup = false;
					break;
				case "hit":
					//sendToServer({type:"hit", projkey: key, shooterID: player.id, shootedID: opponent.id});

					//Player is the one that gets hit
					if(player.id == message.shootedID){
						if(player.powerup == true)	//Remove his powerup!
							player.powerup = false;
						else{
							player.isHit = true;
							player.canMove = false;

							opponentArr[message.shooterID].projectiles.splice(message.projkey,1);
							setTimeout(function(){player.isHit=false;player.canMove = true;},Player.FREEZE*1000/FunJump.FRAME_RATE);
						}
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

					//Game starts so the player can move now
					//Record the time the player starts moving
					if(player != null){
						player.canMove  = true;
						gameStartAtTime = Date.now();
						gameStarted = true
					}

					//Remove start button.
					$(".ui-btn").css("display", "none");	//Hide the button .

					GameLoopID = setInterval(function(){GameLoop();},1000/FunJump.FRAME_RATE);
					break;

				case "powerup":
					powerups[message.powerupid].taken = true;
					if(message.pid == player.id){
						player.powerup = true;
					}
					else{
						opponentArr[message.pid].powerup = true;
					}
					break;
				case "latencyCheck":
					sendToServer({type:"latencyCheck", content:Date.now(), serverTime:message.serverTime});
					break;
				case "gameStarted":
					alert("You entered the room by accident. This game has started, you are navigated to lobby");
					window.location.href = "http://"+FunJump.SERVER_NAME+":4344/index.html";
					break;	
                default:
					console.log("unhandled meesage type " + message.type);
					break;
                }

				// ------------END of Commands Client Receives From Server ------------------
            }
        } catch (e) {
            console.log("Failed to connect to " + "http://" + FunJump.SERVER_NAME + ":" + loction.port);
        }
    }

    //This function to ping server to state it is alive, since server closes the connection if not hearing from client for 5 seconds
	var pingServer = function(){
		sendToServer({type:"ping", pid:player.id});
	}

	//This function draws the result scence.
	//Called only once when the client receives message "result" from server
	var drawResultScence = function(){

		 // Get context
        var context = playArea.getContext("2d");

		// Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);
        //draw background
        context.drawImage(imageRepository.background, 0, 0, playArea.width, playArea.height);
        //draw winning platform
        var winningX = FunJump.WIDTH/2-ImageRepository.WINNING_WIDTH*3/8;
        var winningY = FunJump.HEIGHT/2-ImageRepository.WINNING_HEIGHT;
        context.drawImage(imageRepository.winningplatform, winningX,
        	winningY, ImageRepository.WINNING_WIDTH, ImageRepository.WINNING_HEIGHT);
        //draw finish line
        context.drawImage(imageRepository.finishline,0,winningY+ImageRepository.WINNING_HEIGHT);

		//Set the 'final placings' coordinates accordingly.
		var firstX = winningX + 105 + 25;
		var firstY = winningY + 45 - Player.HEIGHT;
		var secondX = winningX + 30;
		var secondY = winningY + 75 - Player.HEIGHT;
		var thirdX = winningX + 105*2 + 30;
		var thirdY = winningY + 75 - Player.HEIGHT;
		var fourthX = winningX + 105*3 + 30;
		var fourthY = winningY + ImageRepository.WINNING_HEIGHT - Player.HEIGHT;


		var textSX = 160;
		var textSY = winningY + ImageRepository.WINNING_HEIGHT + Platform.HEIGHT + 50;
		context.font="20px Comic Sans MS";
		 context.fillStyle = 'black';

		for(var i=0; i<players.length; i++){
			//draw players
			switch(i){
				case 0:
					drawPlayer(context,players[i].playerid, firstX, firstY);
					break;
				case 1:
					drawPlayer(context,players[i].playerid, secondX, secondY);
					break;
				case 2:
					drawPlayer(context,players[i].playerid, thirdX, thirdY);
					break;
				case 3:
					drawPlayer(context,players[i].playerid, fourthX, fourthY);
					break;
				default:
					console.log("invalid pid: "+i);
			}
			//print game duration of each player
			if(players[i].playerid == player.id){
				 	context.fillText("You :   "+players[i].gameDuration/1000+" s",textSX,textSY+30*i);
			}
			else{
					context.fillText("Player "+(players[i].playerid+1)+" : "+players[i].gameDuration/1000+" s",textSX,textSY+30*i);
			}
		}
	}

	//function to draw players in the final scence
	var drawPlayer = function(context, playerid, playerx, playery){

		switch(playerid){

				case 0:
					context.drawImage(imageRepository.girly, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 1:
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

	
	//Client initializes his GUI / Screen
	var initGUI = function() {
		playArea = document.getElementById('mycanvas');
		playArea.width = FunJump.WIDTH;
		playArea.height = FunJump.HEIGHT;

		window.addEventListener("keydown", function(e) {
			//playerStopped = true cause the last action should be stopped! Otherwise, there can be multiple movements which will be erratic!
			if((e.which == 37 || e.which == 39 || e.which == 65 || e.which == 68) && playerStopped == true){
				if(player.canMove == true){
					playerStopped = false;
					movePlayer(e,true);
				}
			}

			//Press up key for a debug function. Place your console.log's there if you need to debug then press up key.
			if(e.which == 38)
				debugFn();

		}, false);

		window.addEventListener("keyup", function(e) {
			if (e.which == 37 || e.which == 39 || e.which == 65 || e.which == 68){
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

		window.addEventListener("devicemotion", function(e) {
            onDeviceMotion(e);
        }, false);
		
        window.ondevicemotion = function(e) {
            onDeviceMotion(e);
        }
	}

	var onDeviceMotion = function(e) {
        var vx;
        if (isMobile.iOS()){
        	vx = e.accelerationIncludingGravity.x;	
        } else if (isMobile.Android()){
        	vx = -e.accelerationIncludingGravity.x;	
        }else {
        	//Not tested, so assume to be same as iOS
        	vx = e.accelerationIncludingGravity.x;	
        }
        player.accelerate(vx);
    }

    this.start = function() {
		initNetwork();	//Initilizes player object too!
		initGUI();	//Initialize listeners and context etc.
        imageRepository = new ImageRepository();	//Initialize images
        checkImgLoaded();
        // setInterval(pingServer, 4000);
    }

	//function to check if all images have been loaded
    var checkImgLoaded = function(){
    	if(imageRepository.allImgLoaded === false || connected == false)
    		setTimeout(checkImgLoaded, 500);
		else
			render();	//Render once.
    }
	
	//Drawing on canvas function
	var render = function() {
        // Get context
        var context = playArea.getContext("2d");

		// Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);
   		context.drawImage(imageRepository.background, 0, 0, playArea.width, playArea.height);

		if(player!=null){
			drawProgressBar(context);
		}

		drawPlatforms(context);
		drawPowerups(context);

		//Projectile should be drawn behind player so that missed projectile would look more natural
		for(var i = 0; i < opponentArr.length; i ++){
			var opponent = opponentArr[i];
			if(opponent != null){

				if(player.screenMove == true){
						if(opponent.canMove == false){
							opponent.yForOpp += player.jumpSpeed;
						}
						opponent.projectiles.forEach(function(projectile,ind){
							projectile.y += player.jumpSpeed;
						});
				}
				//draw opponents' projectiles
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

    }

    var drawResult = function(context){
    	var textSX = 20;
		var textSY = 10;
		context.font="20px Georgia";

		for(var i=0; i<players.length; i++){
			//draw result
			if(players[i].playerid == player.id){
				 	context.fillText("You:   "+players[i].gameDuration/1000+" s",textSX,textSY+30*i);
			}
			else{
					context.fillText("Player "+players[i].playerid+" : "+players[i].gameDuration/1000+" s",textSX,textSY+30*i);
			}
		}
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
	//Draw indicator of each player
	var drawPlayerIcon = function(context, player, progressx, progressy){

		var difference = ImageRepository.PROGRESS_HEIGHT-ImageRepository.PROGRESS_LENGTH;
		//var positionY = progressy-5+ImageRepository.PROGRESS_LENGTH+(difference/2)-((player.distance-Player.HEIGHT)/((totalNoOfPlatforms+1)* platformDist))*ImageRepository.PROGRESS_LENGTH;
		var positionY = progressy-5+ImageRepository.PROGRESS_LENGTH+(difference/2)-((player.distance-Player.HEIGHT)/(platforms[totalNoOfPlatforms-1].gameY))*ImageRepository.PROGRESS_LENGTH;
		positionY = Math.max(positionY, progressy+(difference/2));

		switch(player.id){

		case 0:
			context.fillStyle = 'pink';

			break;
		case 1:
			context.fillStyle = 'green';
			break;
		case 2:
			context.fillStyle = 'yellow';
			break;
		case 3:
			context.fillStyle = 'red';
			break;
		default:
			console.log("Invalid player id: "+ playerid);
			context.fillStyle = 'black';
		}

		context.fillRect(progressx, positionY, ImageRepository.PROGRESS_WIDTH, 5);
	}

	//function to draw each player during gameplay
	var renderPlayer = function(context, playerid, playerx, playery, playerIsHit, playerShoot, player){
		var condition = playerShoot||playerIsHit;

		switch(condition){
			case true:
				switch(playerid){

				case 0:
					context.drawImage(imageRepository.girlya, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 1:	
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

			//Only this condition will allow a player to have a shield
			case false:
				switch(playerid){
				case 0:
					context.drawImage(imageRepository.girly, playerx, playery, Player.WIDTH, Player.HEIGHT);
					break;
				case 1: 
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
					break;

		}

		if(player.powerup == true){

			context.drawImage(imageRepository.shieldactivated, playerx-Player.POWERUPDIST, playery-Player.POWERUPDIST, Player.POWERUPSIZE, Player.POWERUPSIZE);
		}

		if(playerIsHit == true){
			context.drawImage(imageRepository.splash, playerx - (Projectile.SPLASH_SIZE - Player.WIDTH)/2, playery - (Projectile.SPLASH_SIZE - Player.HEIGHT)/2, Projectile.SPLASH_SIZE, Projectile.SPLASH_SIZE);
		}

		//render fire animation when player falls down to bottom
		if(player.canMove == false && playerIsHit == false && player.finish == false && player.start==false){
			var aNum = Math.floor((Math.random()*3)+1);// generate a number between 1 and 3

			switch(aNum){
				case 1:
					context.drawImage(imageRepository.fires, playerx+3, playery+10, Player.WIDTH-6, 30);
					break;
				case 2:
					context.drawImage(imageRepository.fires, playerx+3, playery+10, Player.WIDTH-6, 30);
					context.drawImage(imageRepository.firem, playerx, playery-20, Player.WIDTH, 60);
					break;
				case 3:
					context.drawImage(imageRepository.fires, playerx+3, playery+10, Player.WIDTH-6, 30);
					context.drawImage(imageRepository.firem, playerx, playery-20, Player.WIDTH, 60);
					context.drawImage(imageRepository.firel, playerx, playery-30, Player.WIDTH, 70);
					break;
			}
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

	var updateOpponent = function(message){
		var oID = message.pid;	//Opponent ID
		var tempYForOpp = FunJump.HEIGHT - (message.distance - player.yRel);

		//An opponent informs that he/she has reached the finish line. Update his/her position accordingly
		if(message.playerFinish == true){
			opponentArr[oID].distance = message.playerDistance;
			opponentArr[oID].x = message.playerX;
			opponentArr[oID].y = message.playerY;
			opponentArr[oID].yForOpp = platforms[platforms.length-1].y - Player.HEIGHT;
			opponentArr[oID].canMove = message.playerCanMove;
			opponentArr[oID].finish = true;
			opponentArr[oID].gameDuration = message.playerGameDuration;
		}

		//We chose teleport over convergence when there is a huge distance difference. Why? Convergence will make the game look silly when someone goes from top to bottom, cutting through platforms. Teleport is more feasible over here.
		//However, convergence DOES happen when there is a small movement different. (See convergeOpponentMovement section)
		else if( ((opponentArr[oID].x + convMaxXThres) < message.playerX )||
			((opponentArr[oID].x - convMaxXThres) > message.playerX ) ||
			((opponentArr[oID].distance - convMaxYThres) > message.playerDistance)||
			((opponentArr[oID].distance + convMaxYThres) < message.playerDistance)	){
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

		//update projectile status of the player
		for (var key in player.projectiles) {
			player.projectiles[key].updatePos(1000/FunJump.FRAME_RATE);

	        if (player.projectiles[key].landedTimer >= 8)
	        {
	            player.projectiles.splice(key, 1);
	            sendToServer({type:"projGone", projkey: key, pid:player.id, hitShield: false});
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
		if(player.canMove == true && player.isHit == false){
			checkPlayerFall();
			checkPlatformCollisionForPlayer();
			checkPowerupCollisionForPlayer();

			if(player.start == false && player.y >= FunJump.HEIGHT - Player.HEIGHT){
				if(player.powerup == true){
					player.powerup = false;
					sendToServer({type:"removeshield", pid: player.id});
					player.canMove = false;
					player.vx = 0;
					setTimeout(function(){
						getNearestPlatform(player);
						updatePlayerVariables();
						playerStopped = true;
						stopPlayer(true);
					},500);	//difference is 500miliseconds
				}
				else{
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
		}

		/*
			If an opponent can move, we should simulate his movements
			Also, if he gets frozen, we stop him so that this if statement never runs till he can move again.
		*/
		for(var i = 0; i < opponentArr.length; i ++){
			if(opponentArr[i]!=null && opponentArr[i].canMove == true && opponentArr[i].isHit == false){
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

		if(player.distance-Player.HEIGHT>=platforms[totalNoOfPlatforms-1].gameY && player.finish==false){
			player.finish = true;
			player.canMove = false;
			player.y = platforms[totalNoOfPlatforms-1].y-Player.HEIGHT;
			player.gameDuration = Date.now() - gameStartAtTime;
			updatePlayerVariables();
		}

		render();
	};

	//Get the nearest platform so that a player can return to when the player recovers from being burnt
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

		//A player is allowed to fire if he can move and the time interval between this fire
		//and the last fire is greater than the player shoot delay
		if (Date.now() - player.projectileTimer > Player.SHOOTDELAY && player.canMove == true) {
	        //Play sound:
	        // fireSound.play();
	        GameSound.play("fireSound"); 
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
								if(opponent.powerup == true){
									opponent.powerup = false;
									sendToServer({type:"removeshield", pid: opponent.id});

									player.projectiles.splice(key,1);
									//need to inform other opponent to remove the projectile
									//or else it would be at where the click is forever
									sendToServer({type:"projGone", projkey: key, pid:player.id, hitShield: true});

								}
								else{
									opponent.isHit = true;
									opponent.canMove = false;
									player.projectiles.splice(key,1);
									sendToServer({type:"hit", projkey: key, shooterID: player.id, shootedID: opponent.id});
									setTimeout(function(){opponent.isHit=false;opponent.canMove = true;},Player.FREEZE*1000/FunJump.FRAME_RATE);
								}
		 					}
					}
		        }
		    }
		}
	}

	//These two are needed cause we only want to send the player variables once. (Cut updates to server)
	var jumping = 0;
	var falling = 0;

	//Render the opponent's movement accordingly. (Client render)
	var checkOpponentFall = function(opponent){
		if (opponent.isJumping){
			opponent.checkJump();
		}
		if (opponent.isFalling){
			opponent.checkFall();
		}
		opponent.yForOpp = FunJump.HEIGHT - (opponent.distance - player.yRel);
	}

	//Render the player's movement accordingly.
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
			//Reupdate player after 0.25second (something like local lag) This is to prevent some rendering issues too.
			setTimeout(function(){updatePlayerVariables();}, 250);
		}
	}

	//Function to rank players that have touched finish line
	var addFinishPlayer = function(playerid, playerduration){
		var aFinishPlayer = {playerid:playerid,gameDuration:playerduration};
			if(players.indexOf(aFinishPlayer) == -1){
					if(players.length == 0){//the array is empty
					players[0] = aFinishPlayer;
					}
					else{
						for(var i=0; i<players.length; i++){
							if(aFinishPlayer.playerid == players[i].playerid){
								break;
							}
							else if(aFinishPlayer.gameDuration < players[i].gameDuration){
								players.splice(i, 0, aFinishPlayer);
							}
							else if(i == players.length-1){
								players[players.length] = aFinishPlayer;
								break;
							}
						}
						if(players.length >= noOfPlayers && player.finish == true && GameLoopID != null)//all players has reached finish line
						{

							clearInterval(GameLoopID);
							GameLoopID = null;
							setTimeout(function(){
							drawResultScence(players);},1000);

						}
					}
			}

	}

	//Function to update the player variables to the rest of the opponents.
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
			playerGameDuration: player.gameDuration,
			pid: player.id});

		if(player.finish == true){
			addFinishPlayer(player.id, player.gameDuration);
		}
	}

	//Update the player's direction. Only called when player hits 'left or right'
	var updatePlayerDirection = function(){
		sendToServer({type:"updatePlayerDirection",
			playerDirection: player.direction,
			playerStepMove: player.stepMove,
			playerDirMove: player.dirMove,
			pid:player.id});
	}

	//Player will move according to left / right key's being pressed.
	var movePlayer = function(e,updateDirection){
		if(playerStopped == false){
			if (e.which == 37 || e.which == 65)
				player.move('left');
			else if (e.which == 39 || e.which == 68)
				player.move('right');
			if(updateDirection == true && player.canMove == true)	//Update only once to server!
				updatePlayerDirection();
			updateDirection = false;

			setTimeout(function(){movePlayer(e,updateDirection);}, 1000/FunJump.FRAME_RATE);	//move the player again after framerate
		}
	}

	//Player will stop / decelerate if no key is being pressed.
	var stopPlayer = function(updateDirection){
		if(playerStopped == true){ //Need to constantly check if person has keydown or not.
			if(player.vx == 0)	//once player has stopped, we don't have to do anything.
				return ;
			else{
				player.move('stop');
				if(updateDirection == true && player.canMove == true)
					updatePlayerDirection();
				updateDirection = false;
				player.stepMove = 0;
				setTimeout(function(){stopPlayer(updateDirection);}, 1000/FunJump.FRAME_RATE);
			}
		}
	}

	//Function to convert server platforms to client platform objects
	var convertToPlatforms = function(p){
		for(var i = 0; i < p.length; i++)
			platforms[i] = new Platform(p[i].x, p[i].y, p[i].type);
		totalNoOfPlatforms = p.length;
		player.platforms = platforms;
	}

	//Function to convert server powerups to client powerup objects
	var convertToPowerups = function(p){
		for(var i = 0; i < p.length; i++){
			powerups[i] = new Powerup(p[i].x, p[i].y, p[i].id);
		}
		player.powerups = powerups;
	}

	//Draw platforms for map.
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

	//Draw powerups.
	var drawPowerups = function(context){
		for(var i = 0; i < powerups.length; i ++){
			if(powerups[i].taken == false)
				context.drawImage(imageRepository.shield,powerups[i].x,powerups[i].y,Powerup.WIDTH,Powerup.HEIGHT);
		}
	}

	//When the player is falling and hits a platform, he needs to jump up.
	//However, there is no packet sent for hitting a platform. Rather, an update is sent when a player jumps.
	//In this case, hitting a platform is similar to jumping.
	//This is to prevent duplicate sending of packets.
	var checkPlatformCollisionForPlayer = function(){
		platforms.forEach(function(platform, no){
			//Client will render player position when platform collision happens based on requirements
			switch(platform.type){
				case 3:	//Finish line
					if(player.y + Player.HEIGHT < platform.y){
						player.finish = true;
						player.canMove = false;
						player.y = platform.y-Player.HEIGHT;
						player.gameDuration = Date.now() - gameStartAtTime;
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
						if (platform.type==0){
						// 	var jumpSound = new Audio("libs/sounds/Pop-Texavery-8926_hifi.mp3"); // buffers automatically when created
						// 	jumpSound.play();
						// document.getElementById("bounceSound1").play();
						GameSound.play("bounceSound1"); 
						}else{
						// 	var jumpSound = new Audio("libs/sounds/Pop_2-Texavery-8930_hifi.mp3");
						// 	jumpSound.play();
						// document.getElementById("bounceSound2").play();
						GameSound.play("bounceSound2"); 
						}
					}
			}

		});
	}

	//If the player touches the powerup, he will send it to the server.
	var checkPowerupCollisionForPlayer = function(){
		if(player.powerup == false){
			powerups.forEach(function(powerup,no){
				if(powerup.taken == false){
					if(
					((player.x < powerup.x) && (player.x + Player.WIDTH > powerup.x) &&
					(player.y < powerup.y) && (player.y + Player.HEIGHT > powerup.y))

					||

					((player.x < powerup.x) && (player.x + Player.WIDTH > powerup.x) &&
					(player.y > powerup.y) && (player.y < powerup.y + Powerup.HEIGHT))

					||

					((player.x > powerup.x) && (player.x < powerup.x + Powerup.WIDTH) &&
					(player.y < powerup.y) && (player.y + Player.HEIGHT > powerup.y))

					||
					((player.x > powerup.x) && (player.x < powerup.x + Powerup.WIDTH) &&
					(player.y > powerup.y) && (player.y < powerup.y + Powerup.HEIGHT))){
						powerup.taken = true;
						sendToServer({type:"powerup", powerupid: powerup.id, pid:player.id, pTime:Date.now()});
						//He does not NECCESSARILY get the powerup.
						//It will dissepear on the map and have a 300ms delay for him to get.
						//If within this delay, someone else have already taken it and according to the server, he has taken it before, the other player will have the shield animation showing that the enemy has taken it instead.
					}
				}
			});
		}
	}

	//Client render's the opponent collision with platforms
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
	
	//When you press up key, this runs.
	var debugFn = function(x){
		console.log(noOfPlayers);
	}
}

var client = new Client();
console.log("CLIENT Loaded");
setTimeout(function() {client.start();}, 1500);