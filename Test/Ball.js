var width = 320, height = 500;
var c = document.getElementById('mycanvas');
var ctx = c.getContext('2d');
c.width = width;
c.height = height;
var counter = 1;
var clear = function(){
	ctx.fillStyle = '#d0e7f9';
	ctx.beginPath();
	ctx.rect(0,0,width,height);
	ctx.closePath();
	ctx.fill();
}
var ax = 0;
var ay = 0;
var playerHeight = 30, playerWidth = 30;
var px = ((width-playerWidth)/2);
var py = ((height - playerHeight)/2);
var vx = 0;
var vy = 0;
/*var DrawBox = function(){
    ctx.fillStyle = '#000'
	ctx.beginPath();
	ctx.rect(ax,ay,vx,vy);
	ctx.closePath();
    ctx.fill();
	ax ++;
	ay ++;
};*/

var GameLoop = function(){
	clear();
	//DrawBox();
	player.draw();
	gLoop = setTimeout(GameLoop, 1000/50);
};

var player = new function(){
	var that = this;
	that.image = new Image();
	that.image.src = "Person.png";
	that.width = playerWidth;
	that.height = playerHeight;
	that.X = 0;
	that.Y = 0;
	
	that.setPosition = function(x,y){
		that.X = x;
		that.Y = y;
	}
	
	that.draw = function(){
		if(that.X < 0){
			vx = 0;
			that.X = 0;
		}
		else if(that.X > width-that.width){
			vx = 0;
			that.X = width-that.width;
			
		}
		else
			that.X = that.X+vx;
		console.log(that.X);
		ctx.drawImage(that.image,that.X,that.Y,that.width,that.height);
	}
};


GameLoop();

document.addEventListener("keydown", function(e) {
	onKeyPress(e);
}, false);
var onKeyPress = function(e) {
	switch(e.keyCode) {
		case 37: { // Left
			vx = vx-1;
			break;
		}
		case 39: { // Right
			vx+=1;
			break;
		}
	}
}