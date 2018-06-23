const ethUtils = require('ethereumjs-util');
const hdkey = require('ethereumjs-wallet/hdkey');
const private = require('../private.json');
const bip39 = require('bip39');

module.exports = (function(){

  const _private = {
    getNodePath: (index) => {
      return `m/44'/60'/0'/0/${index}`;
    },
    hdWallet: hdkey.fromMasterSeed(bip39.mnemonicToSeed(private.seed)),
    fundsWallet: hdkey.fromMasterSeed(bip39.mnemonicToSeed(private.funds))
  };

  const _public = {
    hdWallet: _private.hdWallet,
    getChildWallet: (index) => _private.hdWallet.derivePath(_private.getNodePath(index)).getWallet(),
    getFundsWallet: () => _private.fundsWallet.derivePath(_private.getNodePath(0)).getWallet(),
    parseWallet: (wallet) => {
      const privateKey = wallet.getPrivateKey().toString('hex');
      const publicKey = wallet.getPublicKey().toString('hex');
      const address = ethUtils.pubToAddress(wallet.getPublicKey()).toString('hex');
      return { privateKey, publicKey, address };
    }
  };

  return _public;
})();