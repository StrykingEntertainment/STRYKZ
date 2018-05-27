const express = require('express');
const app = express();
app.use(express.json());
const db = require('./src/db.js');

app.get('/getUserCount', async (req, res) => res.send((await db.getUserCount()).toString()));
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
