const mainMainModel = require("../models/mainMain");
exports.getProjects = async (req,res) => {
    const projects = await mainMainModel.getProjects();
    res.send(projects);
}