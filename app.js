var createError = require('http-errors');
var express = require('express');
const cors = require('cors');
var cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const jwtManager = require('./jwt/jwtManager');
var path = require('path');
var logger = require('morgan');
const authorizeRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const projectRouter = require('./routes/project');
const mainMainRouter = require('./routes/mainMain');
var indexRouter = require('./routes/index');
const resumeRoute = require('./routes/resume');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use('/', authorizeRouter);
app.use('/users', usersRouter);
app.use('/resume', resumeRoute);
app.use('/projects', projectRouter);
app.use('/mainMain', mainMainRouter);

// error handler
app.use(function (err, req, res, next) {
  // render the error page
  // res.status(err.status || 500);
  res.json({ status: 'error', data: err });
});

// module.exports = app;
app.listen(3000);
