const express = require('express');
const app = express();
const ethUtils = require('ethereumjs-util');
app.use(express.json());
const db = require('./src/db.js');
const wallet = require('./src/wallet.js');
const logger = require('./src/logger.js');
const blockchain = require('./src/blockchain.js');
const keccak256 = require('./src/keccak256.js');

app.get('/', (req, res) => res.send('Stryking Eth Server'));

app.get('/getUserCount', async (req, res) => res.send((await db.getUserCount()).toString()));

app.get('/getChildWallet', async (req, res) => {
  try {
    if (isNaN(Number(req.query.index))) {
      res.status(400).send('Please specify the child index');
    } else {
      const childWallet = wallet.getChildWallet(req.query.index);
      res.send(wallet.parseWallet(childWallet));
    }
  } catch (e) {
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
});

app.get('/getUser/', async (req, res) => {
  try {
    if (isNaN(Number(req.query.userId))) {
      res.status(400).send('Please specify the user id');
      return;
    }
    const user = await db.getUser(req.query.userId);
    if (user === null) {
      res.status(404).send("User not found");
    } else {
      res.send(user);
    }
  } catch (e) {
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
});

app.get('/getUserTokenBalance', async (req, res) => {
  res.send('get user token balance');
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
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
});

app.get('/getFundsWallet', async (req, res) => {
  try {
    const fundsWallet = wallet.parseWallet(wallet.getFundsWallet());
    res.send(fundsWallet);
    logger.log('LOG', 'FUNDS_WALLET: details retrieved');
  } catch (e) {
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
});

app.get('/getWalletLogs', async (req, res) => {
  res.send(db.getWalletLogs());
});

app.post('/toggleUserSpecialApproval', async (req, res) => {
  try {
    const userId = req.body.userId;
    const userWallet = wallet.parseWallet(wallet.getChildWallet(userId))
    const fundsWallet = wallet.parseWallet(wallet.getFundsWallet());
    const strykingContract = await blockchain.strykingContract();
    const currentNonce = await strykingContract.specialAllowance('0x' + userWallet.address, '0x' + fundsWallet.address);
    if (isNaN(Number(currentNonce))) throw new Error('currentNonce is not a number');
    const approvalNonce = Number(currentNonce) + 1;
    const nonceHash = keccak256(approvalNonce);
    const userSignedNonce = blockchain.ethSign(
      ethUtils.toBuffer(keccak256(approvalNonce)),
      Buffer.from(userWallet.privateKey, 'hex')
    );
    const msg = await strykingContract.specialApprove(approvalNonce, nonceHash, userSignedNonce);
    logger.log('INFO', `toggleUserSpecialApproval called with response: ${msg}`, {
      userId,
      userWallet: userWallet.address,
      fundsWallet: fundsWallet.address
    });
    res.send(msg);
  } catch (e) {
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
});

app.get('/userApproval', async (req, res) => {
  try {
    const userId = req.query.userId
    const userWallet = wallet.parseWallet(wallet.getChildWallet(userId));
    const fundsWallet = wallet.parseWallet(wallet.getFundsWallet());
    const strykingContract = await blockchain.strykingContract();
    const msg = await strykingContract.specialAllowance('0x' + userWallet.address, '0x' + fundsWallet.address);
    logger.log('INFO', `userApproval called with response: ${msg}`);
    res.send(msg);
  } catch(e) {
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message)
  }
});

app.post('/transferTokensFromUser', async (req, res) => {
  try {
    let from;
    if (req.body.from) {
      from = req.body.from;
    } else if (req.body.userId) {
      from = '0x' + wallet.parseWallet(wallet.getChildWallet(req.body.userId)).address;
    } else {
      throw new Error('userId or from fields not specified');
    }
    if (typeof from !== 'string') throw new Error('from is not hex address');
    if (from.slice(0,2) !== '0x') throw new Error('from should start with 0x');
    const to = req.body.to;
    const amount = req.body.amount;
    if (typeof to !== 'string') throw new Error('to needs to be a hex string');
    if (to.slice(0, 2) !== '0x') throw new Error('to should start with 0x');
    if (typeof amount !== 'number') throw new Error('amount should be a number');
    const strykingContract = await blockchain.strykingContract();
    const msg = await strykingContract.transferFrom('0x' + from, to, Math.pow(10, 18) * amount);
    logger.log('INFO', `trasnferTokens called with response: ${msg}`, {
      from,
      to,
      amount
    });
    res.send(msg);
  } catch (e) {
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
});

app.post('/transferTokensFromFunds', async (req, res) => {
  try {
    let to;
    if (req.body.to) {
      to = req.body.to;
    } else if (req.body.userId) {
      to = '0x' + wallet.parseWallet(wallet.getChildWallet(req.body.userId)).address;
    } else {
      throw new Error('userId or to fields not specified');
    }
    if (typeof to !== 'string') throw new Error('to is not hex address');
    if (to.slice(0,2) !== '0x') throw new Error('to should start with 0x');
    const amount = req.body.amount;
    if (typeof amount !== 'number') throw new Error('amount is not a number');
    const strykingContract = blockchain.strykingContract();
    const msg = await strykingContract.transfer(to, amount * Math.pow(10, 18));
    logger.log('INFO', `transferTokensFromFunds called with response: ${msg}`, {
      to,
      amount
    });
    res.send(msg);
  } catch (e) {
    logger.log('ERROR', e.message, e);
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
    logger.log('ERROR', e.message, e);
    res.status(500).send(e.message);
  }
})

app.listen(3000);
