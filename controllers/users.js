const bcrypt = require('bcrypt');
const usersModel = require('../models/users');
// const connectToUsersDB = require('mongoose');
// const connectionString =
//     'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/users?retryWrites=true&w=majority';
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
    // await connectToUsersDB.connect(connectionString)
    // .then(async()=>{
    //     console.log("req.body.user", req.body.user);
    //     const user = {
    //         email: req.body.user.email,
    //         password: bcrypt.hashSync(req.body.user.password, 8),
    //         phone: req.body.user.phone,
    //         firstname: req.body.user.firstname,
    //         lastname: req.body.user.lastname
    //     }
    //     const userAdded = await usersModel.create(user);
    //     console.log('add user', userAdded);
    //     res.send({status:"success",data:userAdded});
    // })
    // .catch(error =>{
    //     console.log("Route users create catch connected",error);
    //     res.send({status:"error",data:error})
    // });
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