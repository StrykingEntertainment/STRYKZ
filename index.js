const express = require('express');
const app = express();
const ethUtils = require('ethereumjs-util');
app.use(express.json());
const db = require('./src/db.js');
const wallet = require('./src/wallet.js');

app.get('/', (req, res) => res.send('Stryking Eth Server'));
app.get('/getUserCount', async (req, res) => res.send((await db.getUserCount()).toString()));
app.get('/getChildWallet', async (req, res) => {
  if (isNaN(Number(req.query.index))) {
    res.status(400).send('Please specify the child index');
  } else {
    const childWallet = wallet.getChildWallet(req.query.index);
    const privateKey = childWallet.getPrivateKey().toString('hex');
    const publicKey = childWallet.getPublicKey().toString('hex');
    debugger;
    const address = ethUtils.pubToAddress(Buffer.from(childWallet.getPublicKey())).toString('hex');
    const msg = { index: req.query.index, privateKey, publicKey, address };
    res.send(msg);
  }
});
app.get('/getUser/', async (req, res) => {
  if (isNaN(Number(req.query.id))) {
    res.status(400).send('Please specify the user id');
  }
  const user = await db.getUser(req.query.id);
  if (user === null) {
    res.status(404).send("User not found");
  } else {
    res.send(user);
  }
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
app.listen(3000);
