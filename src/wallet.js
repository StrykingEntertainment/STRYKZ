const wallet = require('ethereumjs-wallet');
const hdkey = require('ethereumjs-wallet/hdkey');
const seed = require('../private.json').seed;

module.exports = hdkey.fromMasterSeed(seed);