import moment from '@/node_modules/moment/moment.js'

import { isInteger } from '@/src/modelize.js/utils/validation.js'


// Build
const DATEFORMAT = 'YYYY-MM-DD'
const DATETIMEFORMAT = 'YYYY-MM-DD[T]HH:mm:ssZ'

const parseDate = (date, pattern) => moment(date, pattern)
const formatDate = (date, pattern) => date.format(pattern)


/**
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
const generateUUID = () => {
  let date = new Date().now()
  date += performance.now()

  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    var rand = (date + Math.random() * 16) % 16 | 0
    date = Math.floor(date / 16)
    return (char === 'x' ? rand : (rand & 0x3 | 0x8)).toString(16)
  })
}


const sanitizePhone = (value) => {
  let sanitizedPhone = ''

  value.split('').forEach((n, index) => {
    if (
      (index === 0 && n === '+') ||
      isInteger(parseInt(n))
    ) {
      sanitizedPhone += n
    }
  })

  return sanitizedPhone
}


export {
  DATEFORMAT,
  DATETIMEFORMAT,
  formatDate,
  parseDate,
  generateUUID,
  sanitizePhone
}
