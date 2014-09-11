'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var when = require('when');
var util = require('util');
var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Endpoint = require('./Endpoint');
var EventEmitter = require('events').EventEmitter;

module.exports = Device;

function Device(pan, deviceInfo) {
    this._pan = pan;
    this._deviceInfo = deviceInfo;

    this.__defineGetter__('IEEEAddress', function () {
        return this._deviceInfo.ieeeAddress;
    });

    this.__defineGetter__('shortAddress', function () {
        return this._deviceInfo.networkAddress;
    });

    this._endpoints = {};
}
util.inherits(Device, EventEmitter);

Device.prototype.update = function(deviceInfo) {

};

/**
 * Finds endpoints for a profileId, which are them emitted as an 'endpoints' event.
 * HA endpoints are searched for automatically.
 */
Device.prototype.findEndpoints = function(profileId, inClusters, outClusters) {
  inClusters = inClusters || [];
  outClusters = outClusters || [];

  logger.info(this, 'findEndpoints', profileId.toString(16));

  var matchEndpointsPayload = Concentrate()
    .uint16le(this.shortAddress) // DstAddr
    .uint16le(this.shortAddress) // NWKAddrOfInterest
    .uint16le(profileId); // ProfileID

  matchEndpointsPayload.uint8(inClusters.length); // NumInClusters
  inClusters.forEach(function(c) {
    matchEndpointsPayload.uint16le(c);
  });

  matchEndpointsPayload.uint8(outClusters.length); // NumOutClusters
  outClusters.forEach(function(c) {
    matchEndpointsPayload.uint16le(c);
  });

  this.client.comms.request('ZDO_MATCH_DESC_REQ', matchEndpointsPayload.result());
};

/**
 * Returns a promise of a new Device when deviceInfoPromise resolves to a device
 * info object. 
 * @param  {[type]} deviceInfoPromise
 * @return {[type]}
 */
module.exports.deviceForInfo = function(client, deviceInfoPromise) {
  return when(deviceInfoPromise)
    .then(function(deviceInfo) {
      var addrReqPayload = Concentrate()
        .uint16le(deviceInfo.shortAddr) // shortAddr
        .result();

      return client.comms
        .request('UTIL_ADDRMGR_NWK_ADDR_LOOKUP', addrReqPayload)
        .then(function(response) {

          var ieee = response.data;

          // We override the IEEE addresses toString to give us a nice human-readable
          // one that matches up with what's shown on the user's device.
          ieee.toString = function() {
            var part1 = this.readUInt32LE(4).toString(16);
            var part2 = this.readUInt32LE(0).toString(16);
            return (pad(part1, 8) + pad(part2, 8)).toUpperCase();
          };

          deviceInfo.ieee = ieee;

          return new Device(client, deviceInfo);
        }.bind(this));
    });
};

Device.prototype.toString = function() {
  return '[Device: ' + this.IEEEAddress + ']';
};

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

//command = ZDO_COMPLEX_DESC or ZDO_ACTIVE_EP
Device.prototype.findActiveEndpoints = function() {
  var payload = Concentrate()
    .uint16le(this.shortAddress) // DstAddr
    .uint16le(this.shortAddress) // NWKAddrOfInterest
    .result();

  return this.client.comms
    .request('ZDO_ACTIVE_EP_REQ', payload)
    .then(this.client._parseStatus)
    .then(function(status) {
      logger.info(this, 'ZDO_ACTIVE_EP_REQ', 'status', status);
      if (status.key !== 'ZSuccess') {
        throw new Error('ZDO_ACTIVE_EP_REQ failed with error: ' + status.key);
      }

      return status;
    }.bind(this));
};