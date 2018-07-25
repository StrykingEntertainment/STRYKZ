const express = require('express');
const app = express();
const ethUtils = require('ethereumjs-util');
app.use(express.json());
const txPool = require('./src/tx.js')
const db = require('./src/db.js');
const wallet = require('./src/wallet.js');
const logger = require('./src/logger.js');
const blockchain = require('./src/blockchain.js');
const keccak256 = require('./src/keccak256.js');
const validation = require('./src/validation.js');
const toNumber = validation.toNumber;
const abi = require('./src/abi.js');
const fs = require('fs')

app.get('/', (req, res) => {
  fs.readFile('./doc/docs.md', (err, data) => {
    if (err) {
      res.send('Stryking Eth Server')
    } else {
      res.send(data)
    }
  });
});

app.get('/getUserCount', async (req, res) => res.send((await db.getUserCount()).toString()));

app.get('/getChildWallet', async (req, res) => {
  try {
    const index = toNumber(req.query.index);
    if (!validation.isInteger(index)) {
      res.status(400).send('index is not an integer');
    } else {
      const childWallet = wallet.getChildWallet(index);
      res.send(wallet.parseWallet(childWallet));
    }
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/getUserById', async (req, res) => {
  try {
    const id = toNumber(req.query.id);
    if (!validation.isInteger(id)) {
      res.status(400).send('id is not an integer');
      return;
    }
    const user = await db.getUserById(id);
    if (user === null) {
      res.status(404).send("User not found");
    } else {
      res.send(user);
    }
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/getUserByIndex/', async (req, res) => {
  try {
    const index = toNumber(req.query.index);
    if (!validation.isInteger(index)) {
      res.status(400).send('index is not an integer');
      return;
    }
    const user = await db.getUserByIndex(index);
    if (user === null) {
      res.status(404).send("User not found");
    } else {
      res.send(user);
    }
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/getStrykingContractDetails', async (req, res) => {
  try {
    res.send(blockchain.getStrykingContractDetails())
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
})

app.get('/getUserTokenBalanceByIndex', async (req, res) => {
  try {
    const index = toNumber(req.query.index);
    if (!validation.isInteger(index)) throw new Error ('index is not an integer');
    const userWallet = wallet.parseWallet(wallet.getChildWallet(index))
    const strykingContract = await blockchain.strykingContract();
    res.send(await strykingContract.balanceOf('0x' + userWallet.address));
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.post('/generateUser', async (req, res) => {
  try {
    const name = req.body.name;
    if (name === undefined) {
      res.status(400).send('Please specify the name');
    } else {
      const newUser = await db.generateUser(name);
      res.send(newUser);
    }
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/getFundsWallet', async (req, res) => {
  try {
    const fundsWallet = wallet.parseWallet(wallet.getFundsWallet());
    const strykingContract = await blockchain.strykingContract();
    const tokenBalance = await strykingContract.balanceOf('0x' + fundsWallet.address);
    res.send({
      ...fundsWallet,
      tokenBalance
    });
    logger.log('LOG', 'FUNDS_WALLET: details retrieved');
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/getWalletLogs', async (req, res) => {
  try {
    res.send(db.getWalletLogs());
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.post('/toggleUserSpecialApproval', async (req, res) => {
  try {
    const index = req.body.index;
    if (!validation.isInteger(req.body.index)) throw new Error('index is not an integer')
    const userWallet = wallet.parseWallet(wallet.getChildWallet(index))
    const fundsWallet = wallet.parseWallet(wallet.getFundsWallet());
    const strykingContract = await blockchain.strykingContract();
    const currentNonce = toNumber(await strykingContract.specialAllowance('0x' + userWallet.address, '0x' + fundsWallet.address));
    if (!validation.isInteger(currentNonce)) throw new Error('currentNonce is not an integer');
    const approvalNonce = currentNonce + 1;
    const nonceHash = keccak256(approvalNonce);
    const userSignedNonce = blockchain.ethSign(
      ethUtils.toBuffer(keccak256(approvalNonce)),
      Buffer.from(userWallet.privateKey, 'hex')
    );
    const msg = await strykingContract.specialApprove(approvalNonce, nonceHash, userSignedNonce);
    logger.log('INFO', `toggleUserSpecialApproval called with response: ${msg}`, {
      index,
      userWallet: userWallet.address,
      fundsWallet: fundsWallet.address
    });
    res.send(msg);
    db.createTransaction(msg);
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/userApproval', async (req, res) => {
  try {
    const index = toNumber(req.query.index);
    if (!validation.isInteger(index)) throw new Error('index is not an integer');
    const userWallet = wallet.parseWallet(wallet.getChildWallet(index));
    const fundsWallet = wallet.parseWallet(wallet.getFundsWallet());
    const strykingContract = await blockchain.strykingContract();
    const msg = await strykingContract.specialAllowance('0x' + userWallet.address, '0x' + fundsWallet.address);
    logger.log('INFO', `userApproval called with response: ${msg}`);
    res.send(msg);
  } catch(e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message)
  }
});

app.post('/transferTokensFromUser', async (req, res) => {
  try {
    let from;
    if (req.body.from !== undefined) {
      if (!validation.isEthHex(req.body.from)) throw new Error('from is not a valid ethereum hex input')
      from = req.body.from;
    } else if (req.body.index !== undefined) {
      from = '0x' + wallet.parseWallet(wallet.getChildWallet(req.body.index)).address;
    } else {
      throw new Error('index or from fields not specified');
    }
    const to = req.body.to;
    const amount = req.body.amount;
    if (!validation.isEthHex(to)) throw new Error('to is not a valid ethereum hex input')
    if (!validation.isNumber(amount)) throw new Error('amount is not a number');
    const strykingContract = await blockchain.strykingContract();
    const msg = await strykingContract.transferFrom(from, to, Math.pow(10, 18) * amount);
    logger.log('INFO', `transferTokens called with response: ${msg}`, {
      from,
      to,
      amount
    });
    res.send(msg);
    db.createTransaction(msg);
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.post('/transferTokensFromFunds', async (req, res) => {
  try {
    let to;
    if (req.body.to) {
      if (!validation.isEthHex(req.body.to)) throw new Error('to is not a valid ethereum hex input')
      to = req.body.to;
    } else if (req.body.index) {
      to = '0x' + wallet.parseWallet(wallet.getChildWallet(req.body.index)).address;
    } else {
      throw new Error('index or to fields unspecified');
    }
    const amount = req.body.amount;
    if (!validation.isNumber(amount)) throw new Error('amount is not a number');
    const strykingContract = blockchain.strykingContract();
    const msg = await strykingContract.transfer(to, amount * Math.pow(10, 18));
    logger.log('INFO', `transferTokensFromFunds called with response: ${msg}`, {
      to,
      amount
    });
    res.send(msg);
    db.createTransaction(msg);
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
});

app.get('/logs', async (req, res) => {
  try {
    if (req.query.id) {
      res.send(await db.getLogById(req.query.id));
    } else {
      res.send(await db.getLogs());
    }
  } catch (e) {
    logger.log('ERROR', e.message, e.stack);
    res.status(500).send(e.message);
  }
})

app.listen(3000);
