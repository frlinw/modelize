import {
  has,
  isNull,
  isBoolean,
  isArray,
  isObject,
  isFloat,
  isInteger,
  isDate,
  isString,
  isUrl,
  isEmail,
  isFile,
  isIp
} from './utils/validation.js'
import {
  generateUUID,
  sanitizePhone
} from './utils/formatting.js'


// Type & format validation
export default {
  STRING: {
    default: '',
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value)
  },
  UUID: {
    default: generateUUID,
    formatForServer: (value) => value,
    formatForClient: (value) => value.replace(/-/g, ''),
    isBlank: (value) => value === '',
    isValid: (value) => isString(value)
  },
  EMAIL: {
    default: '',
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isEmail(value)
  },
  PHONE: {
    default: '',
    formatForServer: (value) => sanitizePhone(value),
    formatForClient: (value) => value,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value)
  },
  URL: {
    default: '',
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isUrl(value)
  },
  FILE: {
    default: '',
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isFile(value)
  },
  IP: {
    default: '',
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isIp(value)
  },
  BOOLEAN: {
    default: null,
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => isNull(value),
    isValid: (value) => isBoolean(value)
  },
  INTEGER: {
    default: null,
    formatForServer: (value) => value,
    formatForClient: (value) => Number.parseInt(value) || value,
    isBlank: (value) => isNull(value),
    isValid: (value) => isInteger(value) && value >= 0
  },
  FLOAT: {
    default: null,
    formatForServer: (value) => value,
    formatForClient: (value) => Number.parseFloat(value) || value,
    isBlank: (value) => isNull(value),
    isValid: (value) => (isInteger(value) || isFloat(value)) && value >= 0
  },
  DATE: {
    default: null,
    formatForServer: (value) => (
      isDate(value)
        ? value.toISOString().split('T')[0]
        : value
    ),
    formatForClient: (value) => (
      isString(value)
        ? new Date(value)
        : value
    ),
    isBlank: (value) => isNull(value),
    isValid: (value) => isDate(value)
  },
  DATETIME: {
    default: null,
    formatForServer: (value) => (
      isDate(value)
        ? value.toISOString()
        : value
    ),
    formatForClient: (value) => (
      isString(value)
        ? new Date(value)
        : value
    ),
    isBlank: (value) => isNull(value),
    isValid: (value) => isDate(value)
  },
  ADDRESS: {
    default: () => ({
      street: '',
      postcode: '',
      city: '',
      latitude: '',
      longitude: ''
    }),
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value.street === '' && value.postcode === '' && value.city === '',
    isValid: (value) => isObject(value) && has(value, 'street') && has(value, 'postcode') && has(value, 'city')
  },
  OBJECT: {
    default: () => ({}),
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value)
  },
  ARRAY: {
    default: () => [],
    formatForServer: (value) => value,
    formatForClient: (value) => value,
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list)
  },
  COLLECTION: (Model) => ({
    default: () => [],
    formatForServer: (value) => Model.formatForServer(value),
    formatForClient: (value) => new Model(value),
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list)
  }),
  REFERENCE: (Model) => ({
    default: () => Model.buildRaw(),
    formatForServer: (value) => Model.formatForServer(value),
    formatForClient: (value) => new Model(value),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey)
  }),
  EXTENSION: (Model) => ({
    default: (pk) => Model.buildRaw({ pk: pk }),
    formatForServer: (value) => Model.formatForServer(value),
    formatForClient: (value) => new Model(value),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey)
  })
}
