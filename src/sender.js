const Promise = require('bluebird');
const readFile = Promise.promisify(require("fs").readFile);
const checksum16 = require('./checksum');
const getHeader = require('./header');
const dgram = require('dgram');
const parsePacket = require('./parse-packet');

module.exports = class Sender {
    constructor(hosts, port, file, mss) {
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
            address: `localhost`,
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
        this.sendSegement(this.segmentCount, this.hosts);
    }

    sendSegement(segmentCount, hosts) {
        const body = this.data.slice((segmentCount - 1)*this.mss, this.mss*segmentCount);
        const header = getHeader(segmentCount, checksum16(body), 0x5555);
        this.packet = Buffer.concat([header, body], header.length + body.length);
        this.sendPacket(this.packet, hosts);
    }

    sendPacket(packet, hosts) {
        clearTimeout(this.timeout);
        this.timeout = null;

        this.hosts.forEach((host) => {
            this.pendingAcks[host] = true;
        });
        this.timeout = setTimeout(this.messageTimeout, this.timeoutTime);
        this.hosts.forEach((host) => {
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
            if(packet.sequence !== this.segmentCount) {
                this.sendSegement(packet.sequence, [info.address]);
            }
            else {
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
            }
        }
    }

    messageTimeout() {
        console.log(`Timeout, sequence number = ${this.segmentCount}`);
        this.sendPacket(this.packet, Object.keys(this.pendingAcks));
    }
}
