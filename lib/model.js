import {
  has,
  isFunction,
  isArray,
  isObject,
  isString,
  isDate
} from './utils/validation.js'


class Model {
  static config (options = {}) {
    this.configured = true

    this.endpoint = ''
    this.requireAuth = false
    this.collectionKey = 'list'
    this.collectionPattern = {
      count: 'count',
      data: 'rows'
    }

    if (options.baseUrl) {
      this.baseUrl = options.baseUrl
    } else {
      throw new Error(`[Modelize][Config] baseUrl is required`)
    }

    if (options.requireAuth) {
      this.requireAuth = options.requireAuth
    }
    if (options.authToken) {
      this.authToken = options.authToken
    }
    if (this.requireAuth && !this.authToken) {
      throw new Error(`[Modelize][Config] authToken is required if requireAuth is enabled`)
    }

    if (
      options.collectionPattern &&
      options.collectionPattern.count &&
      options.collectionPattern.data
    ) {
      this.collectionPattern = options.collectionPattern
    }
  }

  static init (schema, options = {}) {
    if (!this.configured) {
      throw new Error(`[Modelize][Config] Model.config() is required before any Model.init()`)
    }

    // Prebuild the url
    if (options.endpoint) {
      this.endpoint = options.endpoint
      this.requestUrl = `${this.baseUrl}/${this.endpoint}`
    }

    // Override global requireAuth
    if ('requireAuth' in options) {
      this.requireAuth = options.requireAuth
    }
    if ('authToken' in options) {
      this.authToken = options.authToken
    }
    if (this.requireAuth && !this.authToken) {
      throw new Error(`[Modelize][Init] authToken is required if requireAuth is enabled`)
    }

    // Parse schema fields to set default values for each option
    this.schema = schema
    this.primaryKeyFieldname = null

    for (const fieldname in this.schema) {
      const fieldconf = this.schema[fieldname]

      // Type is a required param
      if (!('type' in fieldconf)) {
        throw new Error(`[Modelize][Init] \`type\` is required on field '${fieldname}'`, schema)
      }

      // Set the primary key
      if (fieldconf.primaryKey) {
        this.primaryKeyFieldname = fieldname
      }

      // Define the default value
      const defaultValue = 'defaultValue' in fieldconf
        ? fieldconf.defaultValue
        : fieldconf.type.defaultValue

      // Optimization: Unsure the default value is a function (avoid type check on runtime)
      fieldconf.defaultValue = isFunction(defaultValue)
        ? defaultValue
        : () => defaultValue

      // Default blank is restricted
      if (!('allowBlank' in fieldconf)) {
        fieldconf.allowBlank = false
      }

      // Default valid method is permissive
      if (!('isValid' in fieldconf)) {
        fieldconf.isValid = () => true
      }

      // Require validation as a default except for primary key and timestamp fields
      fieldconf.bypassValidation = fieldconf.primaryKey || ['createdAt', 'updatedAt'].includes(fieldname) || false
    }

    if (this.primaryKeyFieldname === null) {
      throw new Error(`[Modelize][Model] Required property 'primaryKey' not found in the schema`, schema)
    }

    return this
  }


  /*****************************************************************
  * Fetch helpers
  *****************************************************************/

  static _buildRequestUrl ({ pk, action, params }) {
    let requestUrl = this.requestUrl

    if (pk) {
      requestUrl += `/${pk}`
    }
    if (action) {
      requestUrl += `/${action}`
    }
    if (params) {
      requestUrl += `?${
        Object.entries(params)
          .map(([key, value]) => {
            if (isDate(value)) {
              value = value.toISOString()
            }
            return `${key}=${encodeURIComponent(value)}`
          })
          .join('&')
      }`
    }

    return requestUrl
  }

  static async _buildRequestInit (data, method, signal = null) {
    const requestInit = {
      method: method,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: signal
    }

    // Set Authorization header for private api
    if (this.requireAuth) {
      const token = await this.authToken()

      if (!token) {
        throw new Error(`[Modelize][Fetch] Impossible to get the auth token to access ${this.requestUrl}`)
      }

      requestInit.headers['Authorization'] = `Bearer ${token}`
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Extract validated data only
      requestInit.body = data.toJSON()
    }

    return requestInit
  }

  static _hasMatchedCollectionPattern (serverData) {
    return (
      has(serverData, this.collectionPattern.count) &&
      has(serverData, this.collectionPattern.data)
    )
  }


  /*****************************************************************
  * Format data before use in front
  *****************************************************************/

  static _buildRawItem (item = {}) {
    const rawItem = {}

    const primaryKey = item['primaryKey'] || item[this.primaryKeyFieldname] || this.schema[this.primaryKeyFieldname].defaultValue()

    // Build the item with default values
    for (const fieldname in this.schema) {
      if (fieldname === this.primaryKeyFieldname) {
        rawItem[fieldname] = primaryKey
      } else if (has(item, fieldname)) {
        rawItem[fieldname] = item[fieldname]
      } else {
        rawItem[fieldname] = this.schema[fieldname].defaultValue(primaryKey) // primaryKey params is necessary for HASONE datatype
      }
    }

    return rawItem
  }


  static _buildValidator () {
    const validator = {}

    // Build the base validator
    for (const fieldname in this.schema) {
      const fieldconf = this.schema[fieldname]

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
    options = Object.assign({
      isNew: true,
      isCustom: false
    }, options)

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
        validator: this.constructor._buildValidator(),
        states: {
          fetchInProgress: false,
          fetchSuccessOnce: false,
          fetchSuccess: false,
          fetchFailure: false,
          saveInProgress: false,
          saveSuccess: false,
          saveFailure: false
        },
        originalData: Object.freeze(data) // freeze to skip reactivity
      }

      // Format recursively existing fields only
      for (const fieldname in data) {
        const value = data[fieldname]
        // Try to format the value
        this[fieldname] = has(this.constructor.schema, fieldname)
          ? this.constructor.schema[fieldname].type.beforeBuild(value, options)
          : value
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
      for (const key in newData) {
        if (has(newData, key)) {
          const value = newData[key]
          // Recursive mutation
          if (value instanceof Model) {
            this[key]._mutateData(value)
          // Mutate only some keys
          } else if (key === '$modelize') {
            this[key].isNew = value.isNew
            this[key].isCustom = value.isCustom
            this[key].originalData = value.originalData
          // Basic fields
          } else {
            this[key] = value
          }
        }
      }
    }
  }

  toJSON () {
    return JSON.stringify(this._beforeSave())
  }

  /**
   * Format collections and objects to use in back
   */
  _beforeSave () {
    if (this.isCollection()) {
      return this._beforeSaveCollection()
    } else {
      return this._beforeSaveItem()
    }
  }

  /**
   * Format data recursively based on schema definition
   */
  _beforeSaveCollection () {
    return this.items().map(item => item._beforeSaveItem())
  }

  /**
   * Format data recursively based on schema definition
   */
  _beforeSaveItem () {
    const newItem = {}

    for (const fieldname in this.$modelize.validator) {
      const validator = this.$modelize.validator[fieldname]
      const value = this[fieldname]

      if (validator.checked && validator.isValid(value, this)) {
        newItem[fieldname] = this.constructor.schema[fieldname].type.beforeSave(value)
      }
    }

    return newItem
  }

  /**
   * Proceed to the HTTP request
   * - Preformat data for backend compatibility
   * - Build API URL
   * - Postformat data for frontend compatibility
   */
  async fetch (options) {
    if (!this.constructor.endpoint) {
      throw new Error('[Modelize][Fetch] endpoint is required to perform a request')
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
    const requestUrl = this.constructor._buildRequestUrl(options)
    const requestInit = await this.constructor._buildRequestInit(this, options.method, abortController.signal)
    // Prepare fetch request
    const fetchRequest = new Request(requestUrl, requestInit)
    let fetchResponse

    try {
      const abortTimeout = setTimeout(() => {
        abortController.abort()
        throw new Error()
      }, 20000)

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
    let serverData = await fetchResponse.json()

    let data = serverData
    const dataOptions = {
      isNew: false,
      isCustom: this.$modelize.isCustom
    }

    if (this.constructor._hasMatchedCollectionPattern(serverData)) {
      data = serverData[this.constructor.collectionPattern.data]
      dataOptions.count = serverData[this.constructor.collectionPattern.count]
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
   * @param {Object, function} ref - item (with the primary key) to remove
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
   * @param {Object} item - item (with the primary key) to add or remove
   */
  toggle (item, check = null) {
    const ref = check || item

    if (this.exists(ref)) {
      return this.remove(ref)
    } else {
      return this.add(item)
    }
  }

  /**
   * Retrieve a collection of items
   * @param {object} options
   *  - action: custom action
   *  - params: params to send in the url
   */
  getCollection (options = {}) {
    const params = options.params || {}

    if (!params.limit) params.limit = 20
    if (!params.offset) params.offset = 0

    return this.fetch({
      method: 'GET',
      action: options.action || '',
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
      action: this.$modelize.fetch.options.action || '',
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
    return this.$modelize.originalData
  }

  /**
   * Valid a list of fields
   * @param {array} fieldlist list of fieldname
   * @return {object} { isValid<Boolean>, errors<Array> }
   */
  _validQuietly (fieldlist) {
    if (!isArray(fieldlist)) {
      throw new Error(`[Modelize][Validation] .valid() params must be an array`, fieldlist)
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
   * @event ModelizeValidationError emitted if the return value is false
   */
  valid (fieldlist) {
    const { isValid, errors } = this._validQuietly(fieldlist)

    if (!isValid) {
      document.dispatchEvent(new CustomEvent('ModelizeValidationError', {
        detail: errors
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
   *  - action: custom action
   */
  get (options) {
    if (!has(options, 'pk')) {
      throw new Error(`[Modelize][Fetch] get(options) method requires 'pk' in options`)
    }

    return this.fetch({
      method: 'GET',
      pk: options.pk,
      action: options.action || ''
    })
  }

  /**
   * Create a new item
   * @param {object} options
   *  - action: custom action
   */
  post (options = {}) {
    return this.fetch({
      method: 'POST',
      action: options.action || ''
    })
  }

  /**
   * Update an item
   * @param {object} options
   *  - pk: item reference (default: value of the primary key field)
   *  - action: custom action
   */
  put (options = {}) {
    return this.fetch({
      method: 'PUT',
      pk: options.pk || this[this.constructor.primaryKeyFieldname],
      action: options.action || ''
    })
  }

  /**
   * Partial update of an item
   * @param {object} options
   *  - pk: item reference (default: value of the primary key field)
   *  - action: custom action
   */
  patch (options = {}) {
    return this.fetch({
      method: 'PATCH',
      pk: options.pk || this[this.constructor.primaryKeyFieldname],
      action: options.action || ''
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
