# Modelize

Model based Rest API manager.

Retrieve, parse, valid, transform and save data.

Full featured & designed to work with [Vue](https://vuejs.org/) reactivity system.

## Installation

`npm install @frlinw/modelize`

## TODO
- Build & release workflow
- Tests

## Configuration

Create a config file:
- Config the base url for api call
- Add new data types

```javascript
import Modelize from '@frlinw/modelize'

import moment from 'moment'


// Config
Modelize.config({
  baseUrl: 'https://api.example.com',
  requireAuth: true,
  getAuthToken: () => localStorage.get('authToken'),
  // Support for moment date instead of native javascript Date
  isDate: (value) => moment.isMoment(value),
  toDate: (momentDate) => momentDate.toDate(),
  parseDate: (dateString) => moment(dateString)
})


// Add a new type
Modelize.addDataType('NEWTYPE', {
  defaultValue: '' // or a function
  isValid: (value) => true
  isBlank: (value) => value === ''
  // Format data before save
  beforeSave: (value) => value
  // Format data before build
  beforeBuild: (value) => value
})


export const Model = Modelize.Model
export const DataTypes = Modelize.DataTypes
```

## Model definition

Example of a User model

```javascript
import { Model, DataTypes } from '../config/modelize.js'

import Sponsor from './Sponsor.js'
import Profile from './Profile.js'
import Plan from './Plan.js'


class User extends Model {
  static init () {
    return super.init({
      id: {
        type: DataTypes.UUID,
        primaryKey: true
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
      plans: {
        type: DataTypes.COLLECTION(Plan)
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
    type: // required
    defaultValue: // optional | type.default
    allowBlank: // optional | false
    valid: // optional | (value, data) => true
    primaryKey: true // required for one field in the schema definition
  }
}
```

## Example in Vue

UserEdit.vue

```javascript
<script>

import User from '@/src/models/User.js'
import Plan from '@/src/models/Plan.js'


export default {
  props: {
    id: {
      type: String
    }
  },

  data () {
    return {
      // Create a new user with default values
      user: User.build(),
      // Create an empty collection of your app plans
      plans: Plan.buildCollection()
    }
  },

  async created () {
    // Note:
    // Data will be reactives
    // Result fetched from api will mutate data

    // Get all plans of your app
    // Options:
    // {
    //   url: '' // optional
    // }
    // Flags:
    // this.plans.$states.fetchInProgress
    // this.plans.$states.fetchSuccess
    // this.plans.$states.fetchSuccessOnce
    // this.plans.$states.fetchFailure
    await this.plans.getCollection()

    if (this.id) {
      // Get the existing user if there is an id in the URL
      // Options:
      // {
      //   pk: '', // required
      //   url: '' // optional
      // }
      // Flags:
      // this.user.$states.fetchInProgress
      // this.user.$states.fetchSuccess
      // this.user.$states.fetchSuccessOnce
      // this.user.$states.fetchFailure
      // this.user.$states.saveInProgress
      // this.user.$states.saveSuccess
      // this.user.$states.saveFailure
      await this.user.get({ pk: this.id })
    }
  },

  methods: {
    async saveUser () {
      if (
        // Data validation is required before .put, .post
        // A 'validationerror' event will be emitted on fail
        this.user.valid([
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
              'code'
            ]
          },
          // Nested validation of collection
          [
            'plans', [
              'name',
              'price'
            ]
          ]
        ])
      ) {
        // .save() is a syntax sugar for .put() or .post()
        // {
        //   pk: '' // optional. default is primary key field.
        //   url: '' // optional
        // }
        await this.user.save()

        if (this.user.$states.saveSuccess) {
          if (this.id) {
            console.log('Yeah! user updated !')
          } else {
            console.log('Yeah! user created !')
          }
        }
      }
    }
  }
}

</script>
```

```html
<template>

  <div>
    <h1>User example</h1>

    <form
      id="UserEdit"
      @submit.prevent="saveUser()"
    >
      <div :class="{ 'form-error': user.error('firstName') }">
        <input
          v-model="user.firstName"
          type="text"
          placeholder="Firstname"
        >
      </div>

      <div :class="{ 'form-error': user.profile.error('picture') }">
        <input
          v-model="user.profile.picture"
          type="file"
          placeholder="Avatar"
        >
      </div>

      <div :class="{ 'form-error': user.sponsor.error('code') }">
        <input
          v-model="user.sponsor.code"
          type="text"
          placeholder="Sponsor code"
        >
      </div>

      <div :class="{ 'form-error': user.error('plans') }">
        <div
          v-for="plan in plans.items()"
          :key="plan.id"
        >
          <label>
            <input
              type="checkbox"
              :value="user.plans.exists(plan)"
              @change="user.plans.toggle(plan)"
            >
            {{plan.name}} - {{plan.price}}
          </label>
        </div>
      </div>

      <button type="submit">
        <span v-if="user.$states.saveInProgress">Save in progress</span>
        <span v-else>Save</span>
      </button>
    </form>
  </div>

</template>

```
