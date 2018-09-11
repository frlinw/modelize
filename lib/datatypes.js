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
    formatForServer: (value) => {
      if (options.isDate(value)) {
        value = options.toDate(value)
      }

      return formatDateOnly(value)
    },
    formatForClient: (value) => {
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
    formatForServer: (value) => {
      if (options.isDate(value)) {
        value = options.toDate(value)
      }

      return value.toISOString()
    },
    formatForClient: (value) => {
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
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  UUID: {
    defaultValue: generateUUID,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value.replace(/-/g, '')
  },
  EMAIL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isEmail(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  PHONE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    formatForServer: (value) => formatPhone(value),
    formatForClient: (value) => value
  },
  URL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isUrl(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  FILE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isFile(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  IP: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isIp(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  BOOLEAN: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isBoolean(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  INTEGER: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isInteger(value) && value >= 0,
    formatForServer: (value) => value,
    formatForClient: (value) => Number.parseInt(value) || null
  },
  FLOAT: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => (isInteger(value) || isFloat(value)) && value >= 0,
    formatForServer: (value) => value,
    formatForClient: (value) => Number.parseFloat(value) || null
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
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  OBJECT: {
    defaultValue: () => ({}),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  ARRAY: {
    defaultValue: () => [],
    isBlank: (value) => value.length === 0,
    isValid: (value) => isArray(value),
    formatForServer: (value) => value,
    formatForClient: (value) => value
  },
  COLLECTION: (Model) => ({
    defaultValue: () => Model.buildCollection(),
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list),
    formatForServer: (value) => Model._formatForServer(value),
    formatForClient: (value) => new Model(value)
  }),
  REFERENCE: (Model) => ({
    defaultValue: () => Model.buildRaw(),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    formatForServer: (value) => Model._formatForServer(value),
    formatForClient: (value) => new Model(value)
  }),
  EXTENSION: (Model) => ({
    defaultValue: (primaryKey) => Model.buildRaw({ primaryKey: primaryKey }),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    formatForServer: (value) => Model._formatForServer(value),
    formatForClient: (value) => new Model(value)
  })
})
