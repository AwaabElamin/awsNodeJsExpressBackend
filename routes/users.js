var express = require('express');
var router = express.Router();
const JwtManager = require('../jwt/jwtManager');
const authorizationController = require('../controllers/auth');
const usersController = require('../controllers/users');

/* GET users listing. */
router.get('',authorizationController.authorize,usersController.getAll);
// router.get('/', (req, res, next) => {
//     user_email = req.body.user.email;
//     try {
//         req.db.collection('users').find({'user.email': user_email }).toArray()
//             .then(data => {
//                 res.json({status: "success",data: data });
//             });
//     } catch (error) {
//         console.log(error);
//         res.json({ status: "fail", data: error });
//     }
// });

router.post('',usersController.create);
// router.post('/', (req, res, next) => {
//     try {
//         console.log('body',req.body);
//         user_email = req.body.user.email;
//         console.log('post users email', user_email);
//         req.db.collection('users').find({ 'user.email': user_email }).toArray()
//             .then(result => {
//                 console.log('result', result)
//                 if (result.length) {
//                     res.json({ status: 'fail', data: 'there is account with the same email' })
//                 } else {
//                     req.db.collection('users').insertOne(req.body)
//                         .then(data => {
//                             res.json({ status: "success", data: data });
//                         });
//                 }
//             });

//     } catch (error) {
//         // console.log(error);
//         res.json({ status: "fail", data: error });
//     }

// });

router.post('/login', authorizationController.login);
// router.post('/login', function (req, res, next) {
//     const email = req.body.email;
//     const pass = req.body.password;
//     // console.log('email', email);
//     // console.log('password',pass);
//     req.db.collection('users').find({ 'user.email': email, 'user.password': pass }).toArray()
//         .then(result => {
//             // console.log('result', result);
//             if (result[0]) {
//                 // console.log('result= ' + result[0].user.password);
//                 const data = { email: email, password: pass };
//                 const jwt = new JwtManager();
//                 const token = jwt.generate(data);
//                 res.json({ status: 'success', accessToken: token, email: email, _id: result[0]._id });
//                 // console.log('data ' + data);
//             } else {
//                 console.log('nothing');
//                 res.json({ status: 'fail', data: 'invalid email or password' });
//             }
//         })

// });

router.post('/forget',authorizationController.authorize, usersController.update)
// router.post('/forget',(req,res,next)=>{
//     const email = req.body.email;
//     console.log('email', email);
//     const password = req.body.password;
//     req.db.collection('users').updateOne({'user.email':email}, 
//     {
//         $set: {'user.password': password}
//     })
//     .then(result=>{
//         res.json({ status: 'success', data: result });
//     });
// });
module.exports = router;
