'use strict'

const { chain, find } = require('lodash')
const { getAST } = require('../operations/helpers')
const Joi = require('joi')
const { db } = require('@arangodb')

// Public
const getCRUDErrors = function getCRUDErrors (result) {
  return chain(result).map('errorNum').compact().countBy().map((val, key) => `${key}:${val}`).join().value()
}

const JoiRG = Joi.extend(Joi => ({
  base: Joi.string(),
  name: 'string',
  language: {
    filter: 'must be a valid filter expression (see docs).',
    collection: 'collection does not exist in DB.'
  },
  rules: [
    {
      name: 'filter',
      validate (params, value, state, options) {
        try {
          getAST(value)

          return value
        } catch (e) {
          console.error(e.stack)

          return this.createError('string.filter', { v: value }, state, options)
        }
      }
    },
    {
      name: 'collection',
      validate (params, value, state, options) {
        const coll = db._collection(value)
        if (!coll) {
          return this.createError('string.collection', { v: value }, state, options)
        }

        return value
      }
    }
  ]
}))

function validate (values, schemas) {
  const results = {
    valid: true,
    values: [],
    errors: []
  }

  values.forEach((value, i) => {
    const schema = schemas[i]
    const res = JoiRG.validate(value, schema)

    results.values.push(res.value)
    results.errors.push(res.error)

    if (res.error) {
      results.valid = false
    }
  })

  return results
}

function checkValidation (result) {
  if (!result.valid) {
    throw find(result.errors)
  }
}

module.exports = {
  getCRUDErrors,
  JoiRG,
  validate,
  checkValidation
}
