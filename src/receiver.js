const fs = require('fs');
const dgram = require('dgram');
const parsePacket = require('./parse-packet');
const lostPacket = require('./probabilistic-loss');
const checksum16 = require('./checksum');
const getHeader = require('./header');
const uuidv1 = require('uuid/v1');

module.exports = class Receiver {
    constructor(port, file, probability) {
        this.listening = this.listening.bind(this);
        this.message = this.message.bind(this);

        this.started = false;
        this.port = port;
        this.file = file;
        this.probability = probability;
        this.sequenceCount = 1;
        this.fileData = Buffer.from([]);

        this.socket = dgram.createSocket('udp4');
        this.socket.on('listening', this.listening);
        this.socket.on('message', this.message);
        this.socket.bind({
            address: `192.168.1.14`,
            port: port
        });
    }

    saveFileData() {
        const context = this;
        fs.writeFile(this.file, this.fileData, (err) => {
            if(err) {
                throw new Error(err);
            }
            else {
                console.log("The file was saved!");
                context.fileData = Buffer.from([]);
            }
        });
    }

    listening() {
        const address = this.socket.address();
        console.log(`Server listening at ${address.address}:${address.port}`);
    }

    message(msg, rinfo) {
        if(!this.start) {
            console.log('RECEIVE STARTED');
        }
        this.start = true;
        //Check probability
        const packet = parsePacket(msg);
        if(!lostPacket(this.probability)) {
            //Verify Packet Type
            if(packet.packetType === 0x5555) {
                //Verify Packet Sequence
                if(packet.sequence === this.sequenceCount) {
                    //Verify Checksum
                    const checksum = checksum16(packet.data);
                    if(packet.checksum === checksum) {
                        //Add to file data buffer
                        this.fileData = Buffer.concat([this.fileData, packet.data], packet.data.length + this.fileData.length);
                        //Send ACK
                        const header = getHeader(this.sequenceCount, 0, 0xAAAA);
                        this.sequenceCount++;

                        if(packet.data[packet.data.length-1] === 0x10){
                            this.sequenceCount = 1;
                            this.fileData = this.fileData.slice(0, this.fileData.length -1);
                            console.log('RECEIVE COMPLETE');
                            this.saveFileData();
                        }
                        this.socket.send(header, rinfo.port, rinfo.address);
                    }
                }
                else {
                    //ACK last sequence
                    const header = getHeader(this.sequenceCount, 0, 0xAAAA);
                    this.socket.send(header, rinfo.port, rinfo.address);
                }
            }
        }
        else {
            console.log(`Packet loss, sequence number = ${packet.sequence}`);
        }
    }
}
