'use strict'

const { chain } = require('lodash')
const { getAST } = require('../operations/helpers')
const Joi = require('joi')

// Public
const getCRUDErrors = function getCRUDErrors (result) {
  return chain(result).map('errorNum').compact().countBy().map((val, key) => `${key}:${val}`).join().value()
}

const joiCG = Joi.extend(Joi => ({
  base: Joi.string(),
  name: 'string',
  language: {
    filter: 'must be a valid filter expression (see docs).'
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
    }
  ]
}))

module.exports = {
  getCRUDErrors,
  joiCG
}
