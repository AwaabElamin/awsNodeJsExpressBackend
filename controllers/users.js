const bcrypt = require('bcrypt');
const usersModel = require('../models/users');
exports.create = async (req, res) => {
    const user = {
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 8),
        phone: req.body.phone,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        title: req.body.title,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        linkedin: req.body.linkedin,
        github: req.body.github,
        webside: req.body.webside,
        summary: req.body.summary,
        keySkills: req.body.keySkills,
        technicalSkills: req.body.technicalSkills,
        education: [{
            universityName: req.body.education.universityName,
            degree: req.body.education.degree,
            fieldName: req.body.education.fieldName,
            month: req.body.education.month,
            year: req.body.education.year,
            location: req.body.education.location,
            gpa: req.body.education.gpa
        }],
        experience: [{
            companyName: req.body.experience.companyName,
            jobTitle: req.body.experience.jobTitle,
            startMonth: req.body.experience.startMonth,
            startYear: req.body.experience.startYear,
            endMonth: req.body.experience.endMonth,
            endYear: req.body.experience.endYear,
            location: req.body.experience.location,
            summary: req.body.experience.summary
        }],
        Additional: []
    }
    const userAdded = await usersModel.create(user);
    console.log('add user', userAdded);
    res.send(userAdded);
}
exports.getAll = async (req, res) => {
    const users = await usersModel.findAll();
    res.send(users);
}
exports.update = async (req, res) => {
    const user = {
        password: bcrypt.hashSync(req.body.password, 8),
        email: req.body.email,
        phone: req.body.phone
    }
    const updatedUser = await usersModel.findAndUpdate(req.body.email, user);
    res.send(updatedUser);
}
exports.delete = async (req, res) => {
    const id = req.query.id;
    const deletedUser = await usersModel.findAndDelete(id);
    console.log('deleted user:- ', deletedUser);
    res.send(deletedUser);
}