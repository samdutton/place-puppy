const express = require('express')
const router = express.Router()
const imageController = require('../logic/controllers/images.controller')
const indexController = require('../logic/controllers/index.controller')
const imageMiddleware = require('../logic/middleware/images.middleware.js')
const debug = require('debug')
const log = debug('app:log')
const error = debug('app:error')
const count = debug('app:count')
let siteCount = 0

// show index
router.get('/', (req, res) => {
  siteCount++
  count('Count', siteCount)
  return indexController.showIndex(res, res)
})
// show img- use middleware when returning img dims
router.get(
  '^/:dimensions([0-9]+[x][0-9]+)',
  imageMiddleware.qualityMiddleware,
  imageMiddleware.returnImageFormat,
  (req, res) => {
    siteCount++
    count('Count', siteCount)
    imageController.showImage(req, res, req.quality, req.format)
  }
)

module.exports = router
