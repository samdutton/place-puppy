require('dotenv').config()
const express = require('express')
const path = require('path')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)

const debug = require('debug')
const log = debug('app:log')
const error = debug('app:error')

var index = require('./routes/index')

var app = express()
// / MONGO
var mongoose = require('mongoose')

var mongoDB = process.env.DB_URI //
mongoose.connect(mongoDB)

var db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error'))
log('db connected')
db.once('open', function () {
  // we're connected!
})

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.locals.title = 'placepuppy'

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieParser(''))
app.use(
  session({
    secret: process.env.SECRET,
    store: new MongoStore({ mongooseConnection: db }),
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
)

app.use(express.static(path.join(__dirname, 'public')))
app.use('/', index)

// // catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('404 Not Found')
  err.status = 404
  next(err)
})
const errorController = require('./logic/controllers/error.controller')
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}
  res.status(err.status || 500)
  // render the error page
  errorController.showErrorPage(req, res, err)
})

module.exports = app
