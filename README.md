# Modelize

Model based Rest API manager.

Retrieve, parse, valid, transform and save data.

Designed to work with [Vue](https://vuejs.org/) reactivity system.

## Installation

`npm install @frlinw/modelize`

## TODO
- Build & release workflow
- Tests

## Create a configuration file

```javascript
import Modelize from '@frlinw/modelize'


// Main config
Modelize.config({
  // Base URL for API call
  baseUrl: 'https://api.example.com',
  // Active authorization header for every API call
  // authToken is required if requireAuth is set to true
  requireAuth: true,
  authToken: () => localStorage.get('authToken')
})


// Add a new type
Modelize.addDataType('NEWTYPE', {
  defaultValue: '' // primitive value or function
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
      // One-to-One relation
      profile: {
        type: DataTypes.HASONE(Profile)
      },
      // One-to-Many relation
      plans: {
        type: DataTypes.HASMANY(Plan)
      },
      // Many-to-One relation
      sponsor: {
        type: DataTypes.BELONGSTO(Sponsor)
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
    isValid: // optional | (value, data) => true
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
      user: new User({}),
      // Create an empty collection of your app plans
      plans: new Plan([])
    }
  },

  async created () {
    // Note:
    // Data will be reactives
    // Result fetched from api will mutate data

    // A 'ModelizeFetchError' event will be emitted if there is a fail from the Fetch API

    // Get all plans of your app
    // Options:
    // {
    //   url: '' // optional
    // }
    // Flags:
    // this.plans.fetchInProgress
    // this.plans.fetchSuccess
    // this.plans.fetchSuccessOnce()
    // this.plans.fetchFailure
    await this.plans.getCollection()

    if (this.id) {
      // Get the existing user if there is an id in the URL
      // Options:
      // {
      //   pk: '', // required
      //   url: '' // optional
      // }
      // Flags:
      // this.user.fetchInProgress
      // this.user.fetchSuccess
      // this.user.fetchSuccessOnce()
      // this.user.fetchFailure
      // this.user.saveInProgress
      // this.user.saveSuccess
      // this.user.saveFailure
      await this.user.get({ pk: this.id })
    }
  },

  methods: {
    async saveUser () {
      if (
        // Data validation is required before .put, .post
        // A 'ModelizeValidationError' event will be emitted on fail
        this.user.valid([
          // Validation of direct field
          'firstName',
          // Nested validation of BELONGSTO
          {
            'sponsor': [
              'code'
            ]
          },
          // Nested validation of HASONE
          {
            'profile': [
              'picture'
            ]
          },
          // Nested validation of HASMANY
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

        if (this.user.saveSuccess) {
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
          v-for="plan of plans.items()"
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
        <span v-if="user.saveInProgress">Save in progress</span>
        <span v-else>Save</span>
      </button>
    </form>
  </div>

</template>

```
