const wallet = require('ethereumjs-wallet');
const hdkey = require('ethereumjs-wallet/hdkey');
const seed = require('../private.json').seed;

module.exports = (function(){

  const _private = {
    hdWallet: hdkey.fromMasterSeed(seed),
  }

  const _public = {
    hdWallet: _private.hdWallet,
    getChildWallet: (index) => _private.hdWallet.deriveChild(index).getWallet(),
  }

  return _public;
})();