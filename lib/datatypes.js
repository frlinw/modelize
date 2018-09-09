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
  formatPhone,
  formatDateOnly
} from './utils/formatting.js'


// Type & format validation
export default {
  STRING: {
    default: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  UUID: {
    default: generateUUID,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value.replace(/-/g, '')
  },
  EMAIL: {
    default: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isEmail(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  PHONE: {
    default: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    formatForServer: (value) => formatPhone(value),
    formatForClient: (value) => value
  },
  URL: {
    default: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isUrl(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  FILE: {
    default: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isFile(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  IP: {
    default: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isIp(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  BOOLEAN: {
    default: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isBoolean(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  INTEGER: {
    default: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isInteger(value) && value >= 0,
    formatForServer: (value) => value,
    formatForClient: (value) => Number.parseInt(value) || value
  },
  FLOAT: {
    default: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => (isInteger(value) || isFloat(value)) && value >= 0,
    formatForServer: (value) => value,
    formatForClient: (value) => Number.parseFloat(value) || value
  },
  DATE: {
    default: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => {
      if (isMoment(value)) {
        value = value.toDate()
      }

      return isDate(value)
    },
    formatForServer: (value) => {
      if (isMoment(value)) {
        value = value.toDate()
      }

      return formatDateOnly(value)
    },
    formatForClient: (value) => new Date(value)
  },
  DATETIME: {
    default: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => {
      if (isMoment(value)) {
        value = value.toDate()
      }

      return isDate(value)
    },
    formatForServer: (value) => {
      if (isMoment(value)) {
        value = value.toDate()
      }

      return value.toISOString()
    },
    formatForClient: (value) => new Date(value)
  },
  ADDRESS: {
    default: () => ({
      street: '',
      postcode: '',
      city: '',
      latitude: '',
      longitude: ''
    }),
    isBlank: (value) => value.street === '' && value.postcode === '' && value.city === '',
    isValid: (value) => isObject(value) && has(value, 'street') && has(value, 'postcode') && has(value, 'city'),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  OBJECT: {
    default: () => ({}),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  ARRAY: {
    default: () => [],
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  COLLECTION: (Model) => ({
    default: () => [],
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list),
    formatForServer: (value) => Model._formatForServer(value),
    formatForClient: (value) => new Model(value)
  }),
  REFERENCE: (Model) => ({
    default: () => Model.buildRaw(),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    formatForServer: (value) => Model._formatForServer(value),
    formatForClient: (value) => new Model(value)
  }),
  EXTENSION: (Model) => ({
    default: (pk) => Model.buildRaw({ pk: pk }),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    formatForServer: (value) => Model._formatForServer(value),
    formatForClient: (value) => new Model(value)
  })
}
