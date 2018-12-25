import {
  has,
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
    if (!has(this.CONFIG, 'baseUrl')) {
      throw new Error(`[Modelize.js] Config error: baseUrl is required. try Modelize.config({ baseUrl: 'https://api.example.com' })`, schema)
    }

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

    if (this.OPTIONS.requireAuth && !has(this.CONFIG, 'authToken')) {
      throw new Error(`[Modelize.js] Config error: 'authToken' is required if 'requireAuth' is set to true. try Modelize.config({ authToken: () => localStorage.get('authToken')) })`, schema)
    }

    // Clone the schema
    this.schema = cloneObject(schema)
    // Optimization: Cache the array version of the schema
    this.schemaEntries = Object.entries(this.schema)

    // Define the key to use for collection items
    this.collectionKey = 'list'

    // Parse schema fields to set default values for each option
    this.primaryKeyFieldname = null

    for (const [fieldname, fieldconf] of this.schemaEntries) {
      // Type is a required param
      if (!has(fieldconf, 'type')) {
        throw new Error(`[Modelize.js] Initialization error: Required property 'type' is missing from field '${fieldname}'`, schema)
      }

      // Set the primary key
      if (has(fieldconf, 'primaryKey') && fieldconf.primaryKey) {
        this.primaryKeyFieldname = fieldname
      }

      // Define the default value
      const defaultValue = has(fieldconf, 'defaultValue')
        ? fieldconf.defaultValue
        : fieldconf.type.defaultValue

      // Optimization: Unsure the default value is a function (avoid type check on runtime)
      fieldconf.defaultValue = isFunction(defaultValue)
        ? defaultValue
        : () => defaultValue

      // Default blank is restricted
      if (!has(fieldconf, 'allowBlank')) {
        fieldconf.allowBlank = false
      }

      // Default valid method is permissive
      if (!has(fieldconf, 'isValid')) {
        fieldconf.isValid = () => true
      }

      // Require validation as a default except for primary key and timestamp fields
      fieldconf.bypassValidation = fieldconf.primaryKey || ['createdAt', 'updatedAt'].includes(fieldname) || false
    }

    if (this.primaryKeyFieldname === null) {
      throw new Error(`[Modelize.js] Initialization error: Required property 'primaryKey' not found in the schema`, schema)
    }

    return this
  }


  /*****************************************************************
  * Fetch helpers
  *****************************************************************/

  /** Format collections and objects to use in back */
  static _beforeSave (data) {
    if (data instanceof Model) {
      if (data.isCollection()) {
        return this._beforeSaveCollection(data)
      } else {
        return this._beforeSaveItem(data)
      }
    }

    return null
  }

  /** Format data recursively based on schema definition */
  static _beforeSaveCollection (collection) {
    return collection.items().map(item => this._beforeSaveItem(item))
  }

  /** Format data recursively based on schema definition */
  static _beforeSaveItem (item) {
    const newItem = {}

    for (const [fieldname, fieldstate] of Object.entries(item.$modelize.validator)) {
      const value = item[fieldname]

      if (fieldstate.checked && fieldstate.isValid(value, item)) {
        const fieldconf = this.schema[fieldname]

        newItem[fieldname] = fieldconf.type.beforeSave(value)
      }
    }

    return newItem
  }


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
      const token = await this.CONFIG.authToken()

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

  static _buildRawItem (item = {}) {
    const rawItem = {}

    const primaryKey = item['primaryKey'] || item[this.primaryKeyFieldname] || this.schema[this.primaryKeyFieldname].defaultValue()

    // Build the item with default values
    for (const [fieldname, fieldconf] of this.schemaEntries) {
      if (fieldname === this.primaryKeyFieldname) {
        rawItem[fieldname] = primaryKey
      } else if (has(item, fieldname)) {
        rawItem[fieldname] = item[fieldname]
      } else {
        rawItem[fieldname] = fieldconf.defaultValue(primaryKey) // primaryKey params is necessary for HASONE datatype
      }
    }

    return rawItem
  }


  static _buildValidator () {
    const validator = {}

    // Build the base validator
    for (const [fieldname, fieldconf] of this.schemaEntries) {
      validator[fieldname] = {
        checked: fieldconf.bypassValidation,
        isValid: (value, data) => {
          const isBlank = fieldconf.type.isBlank(value)

          return (
            (
              // Blank and allowed
              (isBlank && fieldconf.allowBlank) ||
              // Not blank and valid
              (!isBlank && fieldconf.type.isValid(value))
            ) &&
            // Custom valid method
            fieldconf.isValid(value, data)
          )
        }
      }
    }

    return validator
  }


  constructor (data, options = {}) {
    options = {
      isNew: true,
      isCustom: false,
      ...options
    }

    // Format an item
    if (isObject(data)) {
      // Build a raw item if it's a new instance
      if (options.isNew && !options.isCustom) {
        data = this.constructor._buildRawItem(data)
      }

      // Add modelize specific params
      this.$modelize = {
        isNew: options.isNew,
        isCustom: options.isCustom,
        data: data,
        validator: this.constructor._buildValidator(),
        states: {
          fetchInProgress: false,
          fetchSuccessOnce: false,
          fetchSuccess: false,
          fetchFailure: false,
          saveInProgress: false,
          saveSuccess: false,
          saveFailure: false
        }
      }

      // Format recursively existing fields only
      for (const [fieldname, value] of Object.entries(data)) {
        let newValue = value

        if (
          value !== null && // Do not try to format null value (avoid creating empty model instance)
          has(this.constructor.schema, fieldname)
        ) {
          const fieldconf = this.constructor.schema[fieldname]
          newValue = fieldconf.type.beforeBuild(value, options)
        }

        this[fieldname] = newValue
      }
    // Format a collection of items
    } else if (isArray(data)) {
      // Add modelize specific params
      this.$modelize = {
        isCustom: options.isCustom,
        count: 0,
        states: {
          fetchInProgress: false,
          fetchSuccessOnce: false,
          fetchSuccess: false,
          fetchFailure: false
        }
      }

      // Add items to the list
      this.setCollection([])

      for (const item of data) {
        this.add(item, options)
      }

      // Update the count with the grand total
      // Note: must be after .add() processing
      if (has(options, 'count')) {
        this.$modelize.count = options.count
      }
    }

    return this
  }

  /**
   * Get fetch state
   */

  get isNew () {
    return this.$modelize.isNew
  }

  /**
   * Get fetch state
   */

  get fetchInProgress () {
    return this.$modelize.states.fetchInProgress
  }

  get fetchSuccessOnce () {
    return this.$modelize.states.fetchSuccessOnce
  }

  get fetchSuccess () {
    return this.$modelize.states.fetchSuccess
  }

  get fetchFailure () {
    return this.$modelize.states.fetchFailure
  }

  /**
   * Get save state
   */

  get saveInProgress () {
    return this.$modelize.states.saveInProgress
  }

  get saveSuccess () {
    return this.$modelize.states.saveSuccess
  }

  get saveFailure () {
    return this.$modelize.states.saveFailure
  }

  /**
   * Update the current model instance with new data
   * @param {object}
   * @return {integer}
   */
  _mutateData (newData) {
    if (newData.isCollection()) {
      // Refresh item count
      this.$modelize.count = newData.$modelize.count

      // Extend the list or just replace it
      this.setCollection(
        has(this.$modelize, 'fetch') && this.$modelize.fetch.options.extend
          ? [...this.items(), ...newData.items()]
          : newData.items()
      )
    } else {
      for (const [key, value] of Object.entries(newData)) {
        // Recursive mutation
        if (value instanceof Model) {
          this[key]._mutateData(value)
        // Mutate isNew and data only
        } else if (key === '$modelize') {
          this[key].isNew = value.isNew
          this[key].isCustom = value.isCustom
          this[key].data = value.data
        // Basic fields
        } else {
          this[key] = value
        }
      }
    }
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
      this.$modelize.states.fetchInProgress = true
      this.$modelize.states.fetchFailure = false
      this.$modelize.states.fetchSuccess = false
    } else {
      this.$modelize.states.saveInProgress = true
      this.$modelize.states.saveFailure = false
      this.$modelize.states.saveSuccess = false
    }

    // Allow fetch request to be aborted
    const abortController = new AbortController()
    const abortTimeout = setTimeout(() => abortController.abort(), 20000)
    // Prepare fetch request
    const fetchRequest = new Request(this.constructor._buildRequestUrl(options), await this.constructor._buildRequestInit(this, options.method, abortController.signal))
    let fetchResponse

    try {
      // Proceed to api call
      // https://developer.mozilla.org/fr/docs/Web/API/Fetch_API
      fetchResponse = await fetch(fetchRequest)

      clearTimeout(abortTimeout)

      // Server side errors raise an exception
      if (!fetchResponse.ok) {
        throw new Error()
      }
    } catch (err) {
      document.dispatchEvent(new CustomEvent('ModelizeFetchError', { detail: fetchResponse }))

      // Set states to failure
      if (options.method === 'GET') {
        this.$modelize.states.fetchInProgress = false
        this.$modelize.states.fetchFailure = true
      } else {
        this.$modelize.states.saveInProgress = false
        this.$modelize.states.saveFailure = true
      }

      return Promise.resolve(this)
    }

    // Save fetch request & response
    this.$modelize.fetch = {
      options: options,
      request: fetchRequest,
      response: fetchResponse
    }

    // Get data from server response
    const serverData = await fetchResponse.json()

    // Save original data from server (for comparison before save)
    const data = has(serverData, 'results') // Server put data collection in 'results' key
      ? serverData.results
      : serverData

    // Build raw data with existing options
    const dataOptions = {
      isNew: false,
      isCustom: this.$modelize.isCustom
    }
    if (has(serverData, 'count')) {
      dataOptions.count = serverData.count
    }
    const formattedData = new this.constructor(data, dataOptions)

    this._mutateData(formattedData)

    // Set states to success
    if (options.method === 'GET') {
      this.$modelize.states.fetchInProgress = false
      this.$modelize.states.fetchSuccess = true
      this.$modelize.states.fetchSuccessOnce = true
    } else {
      this.$modelize.states.saveInProgress = false
      this.$modelize.states.saveSuccess = true
    }

    return Promise.resolve(this)
  }

  /*****************************************************************
  * Collection methods
  *****************************************************************/

  /**
   * Check if the instance is a collection
   */
  isCollection () {
    return has(this, this.constructor.collectionKey)
  }

  /**
   * Set the list of items
   */
  setCollection (newCollection) {
    this[this.constructor.collectionKey] = newCollection
  }

  /**
   * Get the list of items
   */
  items () {
    return this[this.constructor.collectionKey]
  }

  /**
   * Check if there are items in the collection
   */
  isEmpty () {
    return this.items().length === 0
  }

  /**
   * The collection can be extended with more items
   */
  hasMore () {
    return this.items().length < this.$modelize.count
  }

  /**
   * Remove all items from the collection
   */
  clear () {
    return this.items().splice(0, this.items().length)
  }

  /**
   * Try to find an item in the list with a primary key
   * @param {String} primaryKey - primary key of the item to find
   */
  find (primaryKey) {
    return this.items().find(item => item[this.constructor.primaryKeyFieldname] === primaryKey) || null
  }

  /**
   * Check if an item exists in the collection (based on its primary key)
   * @param {Object, function} ref - item (with the primary key) to check existence
   */
  exists (ref) {
    const check = isFunction(ref)
      ? ref
      : (item) => item[this.constructor.primaryKeyFieldname] === ref[this.constructor.primaryKeyFieldname]

    return this.items().some(item => check(item))
  }

  /**
   * Remove the item from the collection based on its primary key
   * @param {Object} item - item to remove (must at least contains its primary key)
   */
  remove (ref) {
    const check = isFunction(ref)
      ? ref
      : (item) => item[this.constructor.primaryKeyFieldname] === ref[this.constructor.primaryKeyFieldname]

    const indexToRemove = this.items().findIndex(item => check(item))

    if (indexToRemove !== -1) {
      this.items().splice(indexToRemove, 1)
      this.$modelize.count = this.$modelize.count - 1
    }

    return indexToRemove
  }

  /**
   * Add a new item to the collection
   * @param {Object} options - optional definition of the item to add
   */
  add (item = {}, options = {}) {
    const instance = item instanceof this.constructor
      ? item
      : new this.constructor(item, options)

    this.items().push(instance)

    this.$modelize.count = this.$modelize.count + 1

    return instance
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
    this.$modelize.fetch.options.params.offset += this.$modelize.fetch.options.params.limit

    await this.getCollection({
      url: this.$modelize.fetch.options.url || '',
      params: this.$modelize.fetch.options.params,
      extend: true
    })
  }

  /*****************************************************************
  * Single item methods
  *****************************************************************/

  /**
   * Get original data
   */
  baseData () {
    return this.$modelize.data
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

    const checkValidity = (result) => {
      if (!result.isValid) {
        isValid = false
        errors = [...errors, ...result.errors]
      }
    }

    // Check user defined validation
    for (const fielditem of fieldlist) {
      // Validation for direct fields
      if (isString(fielditem)) {
        const fieldname = fielditem

        if (has(this, fieldname)) {
          this.$modelize.validator[fieldname].checked = true

          if (this.$modelize.validator[fieldname].isValid(this[fieldname], this) === false) {
            checkValidity({
              isValid: false,
              errors: [{
                context: fieldlist,
                name: fieldname,
                value: this[fieldname],
                error: 'NOT_VALID'
              }]
            })
          }
        } else {
          checkValidity({
            isValid: false,
            errors: [{
              context: fieldlist,
              name: fieldname,
              error: 'NOT_FOUND'
            }]
          })
        }
      // Recursive validation for associations
      } else if (isArray(fielditem)) {
        const fieldname = fielditem[0]
        const fieldlist = fielditem[1]

        if (has(this, fieldname)) {
          this.$modelize.validator[fieldname].checked = true

          switch (this.constructor.schema[fieldname].type.association) {
            case 'BelongsTo':
            case 'HasOne':
              if (fieldlist) {
                checkValidity(this[fieldname]._validQuietly(fieldlist))
              }
              break
            case 'HasMany':
              // Check if collection is valid
              checkValidity(this._validQuietly([fieldname]))

              if (fieldlist) {
                // Check if each item of the collection is valid
                for (const item of this[fieldname].items()) {
                  checkValidity(item._validQuietly(fieldlist))
                }
              }
              break
          }
        } else {
          checkValidity({
            isValid: false,
            errors: [{
              context: fieldlist,
              name: fieldname,
              error: 'NOT_FOUND'
            }]
          })
        }
      } else {
        checkValidity({
          isValid: false,
          errors: [{
            context: fieldlist,
            name: fielditem,
            error: 'SYNTAX_ERROR'
          }]
        })
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
  valid (fieldlist) {
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
      this.$modelize.validator[fieldname].checked &&
      !this.$modelize.validator[fieldname].isValid(this[fieldname], this)
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
      pk: options.pk || this[this.constructor.primaryKeyFieldname],
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
      pk: options.pk || this[this.constructor.primaryKeyFieldname],
      url: options.url || ''
    })
  }

  /**
   * Create or update the item depends of if it comes from db or not
   */
  save (options = {}) {
    return (
      this.$modelize.isNew
        ? this.post(options)
        : this.put(options)
    )
  }
}


export default Model
