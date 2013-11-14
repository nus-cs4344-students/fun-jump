Fun Jump
============
#### A CS4344 Project  
by

Name                        | Matric Number
---                         | ---
[Hu Qiang](http://qiang.hu) | A0077857J
Satish 	                    | 
Kathy                       | 

## Run the game  
This is a HTML5 game, with server powered by [NodeJS](http://nodejs.org). So it requires a modern browser and computer with NodeJS and some modules installed.   
### Install dependencies  
```bash
npm install express 
npm install sockjs 
npm install request
```
###Change configuration
Global configuration is in FunJump.js. You need to change the SERVER_NAME to your IP or as "localhost"(DONT set as localhost if you want to use another device to connect to your computer). You may also want to change the port number accordingly.

###Connect to server
Open a modern browser and navigate to SERVER_NAME:PORT/index.html, where SERVER_NAME and PORT are from previous section.

##Development Environment
+ Mac OS X 10.9, 
+ NodeJS: version 0.10.21
+ Safari (Mac ): 7.0

##Known issues
As different browsers implement HTML5 differently, things are not working perfectly on all platforms.
* Audio is not played on iOS Safari