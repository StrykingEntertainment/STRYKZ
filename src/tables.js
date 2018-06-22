var Sequelize = require('sequelize');

module.exports = function(sequelize) {
  if (!(sequelize instanceof Sequelize)) throw new Error("DB connection error");
  const _private = {
    User: sequelize.define(
      'user', {
        name: {
          type: Sequelize.STRING,
        },
        publicKey: {
          type: Sequelize.STRING,
        },
        index: {
          type: Sequelize.INTEGER,
          unique: true,
        }
      }
    ),
    Log: sequelize.define(
      'log', {
        severity: {
          type: Sequelize.STRING,
        },
        message: {
          type: Sequelize.STRING,
        },
        data: {
          type: Sequelize.TEXT,
        }
      }
    )
  }

  const _public = {};

  for (var key in _private) {
    ((key) => {
      _public[key] = new Promise((resolve, reject) => {
        _private[key].sync()
        .then(() => {
          resolve(_private[key]);
        })
        .catch((err) => {
          reject(err);
        })
      })
    })(key)
  }

  return _public;
}
