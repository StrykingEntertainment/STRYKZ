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
