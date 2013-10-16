function Projectile(x, y, trajectory, size, color, speed, distance) {
    var that = this;
	that.x = x;
    that.y = y;
    that.trajectory = trajectory;
    that.size = size;
    that.color = color;
    that.speed = speed;
    that.distance = distance; //distance from the start line
    that.canRemove = false;

    that.updatePos = function(mod){
    	that.x += that.trajectory.x * that.speed * mod;
	    that.y += that.trajectory.y * that.speed * mod;
	    that.distance -= that.trajectory.y * that.speed * mod;
    }
}


// Static variables
Projectile.SPEED = 0.5;
Projectile.COLOR = '#FFFF00';
Projectile.SIZE = 5;

// For node.js require
global.Projectile = Projectile;