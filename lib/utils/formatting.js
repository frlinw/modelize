import { isInteger } from './validation.js'


// Helpers
const prependZero = (number) => (
  number < 10
    ? `0${number}`
    : number
)


/**
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
function generateUUID () {
  let date = Date.now()
  date += performance.now()

  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    var rand = (date + Math.random() * 16) % 16 | 0
    date = Math.floor(date / 16)
    return (
      char === 'x'
        ? rand
        : (rand & 0x3 | 0x8)
    ).toString(16)
  })
}


function parseDate (dateString) {
  return new Date(dateString)
}


function formatDateOnly (date) {
  // Cannot use .toISOString because it convert date to UTC
  // DateOnly must be the day in the local time
  const year = date.getFullYear()
  const month = prependZero(date.getMonth() + 1) // require +1 because month start at 0
  const day = prependZero(date.getDate())

  return `${year}-${month}-${day}`
}


function formatPhone (value) {
  let sanitizedPhone = ''

  value.split('').forEach((n, index) => {
    if (
      (index === 0 && n === '+') ||
      isInteger(Number.parseInt(n))
    ) {
      sanitizedPhone += n
    }
  })

  return sanitizedPhone
}


export {
  generateUUID,
  parseDate,
  formatDateOnly,
  formatPhone
}
