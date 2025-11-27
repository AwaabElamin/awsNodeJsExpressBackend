const mainMainModel = require('../models/mainMain');

exports.getProjects = async (req, res) => {
  try {
    const projects = await mainMainModel.getProjects();
    res.send({ status: 'success', data: projects });
  } catch (error) {
    res.send({ status: 'error', data: error });
  }
}

exports.create = async (req, res) => {
  // This endpoint currently returns static example projects.
  // Persisting projects is not implemented; return sample list or echo body.
  try {
    const projects = await mainMainModel.getProjects();
    res.send({ status: 'success', data: projects });
  } catch (error) {
    res.send({ status: 'error', data: error });
  }
}