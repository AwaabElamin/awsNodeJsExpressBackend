var createError = require('http-errors');
var express = require('express');
const cors = require('cors');
var cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const jwtManager = require('./jwt/jwtManager');
var path = require('path');
var logger = require('morgan');
const autherizeRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

var indexRouter = require('./routes/index');
const resumeRoute = require('./routes/resume');

var app = express();
const connectoinString =
  'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/Delivery?retryWrites=true&w=majority'
try {
  mongoose.connect(connectoinString);
  console.log("DB connected");
} catch (error) {
  console.log('Error: ', err);
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
// let db = { status: "Faild to connect" }
// app.use((req, res, next) => {
//   MongoClient.connect(connectoinString, { useUnifiedTopology: true })
//       .then(client => {
//           db = client.db('Delivery');
//           if (db.status === "Faild to connect") {
//               return res.json({ status: 'Faild to connect to DB' });
//           }
//             console.log("connect to Mongo DB...");
//             req.db = db;
//           // console.log('req.db ' + req.db);
//           if ((req.url === '/resume') || (req.url === '/users/login') || (req.url == '/users') || (req.url == '/users/forget')) {
//               // console.log(req.url);
//               next();
//               return;
//           }
//           const header = req.headers.authorization;
//           console.log('header', header);
//           if (!header){
//             return res.json({ status: 'auth_error', data: 'no header' });
//           }           
//           else {
//               const jwt = new jwtManager();
//               console.log("header.split(' ')[1]",header.split(' ')[1])
//               const data = jwt.verify(header.split(' ')[1]);
//               console.log('data',data);
//               if (!data) {
//                   return res.json({ status: 'auth_err' });
//               }
//               next();
//           }
//       })
// });
// app.use('/', indexRouter);
app.use('/', autherizeRouter);
app.use('/users', usersRouter);
app.use('/resume', resumeRoute);

// error handler
app.use(function (err, req, res, next) {
  // render the error page
  // res.status(err.status || 500);
  res.json({ status: 'error', data: err });
});

// module.exports = app;
app.listen(3000);
