import { isInteger } from './validation.js'


/**
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
export const generateUUID = () => {
  let date = Date.now()
  date += performance.now()

  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    var rand = (date + Math.random() * 16) % 16 | 0
    date = Math.floor(date / 16)
    return (char === 'x' ? rand : (rand & 0x3 | 0x8)).toString(16)
  })
}


export const sanitizePhone = (value) => {
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
