import {
  has,
  isBoolean,
  isArray,
  isObject,
  isDate,
  isNumber,
  isInteger,
  isString,
  isUrl,
  isEmail,
  isFile,
  isIp
} from './utils/validation.js'
import {
  parseDate,
  formatDateOnly,
  formatPhone,
  generateUUID
} from './utils/formatting.js'


// Type & format validation
const DataTypes = {
  // Date types required access to user custom date methods
  DATE: {
    defaultValue: null,
    isBlank: (value) => value === null,
    isValid: (value) => isDate(value),
    beforeSave: (value) => {
      if (isDate(value)) {
        return formatDateOnly(value)
      } else {
        return null
      }
    },
    beforeBuild: (value) => {
      if (isString(value) && value !== '') {
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
    isBlank: (value) => value === null,
    isValid: (value) => isDate(value),
    beforeSave: (value) => {
      if (isDate(value)) {
        return value.toISOString()
      } else {
        return null
      }
    },
    beforeBuild: (value) => {
      if (isString(value) && value !== '') {
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
    isBlank: (value) => value === null,
    isValid: (value) => isBoolean(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  INTEGER: {
    defaultValue: null,
    isBlank: (value) => value === null,
    isValid: (value) => isInteger(value) && value >= 0,
    beforeSave: (value) => value,
    beforeBuild: (value) => {
      const parsedValue = Number.parseInt(value)

      if (!isNumber(parsedValue)) {
        return null
      }

      return parsedValue
    }
  },
  FLOAT: {
    defaultValue: null,
    isBlank: (value) => value === null,
    isValid: (value) => isNumber(value) && value >= 0,
    beforeSave: (value) => value,
    beforeBuild: (value) => {
      const parsedValue = Number.parseFloat(value)

      if (!isNumber(parsedValue)) {
        return null
      }

      return parsedValue
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
    isBlank: (value) => value.street === '' || value.postcode === '' || value.city === '',
    isValid: (value) => isObject(value) && has(value, 'street') && has(value, 'postcode') && has(value, 'city'),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  OBJECT: {
    defaultValue: () => ({}),
    isBlank: (value) => value === null,
    isValid: (value) => isObject(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  ARRAY: {
    defaultValue: () => ([]),
    isBlank: (value) => value.length === 0,
    isValid: (value) => isArray(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  HASMANY: (Model) => ({
    defaultValue: () => ([]),
    isBlank: (value) => value.isEmpty(),
    isValid: (value) => value instanceof Model && value.isCollection() && isArray(value.items()),
    beforeSave: (value) => Model._beforeSave(value),
    beforeBuild: (value) => new Model(value),
    // Association
    model: Model,
    association: 'HASMANY'
  }),
  HASONE: (Model) => ({
    defaultValue: (primaryKey) => Model._buildRawItem({ primaryKey: primaryKey }),
    isBlank: (value) => value === null,
    isValid: (value) => value instanceof Model && has(value, Model.primaryKeyFieldname),
    beforeSave: (value) => Model._beforeSave(value),
    beforeBuild: (value) => new Model(value),
    // Association
    model: Model,
    association: 'HASONE'
  }),
  BELONGSTO: (Model) => ({
    defaultValue: () => Model._buildRawItem(),
    isBlank: (value) => value === null,
    isValid: (value) => value instanceof Model && has(value, Model.primaryKeyFieldname),
    beforeSave: (value) => Model._beforeSave(value),
    beforeBuild: (value) => new Model(value),
    // Association
    model: Model,
    association: 'BELONGSTO'
  })
}


export default DataTypes
