var express = require('express');
const cors = require('cors');
var cookieParser = require('cookie-parser');
var path = require('path');
var logger = require('morgan');
const authorizeRouter = require('./routes/auth');
const resumeRoute = require('./routes/resume');
const healthRouter = require('./routes/health');

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
app.use('/resume', resumeRoute);
app.use('/health', healthRouter);

// error handler
app.use(function (err, req, res, next) {
  // render the error page
  // res.status(err.status || 500);
  res.json({ status: 'error', data: err });
});
// Export the express app; `bin/www` starts the server and manages the process.
module.exports = app;
