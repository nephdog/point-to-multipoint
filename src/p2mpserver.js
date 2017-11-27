const fs = require('fs');
const path = require('path');
const Receiver = require('./receiver');

if(process.argv.length !== 6) {
    console.log('Invalid Command Line Arguments: Expected <port> <file-name> <p>');
}

const port = Number(process.argv[2]);
const file = path.resolve(__dirname , '../' + process.argv[3]);
const probability = Number(process.argv[4]);
const socketHost = process.argv[5];

//Validate valid command line argument: port
if(isNaN(port) || port < 0 || port > 65535) {
    console.log('Invalid port: Expected port number between 0 and 65535');
}

if(isNaN(probability) || (probability < 0 && probability > 1)) {
    console.log('Invalid p: Expected 0 <= probability >= 1');
}

const receiver = new Receiver(port, file, probability, socketHost);
