const db = require('./db.js');

module.exports = (function(){

  const _private = {
    logLevel: ['ERROR', 'INFO', 'WARN', 'FATAL', 'LOG'],
    log: (severity, message, data) => {
      if (_private.logLevel.indexOf(severity) === -1) severity = 'LOG'
      if (message === undefined) message = '';
      try {
        if (typeof data === 'object') data = JSON.stringify(data);
        if (typeof data !== 'string') data = data.toString(); 
      } catch (e) {
        data = 'data could not be logged';
      }
      return db.createLog(severity, message, data)
    }
  }

  const _public = {
    log: _private.log
  }

  return _public;
})();