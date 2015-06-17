'use strict';

var Profiles = require('../lib/profile/ProfileStore');

Profiles.init(__dirname + '/../data/profiles', ['ha', 'zll']);
