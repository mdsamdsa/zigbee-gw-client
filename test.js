var net = require('net');
var ProtoBuf = require('protobufjs');
var ByteBuffer = require('bytebuffer');
var builder = ProtoBuf.loadProtoFile('./proto/nwkmgr.proto');

var NWKMgr = builder.build("");

var command = new NWKMgr.NwkGetLocalDeviceInfoReq();

var buffer = new ByteBuffer();
buffer.littleEndian = true;

buffer.writeUint16(command.toBuffer().length)
    .writeUint8(NWKMgr.zStackNwkMgrSysId_t.RPC_SYS_PB_NWK_MGR)
    .writeUint8(command.cmdId)
    .append(command.toBuffer()).flip();

console.log(buffer.toBuffer());

var socket = net.createConnection(2540, '192.168.90.28');

socket.on('connect', function() {
    console.log('connect');
    socket.write(buffer.toBinary());
    //socket.end();
});

socket.on('data', function(chunk) {
    var buffer = ByteBuffer.wrap(chunk, 'binary', true);
    console.log('data: ' + buffer);
    console.log('len: ' + buffer.readUint16());
    console.log('subsys: ' + buffer.readUint8());
    console.log('cmd: ' + buffer.readUint8());
    console.log(NWKMgr.NwkGetLocalDeviceInfoCnf.decode(buffer));
});

socket.on('end', function() {
   console.log('end');
});

socket.on('error', function(error) {
    console.log('error: ' + error);
});

socket.on('close', function(had_error) {
    console.log('close: ' + had_error);
});
