module.exports = (function(){
  let _private;

  _private = {
    isHex: (input) => {
      const hexRegex = /^([0-9a-fA-F]*)$/;
      const res = hexRegex.exec(input);
      if (res === null) return false;
      return res[0] === res[1]
    },
    isEthHex: (input) => {
      if (typeof input !== 'string') return false;
      var prefix = input.slice(0, 2);
      if (prefix !== '0x') return false;
      var hex = input.slice(2);
      return _private.isHex(hex);
    },
    isInteger: (input) => {
      return Number.isInteger(input);
    },
    isNumber: (input) => {
      return typeof input === 'number' && !isNaN(input);
    },
    toNumber: (input) => {
      if (input === undefined || input === null || input === '') {
        return NaN;
      } else {
        return Number(input);
      }
    }
  }

  const _public = {
    isHex: _private.isHex,
    isEthHex: _private.isEthHex,
    isInteger: _private.isInteger,
    isNumber: _private.isNumber,
    toNumber: _private.toNumber
  }

  return _public;
})();