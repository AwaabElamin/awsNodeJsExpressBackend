const bcrypt = require('bcrypt');
const usersModel = require('../models/users');
exports.create = async (req, res) => {
    const user = {
        email: req.body.user.email,
        passwors: bcrypt.hashSync(req.body.password, 8),
        phone: req.body.phone
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