const express = require('express');
const app = express();
const db = require('./src/db.js');

app.get('/usercount', async (req, res) => res.send((await db.getUserCount()).toString()))
app.listen(3000);
