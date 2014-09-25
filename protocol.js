'use strict';

var ProtoBuf = require('protobufjs');
var path = require('path');

var builderNWKMgr      = ProtoBuf.loadProtoFile(path.join(__dirname, 'data/proto/nwkmgr.proto'));
var builderGatewayMgr  = ProtoBuf.loadProtoFile(path.join(__dirname, 'data/proto/gateway.proto'));
var builderOTAMgr      = ProtoBuf.loadProtoFile(path.join(__dirname, 'data/proto/otasrvr.proto'));

var Protocol = {};

Protocol.NWKMgr     = builderNWKMgr.build();
Protocol.GatewayMgr = builderGatewayMgr.build();
Protocol.OTAMgr     = builderOTAMgr.build();

module.exports = Protocol;
