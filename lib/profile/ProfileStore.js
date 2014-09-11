'use strict';

/**
 * Parses XML ZigBee profile/cluster data from "data/profiles"
 * so it can be searched when devices are discovered.
 */
var xml2js = require('xml2js');
var fs = require('fs');
var util = require('util');
var stream = require('stream');
var _ = require('underscore');
var async = require('async');

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep) + 1, module.filename.length - 3);
var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

var parser = new xml2js.Parser();

util.inherits(ProfileStore, stream);

function ProfileStore(fileNames) {
    var self = this;

    this._profiles = [];

    function readHexId(v) {
        v.id = parseInt(v.id, 16);
        return v;
    }

    var tasks = [ function (cb) {
        self.readXml(__dirname + '/../../data/profiles/zcl.xml', function (err, result) {

            result = result.zcl;

            var clusters = result.clusters[0].cluster.map(cleanHorribleOutput).map(readHexId);
            clusters.forEach(function (cluster) {
                cluster.attribute && (cluster.attribute = cluster.attribute.map(readHexId));
                cluster.command && (cluster.command = cluster.command.map(readHexId));
            });

            logger.info('Parsed ' + clusters.length + ' clusters from the ZCL');
            self._clusters = clusters;

            var types = result.datatypes[0].datatype;
            logger.info('Parsed ' + types.length + ' data types from the ZCL');

            self._types = types.map(cleanHorribleOutput).map(readHexId);

            cb();
        });
    }];

    _.each(fileNames, function (fileName) {
        tasks.push(function (cb) {
            self.readXml(__dirname + '/../../data/profiles/' + fileName + '.xml', function (err, result) {
                logger.info('Parsed ' + result.profiles.profile.length + ' profiles from ' + fileName + '.xml');
                var profiles = _.map(result.profiles.profile, cleanHorribleOutput).map(readHexId);
                profiles.forEach(function (profile) {
                    profile.device = profile.device.map(readHexId);
                });
                self._profiles = self._profiles.concat(profiles);
                cb();
            });
        });
    });

    async.parallel(tasks, function () {

        // Attach the clusters and profile id to the device
        _.each(self._profiles, function (profile) {
            _.each(profile.device, function (device) {
                device.profile = profile.id;
                _.each(['server', 'client'], function (section) {
                    if (device[section]) {
                        device[section] = _.map(device[section][0].clusterRef, function (clusterRef) {
                            return self.getClusterByName(clusterRef.name);
                        });
                    }
                });
            });
        });

        logger.info('Ready');
        self.emit('ready');
    });
}

ProfileStore.prototype.getDevice = function (profileId, deviceId) {
    if (typeof profileId === 'string') {
        profileId = parseInt(profileId, 16);
    }
    if (typeof deviceId === 'string') {
        deviceId = parseInt(deviceId, 16);
    }

    var profile = this.getProfile(profileId);
    if (!profile) {
        logger.info('Profile ' + profileId + ' not found.');
        return null;
    }
    return this.filterById(profile.device, deviceId);
};

ProfileStore.prototype.getCluster = function (clusterId) {
    if (typeof clusterId === 'string') {
        clusterId = parseInt(clusterId, 16);
    }

    return _.filter(this._clusters, function (c) {
        return c.id === clusterId;
    })[0];
};

ProfileStore.prototype.getClusterByName = function (name) {
    return _.filter(this._clusters, function (c) {
        return c.name == name;
    })[0];
};

ProfileStore.prototype.getProfile = function (id) {
    return this.filterById(this._profiles, id);
};

ProfileStore.prototype.filterById = function (haystack, id) {
    if (typeof id === 'string') {
        id = parseInt(id, 16);
    }

    return _.filter(haystack, function (p) {
        return p.id === id;
    })[0];
};

ProfileStore.prototype.readXml = function (file, cb) {
    logger.info('Parsing ' + file);

    fs.readFile(file, function (err, data) {
        parser.parseString(data, function (err, result) {
            cb(err, result);
        });
    });
};

module.exports = new ProfileStore(['ha', 'zll']);

// Ignore me
// ES: I hate all the stupid xml attribute properties... so I'm flattening.
function cleanHorribleOutput(x) {
    if (x && x.$) {
        _.extend(x, x.$);
        delete(x.$);
    }

    _.each(x, function (value) {
        if (_.isArray(value) || _.isObject(value)) {
            cleanHorribleOutput(value);
        }
    });

    return x;
}

function hex(v) {
    v = '000' + v.toString(16);
    return '0x' + v.substring(v.length - 4);
}
