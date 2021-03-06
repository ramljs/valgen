'use strict';
const {coerceToBoolean, coerceToNumber, coalesce, mapDistinct} = require('putil-varhelpers');
const {AnyFactory} = require('./AnyFactory');

const MinValues = {
  int64: null,
  bigint: null,
  int32: -2147483648,
  int: -9007199254740991,
  int16: -32768,
  int8: -128,
  long: 0,
  uint64: 0,
  uint32: 0,
  uint16: 0,
  uint8: 0
};

const MaxValues = {
  int64: null,
  bigint: null,
  int32: 2147483647,
  int: 9007199254740991,
  int16: 32767,
  int8: 127,
  long: null,
  uint64: null,
  uint32: 4294967295,
  uint16: 65535,
  uint8: 255
};

const IntegerFormats = ['int64', 'bigint', 'int32', 'int', 'int16', 'int8',
  'uint64', 'uint32', 'uint16', 'uint8', 'long'];
const NumberFormats = [...IntegerFormats, 'float', 'double'];

class NumberFactory extends AnyFactory {

  constructor(options) {
    super();
    this.format = options && options.format;
  }

  normalizeCompileOptions(options) {
    const o = super.normalizeCompileOptions(options);
    o.strictFormat = coerceToBoolean(options.strictFormat);
    o.coerceTypes = coerceToBoolean(options.coerceTypes);
    return o;
  }

  normalizeAttribute(attr, v) {
    switch (attr) {
      case 'default':
      case 'minimum':
      case 'maximum':
      case 'multipleOf':
        return coerceToNumber(v);
      case 'enum':
        if (!Array.isArray(v))
          throw new TypeError(`"${v}" is not an array value.`);
        return mapDistinct(v, coerceToNumber);
      case 'format': {
        if (v && !NumberFormats.includes(v))
          throw new TypeError(`"${v}" is not a valid number format identifier.`);
        return v;
      }
      case 'strictFormat':
        return coerceToBoolean(v);
    }
  }

  _generateValidationCode(dataType, options) {
    const data = super._generateValidationCode(dataType, options);
    const format = coalesce(dataType.get('format'), dataType.options.format, this.format);
    const bigFormat = ['bigint', 'int64', 'uint64', 'long'].includes(format);
    /* istanbul ignore next */
    if (bigFormat && !global.BigInt)
      throw new Error('Your JavaScript version does not support BigInt values');
    const intFormat = IntegerFormats.includes(format);

    const strictFormat = coalesce(options.strictFormat,
        dataType.get('strictFormat'), dataType.options.strictFormat);
    let minimum = coalesce(dataType.get('minimum'), dataType.options.minimum,
        MinValues[format]);
    let maximum = coalesce(dataType.get('maximum'), dataType.options.maximum,
        MaxValues[format]);
    const multipleOf = coalesce(dataType.get('multipleOf'), dataType.options.multipleOf);

    data.variables.errorMsg1 = 'Value must be ' +
        (intFormat ? 'an integer' : 'a number') +
        (strictFormat ? '' : ' or ' +
            (intFormat ? 'integer' : 'number') +
            ' formatted string');

    data.code += `
    if (!((typeof value === 'number' || typeof value === 'bigint')`;
    if (!strictFormat)
      data.code += ` || (typeof value === 'string' && value)`;
    data.code += `)
    ) 
      return typeCheck ? Failed : ctx.logError({
          message: errorMsg1,
          errorType: 'invalid-data-type'
      });
`;

    data.code += `
    let n;
    try {
        n = ${bigFormat ? 'BigInt(value)' : 'Number(value)'};
    } catch (e) {
        return typeCheck ? Failed : ctx.logError({
            message: errorMsg1,
            errorType: 'invalid-data-type'
        });
    }

    if (!(typeof n === 'bigint' || !isNaN(n))) {
        return typeCheck ? Failed : ctx.logError({
            message: errorMsg1,
            errorType: 'invalid-data-type'
        });
    }
`;
    if (intFormat)
      data.code += `
    if (typeof n === 'number' && (n - Math.floor(n) > 0)) {
        return typeCheck ? Failed : ctx.logError({
            message: errorMsg1,
            errorType: 'invalid-data-type'
        });
    }
`;

    data.code += `    
    if (typeCheck) return;`;

    if (multipleOf)
      data.code += `
    const c = typeof n === 'bigint' ?
        n / BigInt(${multipleOf}) * BigInt(${multipleOf}) :
        Math.trunc(n / ${multipleOf}) * ${multipleOf};
    if (n !== c)
        return ctx.logError({
            message: 'Numeric value must be multiple of ${multipleOf}',
            errorType: 'invalid-value'
        });`;
    if (minimum != null)
      data.code += `
    if (n < ${minimum})
        return ctx.logError({
            message: 'Minimum accepted value is ${minimum}, actual ' + n,
            errorType: 'range-error',
            min: ${minimum},
            actual: n
        });`;
    if (maximum)
      data.code += `
    if (n > ${maximum})
        return ctx.logError({
            message: 'Maximum accepted value is ${maximum}, actual ' + n,
            errorType: 'range-error',
            max: ${maximum},
            actual: n
        });`;
    if (options.coerceTypes)
      data.code += '\n    value = n;';
    return data;
  }
}

module.exports = {
  NumberFactory,
  NumberFormats,
  IntegerFormats,
  MinValues,
  MaxValues
};
