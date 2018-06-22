const ethUtils = require('ethereumjs-util');
const wallet = require('ethereumjs-wallet');
const hdkey = require('ethereumjs-wallet/hdkey');
const private = require('../private.json');
const seed = private.seed;
const fundsWalletSeed = private.funds;

module.exports = (function(){

  const _private = {
    hdWallet: hdkey.fromMasterSeed(seed),
    fundsWallet: hdkey.fromMasterSeed(private.funds)
  }

  const _public = {
    hdWallet: _private.hdWallet,
    getChildWallet: (index) => _private.hdWallet.deriveChild(index).getWallet(),
    getFundsWallet: () => _private.fundsWallet.deriveChild(0).getWallet(),
    parseWallet: (wallet) => {
      const privateKey = wallet.getPrivateKey().toString('hex');
      const publicKey = wallet.getPublicKey().toString('hex');
      const address = ethUtils.pubToAddress(wallet.getPublicKey()).toString('hex');
      return { privateKey, publicKey, address };
    }
  }

  return _public;
})();