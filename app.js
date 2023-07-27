var createError = require('http-errors');
var express = require('express');
const cors = require('cors');
var cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
var path = require('path');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const connectoinString =
    'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/myweb2?retryWrites=true&w=majority'

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
let db = { status: "Faild to connect" }
app.use((req, res, next) => {
  MongoClient.connect(connectoinString, { useUnifiedTopology: true })
      .then(client => {
          db = client.db('Delivery');
          if (db.status === "Faild to connect") {
              return res.json({ status: 'Faild to connect to DB' });
          }else{
            console.log("connect to Mongo DB...");
            req.db = db;
            next();
            // return;
          }
          req.db = db;
          // console.log('req.db ' + req.db);
          if (req.url === '/authorize') {
              // console.log(req.url);
              next();
              return;
          }
          const header = req.headers.authorization;
          // if (!header) {
          //     return res.json({ status: 'auth_error' });
          // } else {
          //     const jwt = new jwtManager();
          //     const data = jwt.verify(header.split(' ')[1]);
          //     // console.log(data);
          //     if (!data) {
          //         return res.json({ status: 'auth_err' });
          //     }
          //     next();
          // }
      })
});
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// module.exports = app;
app.listen(3000);
