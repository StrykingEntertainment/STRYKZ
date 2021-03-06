const web3 = require('./web3.js')
const settings = require('../settings.json');
const abi = require('./abi.js')
const keccak256 = require('./keccak256.js');
const wallet = require('./wallet.js');
const promise = require('./promise.js');
const ethUtils = require('ethereumjs-util');
const Tx = require('ethereumjs-tx');
let network;
switch (settings.networkId) {
  case 1:
    network = 'mainnet';
    break;
  case 3:
    network = 'ropsten';
    break;
  case 4:
    network = 'rinkeby';
    break;
  default:
    network = 'development';
}

module.exports = (function (){
  let fundsWallet, fundsWalletAddress, _private, _public;
  const setup = promise();
  const _strykingContract = web3.eth.contract(abi.stryking).at(settings[network].deployedContractAddresses.stryking);

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
    _getFundsWalletNonce: async (walletAddress) => {
      if (walletAddress === undefined) walletAddress = fundsWalletAddress;
      await setup.promise;
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
    ethSign: (data, privateKeyBuffer) => {
      if (data === undefined) throw new Error('no data to sign');
      if (privateKeyBuffer === undefined) throw new Error('no private key provided');
      var res = ethUtils.ecsign(
        data,
        privateKeyBuffer
      );
      // spec that Ethereum uses for a ECDSA signature
      return '0x' + res.r.toString('hex').slice(0,64) + res.s.toString('hex').slice(0,64) + res.v.toString(16).slice(0,2);
    },
    _generateRawTx: async (contract, method, args = [], options = {}) => {
      await setup.promise;
      if (contract === undefined) throw new Error('contract is undefined');
      if (method === undefined) throw new Error('method is undefined');
      if (!Array.isArray(args)) throw new Error('args is not an array');
      if (typeof options !== 'object') throw new Error('options is not an object');
      const accountNonce = _private._getFundsWalletNonce();
      const gasPrice = _private._getGasPrice();
      const to = options.to !== undefined ? options.to : contract.address;
      if (typeof to !== 'string' || to === '') throw new Error('to is not an address');
      const from = options.from !== undefined? options.to : fundsWalletAddress;
      const value = options.value !== undefined ? options.value : web3.toHex(web3.toWei('0', 'ether'));
      const data = _private._getData(contract, method, args);
      const estimatedGas = _private._estimateGas(contract, method, args);
      return {
        nonce: web3.toHex(await accountNonce),
        gasPrice: Math.min((await gasPrice).toNumber() * 2, 10000000000), // max 10 Gwei
        gasLimit: await estimatedGas,
        to,
        from,
        value,
        data: await data
      }
    },
    _sendRawTransaction: async (serializedTx) => {
      const p = promise();
      web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
        if (err) {
          p.reject(err);
        } else {
          p.resolve(hash);
        }
      });
      return p.promise;
    },

    _getData: async (contract, method, args) => {
      if (typeof contract !== 'object') throw new Error('contract is not an object');
      if (typeof method !== 'string') throw new Error('method name is not a string');
      if (!Array.isArray(args)) throw new Error('args is not an array');
      try {
        return await contract[method].getData.apply(contract[method], args);
      } catch (e) {
        console.log('getData error');
        throw new Error(e);
      }
    },
    _getTransactionHash: (rawTxHexString) => {
      return web3.sha3(rawTxHexString, {encoding: 'hex'});
    },
    _estimateGas: async (contract, method, args) => {
      if (typeof contract !== 'object') throw new Error('contract is not an object');
      if (typeof method !== 'string') throw new Error('method name is not a string');
      if (!Array.isArray(args)) throw new Error('args is not an array');
      try {
        return 2 * await contract[method].estimateGas.apply(contract[method], args);
      } catch (e) {
        console.log("gas estimation error: using default gasLimit of 2900000")
        return 2900000;
      }
    },
    _signRawTx: (rawTx, privateKey) => {
      let tx = new Tx(rawTx);
      tx.sign(privateKey);
      return tx;
    },
    _serializeSignedTx: (tx) => {
      return tx.serialize();
    },
    strykingContract: (contract = _strykingContract, wallet) => {
      let res = {};
      contract.abi.map((method) => {
        if (method.type !== 'function') return;
        if (method.stateMutability === 'view') {
          res[method.name] = async function() {
            await setup.promise;
            const p = promise();
            let args = Array.prototype.slice.apply(arguments);
            args.push(function(err, res) {
              if (err) {
                p.reject(err);
              } else {
                p.resolve(res);
              }
            })
            contract[method.name].apply(contract, args);
            return p.promise;
          }.bind(contract);
        } else {
          res[method.name] = async function() {
            await setup.promise;
            let args = Array.prototype.slice.apply(arguments);
            if (wallet === undefined) wallet = fundsWallet;
            const rawTx = await _private._generateRawTx(contract, method.name, args);
            const signedTx = _private._signRawTx(rawTx, Buffer.from(wallet.privateKey, 'hex'));
            const serializedTx = _private._serializeSignedTx(signedTx);
            return _private._sendRawTransaction(serializedTx);
          }.bind(contract);
        }
      });
      return res;
    },
    getStrykingContractDetails: () => {
      return {
        contractAddress: settings[network].deployedContractAddresses.stryking,
        abi: abi.stryking
      }
    },
    getTransactionStatus: async (tx) => {
      const p = promise();
      web3.eth.getTransactionReceipt(tx, (err, res) => {
        if (err) p.reject(err);
        else p.resolve(res);
      });
      try {
        let response = await p.promise;
        let status;
        if (response === null) {
          status = "Pending"
        } else {
          if (response.status === "0x1") {
            status = "Success"
          } else {
            status = "Failure"
          }
        }
        return status;
      } catch (e) {
        logger.log('ERROR', e, tx.toString())
        return "Error"
      }
    }
  };

  _public = {
    web3,
    getTokenBalance: _private.getTokenBalance,
    ethSign: _private.ethSign,
    strykingContract: _private.strykingContract,
    getStrykingContractDetails: _private.getStrykingContractDetails,
    getTransactionStatus: _private.getTransactionStatus
  };

  return _public;

})();