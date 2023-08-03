var express = require('express');
var router = express.Router();
const JwtManager = require('../jwt/jwtManager');

/* GET users listing. */
router.get('/', (req, res, next) => {
    try {
        req.db.collection('users').find().toArray()
            .then(data => {
                res.json({
                    status: "success",
                    data: data
                });
            });

    } catch (error) {
        console.log(error);
        res.json({ status: "fail", data: error });
    }
});
router.post('/', (req, res, next) => {
    try {
        email = req.body.email;
        console.log('post users email', email);
        req.db.collection('users').find({ 'user.email': email }).toArray()
            .then(result => {
                console.log('result', result[0])
                if (result) {
                    res.json({ status: 'fail', data: 'there is account with the same email' })
                } else {
                    req.db.collection('users').insertOne(req.body)
                        .then(data => {
                            res.json({ status: "success", data: data });
                        });
                }
            });

    } catch (error) {
        // console.log(error);
        res.json({ status: "fail", data: error });
    }

});
router.post('/login', function (req, res, next) {
    const username = req.body.username;
    const pass = req.body.password;
    req.db.collection('users').find({ username: username, password: pass }).toArray()
        .then(result => {
            if (result[0]) {
                console.log('result= ' + result[0].password);
                const data = { username: username, password: pass };
                const jwt = new JwtManager();
                const token = jwt.generate(data);
                res.json({ status: 'success', accessToken: token, username: username, _id: result[0]._id });
                console.log('data ' + data);
            } else {
                console.log('nothing');
                res.json({ status: 'fail', data: 'invalid user name' });
            }
        })

});

module.exports = router;
