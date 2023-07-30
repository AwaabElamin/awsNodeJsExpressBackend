var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
    try {
        req.db.collection('resume').find().toArray()
            .then(data => {
                res.json({
                    status: "success",
                    summary: data[0].summary,
                    Education: data[0].Education,
                    Certificate: data[0].Certificate,
                    Experience: data[0].Experience
                });
            });

    } catch (error) {
        console.log(error);
        res.json({ status: "fail", data: error });
    }
}
);

module.exports = router;