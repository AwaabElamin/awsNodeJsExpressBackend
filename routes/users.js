var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.post('/',(req,res,next)=>{
  const data = req.body;
    const request = {
        user_id: data.user_id,
        city: data.city,
        state: data.state,
        title: data.title,
        phone: data.phone,
        username: data.username,
        details: data.details
    };
    req.db.collection('users').insertOne(request)
        .then(data => {
            res.json({ status: "success", data: data });
        }).catch(error => res.json({ status: "fail", data: error }))
});

module.exports = router;
