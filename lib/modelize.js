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
        : false
    }

    if (has(options, 'getAuthToken') && isFunction(options.getAuthToken)) {
      CONFIG.getAuthToken = options.getAuthToken
    }

    if (CONFIG.requireAuth && !has(CONFIG, 'getAuthToken')) {
      throw new Error(`[Modelize.js] Config error: 'getAuthToken' is required if 'requireAuth' is set to true`, options)
    }


    Model.CONFIG = CONFIG

    this.Model = Model
    this.DataTypes = DataTypes
  }

  static addDataType (name, options = {}) {
    this.DataTypes[name] = options
  }
}


export default Modelize
