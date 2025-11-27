const bcrypt = require('bcrypt');
const usersModel = require('../models/users');
// DB connection is centralized via `lib/db.js`; do not add per-method connects here.
exports.create = async (req, res) => {
    const user = {
        email: req.body.user.email,
        password: bcrypt.hashSync(req.body.user.password, 8),
        phone: req.body.user.phone,
        firstname: req.body.user.firstname,
        lastname: req.body.user.lastname
    }
    try {
        const userAdded = await usersModel.create(user);
        console.log('add user', userAdded);
        res.send({ status: "success", data: userAdded });
    } catch (error) {
        console.log("Route users create catch connected", error);
        res.send({ status: "error", data: error })
    }
    // (legacy) per-method connection removed; models assume an active mongoose connection.
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
exports.getUserByEmail = async(req,res) =>{
    const email = req.body.email;
    console.log('email', email);
    if (email) {
        try {
            const userFound = await usersModel.findByEmail(email);
            if (userFound) {
                res.send({
                    status:'success',
                    data:{
                        email:email,
                        phone:userFound.phone,
                        firstname:userFound.firstname,
                        lastname:userFound.lastname,
                        password:""
                    }
                })
            } else {
                res.send({ status: 'fail', message: 'The user is not found' });
            }
        } catch (error) {
            console.log("error get user by email", error);
            res.send({ status: "error", data: error })
        }
    } else {
        res.send({ status: 'fail', data: 'Please provide the email' });
    }
}