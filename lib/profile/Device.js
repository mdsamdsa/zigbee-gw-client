'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var util = require('util');
var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var Endpoint = require('./Endpoint');
var EventEmitter = require('events').EventEmitter;

function Device(pan, deviceInfo) {
    this.pan = pan;

    this.ieeeAddress       = deviceInfo.ieeeAddress;
    this.shortAddress      = deviceInfo.networkAddress;
    this.parentIeeeAddress = deviceInfo.parentIeeeAddress;
    this.manufacturerId    = deviceInfo.manufacturerId;
    this.deviceStatus      = deviceInfo.deviceStatus;

    this.endpoints = [];
    for (var i = 0; i < deviceInfo.simpleDescList.length; i++) {
        this.endpoints.push(new Endpoint(this, deviceInfo.simpleDescList[i]));
    }
}

util.inherits(Device, EventEmitter);

Device.prototype.update = function(deviceInfo) {
    this.shortAddress = deviceInfo.shortAddress;
};

Device.prototype.toString = function() {
  return '[Device: ' + this.IEEEAddress + ']';
};

module.exports = Device;