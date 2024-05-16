const bcrypt = require('bcrypt');
const usersModel = require('../models/users');
exports.create = async (req, res) => {
    console.log("req.body.user", req.body.user);
    const user = {
        email: req.body.user.email,
        password: bcrypt.hashSync(req.body.user.password, 8),
        phone: req.body.user.phone,
        firstname: req.body.user.firstname,
        lastname: req.body.user.lastname,
        title: req.body.user.title,
        city: req.body.user.city,
        state: req.body.user.state,
        country: req.body.user.country,
        linkedin: req.body.user.linkedin,
        github: req.body.user.github,
        webside: req.body.user.webside,
        summary: req.body.user.summary,
        keySkills: req.body.user.keySkills,
        technicalSkills: req.body.user.technicalSkills,
        education: [{
            universityName: req.body.user.education.universityName,
            degree: req.body.user.education.degree,
            fieldName: req.body.user.education.fieldName,
            month: req.body.user.education.month,
            year: req.body.user.education.year,
            location: req.body.user.education.location,
            gpa: req.body.user.education.gpa
        }],
        experience: [{
            companyName: req.body.user.experience.companyName,
            jobTitle: req.body.user.experience.jobTitle,
            startMonth: req.body.user.experience.startMonth,
            startYear: req.body.user.experience.startYear,
            endMonth: req.body.user.experience.endMonth,
            endYear: req.body.user.experience.endYear,
            location: req.body.user.experience.location,
            summary: req.body.user.experience.summary
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