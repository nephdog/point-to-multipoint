const Promise = require('bluebird');
const readFile = Promise.promisify(require("fs").readFile);
const checksum16 = require('./checksum');
const getHeader = require('./header');
const dgram = require('dgram');
const parsePacket = require('./parse-packet');

module.exports = class Sender {
    constructor(hosts, port, file, mss, clientHost) {
        this.listening = this.listening.bind(this);
        this.message = this.message.bind(this);
        this.messageTimeout = this.messageTimeout.bind(this);
        this.sendSegement = this.sendSegement.bind(this);

        this.hosts = hosts;
        this.port = port;
        this.file = file;
        this.mss = mss;
        this.pendingAcks = {};
        this.segmentCount = 1;
        this.timeout = null;
        this.packet = null;
        this.timeoutTime = 50;
        this.startTime = null;

        this.socket = dgram.createSocket('udp4');
        this.socket.on('listening', this.listening);
        this.socket.on('message', this.message);
        this.socket.bind({
            address: clientHost,
            port: 65000
        });
    }

    start() {
        return readFile(this.file)
        .then((data) => {
            this.data = Buffer.concat([data, Buffer.from([0x10])], data.length+1); //Add EOF to dataset
            this.startTime = new Date().getTime();
            console.log('SEND STARTED');
            this.rdtSend();
        });
    }

    rdtSend() {
        //console.log('SENDING SEQUENCE', this.segmentCount);
        this.sendSegement(this.segmentCount, this.hosts);
    }

    sendSegement(segmentCount, hosts, ignore) {
        const body = this.data.slice((segmentCount - 1)*this.mss, this.mss*segmentCount);
        const header = getHeader(segmentCount, checksum16(body), 0x5555);
        this.packet = Buffer.concat([header, body], header.length + body.length);
        if(!ignore) {
            this.sendPacket(this.packet, hosts, true);
        }
    }

    sendPacket(packet, hosts, addPendingAcks) {
        clearTimeout(this.timeout);
        this.timeout = null;

        if(addPendingAcks) {
            hosts.forEach((host) => {
                this.pendingAcks[host] = true;
            });
        }
        this.timeout = setTimeout(this.messageTimeout, this.timeoutTime);
        hosts.forEach((host) => {
            this.socket.send(packet, 7735, host);
        });
    }

    listening() {
        const address = this.socket.address();
        console.log(`Client listening for ACKs at ${address.address}:${address.port}`);
    }

    message(msg, info) {
        const packet = parsePacket(msg);
        if(packet.packetType === 0xAAAA) {
            if(packet.sequence !== this.segmentCount && packet.sequence < this.segmentCount) {
                //console.log('PACKET OUT OF SEQUENCE');
                this.segmentCount = packet.sequence;
                this.sendSegement(packet.sequence, [info.address], true);
            }
            else {
                //console.log('ACK RECEIVED FROM', info.address);
                delete this.pendingAcks[info.address];
                if(Object.keys(this.pendingAcks).length === 0) {
                    clearTimeout(this.timeout);
                    this.timeout = null;
                    if(this.packet[this.packet.length-1] === 0x10) {
                        this.segmentCount = 1;
                        console.log('SEND COMPLETE');
                        console.log('Ellapsed Time:', (new Date().getTime() - this.startTime)/1000, 'seconds');
                        this.socket.close();
                    }
                    else {
                        this.segmentCount++;
                        this.rdtSend();
                    }
                }
                else {
                    //console.log('STILL AWAITING ACKs', Object.keys(this.pendingAcks));
                }
            }
        }
    }

    messageTimeout() {
        console.log(`Timeout, sequence number = ${this.segmentCount}`);
        //console.log('Retrying', Object.keys(this.pendingAcks));
        this.sendPacket(this.packet, Object.keys(this.pendingAcks), false);
    }
}
