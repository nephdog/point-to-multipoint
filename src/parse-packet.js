module.exports = (buffer) => {
    return {
        sequence: buffer.readUInt32BE(0),
        checksum: buffer.readUInt16BE(4),
        packetType: buffer.readUInt16BE(6),
        data: buffer.slice(8)
    };
};
