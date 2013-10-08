function Platform (x, y, type){
//function takes position and platform type
	var that=this;

	that.color = '#ABCDEF';

	if (type === 1) {
		that.color = '#975310';
	}
	
	that.onCollide = function(player){
		player.fallStop();
		if(type ==1)
			player.jumpSpeed = 40;
		console.log("HIT" + this);
	};
	
	that.x = x;
	that.y = y;
	that.type = type;

	return that;
};

Platform.HEIGHT = 20;
Platform.WIDTH = 70;