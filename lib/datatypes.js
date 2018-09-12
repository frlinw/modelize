import {
  has,
  isNull,
  isBoolean,
  isArray,
  isObject,
  isFloat,
  isInteger,
  isString,
  isUrl,
  isEmail,
  isFile,
  isIp,
  isEmpty
} from './utils/validation.js'
import {
  generateUUID,
  formatPhone,
  formatDateOnly
} from './utils/formatting.js'


// Type & format validation
export default (options) => ({
  // Date types required access to user custom date methods
  DATE: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => options.isDate(value),
    stringify: (value) => {
      if (options.isDate(value)) {
        value = options.toDate(value)
      }

      return formatDateOnly(value)
    },
    parse: (value) => {
      if (isString(value) && !isEmpty(value)) {
        return options.parseDate(value)
      } else if (options.isDate(value)) {
        return value
      } else {
        return null
      }
    }
  },
  DATETIME: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => options.isDate(value),
    stringify: (value) => {
      if (options.isDate(value)) {
        value = options.toDate(value)
      }

      return value.toISOString()
    },
    parse: (value) => {
      if (isString(value) && !isEmpty(value)) {
        return options.parseDate(value)
      } else if (options.isDate(value)) {
        return value
      } else {
        return null
      }
    }
  },
  // Static types
  STRING: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  UUID: {
    defaultValue: generateUUID,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    stringify: (value) => value,
    parse: (value) => value.replace(/-/g, '')
  },
  EMAIL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isEmail(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  PHONE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    stringify: (value) => formatPhone(value),
    parse: (value) => value
  },
  URL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isUrl(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  FILE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isFile(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  IP: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isIp(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  BOOLEAN: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isBoolean(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  INTEGER: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isInteger(value) && value >= 0,
    stringify: (value) => value,
    parse: (value) => Number.parseInt(value) || null
  },
  FLOAT: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => (isInteger(value) || isFloat(value)) && value >= 0,
    stringify: (value) => value,
    parse: (value) => Number.parseFloat(value) || null
  },
  ADDRESS: {
    defaultValue: () => ({
      street: '',
      postcode: '',
      city: '',
      latitude: '',
      longitude: ''
    }),
    isBlank: (value) => value.street === '' && value.postcode === '' && value.city === '',
    isValid: (value) => isObject(value) && has(value, 'street') && has(value, 'postcode') && has(value, 'city'),
    stringify: (value) => value,
    parse: (value) => value
  },
  OBJECT: {
    defaultValue: () => ({}),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  ARRAY: {
    defaultValue: () => [],
    isBlank: (value) => value.length === 0,
    isValid: (value) => isArray(value),
    stringify: (value) => value,
    parse: (value) => value
  },
  COLLECTION: (Model) => ({
    defaultValue: () => Model.buildCollection(),
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list),
    stringify: (value) => Model._stringify(value),
    parse: (value) => new Model(value)
  }),
  REFERENCE: (Model) => ({
    defaultValue: () => Model.buildRaw(),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    stringify: (value) => Model._stringify(value),
    parse: (value) => new Model(value)
  }),
  EXTENSION: (Model) => ({
    defaultValue: (primaryKey) => Model.buildRaw({ primaryKey: primaryKey }),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    stringify: (value) => Model._stringify(value),
    parse: (value) => new Model(value)
  })
})
