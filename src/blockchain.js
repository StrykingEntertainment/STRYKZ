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
  const strykingContract = web3.eth.contract(abi.stryking).at(settings.deployedContractAddresses.stryking);

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
    _messageHash: nonce => keccak256(nonce),
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
    // _getGasLimit: async () => {
    //   const p = promise();
    //   const block = await web3.eth.getBlock('latest');
    //   return block.gasLimit;
    // },
    _estimateGas: async () => {

    },
    _sign: (data, privateKeyBuffer) => {
      if (data === undefined) throw new Error('no data to sign');
      if (privateKeyBuffer === undefined) throw new Error('no private key provided');
      var res = ethUtils.ecsign(
        data,
        privateKeyBuffer
      );
      return '0x' + res.r.toString('hex').slice(0,64) + res.s.toString('hex').slice(0,64) + res.v.toString(16).slice(0,2);
    },
    _getApprovalNonce: (userId) => {
      return 1; // TODO: call web3 and get next nonce
    },
    _specialApproveGetData: async (nonce, privateKeyBuffer) => {
      await setup;
      if (nonce === undefined) nonce = _private._getApprovalNonce();
      console.log('nonce', nonce);
      console.log('signedNonce', _private._messageHash(nonce));
      console.log('sign', _private._sign(ethUtils.toBuffer(keccak256(nonce)), privateKeyBuffer));
      const res = await strykingContract.specialApprove.getData(
        nonce,
        _private._messageHash(nonce),
        _private._sign(ethUtils.toBuffer(keccak256(nonce)), privateKeyBuffer)
      );
      console.log(res);
      return res;
    },
    _specialApproveEstimateGas: async (nonce, privateKeyBuffer) => {
      await setup;
      if (nonce === undefined) nonce = _private._getApprovalNonce();
      return await strykingContract.specialApprove.estimateGas(
        nonce,
        _private._messageHash(nonce),
        _private._sign(ethUtils.toBuffer(keccak256(nonce)), privateKeyBuffer)
      );
    },
    _generateRawTxForApprovalToggle: async (userId) => {
      await setup;
      const accountNonce = _private._getFundsWalletNonce();
      const gasPrice = _private._getGasPrice();
      // const estimatedGasLimit = _private._estimateGas(strykingContract.specialApprove);
      const to = strykingContract.address;
      const value = web3.toHex(web3.toWei('0', 'ether'));
      const userWallet = wallet.parseWallet(await wallet.getChildWallet(userId));
      console.log('USING USER WALLET WITH ADDRESS', userWallet.address);
      const approvalNonce = await _private._getApprovalNonce(userId);
      const data = _private._specialApproveGetData(
        approvalNonce,
        Buffer.from(userWallet.privateKey, 'hex')
      );
      const estimatedGas = _private._specialApproveEstimateGas(
        approvalNonce,
        Buffer.from(userWallet.privateKey, 'hex')
      );
      return {
        nonce: web3.toHex(await accountNonce),
        gasPrice: 10000000000, //Math.min((await gasPrice).toNumber()*2, 10000000000),
        gasLimit: 2900000, //2 * await estimatedGas,
        to,
        from: fundsWalletAddress,
        value,
        data: await data
      };
    },
    _signRawTx: (rawTx, privateKey) => {
      let tx = new Tx(rawTx);
      tx.sign(privateKey);
      return tx;
    },
    _serializeSignedTx: (tx) => {
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