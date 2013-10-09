/*=====================================================
  Declared as literal object (All variables are static)	  
  =====================================================*/
var FunJump = {
	HEIGHT : 500,				// height of Pong game window
	WIDTH : 500,				// width of Pong game window
	PORT : 4344,				// port of Pong game
	FRAME_RATE : 25,			// frame rate of Pong game
	SERVER_NAME : "localhost"	// server name of Pong game
	//SERVER_NAME : "172.28.179.28"	// server name of Pong game
}
console.log("FUNJUMP LOADED");
// For node.js require
global.FunJump = FunJump;

// vim:ts=4
