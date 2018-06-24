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
  if (isNaN(Number(req.query.index))) {
    res.status(400).send('Please specify the child index');
  } else {
    const childWallet = wallet.getChildWallet(req.query.index);
    res.send(wallet.parseWallet(childWallet));
  }
});

app.get('/getUser/', async (req, res) => {
  if (isNaN(Number(req.query.id))) {
    res.status(400).send('Please specify the user id');
    return;
  }
  const user = await db.getUser(req.query.id);
  if (user === null) {
    res.status(404).send("User not found");
  } else {
    res.send(user);
  }
});

app.get('/getUserTokenBalance', async (req, res) => {
  res.send('get user token balance');
});

app.post('/generateUser', async (req, res) => {
  const name = req.body.name;
  if (name === undefined) {
    res.status(400).send('Please specify the name');
  } else {
    const newUser = await db.generateUser(name);
    res.send(newUser);
  }
});

app.get('/getFundsWallet', async (req, res) => {
  const fundsWallet = wallet.getFundsWallet();
  res.send(wallet.parseWallet(fundsWallet));
  logger.log('LOG', 'FUNDS_WALLET: details retrieved')
});

app.get('/getWalletLogs', async (req, res) => {
  res.send(db.getWalletLogs());
});

app.post('/tokenTransfer', async (req, res) => {
  res.send('fund tokens');
});

app.post('/tokenTransferFrom', async (req, res) => {
  res.send('token transfer from');
});

app.post('/toggleUserSpecialApproval', async (req, res) => {
  // if (req.body.userId === undefined) {
  //   res.status(400).send('Please specify the userId');
  //   return;
  // }
  // const userId = req.body.userId;
  // try {
  //   res.send(await blockchain.toggleUserSpecialApproval(userId));
  // } catch (e) {
  //   console.log(e);
  //   res.status(500).send(e);
  // }
  const userId = req.body.userId;
  const userWallet = wallet.parseWallet(await wallet.getChildWallet(userId))
  const fundsWallet = wallet.parseWallet(await wallet.getFundsWallet());
  try {
    const strykingContract = await blockchain.strykingContract();
    const currentNonce = await strykingContract.specialAllowance('0x' + userWallet.address, '0x' + fundsWallet.address);
    if (isNaN(Number(currentNonce))) throw new Error('currentNonce is not a number');
    const approvalNonce = Number(currentNonce) + 1;
    const nonceHash = keccak256(approvalNonce);
    const userSignedNonce = blockchain.ethSign(
      ethUtils.toBuffer(keccak256(approvalNonce)),
      Buffer.from(userWallet.privateKey, 'hex')
    );
    res.send(await strykingContract.specialApprove(approvalNonce, nonceHash, userSignedNonce));
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

app.get('/logs', async (req, res) => {
  if (req.query.id) {
    res.send(await db.getLogById(req.query.id));
  } else {
    res.send(await db.getLogs());
  }
})

app.listen(3000);
