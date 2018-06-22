const web3 = require('./web3.js')
const settings = require('../settings.json');
const abi = require('./abi.js')
const keccak256 = require('./keccak256.js');
const wallet = require('./wallet.js');
const promise = require('./promise.js');
const ethUtils = require('ethereumjs-util');
const Tx = require('ethereumjs-tx');

module.exports = (function (){
  let fundsWallet, fundsWalletAddress, _private, _public;
  const setup = promise();
  const strykingContract = web3.eth.contract(abi.stryking).at(settings.strykingDeployedAddress);
  (async () => {
    try {
      // make all async calls first
      const fundsW = wallet.getFundsWallet();

      // await
      fundsWallet = wallet.parseWallet(await fundsW);
      fundsWalletAddress = `0x${fundsWallet.address}`;
      setup.resolve();
    } catch (e) {
      setup.reject(e);
    }
  })();
  _private = {
    contract: web3.eth.contract(abi.stryking).at(settings.strykingDeployedAddress),
    _ethSignedMessageHash: nonce => keccak256(nonce),
    _generateRawTx: () => {},
    _getFundsWalletNonce: async (walletAddress) => {
      if (walletAddress === undefined) walletAddress = fundsWalletAddress;
      await setup;
      return await web3.eth.getTransactionCount(walletAddress);
    },
    _getGasPrice: async () => {
      const p = promise();
      web3.eth.getGasPrice((err, res) => {
        if (err) p.reject(err);
        else p.resolve(res);
      });
      return await p.promise;
    },
    _getGasLimit: async () => {
      const p = promise();
      const block = await web3.eth.getBlock('latest');
      return block.gasLimit;
    },
    _sign: (data, privateKey) => {
      if (data === undefined) throw new Error('no data to sign');
      if (privateKey === undefined) throw new Error('no private key provided');
      return (ethUtils.ecsign(
        ethUtils.toBuffer(keccak256(0)),
        Buffer.from(fundsWallet.privateKey, 'hex')
      ).r).toString('hex');
    },
    _getApprovalNonce: (userId) => {
      return 1; // TODO: call web3 and get next nonce
    },
    _specialApproveGetData: async (nonce, privateKey) => {
      await setup;
      if (nonce === undefined) nonce = _private._getApprovalNonce();
      return await strykingContract.specialApprove.getData(
        nonce,
        _private._ethSignedMessageHash(nonce),
        _private._sign(keccak256(nonce), privateKey)
      );
    },
    _generateRawTxForApprovalToggle: async (userId) => {
      await setup;
      debugger;
      const accountNonce = _private._getFundsWalletNonce();
      const gasPrice = _private._getGasPrice();
      const gasLimit = _private._getGasLimit();
      const to = strykingContract.address;
      const value = '0x00';
      const userWallet = wallet.parseWallet(await wallet.getChildWallet(userId));
      const data = _private._specialApproveGetData(
        await _private._getApprovalNonce(userId),
        Buffer.from(userWallet.privateKey)
      );
      return {
        nonce: await accountNonce,
        gasPrice: await gasPrice,
        gasLimit: await gasLimit,
        to,
        value,
        data: await data
      };
    },
    _signRawTx: (rawTx, privateKey) => {
      const tx = new Tx(rawTx);
      tx.sign(privateKey);
      return tx;
    },
    _serializeSignedTx: (signedTx) => {
      return tx.serialize();
    }
  };

  _public = {
    web3,
    _getFundsWalletNonce: _private._getFundsWalletNonce,
    _getGasPrice: _private._getGasPrice,
    _getGasLimit: _private._getGasLimit,
    _specialApproveGetData: _private._specialApproveGetData,
    _signTx: _private._signTx,
    _signRawTx: _private._signRawTx,
    _generateRawTxForApprovalToggle: _private._generateRawTxForApprovalToggle,
    _serializeSignedTx: _private._serializeSignedTx
  };

  return _public;

})();