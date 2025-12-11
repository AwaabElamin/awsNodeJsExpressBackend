const auto = require('../models/auto');
const bcrypt = require('bcrypt');
const connectAutoDB = require('mongoose');
const { update } = require('./users');

exports.getAutoUser = async (req, res) => {
    try {
        console.log("email",req.params.email);
        const user = await auto.getUserInfo(req.params.email);
        res.send({ status: "success", data: user });
    } catch (error) {
        console.log("Route Auto get autoUser catch connected", error);
        res.send({ status: "error", data: error })
    };
}
exports.addAutoUser = async (req, res) => {
    try {
        const newUser = {
            email: req.body.email,
            password: bcrypt.hashSync("testTest", 8),
            phone: req.body.phone,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            userRole: req.body.userRole,
            status: req.body.isActive ? 'active' : 'inactive',
            updatedAt: req.body.updatedAt,
            createdAt: req.body.createdAt
        }
        const user = await auto.addNewUser(newUser);
        res.send({ status: "success", data: user });
    } catch (error) {
        console.log("Route Auto add autoUser catch connected", error);
        res.send({ status: "error", data: error });
    }
}