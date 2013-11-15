"use strict";
console.log("Player Loaded");
function Player(id) {
	var that              = this;

	//Initialize player's variables
	that.x                = 0;	//Player's X position
	that.y                = FunJump.HEIGHT-Player.HEIGHT;	//Player's Y position
	that.vx               = 0;	//Player's X velocity
	that.distance         = Player.HEIGHT;	//Player's distance from the bottom of the map
	that.yRel             = 0;	//Player's relative position to the map (similar to distance but with proper y-coordinates)
	that.yForOpp          = 0;	//Only for player objects whom are opponents. Set their relative position according to the current player
	that.direction        = "stop";	//Currently their direction is stop. This will determine left or right
	that.directionUpdates = 0;	//To prevent multiple movement of player (See client.js)
	that.type;	//Sets if player is an opponent or player
	that.id               = id;	//Player's ID

	//Player's powerups and platforms [for client rendering]
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
	
	that.stepMove         = 0;	//Check how many left / right it has moved
	that.dirMove;	//Check whether its left / right it has moved.

	//the duration of the player's gameplay
	that.gameDuration     = 0;

	//For player's jump / fall
	that.isFalling        = true;	//True if the player is falling
	that.isJumping        = false;	//True if the player is jumping
	that.jumpSpeed        = 0;		//Current jumpspeed is 0.
	that.fallSpeed        = 1;		//Current fallspeed is 1. 
	that.screenMove       = false;	//true if the screen moves when the player reaches 40% of the current screen height

	//Function that sets the player position given x and y
	that.setPosition = function(x,y){
		that.x = x;
		that.y = y;
	}

	that.setRelY = function(){	//Sets the bottom of the map based on the relative y postion
		that.yRel = that.distance - (FunJump.HEIGHT - that.y);
	}

	//Player moves according to direction given. Left = move left, right = move right. stop = decelerate till stop
	//ONLY for x-axis
	that.move = function(direction){
		if(that.canMove == true && (direction == 'left' || direction == 'right' || direction == 'stop')){
			//Make sure the player doesn't go out of the screen
			if(that.x < 0){	
				that.vx = 0;
				that.x = 0;
			}
			
			//Make sure the player doesn't go out of the screen
			else if(that.x > FunJump.WIDTH-Player.WIDTH){
				that.vx = 0;
				that.x = FunJump.WIDTH - Player.WIDTH;
			}
			
			//Within the screen
			else{
				if(direction == 'left'){
					if(!(that.x <=0)){
						that.dirMove = "left";
						that.vx = that.vx - Player.XACCELERATION;
						that.direction = "left";
						that.stepMove ++;	//Stepmove is to for 'convergence'. When a direction change has happened, it will check how many steps it has moved and compare it to how many steps the client should have moved according to the original client. server relays this message over.
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
				that.x = that.x+that.vx;	//Move the player
			}
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

	//rare case that should not happen.
	that.jump = function() {
	if (that.isJumping == false && that.isFalling == false) {
		that.fallSpeed = 0;
		that.isJumping = true;
		that.jumpSpeed = Player.JUMPSPEED;
		}
	}

	//	
	that.checkJump = function(platforms) {
		//When the player reaches 40% of the screen, a trick is to stop him midair and move the entire screen downwards. This is to show that is is still 'jumping'
		if(that.y > FunJump.HEIGHT * 0.4){	
			that.setPosition(that.x, that.y - that.jumpSpeed);
			that.screenMove = false;
		}
		else{
			that.screenMove = true;
			that.start = false;
			
			if(that.type=="player"){	//Move the platforms accordingly when the player(client) jumps
				that.platforms.forEach(function(platform,ind){
					platform.y += that.jumpSpeed;
				});

				that.projectiles.forEach(function(projectile,ind){	//Moves the projectiles accordingly
					projectile.y += that.jumpSpeed;
				});

				that.powerups.forEach(function(powerup,ind){
					powerup.y += that.jumpSpeed;	//Move the powerup accordingly.
				});
			}
		}

		that.distance += that.jumpSpeed;
		that.setRelY();
		that.jumpSpeed--;	//Jumpspeed should decrease due to 'gravity'

		if (that.jumpSpeed == 0) {
			that.isJumping = false;
			that.isFalling = true;
			that.fallSpeed = Player.FALLSPEED;
		}
	}

	//Similar to jump, we need a fall function
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