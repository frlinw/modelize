import DataTypes from './datatypes.js'
import Model from './model.js'

import { has } from './utils/validation.js'


class Modelize {
  static config (options = {}) {
    const CONFIG = {
      baseUrl: options.baseUrl || '',
      requireAuth: has(options, 'requireAuth')
        ? options.requireAuth
        : false
    }

    if (has(options, 'authToken')) {
      CONFIG.authToken = options.authToken
    }

    if (CONFIG.requireAuth && !has(CONFIG, 'authToken')) {
      throw new Error(`[Modelize.js] Config error: 'authToken' is required if 'requireAuth' is set to true`, options)
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
