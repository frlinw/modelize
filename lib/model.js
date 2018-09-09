import DataTypes from './DataTypes.js'
import {
  has,
  isNull,
  isFunction,
  isArray,
  isObject,
  isString,
  isDate
} from './utils/validation.js'


export default class Model {
  static config (options = {}) {
    this.BASE_URL = options.baseUrl || ''

    this.isDate = has(options, 'isDate')
        ? options.isDate
        : isDate

    this.parseDate = has(options, 'parseDate')
      ? options.parseDate
      : (dateString) => new Date(dateString)

    this.toDate = has(options, 'toDate')
      ? options.toDate
      : (value) => value

    this.DataTypes = DataTypes({
      isDate: this.isDate,
      toDate: this.toDate,
      parseDate: this.parseDate
    })
  }


  static init (schema, config = {}) {
    if (!this.BASE_URL) {
      throw new Error(`[Modelize.js] Initialization error: baseUrl must be defined. ex: Model.config({ baseUrl: 'https://example.com' })`, schema)
    }

    this.schema = schema
    this.config = {
      storeName: config.storeName || null,
      endpoint: config.endpoint || null,
      requireAuth:
        has(config, 'requireAuth')
          ? config.requireAuth
          : true
    }

    this.ENDPOINT_URL = this.config.endpoint
      ? `${this.BASE_URL}/${this.config.endpoint}`
      : ''

    // Parse schema fields to find the pk & set default values
    this.primaryKey = null

    for (const [fieldname, fieldconf] of Object.entries(this.schema)) {
      // Type is a required param
      if (!has(fieldconf, 'type')) {
        throw new Error(`[Modelize.js] Initialization error: 'type' property is missing on field '${fieldname}'`, schema)
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
      if (has(fieldconf, 'pk')) {
        this.primaryKey = fieldname
      }
    }

    if (isNull(this.primaryKey)) {
      throw new Error('[Modelize.js] Initialization error: `pk` not found in the schema', this.schema)
    }

    return this
  }


  /*****************************************************************
  * Format data before send to the back
  *****************************************************************/

  /** Format collections and objects to use in back */
  static _formatForServer (data) {
    if (isNull(data)) return null

    // Format an item
    if (isObject(data)) {
      // If the object has a `$count` property, it's a collection
      if (has(data, '$count')) {
        return this._formatForServerCollection(data)
      } else {
        return this._formatForServerItem(data)
      }
    }
  }

  /** Format data recursively based on schema definition */
  static _formatForServerCollection (collection) {
    return collection.list.map(item => this._formatForServerItem(item))
  }

  /** Format data recursively based on schema definition */
  static _formatForServerItem (item) {
    const newItem = {}

    for (const [fieldname, dbcheck] of Object.entries(item.$todb)) {
      const value = item[fieldname]

      if (dbcheck.toSend && dbcheck.isValid(value, item)) {
        const fieldconf = this.schema[fieldname]

        newItem[fieldname] = fieldconf.type.formatForServer(value)
      }
    }

    return newItem
  }


  /*****************************************************************
  * HTTP: Helpers
  *****************************************************************/

  static _buildRequestUrl (options) {
    let url = this.ENDPOINT_URL

    if (has(options, 'pk')) {
      url += `/${options.pk}`
    }
    if (has(options, 'url') && options.url) {
      url += `/${options.url}`
    }
    if (has(options, 'params')) {
      url += `?${
        Object.entries(options.params)
          .map(([key, value]) => {
            if (this.isDate(value)) {
              value = this.toDate(value).toISOString()
            }
            // Map the key-value filter
            return `${key}=${encodeURIComponent(value)}`
          })
          .join('&')
      }`
    }

    return url
  }

  static _buildRequestInit (data, method, signal = null) {
    const init = {
      signal: signal,
      method: method,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // Set Authorization header for private api
    if (this.config.requireAuth) {
      // TODO: get token from indexeddb
      const token = localStorage.getItem('token')

      if (!token) {
        throw new Error(`[Modelize.js] Fetch Error: anonymous user cannot access '${this.config.endpoint}' private API`)
      }

      init.headers['Authorization'] = `Bearer ${token}`
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Extract validated data only
      init.body = JSON.stringify(this._formatForServer(data))
    }

    return init
  }


  /*****************************************************************
  * Format data before use in front
  *****************************************************************/

  /** Create a non formatted raw item */
  static buildRaw (item = {}) {
    const newItem = {}

    // Generate default pk
    let pk = item[this.primaryKey] || item['pk']

    if (!pk) {
      const fieldconf = this.schema[this.primaryKey]
      pk = isFunction(fieldconf.defaultValue)
        ? fieldconf.defaultValue()
        : fieldconf.defaultValue
    }

    for (const [fieldname, fieldconf] of Object.entries(this.schema)) {
      let value = item[fieldname]

      // Set a default value
      if (value === undefined) {
        if (fieldname === this.primaryKey) {
          value = pk
        } else {
          value = isFunction(fieldconf.defaultValue)
            ? fieldconf.defaultValue(pk)
            : fieldconf.defaultValue
        }
      }

      newItem[fieldname] = value
    }

    return newItem
  }

  /** Create or format an item to use in front */
  static build (item = {}) {
    return new this(this.buildRaw(item))
  }

  /** Create or format a collection to use in front */
  static buildCollection (collection = []) {
    return new this(collection)
  }

  /** Create or format a custom item with all methods (no validation, no schema check) */
  static buildCustom (custom) {
    return new this(custom)
  }

  constructor (data, isFromDb = false) {
    if (isNull(data)) return null

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
      this.$todb = {}

      if (isFromDb) {
        this.$fromdb = data
      }

      // Build validation based on schema
      for (const [fieldname, fieldconf] of Object.entries(this.constructor.schema)) {
        this.$todb[fieldname] = {
          toSend: fieldconf.pk || fieldconf.alwaysSend || false,
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

      // Format recursively existing fields only
      for (const [fieldname, value] of Object.entries(data)) {
        let newValue = value

        if (has(this.constructor.schema, fieldname)) {
          const fieldconf = this.constructor.schema[fieldname]
          newValue = fieldconf.type.formatForClient(value)
        }

        this[fieldname] = newValue
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

      this.list = []
      for (const item of data) {
        this.list.push(new this.constructor(item, isFromDb))
      }

      this.$count = this.list.length
    }

    return this
  }

  /**
   * Proceed to the HTTP request
   * - Preformat data for backend compatibility
   * - Build API URL
   * - Postformat data for frontend compatibility
   */
  async fetch (options) {
    if (!this.constructor.ENDPOINT_URL) {
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
    const fetchRequest = new Request(this.constructor._buildRequestUrl(options), this.constructor._buildRequestInit(this, options.method, controller.signal))

    const abortTimeout = setTimeout(() => controller.abort(), 20000)

    try {
      fetchResponse = await fetch(fetchRequest)

      clearTimeout(abortTimeout)

      // Server side errors raise an exception
      if (!fetchResponse.ok) {
        throw fetchResponse
      }
    } catch (err) {
      document.dispatchEvent(new CustomEvent('fetcherror', { detail: fetchResponse }))

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
    const data = has(serverData, 'results') // Server put data collection in `results` key
      ? serverData.results
      : serverData

    // Save total of items in a collection
    const formattedData = new this.constructor(data, true)

    // Update object values...
    if (isObject(data)) {
      for (const [key, value] of Object.entries(formattedData)) {
        this[key] = value
      }
    // ...or update array items
    } else if (isArray(data)) {
      // Refresh item count
      this.$count = has(serverData, 'count')
        ? serverData.count
        : formattedData.$count

      if (!options.extend) {
        this.list.length = 0 // Empty the array
      }

      for (const item of formattedData.list) {
        this.list.push(item)
      }
    }

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
   * Remove all items from the collection
   */
  clear () {
    return this.list.splice(0, this.list.length)
  }

  /**
   * Try to find an item in the list with a pk
   * @param {String} pk - primary key of the item to find
   */
  find (pk) {
    return this.list.find(item => item[this.constructor.primaryKey] === pk) || null
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
    return this.list.push(this.constructor.build(params))
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
   * Valid a list of fields
   * @param {array} fields
   */
  valid (fieldlist = []) {
    const errors = []
    let isValid = true

    // Check user defined validation
    for (const fielditem of fieldlist) {
      // Validation for direct fields
      if (isString(fielditem)) {
        const fieldname = fielditem

        if (has(this, fieldname)) {
          this.$todb[fieldname].toSend = true

          if (this.$todb[fieldname].isValid(this[fieldname], this) === false) {
            isValid = false
            errors.push({
              error: 'Field value is not valid',
              field: fieldname,
              value: this[fieldname]
            })
          }
        } else {
          isValid = false
          errors.push({
            error: 'Field does not exists',
            field: fieldname
          })
        }
      // Recursive validation for nested objects
      } else if (isObject(fielditem)) {
        const fieldname = Object.keys(fielditem)[0] // get the only one key name
        const fieldlist = fielditem[fieldname]

        if (has(this, fieldname)) {
          this.$todb[fieldname].toSend = true

          if (!this[fieldname].valid(fieldlist)) {
            isValid = false
          }
        } else {
          isValid = false
          errors.push({
            error: 'Field does not exists',
            field: fieldname
          })
        }
      // Recursive validation for nested collections
      } else if (isArray(fielditem)) {
        const fieldname = fielditem[0]
        const fieldlist = fielditem[1]

        if (has(this, fieldname)) {
          this.$todb[fieldname].toSend = true

          for (const item of this[fieldname].list) {
            if (!item.valid(fieldlist)) {
              isValid = false
            }
          }
        } else {
          isValid = false
          errors.push({
            error: 'Field does not exists',
            field: fieldname
          })
        }
      } else {
        isValid = false
        errors.push({
          error: 'Syntax error',
          item: fielditem
        })
      }
    }

    if (!isValid) {
      document.dispatchEvent(new CustomEvent('validationerror', {
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
      this.$todb[fieldname].toSend &&
      !this.$todb[fieldname].isValid(this[fieldname], this)
    )
  }

  /**
   * Retrieve a single item
   * @param {object} options
   *  - pk: item reference
   *  - url: custom action
   */
  get (options) {
    if (!has(options, 'pk')) {
      throw new Error('[Modelize.js] Fetch error: get(options) method requires `pk` in options')
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
   * Create or update the item depends of if it comes from db or not
   */
  save (options = {}) {
    return (
      this.$fromdb
        ? this.put(options)
        : this.post(options)
    )
  }
}
