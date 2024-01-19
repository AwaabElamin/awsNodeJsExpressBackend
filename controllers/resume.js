const resumeModel = require('../models/resume');
exports.getAll = async (req,res)=>{
    const resume = await resumeModel.findAll();
    res.send(resume)
}