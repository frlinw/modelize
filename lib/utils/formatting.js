import {
  isObject,
  isInteger
} from './validation.js'


export const cloneObject = (obj) => {
  const newObject = {}

  for (const key in obj) {
    const value = obj[key]

    newObject[key] = isObject(value)
      ? cloneObject(value)
      : value
  }

  return newObject
}


/**
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
export const generateUUID = () => {
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


export const parseDate = (dateString) => new Date(dateString)


const addZero = (number) => (
  number < 10
    ? `0${number}`
    : number
)

export const formatDateOnly = (date) => {
  // Cannot use .toISOString because it convert date to UTC
  // DateOnly must be the day in the local time
  const year = date.getFullYear()
  const month = addZero(date.getMonth() + 1) // require +1 because month start at 0
  const day = addZero(date.getDate())

  return `${year}-${month}-${day}`
}


export const formatPhone = (value) => {
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
