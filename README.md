Fun Jump
============
#### A CS4344 Project  
by

Name                        | Matric Number
---                         | ---
[Hu Qiang](http://qiang.hu) | A0077857J
Sathish S/O Ramani          | A0087988X
Dinh Hoang Phuong Thao      | A0075099R

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
+ Mac OS X 10.9 / Windows 7
+ NodeJS: version 0.10.21
+ HTML5-Compatible browsers -> Safari (Mac): 7.0, Chrome (Windows): 30.0

##Known issues
As different browsers implement HTML5 differently, things are not working perfectly on all platforms.
* Audio is not played on iOS Safari
