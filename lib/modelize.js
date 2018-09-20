import DataTypes from './datatypes.js'
import Model from './model.js'

import {
  has,
  isFunction
} from './utils/validation.js'


class Modelize {
  static config (options = {}) {
    const CONFIG = {
      baseUrl: options.baseUrl || '',
      requireAuth: has(options, 'requireAuth')
        ? options.requireAuth
        : false,
      // Default date methods use javascript Date class
      // These methods can be overrided to allow the use of a date wrapper lib (moment, luxon, ...)
      // DATE & DATETIME datatypes and date params in URI will be affected by these methods
      isDate: has(options, 'isDate') && isFunction(options.isDate)
        ? options.isDate
        : (value) => value instanceof Date && !isNaN(value.valueOf()),
      parseDate: has(options, 'parseDate') && isFunction(options.parseDate)
        ? options.parseDate
        : (dateString) => new Date(dateString),
      toDate: has(options, 'toDate') && isFunction(options.toDate)
        ? options.toDate
        : (value) => value
    }

    if (CONFIG.requireAuth && !has(options, 'getAuthToken')) {
      throw new Error(`[Modelize.js] Config error: 'getAuthToken' is required if 'requireAuth' is set to true`, options)
    }

    if (has(options, 'getAuthToken') && isFunction(options.getAuthToken)) {
      CONFIG.getAuthToken = options.getAuthToken
    }

    // Create DateTypes
    Model.CONFIG = CONFIG

    this.Model = Model
    this.DataTypes = DataTypes({
      isDate: this.CONFIG.isDate,
      toDate: this.CONFIG.toDate,
      parseDate: this.CONFIG.parseDate
    })
  }
}


export default Modelize
