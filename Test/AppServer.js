//CS4344 Fun Jump
// This is the Application Server, handle request to index (the menu of Fun Jump game), and create different GameServer on demand
var LIB_PATH = "./";
require(LIB_PATH + "Server.js");

var express = require("express");
    app     = express();
    port    = 4344;
var gamePorts=[4345, 4346, 4347, 4348];
var gameServers=[];
    
app.get("/", function(req, res) {
  res.sendfile(__dirname+"/index.html");
});

app.get("/join/:rmID", function(req, res){
	roomID = req.params.rmID
	console.log("request to join room "+roomID + "  " + gamePorts[roomID]);
	if (gameServers[roomID] == null){
		gameServers[roomID] = new Server(gamePorts[roomID]);
		gameServers[roomID].start();
	}
	res.send({status:'ok', port:gamePorts[roomID]});
})

 /* serves all the static files */
 app.get(/^(.+)$/, function(req, res){ 
     console.log('static file request : ' + req.params);
     res.sendfile( __dirname + req.params[0]); 
 });

app.listen(port, function() {
   console.log("Listening on " + port);
 });