const express = require('express');
const app = express();
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
app.listen(3000);
