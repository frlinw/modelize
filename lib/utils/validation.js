/**
* Wrapper for object prototype hasOwnProperty method
* because hasOwnProperty may be shadowed by properties on the object
* @param {Object} object - object to check
* @param {String} key - key to find in the object
*/
export const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

// Primitives types
export const isNull = (value) => value === null
export const isEmpty = (value) => value === null || value === undefined || value === ''
export const isArray = (value) => Array.isArray(value) === true
export const isObject = (value) => typeof value === 'object' && !isNull(value) && !isArray(value)
export const isFunction = (value) => typeof value === 'function'
export const isString = (value) => typeof value === 'string'
export const isBoolean = (value) => value === true || value === false

// Numbers
export const isNumber = (value) => Number(value) === value && Number.isFinite(value)
export const isInteger = (value) => isNumber(value) && Number.isInteger(value)
export const isFloat = (value) => isNumber(value) && value % 1 !== 0

// Strings
export const isEmail = (value) => /[a-zA-Z0-9._-]+@[a-zA-Z0-9-]+\.[a-zA-Z]+/.test(value)
export const isUrl = (value) => /^https?:\/\/[a-zA-Z0-9-_.?=&]/.test(value)
export const isBase64 = (value) => value.includes('data:') && value.includes(';base64')
export const isFile = (value) => isUrl(value) || isBase64(value)
export const isIp = (value) => {
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
