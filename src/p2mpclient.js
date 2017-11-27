const fs = require('fs');
const path = require('path');
const Sender = require('./sender');

if(process.argv.length < 6) {
    console.log('Invalid Command Line Arguments: Expected <server-hostname-i> ... <port> <file-name> <MSS>');
}

const hostnames = process.argv.slice(2, process.argv.length - 3);
const port = Number(process.argv[process.argv.length - 3]);
const file = path.resolve(__dirname , '../' + process.argv[process.argv.length -2]);
const mss = Number(process.argv[process.argv.length -1]);

//Validate valid command line argument: port
if(isNaN(port) || port < 0 || port > 65535) {
    console.log('Invalid port: Expected port number between 0 and 65535');
}

//Validate valid command line argument: file-name
if(!fs.existsSync(file)) {
    console.log('Invalid file-name: Expected valid file-name');
}

//Validate valid command line argument: mss
if(isNaN(mss) || mss < 1 || mss > 1500) {
    console.log('Invalid mss: Expected mss number between 1 and 1500');
}

const sender = new Sender(hostnames, port, file, mss);
sender.start()
