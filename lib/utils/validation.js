/**
* Wrapper for object prototype hasOwnProperty method
* because hasOwnProperty may be shadowed by properties on the object
* @param {Object} object - object to check
* @param {String} key - key to find in the object
*/
function has (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

// Primitives types
function isArray (value) {
  return Array.isArray(value)
}
function isObject (value) {
  return typeof value === 'object' && value !== null && !isArray(value)
}
function isFunction (value) {
  return typeof value === 'function'
}
function isString (value) {
  return typeof value === 'string'
}
function isBoolean (value) {
  return value === true || value === false
}
function isDate (value) {
  return value instanceof Date && !Number.isNaN(value.valueOf())
}

// Numbers
function isNumber (value) {
  return Number(value) === value && Number.isFinite(value)
}
function isInteger (value) {
  return isNumber(value) && Number.isInteger(value)
}
function isFloat (value) {
  return isNumber(value) && value % 1 !== 0
}

// Strings
function isEmail (value) {
  return /[a-zA-Z0-9._-]+@[a-zA-Z0-9-]+\.[a-zA-Z]+/.test(value)
}
function isUrl (value) {
  return /^https?:\/\/[a-zA-Z0-9-_.?=&]/.test(value)
}
function isBase64 (value) {
  return value.includes('data:') && value.includes(';base64')
}
function isFile (value) {
  return isUrl(value) || isBase64(value)
}
function isIp (value) {
  const blocks = value.split('.')

  if (blocks.length === 4) {
    return blocks.every(block => (
      !Number.isNaN(block) &&
      Number.parseInt(block, 10) >= 0 &&
      Number.parseInt(block, 10) <= 255
    ))
  }

  return false
}

// Empty or not
function isEmptyObject (obj) {
  return Object.keys(obj).length === 0
}


export {
  has,
  isArray,
  isBoolean,
  isDate,
  isFunction,
  isObject,
  isString,
  isNumber,
  isInteger,
  isFloat,
  isEmail,
  isUrl,
  isBase64,
  isFile,
  isIp,
  isEmptyObject
}
