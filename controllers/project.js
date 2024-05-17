const bcrypt = require('bcrypt');
const projectModel = require('../models/project');
exports.create = async (req, res) => {
    console.log("req.body", req.body);
    const project = {
        email: req.body.email,
        projectName: req.body.projectName,
    }
    const projectAdded = await projectModel.create(project);
    console.log('add project', projectAdded);
    res.send({status:'success', message: projectAdded});
}