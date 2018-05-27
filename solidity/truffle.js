const HDWalletProvider = require("truffle-hdwallet-provider");
const private = require('../private.json');
const mnemonic = private.funds;
const infuraKey = private.infura;

module.exports = {
  networks: {
   development: {
      host: 'localhost',
      port: 7545,
      network_id: '*', // Match any network id
      gas: 3500000,
    },
   ropsten: {
      provider: new HDWalletProvider(mnemonic, "https://ropsten.infura.io/"),
      network_id: '*',
      gas: 3500000,
      gasPrice: 50000000000, // 50 gwei, this is very high
    },
    rinkeby: {
       provider: new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/"),
       network_id: '*',
       gas: 3500000,
       gasPrice: 5000000000, // 50 gwei, this is very high
     },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
