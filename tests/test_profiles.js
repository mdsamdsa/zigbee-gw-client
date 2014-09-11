'use strict';

var profiles = require('../lib/profile/ProfileStore');

profiles.on('ready', function() {
    console.log('ready');
});