function Powerup (x,y,id){	//ONLY SHIELD FOR NOW!
	var that=this;
	that.origY = y;
	that.gameY = FunJump.HEIGHT-that.origY;
	that.id = id;
	that.taken = false;	//Taken or not

	that.x = x;
	that.y = y;

	return that;
};

Powerup.HEIGHT = 20;
Powerup.WIDTH = 20;
Powerup.CHANCE = 2;	// 1 / chance ==> 1 / 100 = 0.01 chance,  1/4 = 0.25 chance
global.Powerup = Powerup;