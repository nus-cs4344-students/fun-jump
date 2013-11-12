/*=====================================================
  Declared as literal object (All variables are static)
  =====================================================*/
var FunJump = {
	HEIGHT : 500,				// height of FunJump game window
	WIDTH : 500,				// width of FunJump game window
	PORT : 4344,				// port of FunJump game
	FRAME_RATE : 25,			// frame rate of Pong game
	SERVER_NAME : "qiang.hu"	// server name of FunJump game
	// SERVER_NAME : "localhost"	// server name of FunJump game
	// SERVER_NAME : "192.168.1.117"	// server name of FunJump game
}
console.log("FUNJUMP LOADED");
// For node.js require
global.FunJump = FunJump;

// vim:ts=4
