const db = require('./db.js');

module.exports = (function(){

  const _private = {
    logLevel: ['ERROR', 'INFO', 'WARN', 'FATAL', 'LOG'],
    log: (severity, message, data) => {
      if (_private.logLevel.indexOf(severity) === -1) throw new Error('log severity has no matching logLevel');
      if (message === undefined) throw new Error('log message cannot be empty');
      if (typeof data === 'object') data = JSON.stringify(data);
      if (typeof data !== 'string') data = data.toString(); 
      return db.createLog(severity, message, data)
    }
  }

  const _public = {
    log: _private.log
  }

  return _public;
})();