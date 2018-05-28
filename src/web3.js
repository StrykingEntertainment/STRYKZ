const Web3 = require('web3');
const private = require('../private.json');
const web3 = new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/${private.infura}`));
const abi = require('./abi.js')
const deployed = require('./deployed.js');
const contract = web3.eth.contract(abi.stryking).at(deployed.stryking);
