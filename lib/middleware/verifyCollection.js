'use strict'

const { JoiRG, validate, checkValidation } = require('../routes/helpers')

module.exports = function verifyCollection (req, res, next) {
  const collName = req.pathParams.collection
  const result = validate([collName], [JoiRG.string().collection().required()])

  try {
    checkValidation(result)
  } catch (e) {
    return res.throw(404, e.message)
  }

  next()
}
