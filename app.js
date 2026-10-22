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
    const usersUri = process.env.MONGODB_URI_USERS || process.env.MONGODB_URI;

    console.log('Connecting to default (users) MongoDB...');
    await DB.connect(usersUri);
    console.log('Connected to users DB');

    console.log('Creating named connections for resume, carshop and delivery...');
    await DB.createConnection('resume', usersUri, { dbName: process.env.MONGODB_DB_RESUME || 'resume' });
    await DB.createConnection('carshop', usersUri, { dbName: process.env.MONGODB_DB_CARSHOP || 'CarShop' });
    await DB.createConnection('delivery', usersUri, { dbName: process.env.MONGODB_DB_DELIVERY || 'Delivery' });
    await DB.createConnection('groceries', usersUri, { dbName: process.env.MONGODB_DB_GROCERIES || 'Groceries' });
    await DB.createConnection('property-management', usersUri, {
      dbName: process.env.MONGODB_DB_PROPERTY_MANAGEMENT || 'PropertyManagement'
    });
    const PropertyAccount = require('./propertyManagement/models/Account');
    if (await PropertyAccount.countDocuments() === 0) {
      await PropertyAccount.create([
        { code: '1010', name: 'Cash', type: 'asset', is_system: true },
        { code: '1020', name: 'Bank', type: 'asset', is_system: true },
        { code: '2010', name: 'Owner payable', type: 'liability', is_system: true },
        { code: '2020', name: 'Security deposits', type: 'liability', is_system: true },
        { code: '2030', name: 'VAT payable', type: 'liability', is_system: true },
        { code: '4010', name: 'Commission revenue', type: 'revenue', is_system: true },
        { code: '4020', name: 'Brokerage revenue', type: 'revenue', is_system: true },
        { code: '5010', name: 'Maintenance expenses', type: 'expense', is_system: true }
      ]);
    }
    console.log('All DB connections are ready');
    const { Seller, Payment } = require('./models/payment');
    await Promise.all([Seller.init(), Payment.init()]);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }

  // Now set up the app (require routes after DB connections ready)
  var path = require('path');
  var app = express();
  app.set('trust proxy', 1);

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(cors());

  const uploadsDir = path.join(__dirname, 'uploads');
  require('fs').mkdirSync(uploadsDir, { recursive: true });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'awsNodeJsExpressBackend' });
  });

  // require routers after DB is set up so models can read connections

  const authorizeRouter = require('./routes/auth');
  const usersRouter = require('./routes/users');
  const educationRouter = require('./routes/education');
  const experienceRouter = require('./routes/experience');
  const projectRouter = require('./routes/project');
  const mainMainRouter = require('./routes/mainMain');
  var indexRouter = require('./routes/index');
  const autoRouter = require('./routes/auto');
  const groceriesRouter = require('./routes/groceries');
  const clientBriefsRouter = require('./routes/clientBriefs');
  const adminUsersRouter = require('./routes/adminUsers');
  const propertyManagementRouter = require('./propertyManagement/routes');

  app.use('/', authorizeRouter);
  app.use('/users', usersRouter);
  app.use('/education', educationRouter);
  app.use('/experience', experienceRouter);
  app.use('/projects', projectRouter);
  app.use('/mainMain', mainMainRouter);
  app.use('/auto',autoRouter)
  app.use('/groceries', groceriesRouter);
  app.use('/payments', require('./routes/payments'));
  app.use('/client-briefs', clientBriefsRouter);
  app.use('/admin/users', adminUsersRouter);
  app.use('/property-management/api', propertyManagementRouter);
  app.use(
    '/property-management/uploads',
    express.static(path.join(__dirname, 'uploads'))
  );

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
