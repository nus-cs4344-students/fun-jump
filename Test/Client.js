"use strict"; 
console.log("CLIENTHI");
function Client(){
	var playArea;
	var counter;
	var initGUI;
	var player;
	var counter = 0;
	var playerStopped = true;
	var keyState = {};
	
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
        player = new Player();
        initGUI();
        setInterval(function() {render();}, 1000/FunJump.FRAME_RATE);
		GameLoop();
    }
	
	var render = function() {
        // Get context
        var context = playArea.getContext("2d");

        // Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);

        // Draw playArea border
        context.fillStyle = "#000000";
        context.fillRect(0, 0, playArea.width, playArea.height);

		context.drawImage(player.image,player.x,player.y,Player.WIDTH,Player.HEIGHT);
		
		drawPlatforms(context);
		if(player.screenMove == true){
			platforms.forEach(function(platform,ind){
				platform.y += player.jumpSpeed;	//Move the platform accordingly.
				if(platform.y > FunJump.HEIGHT){
					platforms[ind] = new Platform(Math.random() * (FunJump.WIDTH - Platform.WIDTH), platform.y - FunJump.HEIGHT, 0);
					console.log(ind);
				}
			});
		}
    }

	/*var DrawBox = function(){
		ctx.fillStyle = '#000'
		ctx.beginPath();
		ctx.rect(ax,ay,vx,vy);
		ctx.closePath();
		ctx.fill();
		ax ++;
		ay ++;
	};*/

	var GameLoop = function(){
		checkMovement();
		checkPlayerFall();
		checkCollision();
		setTimeout(GameLoop, 1000/FunJump.FRAME_RATE);
	};

	var checkPlayerFall = function(e){
		if (player.isJumping) player.checkJump();
		if (player.isFalling) player.checkFall();
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
	
	var noOfPlatforms = 7; 
	var platforms = [];
	
	var generatePlatforms = function(){
		var position = 0, type;
		//'position' is Y of the platform, to place it in quite similar intervals it starts from 0
		for (var i = 0; i < noOfPlatforms; i++) {
		type = ~~(Math.random()*5);
		if (type == 0) type = 1;
		else type = 0;
		//it's 5 times more possible to get 'ordinary' platform than 'super' one
		platforms[i] = new Platform(Math.random()*(FunJump.WIDTH-Platform.WIDTH),position,type);
		//random X position
		if (position < FunJump.HEIGHT - Platform.HEIGHT) 
			position = position + (FunJump.HEIGHT/ noOfPlatforms);
		}
		//and Y position interval
	};
	generatePlatforms();
	
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
			}
		});
	}
}
var client = new Client();
setTimeout(function() {client.start();}, 500);