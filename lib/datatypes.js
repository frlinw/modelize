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
  isIp,
  isEmptyObject
} from './utils/validation.js'
import {
  parseDate,
  formatDateOnly,
  formatPhone,
  generateUUID
} from './utils/formatting.js'


const DataTypes = {
  //
  // String
  //

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

  //
  // Boolean
  //

  BOOLEAN: {
    defaultValue: null,
    isBlank: (value) => value === null,
    isValid: (value) => isBoolean(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },

  //
  // Number
  //

  INTEGER: {
    defaultValue: null,
    isBlank: (value) => value === null,
    isValid: (value) => isInteger(value) && value >= 0,
    beforeSave: (value) => value,
    beforeBuild: (value) => {
      const parsedValue = Number.parseInt(value)

      if (isNumber(parsedValue)) {
        return parsedValue
      } else {
        return null
      }
    }
  },
  FLOAT: {
    defaultValue: null,
    isBlank: (value) => value === null,
    isValid: (value) => isNumber(value) && value >= 0,
    beforeSave: (value) => value,
    beforeBuild: (value) => {
      const parsedValue = Number.parseFloat(value)

      if (isNumber(parsedValue)) {
        return parsedValue
      } else {
        return null
      }
    }
  },

  //
  // Date
  //

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

  //
  // Object
  //

  OBJECT: {
    defaultValue: () => ({}),
    isBlank: (value) => isEmptyObject(value),
    isValid: (value) => isObject(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },
  ADDRESS: {
    defaultValue: () => ({
      street: '',
      postcode: '',
      city: '',
      latitude: '',
      longitude: ''
    }),
    isBlank: (value) => isEmptyObject(value) || value.street === '' || value.postcode === '' || value.city === '',
    isValid: (value) => isObject(value) && has(value, 'street') && has(value, 'postcode') && has(value, 'city'),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },

  //
  // Array
  //

  ARRAY: {
    defaultValue: () => ([]),
    isBlank: (value) => value.length === 0,
    isValid: (value) => isArray(value),
    beforeSave: (value) => value,
    beforeBuild: (value) => value
  },

  //
  // Associations
  //

  HASMANY: (Model) => ({
    defaultValue: () => ([]),
    isBlank: (value) => value.isEmpty(),
    isValid: (value) => value instanceof Model && value.isCollection() && isArray(value.items()),
    beforeSave: (value) => value._beforeSave(),
    beforeBuild: (value, options) => {
      if (!value) {
        return null
      } else if (value instanceof Model) {
        return value
      } else {
        return new Model(value, options)
      }
    },
    // Association specific
    model: Model,
    association: 'HasMany'
  }),
  HASONE: (Model) => ({
    defaultValue: (primaryKey) => Model._buildRawItem({ primaryKey }),
    isBlank: (value) => value === null,
    isValid: (value) => value instanceof Model && has(value, Model.primaryKeyFieldname),
    beforeSave: (value) => {
      if (value instanceof Model) {
        return value._beforeSave()
      } else {
        return null
      }
    },
    beforeBuild: (value, options) => {
      if (!value) {
        return null
      } else if (value instanceof Model) {
        return value
      } else {
        return new Model(value, options)
      }
    },
    // Association specific
    model: Model,
    association: 'HasOne'
  }),
  BELONGSTO: (Model) => ({
    defaultValue: () => Model._buildRawItem(),
    isBlank: (value) => value === null,
    isValid: (value) => value instanceof Model && has(value, Model.primaryKeyFieldname),
    beforeSave: (value) => {
      if (value instanceof Model) {
        return value._beforeSave()
      } else {
        return null
      }
    },
    beforeBuild: (value, options) => {
      if (!value) {
        return null
      } else if (value instanceof Model) {
        return value
      } else {
        return new Model(value, options)
      }
    },
    // Association specific
    model: Model,
    association: 'BelongsTo'
  })
}


export default DataTypes
