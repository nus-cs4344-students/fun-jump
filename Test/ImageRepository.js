 "use strict";
 /**
	 * Define an object to hold all our images for the game so images
	 * are only ever created once. This type of object is known as a
	 * singleton.
	 */
	function ImageRepository() {
	  // Define images
	  this.background = new Image();
	  this.normalplatform = new Image();
	  this.trampoline = new Image();
	  this.normalguy = new Image();
	  this.normalguya = new Image();
	  this.girly = new Image();
	  this.girlya = new Image();
	  this.evil = new Image();
	  this.evila = new Image();
	  this.angel = new Image();
	  this.angela = new Image();

	  this.allImgLoaded = false;

	  var that = this;


	  // Ensure all images have loaded before starting the game
	  var numImages = 11;
	  var numLoaded = 0;
	  function imageLoaded() {
	    numLoaded++;
	    console.log("# img loaded: "+numLoaded);
	    if (numLoaded === numImages) {
	      	that.allImgLoaded = true;
	    }
	  }
	  this.background.onload = function() {
	    imageLoaded();
	  }
	  this.normalplatform.onload = function() {
	    imageLoaded();
	  }
	  this.trampoline.onload = function() {
	    imageLoaded();
	  }
	  this.normalguy.onload = function() {
	    imageLoaded();
	  }
	  this.normalguya.onload = function() {
	    imageLoaded();
	  }
	  this.girly.onload = function() {
	    imageLoaded();
	  }
	  this.girlya.onload = function() {
	    imageLoaded();
	  }
	  this.evil.onload = function() {
	    imageLoaded();
	  }
	  this.evila.onload = function() {
	    imageLoaded();
	  }
	  this.angel.onload = function() {
	    imageLoaded();
	  }
	  this.angela.onload = function() {
	    imageLoaded();
	  }

	  var imagePath = "./libs/img/";
	  // Set images src
	  this.background.src = imagePath + "background" +".png";
	  this.normalplatform.src = imagePath + "normal platform" +".png";
	  this.trampoline.src = imagePath + "trampoline" +".png";
	  this.normalguy.src = imagePath + "normal guy" +".png";
	  this.normalguya.src = imagePath + "normal guy angry" +".png";
	  this.girly.src = imagePath + "girly" +".png";
	  this.girlya.src = imagePath + "girly angry" +".png";
	  this.evil.src = imagePath + "evil" +".png";
	  this.evila.src = imagePath + "evil angry" +".png";
	  this.angel.src = imagePath + "angel" +".png";
	  this.angela.src = imagePath + "angel angry" +".png";
	}

// For node.js require
global.ImageRepository = ImageRepository;