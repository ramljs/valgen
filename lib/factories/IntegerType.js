'use strict';
const {NumberType, IntegerFormats} = require('./NumberType');
const {coerceToInt, mapDistinct} = require('../helpers');

class IntegerType extends NumberType {

  create(options) {
    options.format = options.format || 'int32';
  }

  set(dataType, attr, v) {
    switch (attr) {
      case 'enum': {
        if (v) {
          if (!Array.isArray(v))
            throw new TypeError(`"${v}" is not an array value.`);
          dataType.enum = mapDistinct(v, coerceToInt);
        } else
          dataType.enum = undefined;
        return;
      }
      case 'format': {
        if (v && !IntegerFormats.includes(v))
          throw new TypeError(`"${v}" is not a valid integer format identifier.`);
        return dataType.format = v ||
            /* istanbul ignore next*/ 'int32';
      }
      case 'default':
      case 'minimum':
      case 'maximum':
      case 'multipleOf': {
        dataType[attr] = coerceToInt(v);
        return;
      }
    }
    super.set(dataType, attr, v);
  }

}

module.exports = {IntegerType};