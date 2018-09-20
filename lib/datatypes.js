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
const DataTypes = ({ isDate, toDate, parseDate }) => ({
  // Date types required access to user custom date methods
  DATE: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isDate(value),
    beforeSave: (value) => {
      if (isDate(value)) {
        value = toDate(value)
      }

      return formatDateOnly(value)
    },
    afterFetch: (value) => {
      if (isString(value) && !isEmpty(value)) {
        return parseDate(value)
      } else if (isDate(value)) {
        return value
      } else {
        return null
      }
    }
  },
  DATETIME: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isDate(value),
    beforeSave: (value) => {
      if (isDate(value)) {
        value = toDate(value)
      }

      return value.toISOString()
    },
    afterFetch: (value) => {
      if (isString(value) && !isEmpty(value)) {
        return parseDate(value)
      } else if (isDate(value)) {
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
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  UUID: {
    defaultValue: generateUUID,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value.replace(/-/g, '')
  },
  EMAIL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isEmail(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  PHONE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    beforeSave: (value) => formatPhone(value),
    afterFetch: (value) => value
  },
  URL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isUrl(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  FILE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isFile(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  IP: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isIp(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  BOOLEAN: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isBoolean(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  INTEGER: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isInteger(value) && value >= 0,
    beforeSave: (value) => value,
    afterFetch: (value) => Number.parseInt(value) || null
  },
  FLOAT: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => (isInteger(value) || isFloat(value)) && value >= 0,
    beforeSave: (value) => value,
    afterFetch: (value) => Number.parseFloat(value) || null
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
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  OBJECT: {
    defaultValue: () => ({}),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  ARRAY: {
    defaultValue: () => [],
    isBlank: (value) => value.length === 0,
    isValid: (value) => isArray(value),
    beforeSave: (value) => value,
    afterFetch: (value) => value
  },
  COLLECTION: (Model) => ({
    defaultValue: () => Model.buildCollection(),
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list),
    beforeSave: (value) => Model._beforeSave(value),
    afterFetch: (value) => new Model(value)
  }),
  REFERENCE: (Model) => ({
    defaultValue: () => Model.buildRaw(),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    beforeSave: (value) => Model._beforeSave(value),
    afterFetch: (value) => new Model(value)
  }),
  EXTENSION: (Model) => ({
    defaultValue: (primaryKey) => Model.buildRaw({ primaryKey: primaryKey }),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    beforeSave: (value) => Model._beforeSave(value),
    afterFetch: (value) => new Model(value)
  })
})


export default DataTypes
