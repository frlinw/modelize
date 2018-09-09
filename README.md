# Modelize.js

Parse & valid data based on explicit model definition

## Installation

`npm install @frlinw/modelize.js`

## Configuration

Create a config file:
- Config the base url for api call
- Add new data types
- Override existing data types

```javascript
import Modelize from '@/node_modules/@frlinw/modelize.js/lib/index.js'

import { isMoment, strToMoment } from '@/src/services/date.js'


// Config
Modelize.Model.config({
  baseUrl: ENV.BACKEND_URL,
  // Support for moment date instead of native javascript Date
  isDate: (value) => isMoment(value),
  toDate: (moment) => moment.toDate(),
  parseDate: (dateString) => strToMoment(dateString)
})

const Model = Modelize.Model
const DataTypes = Model.DataTypes


// Add a new type
DataTypes.NEWTYPE = {
  defaultValue: '' // or a function
  isValid: (value) => true
  isBlank: (value) => value === ''
  // Format data Client to Server (JS to JSON)
  formatForServer: (value) => value
  // Format data Server to Client (JSON to JS) or Client to Client (JS to JS)
  formatForClient: (value) => value
}


export {
  Model,
  DataTypes
}
```

## Model definition

Example of a User model

```javascript
import { Model, DataTypes } from '../config/modelize.js'

import Sponsor from './Sponsor.js'
import Profile from './Profile.js'
import Guest from './Guest.js'


class User extends Model {
  static init () {
    return super.init({
      id: {
        type: DataTypes.UUID,
        pk: true
      },
      createdAt: {
        type: DataTypes.DATETIME
      },
      firstName: {
        type: DataTypes.STRING
      },
      lastName: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.EMAIL
      },
      password: {
        type: DataTypes.STRING
      },
      phone: {
        type: DataTypes.PHONE,
        allowBlank: true
      },
      address: {
        type: DataTypes.ADDRESS,
        allowBlank: true
      },
      role: {
        type: DataTypes.STRING
      },
      isActive: {
        type: DataTypes.BOOLEAN
      },
      // One-to-Many relation
      sponsor: {
        type: DataTypes.REFERENCE(Sponsor)
      },
      // One-to-One relation
      profile: {
        type: DataTypes.EXTENSION(Profile)
      },
      // Many-to-One relation
      friends: {
        type: DataTypes.COLLECTION(Friend)
      },
      // Virtual fields
      newEmail: {
        type: DataTypes.EMAIL
      },
      newPassword: {
        type: DataTypes.STRING
      }
    }, {
      endpoint: 'private/users'
      requireAuth: true
    })
  }
}


export default User.init()
```

field options

```javascript
{
  fieldname: {
    type: // required | undefined
    defaultValue: // optional | type.default
    allowBlank: // optional | false
    valid: // optional | (value, data) => true
    pk: true // required for one field in the schema definition
  }
}
```

## Usage

```javascript
import User from '@/src/models/User.js'

// Request result will mutate user data
// data will be reactives if you use it with Vue
const users = await User.buildCollection()
await users.getCollection()

const user = await User.build()
await user.get({
  pk: '10000' // required | null
})

// Data validation is required before .put, .post
// A 'validationerror' event will be emitted on fail
user.valid([
  // Validation of direct field
  'firstName',
  // Nested validation of extension
  {
    'profile': [
      'picture'
    ]
  },
  // Nested validation of reference
  {
    'sponsor': [
      'name'
    ]
  },
  // Nested validation of collection
  [
    'friends', [
      'firstName',
      'kindness'
    ]
  ]
])

// put, post methods send data processed by .valid
await user.put|post({
  url: 'requestPassword' // optional | ''
  pk: 'bonjou@example.com' // optional | primary key field
})

// Sugar method: put or post depends of user origin (server or client side)
await user.save()
```

