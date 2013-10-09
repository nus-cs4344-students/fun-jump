"use strict"; 
function Client(){
	var socket;         // socket used to connect to server 
	var playArea;
	var counter;
	var initGUI;
	var player;
	var counter = 0;
	var playerStopped = true;
	var keyState = {};
	
    var sendToServer = function (msg) {
        socket.send(JSON.stringify(msg));
    }
	
    var appendMessage = function(location, msg) {
        var prev_msgs = document.getElementById(location).innerHTML;
        document.getElementById(location).innerHTML = "[" + new Date().toString() + "] " + msg + "<br />" + prev_msgs;
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
					break;
                default: 
					//convertToPlatforms(message);
					//console.log(platforms);
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
        setInterval(function() {render();}, 1000/FunJump.FRAME_RATE);
		setTimeout(function() {GameLoop();}, 1500);
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
		context.fillRect(player.x,player.y,Player.WIDTH,Player.HEIGHT);
		//context.drawImage(player.image,player.x,player.y,Player.WIDTH,Player.HEIGHT);
		
		drawPlatforms(context);
		if(player.screenMove == true){
			platforms.forEach(function(platform,ind){
				platform.y += player.jumpSpeed;	//Move the platform accordingly.
			});
		}
    }

	var GameLoop = function(){
		checkMovement();
		checkPlayerFall();
		checkCollision();
		setTimeout(GameLoop, 1000/FunJump.FRAME_RATE);
	};

	var checkPlayerFall = function(e){
		if (player.isJumping) player.checkJump();
		if (player.isFalling) player.checkFall();
		//console.log("Player has travelled " + player.distance);
	}
	
	var checkMovement = function(e){
		if	((keyState[37] || keyState[65]) && (keyState[39] || keyState[68]))	//Press both left and right!
			player.move('stop');
		else if (keyState[37] || keyState[65])
			player.move('left');
		else if (keyState[39] || keyState[68])
			player.move('right');
		else{	//Player Stopped
			player.move('stop')
		}
	}
	
	var totalNoOfPlatforms = 20;
	var noOfPlatforms = 5;
	var platformDist = (FunJump.HEIGHT/ noOfPlatforms);
	var platforms = [];
	
	var convertToPlatforms = function(p){
	console.log("HI");
		for(var i = 0; i < p.length; i++){
			platforms[i] = new Platform(p[i].x, p[i].y, p[i].type);
		}
	}
	
/*	var generatePlatforms = function(){
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
	generatePlatforms();*/
	
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
				console.log(no);
			}
		});
	}
}
var client = new Client();
console.log("CLIENT Loaded");
setTimeout(function() {client.start();}, 500);