import {
  has,
  isNull,
  isFunction,
  isArray,
  isObject,
  isString,
  isDate
} from './utils/validation.js'
import {
  cloneObject
} from './utils/formatting.js'


class Model {
  static init (schema, options = {}) {
    if (!this.CONFIG.baseUrl) {
      throw new Error(`[Modelize.js] Config error: baseUrl is required. try Modelize.config({ baseUrl: 'https://api.example.com' })`, schema)
    }

    // Clone the schema
    this.schema = cloneObject(schema)
    // Cache the array version of the schema
    this.schemaArray = Object.entries(this.schema)

    // Define model options with default values
    this.OPTIONS = {
      storeName: options.storeName || null,
      endpoint: options.endpoint
        ? `${this.CONFIG.baseUrl}/${options.endpoint}`
        : null,
      requireAuth: has(options, 'requireAuth')
        ? options.requireAuth
        : this.CONFIG.requireAuth
    }

    if (this.OPTIONS.requireAuth && !('getAuthToken' in this.CONFIG)) {
      throw new Error(`[Modelize.js] Config error: 'getAuthToken' is required if 'requireAuth' is set to true. try Modelize.config({ getAuthToken: () => localStorage.get('authToken')) })`, schema)
    }

    // Parse schema fields to find the pk & set default values
    this.primaryKey = null
    this.validator = {}

    for (const [fieldname, fieldconf] of this.schemaArray) {
      // Type is a required param
      if (!has(fieldconf, 'type')) {
        throw new Error(`[Modelize.js] Initialization error: Required 'type' property is missing from field '${fieldname}'`, schema)
      }

      // Set default fonction
      if (!has(fieldconf, 'defaultValue')) {
        fieldconf.defaultValue = fieldconf.type.defaultValue
      }

      // Default blank is restricted
      if (!has(fieldconf, 'allowBlank')) {
        fieldconf.allowBlank = false
      }

      // Default valid method is permissive
      if (!has(fieldconf, 'valid')) {
        fieldconf.valid = () => true
      }

      // Set the primary key
      if (has(fieldconf, 'primaryKey')) {
        this.primaryKey = fieldname
      }

      // Build the base validator
      this.validator[fieldname] = {
        checked: fieldconf.primaryKey || ['createdAt', 'updatedAt'].includes(fieldname) || false,
        isValid: (value, data) => {
          const isBlank = fieldconf.type.isBlank(value)
          const isValid = fieldconf.type.isValid(value)

          return (
            (
              // Blank and allowed
              (isBlank && fieldconf.allowBlank) ||
              // Not blank and valid
              (!isBlank && isValid)
            ) &&
            // Custom valid method
            fieldconf.valid(value, data)
          )
        }
      }
    }

    if (isNull(this.primaryKey)) {
      throw new Error(`[Modelize.js] Initialization error: Required 'primaryKey' property not found in the schema`, schema)
    }

    return this
  }


  /*****************************************************************
  * Format data before send to the back
  *****************************************************************/

  /** Format collections and objects to use in back */
  static _beforeSave (data) {
    if (isNull(data)) return null

    // Format an item
    if (isObject(data)) {
      // If the object has a '$count' property, it's a collection
      if (has(data, '$count')) {
        return this._beforeSaveCollection(data)
      } else {
        return this._beforeSaveItem(data)
      }
    }
  }

  /** Format data recursively based on schema definition */
  static _beforeSaveCollection (collection) {
    return collection.list.map(item => this._beforeSaveItem(item))
  }

  /** Format data recursively based on schema definition */
  static _beforeSaveItem (item) {
    const newItem = {}

    for (const [fieldname, dbcheck] of Object.entries(item.$validator)) {
      const value = item[fieldname]

      if (dbcheck.checked && dbcheck.isValid(value, item)) {
        const fieldconf = this.schema[fieldname]

        newItem[fieldname] = fieldconf.type.beforeSave(value)
      }
    }

    return newItem
  }

  /*****************************************************************
  * Format data before send to the back
  *****************************************************************/

  static _afterFetch (oldData, newData, serverData) {

  }


  /*****************************************************************
  * HTTP: Helpers
  *****************************************************************/

  static _buildRequestUrl ({ pk, url, params }) {
    let requestUrl = this.OPTIONS.endpoint

    if (pk) {
      requestUrl += `/${pk}`
    }
    if (url) {
      requestUrl += `/${url}`
    }
    if (params) {
      requestUrl += `?${
        Object.entries(params)
          .map(([key, value]) => {
            if (isDate(value)) {
              value = value.toISOString()
            }
            // Map the key-value filter
            return `${key}=${encodeURIComponent(value)}`
          })
          .join('&')
      }`
    }

    return requestUrl
  }

  static async _buildRequestInit (data, method, signal = null) {
    const requestInit = {
      signal: signal,
      method: method,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // Set Authorization header for private api
    if (this.OPTIONS.requireAuth) {
      const token = await this.CONFIG.getAuthToken()

      if (!token) {
        throw new Error(`[Modelize.js] Fetch Error: anonymous user cannot access '${this.OPTIONS.endpoint}' private API`)
      }

      requestInit.headers['Authorization'] = `Bearer ${token}`
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Extract validated data only
      requestInit.body = JSON.stringify(this._beforeSave(data))
    }

    return requestInit
  }


  /*****************************************************************
  * Format data before use in front
  *****************************************************************/

  constructor (data, options = {}) {
    if (isNull(data)) return null

    const isNew = has(options, 'isNew')
      ? options.isNew
      : true

    // Format an item
    if (isObject(data)) {
      this.$states = {
        fetchInProgress: false,
        fetchSuccessOnce: false,
        fetchSuccess: false,
        fetchFailure: false,
        saveInProgress: false,
        saveSuccess: false,
        saveFailure: false
      }
      this.$validator = cloneObject(this.constructor.validator)
      this.$isNew = isNew
      this.$data = data

      // Just add properties to the instance for custom objects
      const isCustom = has(options, 'isCustom')
        ? options.isCustom
        : false

      if (isCustom) {
        for (const [fieldname, value] of Object.entries(data)) {
          this[fieldname] = value
        }
      // Build the instance with default values from the schema
      } else {
        // Find or generate the primary key
        let primaryKey = data[this.constructor.primaryKey] || data['primaryKey']

        if (!primaryKey) {
          const fieldconf = this.constructor.schema[this.constructor.primaryKey]
          primaryKey = isFunction(fieldconf.defaultValue)
            ? fieldconf.defaultValue()
            : fieldconf.defaultValue
        }

        // Build the item with default values
        for (const [fieldname, fieldconf] of this.constructor.schemaArray) {
          let value = data[fieldname]

          // Set a default value
          if (value === undefined) {
            if (fieldname === this.constructor.primaryKey) {
              value = primaryKey
            } else {
              value = isFunction(fieldconf.defaultValue)
                ? fieldconf.defaultValue(primaryKey)
                : fieldconf.defaultValue
            }
          }

          // Format the data
          if (value !== null) { // null should not be formatted
            value = fieldconf.type.beforeBuild(value)
          }

          this[fieldname] = value
        }
      }
    }

    // Format a collection of items
    if (isArray(data)) {
      this.$states = {
        fetchInProgress: false,
        fetchSuccessOnce: false,
        fetchSuccess: false,
        fetchFailure: false
      }

      this.$count = has(options, 'count')
        ? options.count
        : data.length

      this.list = []

      for (const item of data) {
        this.list.push(new this.constructor(item, { isNew }))
      }
    }

    return this
  }

  /**
   * Update the current model instance with new data
   * @param {object}
   * @return {integer}
   */
  _mutateData (newData) {
    // If the object has a '$count' property, it's a collection
    if (has(newData, '$count')) {
      // Refresh item count
      this.$count = newData.$count

      if (this.$resources && !this.$resources.options.extend) {
        this.clear() // Empty the array
      }

      this.list = this.list.concat(newData.list)
    } else {
      for (const [key, value] of Object.entries(newData)) {
        if (isObject(value) && this[key] instanceof Model) {
          this[key]._mutateData(value)
        } else {
          if (!['$states', '$resources'].includes(key)) {
            this[key] = value
          }
        }
      }
    }
  }


  /**
   * Valid a list of fields
   * @param {array} fieldlist list of fieldname
   * @return {object} { isValid<Boolean>, errors<Array> }
   */
  _validQuietly (fieldlist) {
    if (!isArray(fieldlist)) {
      throw new Error(`[Modelize.js] Validation error: .valid() params must be an array`, fieldlist)
    }

    let isValid = true
    let errors = []

    // Check user defined validation
    for (const fielditem of fieldlist) {
      // Validation for direct fields
      if (isString(fielditem)) {
        const fieldname = fielditem

        if (has(this, fieldname)) {
          this.$validator[fieldname].checked = true

          if (this.$validator[fieldname].isValid(this[fieldname], this) === false) {
            isValid = false
            errors = [...errors, {
              error: 'Field value is not valid',
              field: fieldname,
              value: this[fieldname]
            }]
          }
        } else {
          isValid = false
          errors = [...errors, {
            error: 'Field does not exists',
            field: fieldname
          }]
        }
      // Recursive validation for nested objects
      } else if (isObject(fielditem)) {
        const fieldname = Object.keys(fielditem)[0] // get the only one key name
        const fieldlist = fielditem[fieldname]

        if (has(this, fieldname)) {
          this.$validator[fieldname].checked = true

          const result = this[fieldname]._validQuietly(fieldlist || [])

          if (!result.isValid) {
            isValid = false
            errors = [...errors, ...result.errors]
          }
        } else {
          isValid = false
          errors = [...errors, {
            error: 'Field does not exists',
            field: fieldname
          }]
        }
      // Recursive validation for nested collections
      } else if (isArray(fielditem)) {
        const fieldname = fielditem[0]
        const fieldlist = fielditem[1]

        if (has(this, fieldname)) {
          this.$validator[fieldname].checked = true

          // Check if collection is valid
          const result = this._validQuietly([fieldname])

          if (!result.isValid) {
            isValid = false
            errors = [...errors, ...result.errors]
          }

          // Check if each item of the collection is valid
          for (const item of this[fieldname].list) {
            const result = item._validQuietly(fieldlist)

            if (!result.isValid) {
              isValid = false
              errors = [...errors, ...result.errors]
            }
          }
        } else {
          isValid = false
          errors = [...errors, {
            error: 'Field does not exists',
            field: fieldname
          }]
        }
      } else {
        isValid = false
        errors = [...errors, {
          error: 'Syntax error',
          field: fielditem
        }]
      }
    }

    return {
      isValid,
      errors
    }
  }

  /**
   * Valid a list of fields
   * @param {array} fieldlist list of fieldname
   * @return {boolean} result of fields validation
   * @event validationerror emitted if the return value is false
   */
  valid (fieldlist = []) {
    const { isValid, errors } = this._validQuietly(fieldlist)

    if (!isValid) {
      document.dispatchEvent(new CustomEvent('ModelizeValidationError', {
        detail: {
          error: '[Modelize.js] Validation error',
          list: errors
        }
      }))
    }

    return isValid
  }

  /**
   * Check validation status of a validated field
   * @param {string} fieldname
   */
  error (fieldname) {
    return (
      this.$validator[fieldname].checked &&
      !this.$validator[fieldname].isValid(this[fieldname], this)
    )
  }


  /**
   * Proceed to the HTTP request
   * - Preformat data for backend compatibility
   * - Build API URL
   * - Postformat data for frontend compatibility
   */
  async fetch (options) {
    if (!this.constructor.OPTIONS.endpoint) {
      throw new Error('[Modelize.js] Fetch error: an endpoint is required to perform a request')
    }

    // Set states to inprogress
    if (options.method === 'GET') {
      this.$states.fetchInProgress = true
      this.$states.fetchFailure = false
      this.$states.fetchSuccess = false
    } else {
      this.$states.saveInProgress = true
      this.$states.saveFailure = false
      this.$states.saveSuccess = false
    }

    // HTTP request
    // https://developer.mozilla.org/fr/docs/Web/API/Fetch_API
    let fetchResponse

    // Allow fetch request to be aborted
    const controller = new AbortController()
    const fetchRequest = new Request(this.constructor._buildRequestUrl(options), await this.constructor._buildRequestInit(this, options.method, controller.signal))

    const abortTimeout = setTimeout(() => controller.abort(), 20000)

    try {
      fetchResponse = await fetch(fetchRequest)

      clearTimeout(abortTimeout)

      // Server side errors raise an exception
      if (!fetchResponse.ok) {
        throw fetchResponse
      }
    } catch (err) {
      document.dispatchEvent(new CustomEvent('ModelizeFetchError', { detail: fetchResponse }))

      // Set states to failure
      if (options.method === 'GET') {
        this.$states.fetchInProgress = false
        this.$states.fetchFailure = true
      } else {
        this.$states.saveInProgress = false
        this.$states.saveFailure = true
      }

      return Promise.resolve(this)
    }

    // Save fetch request & response
    this.$resources = {
      request: fetchRequest,
      response: fetchResponse,
      // Save original options of the request (required by getMore method)
      options: options
    }

    // Get data from server response
    const serverData = await fetchResponse.json()

    // Save original data from server (for comparison before save)
    const data = has(serverData, 'results') // Server put data collection in 'results' key
      ? serverData.results
      : serverData

    // Save total of items in a collection
    const dataOptions = { isNew: false }
    if (has(serverData, 'count')) {
      dataOptions.count = serverData.count
    }
    const formattedData = new this.constructor(data, dataOptions)

    this._mutateData(formattedData)

    // Set states to success
    if (options.method === 'GET') {
      this.$states.fetchInProgress = false
      this.$states.fetchSuccess = true
      this.$states.fetchSuccessOnce = true
    } else {
      this.$states.saveInProgress = false
      this.$states.saveSuccess = true
    }

    return Promise.resolve(this)
  }


  /**
   * Get the list of items
   */
  items () {
    return this.list
  }

  /**
   * Remove all items from the collection
   */
  clear () {
    return this.list.splice(0, this.list.length)
  }

  /**
   * Try to find an item in the list with a primary key
   * @param {String} primaryKey - primary key of the item to find
   */
  find (primaryKey) {
    return this.list.find(item => item[this.constructor.primaryKey] === primaryKey) || null
  }

  /**
   * Check if an item exists in the collection (based on its primary key)
   * @param {Object, function} ref - item (with the primary key) to check existence
   */
  exists (ref) {
    const check = isFunction(ref)
      ? ref
      : (item) => item[this.constructor.primaryKey] === ref[this.constructor.primaryKey]

    return this.list.some(item => check(item))
  }

  /**
   * Remove the item from the collection based on its primary key
   * @param {Object} item - item to remove (must at least contains its primary key)
   */
  remove (ref) {
    const check = isFunction(ref)
      ? ref
      : (item) => item[this.constructor.primaryKey] === ref[this.constructor.primaryKey]

    const indexToRemove = this.list.findIndex(item => check(item))

    if (indexToRemove !== -1) {
      this.list.splice(indexToRemove, 1)
    }
    return indexToRemove
  }

  /**
   * Add a new item to the collection
   * @param {Object} params - optional definition of the item to add
   */
  add (params = {}) {
    return this.list.push(new this.constructor(params))
  }

  /**
   * Remove or add the item from the collection based on its primary key
   * @param {Object} item - item to Add or remove (must at least contains its primary key)
   */
  toggle (item) {
    if (this.exists(item)) {
      return this.remove(item)
    } else {
      return this.add(item)
    }
  }

  /**
   * The collection can be extended with more items
   */
  isEmpty () {
    return this.$count === 0
  }

  /**
   * The collection can be extended with more items
   */
  hasMore () {
    return this.$count > this.list.length
  }

  /**
   * Retrieve a collection of items
   * @param {object} options
   *  - url: custom action
   *  - params: params to send in the url
   */
  getCollection (options = {}) {
    const params = options.params || {}

    if (!params.limit) params.limit = 20
    if (!params.offset) params.offset = 0

    return this.fetch({
      method: 'GET',
      url: options.url || '',
      extend: options.extend || false,
      params: params
    })
  }

  /**
   * Extend a collection with more items
   */
  async getMore () {
    this.$resources.options.params.offset += this.$resources.options.params.limit

    await this.getCollection({
      url: this.$resources.options.url || '',
      params: this.$resources.options.params,
      extend: true
    })
  }


  /**
   * Retrieve a single item
   * @param {object} options
   *  - pk: item reference
   *  - url: custom action
   */
  get (options) {
    if (!has(options, 'pk')) {
      throw new Error(`[Modelize.js] Fetch error: get(options) method requires 'pk' in options`)
    }

    return this.fetch({
      method: 'GET',
      pk: options.pk,
      url: options.url || ''
    })
  }

  /**
   * Create a new item
   * @param {object} options
   *  - url: custom action
   */
  post (options = {}) {
    return this.fetch({
      method: 'POST',
      url: options.url || ''
    })
  }

  /**
   * Update an item
   * @param {object} options
   *  - pk: item reference (default: value of the primary key field)
   *  - url: custom action
   */
  put (options = {}) {
    return this.fetch({
      method: 'PUT',
      pk: options.pk || this[this.constructor.primaryKey],
      url: options.url || ''
    })
  }

  /**
   * Partial update of an item
   * @param {object} options
   *  - pk: item reference (default: value of the primary key field)
   *  - url: custom action
   */
  patch (options = {}) {
    return this.fetch({
      method: 'PATCH',
      pk: options.pk || this[this.constructor.primaryKey],
      url: options.url || ''
    })
  }

  /**
   * Create or update the item depends of if it comes from db or not
   */
  save (options = {}) {
    return (
      this.$isNew
        ? this.post(options)
        : this.put(options)
    )
  }
}


export default Model
