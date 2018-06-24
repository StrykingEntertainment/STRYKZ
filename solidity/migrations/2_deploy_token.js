var Stryking = artifacts.require("./Stryking.sol");
const fs = require('fs');
const fileName = __dirname + '/../../settings.json';
let file;
if (fs.existsSync(fileName)) {
  file = require(fileName);
} else {
  console.log('file does not exist, please update deployed contract addresses manually');
}

module.exports = async function(deployer) {
  const strykingContract = await deployer.deploy(Stryking);
  const d = await Stryking.deployed();
  if (file) {
    file[deployer.network]['deployedContractAddresses']['stryking'] = d.address;
    console.log(file);
    fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
      if (err) return console.log(err);
      console.log('writing to ' + fileName);
    });
  }

};
