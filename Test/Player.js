"use strict";
console.log("Player Loaded");
function Player(id) {
	var that = this;
	//this.image;
	that.x = 0;
	that.y = FunJump.HEIGHT-Player.HEIGHT;
	that.vx = 0;
	that.distance = Player.HEIGHT;
	that.yRel = 0;
	that.yForOpp = 0;
	that.direction = "stop";
	that.receivedDirection = "nil";

	that.projectiles = [];
	that.projectileTimer = 0;
	that.isHit = false;

	that.image = new Image();
	if(id==1){
		//this.image.src = "Person.png";
		that.color = "#AAA";
	}
	else if (id==2){
		//this.image.src = "";
		that.color = "#555";
	}

	that.vx = 0;

	that.isFalling = true;
	that.isJumping = false;

	that.jumpSpeed = 0;
	that.fallSpeed = 1;

	that.screenMove = false;

	that.setPosition = function(x,y){
		that.x = x;
		that.y = y;
		//var xx = (FunJump.HEIGHT - (that.y+Player.HEIGHT));
		//console.log(xx);
	}

	that.setRelY = function(){	//Sets the bottom of the map based on the relative y postion
		that.yRel = that.distance - (FunJump.HEIGHT - that.y);
		//console.log(that.distance);
	}

	that.move = function(direction){
		if(that.isHit == false && (direction == 'left' || direction == 'right' || direction == 'stop')){
			if(that.x < 0){
				that.vx = 0;
				that.x = 0;
			}
			else if(that.x > FunJump.WIDTH-Player.WIDTH){
				that.vx = 0;
				that.x = FunJump.WIDTH - Player.WIDTH;
			}
			else{
				if(direction == 'left'){
					that.vx = that.vx - Player.XACCELERATION;
					that.direction = "left";
				}
				else if(direction == 'right'){
					that.vx = that.vx + Player.XACCELERATION;
					that.direction = "right";
				}
				else if(direction == 'stop'){
					if(that.vx > Player.XACCELERATION)
						that.vx = that.vx - (Player.XACCELERATION+0.5);
					else if(that.vx < -Player.XACCELERATION)
						that.vx = that.vx + (Player.XACCELERATION+0.5);
					else
						that.vx = 0;
					that.direction = "stop";
				}
				that.x = that.x+that.vx;
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
		that.jumpSpeed = Player.JUMPSPEED;
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
		that.setRelY();
		that.jumpSpeed--;

		if (that.jumpSpeed == 0) {
			that.isJumping = false;
			that.isFalling = true;
			that.fallSpeed = Player.FALLSPEED;
		}
	}

	that.checkFall = function(){
		if (that.y < FunJump.HEIGHT - Player.HEIGHT) {
			that.screenMove = false;
			if(that.fallSpeed < Platform.HEIGHT){ //fix for going thru platform
				that.setPosition(that.x, that.y + that.fallSpeed);
				that.distance -= that.fallSpeed;
				that.setRelY();
				that.fallSpeed = that.fallSpeed + (Player.FALLSPEED*0.5);
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
Player.JUMPSPEED = 17;
Player.FALLSPEED = 1;
Player.SHOOTDELAY = 200;
Player.FREEZE = 100;
global.Player = Player;