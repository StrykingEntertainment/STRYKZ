const express = require('express');
const app = express();
const ethUtils = require('ethereumjs-util');
app.use(express.json());
const db = require('./src/db.js');
const wallet = require('./src/wallet.js');
const logger = require('./src/logger.js');
const blockchain = require('./src/blockchain.js');
const web3 = require('./src/web3.js')


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

app.get('/test', async (req, res) => {
  const userId = 1;
  const userWallet = wallet.parseWallet(wallet.getChildWallet(userId));
  const rawTx = await blockchain._generateRawTxForApprovalToggle(userId);
  console.log(rawTx);
  const signedTx = blockchain._signRawTx(rawTx, Buffer.from(userWallet.privateKey, 'hex'));
  const serializedTx = blockchain._serializeSignedTx(signedTx);
  web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
    if (err) {
      throw new Error(err);
    } else {
      res.send(hash);
    }
  });
});

app.get('/logs', async (req, res) => {
  if (req.query.id) {
    res.send(await db.getLogById(req.query.id));
  } else {
    res.send(await db.getLogs());
  }
})

app.listen(3000);
