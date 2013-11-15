//function takes position and platform type
function Platform (x, y, type){
	var that=this;
	
	that.origY = y;	//The platform's y to the map. Can go past the map. Ranges from 0 to 1000+ (depends on no of platforms)
	that.gameY = FunJump.HEIGHT-that.origY;	//Platform's y w.r.t to the map. Since y is calculated 0 at the top and 500 at the bottom for canvas, we have to set it according to this.
	that.x = x;
	that.y = y;
	that.type = type;
	
	//Takes in a player object.
	//When a player collide, the player will stop falling and start jumping.
	that.onCollide = function(player){
		player.fallStop();
		if(type ==1)
		player.jumpSpeed = Platform.SPECIALJUMPSPEED;
	};

	return that;
};

Platform.HEIGHT = 20;
Platform.WIDTH = 60;
Platform.SPECIALJUMPSPEED = 40;	//For trampoline platform
global.Platform = Platform;