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
    that.landedTimer = 0; // >0 if the projectile reach the final destination
    that.travelled = 0; // distance travelled along x-axis

    that.updatePos = function(mod){
    	if(that.landedTimer <= 0){
	    	that.travelled += Math.abs(that.trajectory.x * that.speed * mod);
	    	 if(that.travelled >= that.trajectory.distanceX){
		     	that.landedTimer++;
		     	that.x = that.trajectory.endX;
		     	that.y += (that.distance - that.trajectory.endY);
		     	that.distance = that.trajectory.endY;

    		}
			else{
				that.x += that.trajectory.x * that.speed * mod;
			    that.y += that.trajectory.y * that.speed * mod;
			    that.distance -= that.trajectory.y * that.speed * mod;
			}
	    }
	    else{
	    	that.landedTimer++;
	    }
    }
}


// Static variables
Projectile.SPEED = 0.5;
Projectile.COLOR = '#92CD00';
Projectile.SIZE = 5;
Projectile.SPLASH_SIZE = 40;

// For node.js require
global.Projectile = Projectile;