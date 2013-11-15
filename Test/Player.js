"use strict";
console.log("Player Loaded");
function Player(id) {
	var that              = this;

	that.x                = 0;
	that.y                = FunJump.HEIGHT-Player.HEIGHT;
	that.vx               = 0;
	that.distance         = Player.HEIGHT;
	that.yRel             = 0;
	that.yForOpp          = 0;
	that.direction        = "stop";
	that.directionUpdates = 0;
	that.type;

	that.powerups         = [];
	that.platforms        = [];
	
	//for player's projectiles
	that.projectiles      = [];
	that.projectileTimer  = 0; //the latest time when the player fires a projectile
	
	//flags to decide which state the player is in
	that.isHit            = false; //true when player is hit with an projectile
	that.shoot            = false; //true when player fires a projectile
	that.finish           = false; //true if player reaches finish line
	that.start            = true;  //true when the player starts the game and the screen hasn't moved upwards
	that.canMove          = false; //true when the player is allowed to move
	that.powerup          = false; //true when the player possess a Shield Powerup
	
	that.id               = id;
	
	that.stepMove         = 0;	//Check how many left / right it has moved
	that.dirMove;	//Check whether its left / right it has moved.

	//the duration of the player's gameplay
	that.gameDuration     = 0;

	that.vx               = 0;

	that.isFalling        = true;
	that.isJumping        = false;

	that.jumpSpeed        = 0;
	that.fallSpeed        = 1;

	that.screenMove       = false;

	that.setPosition = function(x,y){
		that.x = x;
		that.y = y;
	}

	that.setRelY = function(){	//Sets the bottom of the map based on the relative y postion
		that.yRel = that.distance - (FunJump.HEIGHT - that.y);
	}

	that.move = function(direction){
		if(that.canMove == true && (direction == 'left' || direction == 'right' || direction == 'stop')){
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
					if(!(that.x <=0)){
						that.dirMove = "left";
						that.vx = that.vx - Player.XACCELERATION;
						that.direction = "left";
						that.stepMove ++;
					}
				}
				else if(direction == 'right'){
					if(!(that.x+Player.WIDTH >=FunJump.WIDTH)){
						that.dirMove = "right";
						that.vx = that.vx + Player.XACCELERATION;
						that.direction = "right";
						that.stepMove ++;
					}
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

	that.accelerate = function(ax){
		if (that.canMove ){
			if( ax < -0.4){
				that.dirMove = "leff";
				//Decrease the normal acceleration to 1/5, or velocity increase too fast!
				that.vx = that.vx - Player.XACCELERATION/5;
				that.direction = "left";
				that.stepMove++;
			}
			else if( ax > 0.4){
				that.dirMove = "right";
				// that.vx = ax * 5;
				that.vx = that.vx + Player.XACCELERATION/5;
				that.direction = "right";
				that.stepMove++;
			}
			else{
				//Else stop player, or it is very difficult to predict where it lands in mobile devices.
				that.vx = 0;
						
				that.direction = "stop";
			}

			//Limit the max speed to or the speed will increase dramatically.
			if (Math.abs(that.xv) > 100){
				that.x = that.x/Math.abs(that.x) * 100;
			}
			that.x = that.x+that.vx;
			if(that.x < 0){
				that.vx = 0;
				that.x = 0;
			}
			else if(that.x > FunJump.WIDTH-Player.WIDTH){
				that.vx = 0;
				that.x = FunJump.WIDTH - Player.WIDTH;
			}
		}
	}

	that.jump = function() {	//Set start.
	if (that.isJumping == false && that.isFalling == false) {
		that.fallSpeed = 0;
		that.isJumping = true;
		that.jumpSpeed = Player.JUMPSPEED;
		}
	}

	that.checkJump = function(platforms) {
		if(that.y > FunJump.HEIGHT * 0.4){
			that.setPosition(that.x, that.y - that.jumpSpeed);
			that.screenMove = false;
		}
		else{
			that.screenMove = true;
			that.start = false;
			if(that.type=="player"){
				that.platforms.forEach(function(platform,ind){
					platform.y += that.jumpSpeed;	//Move the platform accordingly.
				});

				that.projectiles.forEach(function(projectile,ind){
					projectile.y += that.jumpSpeed;
				});

				//Don't need to do 'taken' cause i can juz render it out.
				that.powerups.forEach(function(powerup,ind){
					powerup.y += that.jumpSpeed;	//Move the powerup accordingly.
				});
			}
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
Player.HEIGHT        = 40;
Player.WIDTH         = 40;
Player.XACCELERATION = 1.5;
Player.JUMPSPEED = 17;
Player.FALLSPEED = 1;
Player.SHOOTDELAY = 700; //delay between 2 consecutive fires, a player is not allowed to shoot continuously
Player.FREEZE = 100;
Player.POWERUPDIST = 3;	//1 pixels away from player
Player.POWERUPSIZE = Player.HEIGHT + Player.POWERUPDIST * 2;
global.Player = Player;