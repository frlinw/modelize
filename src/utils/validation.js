import moment from '@/node_modules/moment/moment.js'


/**
* Wrapper for object prototype hasOwnProperty method
* because hasOwnProperty may be shadowed by properties on the object
* @param {Object} object - object to check
* @param {String} key - key to find in the object
*/
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

// Primitives types
const isNull = (value) => value === null
const isEmpty = (value) => value === null || value === undefined || value === ''
const isArray = (value) => Array.isArray(value) === true
const isObject = (value) => typeof value === 'object' && !isNull(value) && !isArray(value)
const isFunction = (value) => typeof value === 'function'
const isString = (value) => typeof value === 'string'
const isBoolean = (value) => value === true || value === false

// Date
const isDate = (value) => value instanceof Date && !isNaN(value.valueOf())

// Numbers
const isNumber = (value) => Number(value) === value && Number.isFinite(value)
const isInteger = (value) => isNumber(value) && Number.isInteger(value)
const isFloat = (value) => isNumber(value) && value % 1 !== 0

// Strings
const isEmail = (value) => /[a-zA-Z0-9._-]+@[a-zA-Z0-9-]+\.[a-zA-Z]+/.test(value)
const isUrl = (value) => /^https?:\/\/[a-zA-Z0-9-_.?=&]/.test(value)
const isBase64 = (value) => value.includes('data:') && value.includes(';base64')
const isFile = (value) => isUrl(value) || isBase64(value)
const isIp = (value) => {
  const blocks = value.split('.')

  if (blocks.length === 4) {
    return blocks.every(block => (
      !isNaN(block) &&
      parseInt(block, 10) >= 0 &&
      parseInt(block, 10) <= 255
    ))
  }

  return false
}


export {
  has,
  isNull,
  isEmpty,
  isArray,
  isObject,
  isFunction,
  isString,
  isBoolean,
  isDate,
  isNumber,
  isInteger,
  isFloat,
  isEmail,
  isUrl,
  isBase64,
  isFile,
  isIp
}
