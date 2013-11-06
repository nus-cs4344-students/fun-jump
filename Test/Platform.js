function Platform (x, y, type){
//function takes position and platform type
	var that=this;
	that.origY = y;
	that.gameY = FunJump.HEIGHT-that.origY;

	that.onCollide = function(player){
		player.fallStop();
		if(type ==1)
		player.jumpSpeed = Platform.SPECIALJUMPSPEED;
	};

	that.x = x;
	that.y = y;
	that.type = type;

	return that;
};

Platform.HEIGHT = 20;
Platform.WIDTH = 60;
Platform.SPECIALJUMPSPEED = 40;
global.Platform = Platform;