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
exports.getAllProjects = async (req, res) => {
    const email = req.params.email;
    const allProjects = await projectModel.getAllProjects(email);
    res.send(allProjects);
}
exports.addUserStory = async (req,res) => {
    const userStory={
        email: req.body.email,
        projectId : req.body.PID,
        actor:req.body.actor,
        cRUD:req.body.cRUD,
        action:req.body.action
    }
    const us= await projectModel.insertUserStory(userStory);
    res.send(us)
}
exports.getAllUserStories = async (req,res) => {
    const email = req.params.email;
    const PID = req.params.PID;
    const us= await projectModel.getAllUserStories(email,PID);
    res.send(us)
}
exports.getAllActors = async(req,res) => {
    const email = req.params.email;
    const PID = req.params.PID;
    const actors = await projectModel.getAllActors(email,PID);
    res.send(actors)
}
exports.addActor = async(req,res) =>{
    const  email= req.body.email;
    const projectId = req.body.PID;
    const actor= req.body.actor;
    const response = await projectModel.insertActor(email,projectId,actor);
    res.send(response);
}