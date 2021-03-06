'use strict';
const {AnyFactory} = require('./AnyFactory');

class NilFactory extends AnyFactory {

  normalizeAttribute(attr, v) {
  }

  _generateValidationCode(dataType, options) {
    const data = super._generateValidationCode(dataType, options);
    data.code = '    if (value === undefined) value = null;' + data.code + `
    return typeCheck ? Failed : ctx.logError({
        message: 'Value must be null',
        errorType: 'invalid-data-type'
    }); `;
    return data;
  }
}

module.exports = {NilFactory};
