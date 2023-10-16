var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const resumeSchema = mongoose.Schema({
    summary: { type: String, unique: true },
    Education: { type: String },
    Certificate:  {
        Associate: {type:String},
        Certificates: {type:String}
    } ,
    Experience: {
        Infosys: {type:String},
        AwaaabLLC: {type:String}
    }
});
const resumeModel = mongoose.model('resume','');

/* GET home page. */
router.get('/', async(req, res, next) => {
    try {
        const resume = await resumeModel.find({});
        console.log('resume',resume);
        res.json({ status: "success", data: [] }); 

    } catch (error) {
        console.log(error);
        res.json({ status: "fail", data: error });
    }
}
);

module.exports = router;