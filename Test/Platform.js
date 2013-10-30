function Platform (x, y, type){
//function takes position and platform type
	var that=this;
	that.origY = y;
	that.color = '#ABCDEF';
	that.gameY = FunJump.HEIGHT-that.origY;
	
	if (type === 1) {
		that.color = '#975310';
	}
	
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
Platform.WIDTH = 70;
Platform.SPECIALJUMPSPEED = 40;
global.Platform = Platform;