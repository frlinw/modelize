import {
  has,
  isNull,
  isBoolean,
  isArray,
  isObject,
  isNumber,
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
    beforeBuild: (value) => {
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
    beforeBuild: (value) => {
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
    beforeBuild: (value) => value
  },
  UUID: {
    defaultValue: generateUUID,
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    beforeSave: (value) => value.replace(/([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})/, '$1-$2-$3-$4-$5'),
    beforeBuild: (value) => value.replace(/-/g, '')
  },
  EMAIL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isEmail(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  PHONE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value),
    beforeSave: (value) => formatPhone(value),
    beforeBuild: (value) => value
  },
  URL: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isUrl(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  FILE: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isFile(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  IP: {
    defaultValue: '',
    isBlank: (value) => value === '',
    isValid: (value) => isString(value) && isIp(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  BOOLEAN: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isBoolean(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  INTEGER: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isInteger(value) && value >= 0,
    beforeSave: (value) => value,
    beforeBuild: (value) => {
      const parsedValue = Number.parseInt(value)

      return (
        isNumber(parsedValue)
          ? parsedValue
          : null
      )
    }
  },
  FLOAT: {
    defaultValue: null,
    isBlank: (value) => isNull(value),
    isValid: (value) => isNumber(value) && value >= 0,
    beforeSave: (value) => value,
    beforeBuild: (value) => {
      const parsedValue = Number.parseFloat(value)

      return (
        isNumber(parsedValue)
          ? parsedValue
          : null
      )
    }
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
    beforeBuild: (value) => value
  },
  OBJECT: {
    defaultValue: () => ({}),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  ARRAY: {
    defaultValue: () => [],
    isBlank: (value) => value.length === 0,
    isValid: (value) => isArray(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  BELONGSTO: (Model) => ({
    defaultValue: () => Model.buildRaw(),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    beforeSave: (value) => Model._beforeSave(value),
    beforeBuild: (value) => new Model(value)
  }),
  HASONE: (Model) => ({
    defaultValue: (primaryKey) => Model.buildRaw({ primaryKey: primaryKey }),
    isBlank: (value) => isNull(value),
    isValid: (value) => isObject(value) && has(value, Model.primaryKey),
    beforeSave: (value) => Model._beforeSave(value),
    beforeBuild: (value) => new Model(value)
  }),
  HASMANY: (Model) => ({
    defaultValue: () => Model.buildCollection(),
    isBlank: (value) => value.list.length === 0,
    isValid: (value) => has(value, 'list') && isArray(value.list),
    beforeSave: (value) => Model._beforeSave(value),
    beforeBuild: (value) => new Model(value)
  })
})


export default DataTypes
