import DataTypes from './datatypes.js'
import Model from './model.js'

import { has } from './utils/validation.js'


class Modelize {
  static config (options = {}) {
    if (!has(options, 'baseUrl')) {
      throw new Error(`[Modelize][Config] baseUrl is required. try Modelize.config({ baseUrl: 'https://api.example.com' })`, schema)
    }

    Model.baseUrl = options.baseUrl
    Model.requireAuth = has(options, 'requireAuth')
      ? options.requireAuth
      : false

    if (has(options, 'authToken')) {
      Model.authToken = options.authToken
    }

    if (Model.requireAuth && !Model.authToken) {
      throw new Error(`[Modelize][Config] 'authToken' is required if 'requireAuth' is set to true`, options)
    }

    this.Model = Model
    this.DataTypes = DataTypes
  }

  static addDataType (name, options = {}) {
    this.DataTypes[name] = options
  }
}


export default Modelize
