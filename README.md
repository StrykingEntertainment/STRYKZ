This is an API server that does the following things:
  - Generate wallets for users
  - Interacts with the ethereum blockchain

secrets.json and private.json are not included in version control. get it from someone.

To start it:
  - npm install
  - npm start

There's also the solidity contract for the Stryking token. To deploy it, go to the solidity folder and run "truffle migrate --network=ropsten"