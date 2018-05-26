var settings = require('../settings.json');
var secrets = require('../secrets.json');
var Sequelize = require('sequelize');

module.exports = (function(){

  var sequelize = new Sequelize(
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
  }

  const _public = {
    getUserCount: async () => {
      const User = await _private.tables.User;
      return User.count();
    }
  }

  return _public;
})()
