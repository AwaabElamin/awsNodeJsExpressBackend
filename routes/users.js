var express = require('express');
var router = express.Router();
const JwtManager = require('../jwt/jwtManager');
const authorizationController = require('../controllers/auth');
const usersController = require('../controllers/users');

/* GET users listing. */
router.get('',authorizationController.authorize,usersController.getAll);
router.post('',usersController.create);
router.post('/login', authorizationController.login);
router.post('/forget',usersController.update);
module.exports = router;
