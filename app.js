require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
const cors = require('cors');
var cookieParser = require('cookie-parser');
const logger = require('morgan');
const DB = require('./lib/db');

async function start() {
  // Connect to databases before requiring route handlers/models
  try {
    const usersUri = process.env.MONGODB_URI_USERS || process.env.MONGODB_URI || 'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/users?retryWrites=true&w=majority';
    const deliveryUri = process.env.MONGODB_URI_DELIVERY || 'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/Delivery?retryWrites=true&w=majority';
    const resumeUri = process.env.MONGODB_URI_RESUME || 'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/resume?retryWrites=true&w=majority';
    const carshopUri = process.env.MONGODB_URI_CARSHOP || 'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/CarShop?retryWrites=true&w=majority';

    console.log('Connecting to default (users) MongoDB...');
    await DB.connect(usersUri);
    console.log('Connected to users DB');

    console.log('Creating named connections for resume, carshop and delivery...');
    await DB.createConnection('resume', resumeUri);
    await DB.createConnection('carshop', carshopUri);
    await DB.createConnection('delivery', deliveryUri);
    console.log('All DB connections are ready');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }

  // Now set up the app (require routes after DB connections ready)
  var path = require('path');
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

  // require routers after DB is set up so models can read connections

  const authorizeRouter = require('./routes/auth');
  const usersRouter = require('./routes/users');
  const educationRouter = require('./routes/education');
  const experienceRouter = require('./routes/experience');
  const projectRouter = require('./routes/project');
  const mainMainRouter = require('./routes/mainMain');
  var indexRouter = require('./routes/index');
  const autoRouter = require('./routes/auto');

  app.use('/', authorizeRouter);
  app.use('/users', usersRouter);
  app.use('/education', educationRouter);
  app.use('/experience', experienceRouter);
  app.use('/projects', projectRouter);
  app.use('/mainMain', mainMainRouter);
  app.use('/auto',autoRouter)

  // error handler
  app.use(function (err, req, res, next) {
    // render the error page
    // res.status(err.status || 500);
    res.json({ status: 'error', data: err });
  });

  app.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port', process.env.PORT || 3000);
  });
}

start();
