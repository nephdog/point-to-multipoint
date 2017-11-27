
module.exports = (buffer) => {
    let sum = 0;
    for(let i = 0; i < buffer.length; i = i + 2) {
        sum += buffer.readUInt16BE(i,true);
    }

    let MSB = (sum & 0xFFFF0000) >>> 16;
    let LSB = sum & 0xFFFF;
    while(MSB > 0) {
        sum = MSB + LSB;
        MSB = (sum & 0xFFFF0000) >>> 16;
        LSB = sum & 0xFFFF;
    }

    return ~sum & 0xFFFF;
}
