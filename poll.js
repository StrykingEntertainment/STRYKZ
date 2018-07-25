const request = require('request');
const db = require('./src/db.js')
const blockchain = require('./src/blockchain.js')

const retrieveTransactions = async function(timeout, next) {
  let txns = await db.getLatestTransactions(30 * 60 * 1000)
  txns = txns.map(txn => txn.dataValues)
  console.log(txns)
  const statusMapping = {}
  for (let i = 0; i < txns.length; i++) {
    let status = await blockchain.getTransactionStatus(txns[i].tx)
    if (status !== txns[i].status) {
      statusMapping[txns[i].tx] = status
      db.updateTransactionStatus(txns[i].id, status) // TODO: write this
    }
  }
  // call API endpoint
  const options = {
    uri: 'http://localhost:3333',
    method: 'POST',
    json: statusMapping
  };
  request(options, (err, res, body) => {
    if (!err && res.statusCode == 200) {
      console.log(body)
    } else {
      console.err(err, body)
    }
  })
  setTimeout(next.bind({}, timeout, next), timeout)
}

retrieveTransactions(20000, retrieveTransactions)
