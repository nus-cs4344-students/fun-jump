function Trajectory(startX, startY, endX, endY, iniDistance) {
    this.length = Math.sqrt(Math.pow((endX - startX), 2) + Math.pow((endY - startY), 2));
    this.x = (endX - startX) / this.length;
    this.y = (endY - startY) / this.length;
    this.distanceX = Math.abs(endX-startX); //distance along x axis that projectile has
    this.endX = endX;										//to travel to reach destination
    this.endY = startY - endY + iniDistance; //absolute end Y coordinate wrt the start line
}

// For node.js require
global.Trajectory = Trajectory;