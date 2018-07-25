const settings = require('../settings.json');
const secrets = require('../secrets.json');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const wallet = require('./wallet.js');
const hdWallet = wallet.hdWallet;

module.exports = (function(){

  const sequelize = new Sequelize(
    secrets.database.name,
    secrets.database_username,
    secrets.database_password,
    {
      host: secrets.database.host,
      dialect: secrets.database.dialect,
      logging: secrets.database.logging,
    }
  )

  const _private = {
    tables: require('./tables.js')(sequelize),
    getChildWallet: (index) => {
      return wallet.parseWallet(wallet.getChildWallet(index));
    }
  }

  const _public = {
    createLog: async (severity, message, data) => {
      const Log = await _private.tables.Log;
      try {
        return await Log.create({severity, message, data});
      } catch (e) {
        return e;
      }
    },
    getLogById: async (id) => {
      const Log = await _private.tables.Log;
      try {
        return await Log.findById(id);
      } catch (e) {
        return (e);
      }
    },
    getLogs: async (limit) => {
      if (limit === undefined) limit = 100;
      const Log = await _private.tables.Log;
      try {
        return await Log.findAll({
          limit,
          order: [['createdAt', 'DESC']]
        });
      } catch (e) {
        return e;
      }
    },
    getWalletLogs: async (limit) => {
      if (limit === undefined) limit = 100;
      const Log = await _private.tables.Log;
      try {
        return await Log.findAll({
          limit,
          where: {
            severity: 'LOG',
            message: {
              $like: '%' + 'WALLET' + '%'
            }
          }
        });
      } catch (e) {
        return e;
      }
    },
    getUserCount: async () => {
      const User = await _private.tables.User;
      return User.count();
    },
    getUserByIndex: async (index) => {
      const User = await _private.tables.User;
      return User.findOne({where: {index}});
    },
    getUserById: async (id) => {
      const User = await _private.tables.User;
      return User.findOne({where: {id}});
    },
    getMaxIndex: async () => {
      const User = await _private.tables.User;
      const maxIndexUser = await User.findOne({order: [['index', 'DESC']]});
      if (maxIndexUser === null) {
        return -1;
      } else {
        return maxIndexUser.index;
      }
    },
    createTransaction: async (tx) => {
      const Txn = await _private.tables.Txn;
      try {
        return await Txn.create({tx, status: 'Pending'});
      } catch (e) {
        return e;
      }
    },
    getLatestTransactions: async (ms) => {
      const Txn = await _private.tables.Txn;
      return Txn.findAll({
        where: {
          createdAt: {
            [Op.lt]: new Date(),
            [Op.gt]: new Date(new Date() - ms)
          }
        }
      })
    },
    updateTransactionStatus: async (id, status) => {
      const Txn = await _private.tables.Txn;
      const txn = await Txn.findById(id);
      txn.status = status;
      return await txn.save();
    },
    generateUser: async (name) => {
      const maxIndex = await _public.getMaxIndex();
      const currentIndex = maxIndex + 1;
      const childWallet = _private.getChildWallet(currentIndex);
      const User = await _private.tables.User;
      try {
        return await User.create({
          name,
          index: currentIndex,
          publicKey: childWallet.publicKey,
        });
      } catch (e) {
        return e;
      }
    }
  }

  return _public;
})();
