This is an API server that does the following things:
  - Generate wallets for users
  - Interacts with the ethereum blockchain

secrets.json and private.json are not included in version control. get it from someone.

To start it:
  - npm install
  - npm start

There's also the solidity contract for the Stryking token. To deploy it, go to the solidity folder and run "truffle migrate --network=ropsten"



To call specialApprove, do the following:
  - define keccak256 (note: this behaves differently from web3.sha3)
```
function keccak256(...args) {
  args = args.map(arg => {
    if (typeof arg === 'string') {
      if (arg.substring(0, 2) === '0x') {
          return arg.slice(2)
      } else {
          return web3.toHex(arg).slice(2)
      }
    }

    if (typeof arg === 'number') {
      return leftPad((arg).toString(16), 64, 0)
    } else {
      return ''
    }
  })

  args = args.join('')

  return web3.sha3(args, { encoding: 'hex' })
}
```
  - _ethSignedMessageHash = keccak256(NONCE)
  - _sig = web3.eth.sign(web3.eth.accounts[0], keccak256(NONCE), (e,r)=>console.log(e,r))
  - call specialApprove(NONCE, _ethSignedMessageHash, _sig)
  - verify that specialAllowance is true
  - verify that transfers can be done