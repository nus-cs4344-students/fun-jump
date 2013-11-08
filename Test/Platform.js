function Platform (x, y, type){
//function takes position and platform type
	var that=this;
	that.origY = y;
	that.gameY = FunJump.HEIGHT-that.origY;

	that.onCollide = function(player){
		if (type==0){
			var jumpSound = new Audio("libs/sounds/Pop-Texavery-8926_hifi.mp3"); // buffers automatically when created
		}else{
			var jumpSound = new Audio("libs/sounds/Pop_2-Texavery-8930_hifi.mp3");
		}
		jumpSound.play();
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