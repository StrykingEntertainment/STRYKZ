const Web3 = require('web3');
const private = require('../private.json');
module.exports = new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/${private.infura}`));
