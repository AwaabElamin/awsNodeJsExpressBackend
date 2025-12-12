try {
  require('../controllers/auth');
  console.log('auth module imported');
} catch (e) {
  console.error('error importing auth', e);
}
