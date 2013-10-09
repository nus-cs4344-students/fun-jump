"use strict"; 
console.log("Player Loaded");
function Player(id) {
	//this.image;
	this.x;
	this.y;
	this.image = new Image();
	if(id==1){
		//this.image.src = "Person.png";
		this.color = "#AAA";
	}
	else if (id==2){
		//this.image.src = "";
		this.color = "#555";
	}
	this.x = 0;
	this.y = FunJump.HEIGHT-Player.HEIGHT;
	
	var that = this;
	var vx = 0;
	var vy = 0;
	this.distance = 0;
	
	this.isFalling = true;
	this.isJumping = false;
	
	this.jumpSpeed = 0;
	this.fallSpeed = 1;
	
	this.screenMove = false;
	
	that.setPosition = function(x,y){
		that.x = x;
		that.y = y;
	}

	that.getVX = function(){
		return vx;
	}
	that.move = function(direction){
		if(direction == 'left' || direction == 'right' || direction == 'stop'){
			if(that.x < 0){
				vx = 0;
				that.x = 0;
			}
			else if(that.x > FunJump.WIDTH-Player.WIDTH){
				vx = 0;
				that.x = FunJump.WIDTH - Player.WIDTH;
			}
			else{
				if(direction == 'left'){
					vx = vx - Player.XACCELERATION;
				}
				else if(direction == 'right')
					vx = vx + Player.XACCELERATION;
				else if(direction == 'stop'){
					if(vx > Player.XACCELERATION)
						vx = vx - (Player.XACCELERATION+0.5);
					else if(vx < -Player.XACCELERATION)
						vx = vx + (Player.XACCELERATION+0.5);
					else
						vx = 0;
				}
				that.x = that.x+vx;
			}
		}
		else if(direction == 'up'){
			console.log("UP");
		}
	}
	
	that.jump = function() {	//Set start.
	if (that.isJumping == false && that.isFalling == false) {
		that.fallSpeed = 0;
		that.isJumping = true;
		that.jumpSpeed = 17;
		}
	}
	
	that.checkJump = function() {
		if(that.y > FunJump.HEIGHT * 0.4){
			that.setPosition(that.x, that.y - that.jumpSpeed);
			that.screenMove = false;
		}
		else{
			that.screenMove = true;
		}
		
		that.distance += that.jumpSpeed;
		that.jumpSpeed--;

		if (that.jumpSpeed == 0) {
			that.isJumping = false;
			that.isFalling = true;
			that.fallSpeed = 1;
		}
	}
	
	that.checkFall = function(){
		if (that.y < FunJump.HEIGHT - Player.HEIGHT) {
			that.setPosition(that.x, that.y + that.fallSpeed);
			if(that.fallSpeed < Platform.HEIGHT){ //fix for going thru platform
				that.distance -= that.fallSpeed;
				that.fallSpeed = that.fallSpeed + 0.5;
			}
		} else {
			that.fallStop();
		}
	}
	
	that.fallStop = function(){
		//stop falling, start jumping again
		that.isFalling = false;
		that.fallSpeed = 0;
		that.jump();    
	}

}
Player.HEIGHT = 30;
Player.WIDTH = 30;
Player.XACCELERATION = 1.5;
global.Player = Player;