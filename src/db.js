const settings = require('../settings.json');
const secrets = require('../secrets.json');
const Sequelize = require('sequelize');
const wallet = require('./wallet.js');
const hdWallet = wallet.hdWallet;

module.exports = (function(){

  const sequelize = new Sequelize(
    settings.database.name,
    secrets.database_username,
    secrets.database_password,
    {
      host: settings.database.host,
      dialect: settings.database.dialect,
      logging: settings.database.logging,
    }
  )

  const _private = {
    tables: require('./tables.js')(sequelize),
    getChildWallet: (index) => {
      return hdWallet.deriveChild(index).getWallet();
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
    getUser: async (id) => {
      const User = await _private.tables.User;
      return User.findOne({where: {id}})
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
    generateUser: async (name) => {
      const maxIndex = await _public.getMaxIndex();
      const currentIndex = maxIndex + 1;
      const childWallet = _private.getChildWallet(currentIndex);
      const User = await _private.tables.User;
      try {
        return await User.create({
          name,
          index: currentIndex,
          publicKey: childWallet.getPublicKey().toString('hex'),
        });
      } catch (e) {
        return e;
      }
    }
  }

  return _public;
})();
