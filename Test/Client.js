"use strict"; 
console.log("CLIENTHI");
function Client(){
	var playArea;
	var counter;
	var initGUI;
	var player;
	var counter = 0;
	var playerStopped = true;
	
	var initGUI = function() {
		playArea = document.getElementById('mycanvas');
		playArea.width = FunJump.WIDTH;
		playArea.height = FunJump.HEIGHT;
		
		window.addEventListener("keydown", function(e) {
					onKeyPress(e);
		}, false);
		
		window.addEventListener("keyup", function(e) {
					onKeyUp(e);
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
		//console.log(playArea.width);
        // Clears the playArea
        context.clearRect(0, 0, playArea.width, playArea.height);

        // Draw playArea border
        context.fillStyle = "#000000";
        context.fillRect(0, 0, playArea.width, playArea.height);

		context.drawImage(player.image,player.x,player.y,Player.WIDTH,Player.HEIGHT);
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
		setTimeout(GameLoop, 1000/FunJump.FRAME_RATE);
		//console.log(playerStopped);
		checkPlayerStop();
		checkPlayerFall();
		console.log(player.getVX());
	};
	
	var checkPlayerStop = function(e){
		if(playerStopped == true)
			player.move('stop');
	}

	var checkPlayerFall = function(e){
		if (player.isJumping) player.checkJump();
		if (player.isFalling) player.checkFall();
	}
	
	var onKeyPress = function(e) {
		switch(e.keyCode) {
			case 37: { // Left
				playerStopped = false;
				player.move('left');
				//console.log("Moving Left: " + player.x);
				break;
			}
			case 39: { // Right
				playerStopped = false;
				player.move('right');
				//console.log("Moving Right: " + player.x);
				break;
			}
			case 38: { // Up
				player.move('up');
				break;
			}
		}
	}
	
	var onKeyUp = function(e) {
		switch(e.keyCode) {
			case 37: {
				playerStopped = true;
				break;
			}
			case 39: {
				playerStopped = true;
				break;
			}
		}
	}
}
var client = new Client();
setTimeout(function() {client.start();}, 500);
	