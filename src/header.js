
module.exports = (sequence, checksum, packetType) => {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(sequence);
    header.writeUInt16BE(checksum, 4);
    header.writeUInt16BE(packetType, 6);
    return header;
}
