function Powerup (x,y,id){	//ONLY SHIELD FOR NOW!
	var that=this;
	
	//Similar to platform, define this to be the exact y coordinate of the powerup.
	that.origY = y;
	that.gameY = FunJump.HEIGHT-that.origY;
	
	that.id = id;	//Special ID for each powerup.
	
	that.touchTime = 0;	//This will determine the server authortive role on who gets the platform according to who touched the powerup first.
	
	that.pid = -1;	//Magic number -1 for a player whom have yet to touch the powerup.
	
	that.taken = false;	//Taken or not

	that.x = x;
	that.y = y;

	return that;
};

Powerup.HEIGHT = 20;
Powerup.WIDTH = 20;
Powerup.CHANCE = 6;	// 1/100 = 0.01 chance,  1/4 = 0.25 chance, 1/6 = out of every 6 platforms, we expect 1 powerup.
global.Powerup = Powerup;