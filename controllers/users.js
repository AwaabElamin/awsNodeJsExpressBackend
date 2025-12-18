const bcrypt = require('bcrypt');
const usersModel = require('../models/users');
// const connectToUsersDB = require('mongoose');
// const connectionString =
//     'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/users?retryWrites=true&w=majority';
exports.create = async (req, res) => {
    // Input validation
    if (!req.body || !req.body.user) {
        return res.status(400).json({ status: 'fail', message: 'User payload is required' });
    }

    const { email, password, phone, firstname, lastname } = req.body.user;
    if (!email || !password) {
        return res.status(400).json({ status: 'fail', message: 'Email and password are required' });
    }

    const user = {
        email,
        password: bcrypt.hashSync(password, 8),
        phone,
        firstname,
        lastname
    };

    try {
        const userAdded = await usersModel.create(user);
        console.log('add user', userAdded);
        return res.status(201).json({ status: 'success', data: userAdded });
    } catch (error) {
        console.log('Route users create catch connected', error);
        if (error && error.code === 11000) {
            return res.status(409).json({ status: 'fail', message: 'User already exist' });
        }
        return res.status(500).json({ status: 'error', data: error });
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
    if (!req.user) {
        console.log('Unauthorized access to getAll - aborting DB operation');
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const users = await usersModel.findAll();
    res.send(users);
}
exports.update = async (req, res) => {
    // Validate request
    if (!req.body || !req.body.email) {
        return res.status(400).json({ status: 'fail', message: 'Email is required' });
    }

    const { email, password, phone, firstname, lastname } = req.body;

    // Require at least one field to update
    if (!password && !phone && !firstname && !lastname) {
        return res.status(400).json({ status: 'fail', message: 'At least one field is required to update' });
    }

    const user = {};
    try {
        if (password) user.password = bcrypt.hashSync(password, 8);
        if (phone) user.phone = phone;
        if (firstname) user.firstname = firstname;
        if (lastname) user.lastname = lastname;
    } catch (error) {
        console.log('Error preparing update payload', error);
        return res.status(400).json({ status: 'error', data: error });
    }

    try {
        const updatedUser = await usersModel.findAndUpdate(email, user);
        return res.json(updatedUser);
    } catch (error) {
        console.log('Route users update error', error);
        return res.status(500).json({ status: 'error', data: error });
    }
}
exports.delete = async (req, res) => {
    const id = req.query.id;
    const deletedUser = await usersModel.findAndDelete(id);
    console.log('deleted user:- ', deletedUser);
    res.send(deletedUser);
}
exports.getUserByEmail = async(req,res) =>{
    // Authentication guard
    if (!req.user) {
        console.log('Unauthorized access to getUserByEmail - aborting DB operation');
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }

    const email = req.body.email;
    if (!email) {
        return res.status(400).json({ status: 'fail', message: 'Please provide the email' });
    }

    // Only allow the token owner to fetch their own profile
    if (!req.user.email || req.user.email !== email) {
        console.log('Authenticated user trying to access another user profile:', { requester: req.user.email, target: email });
        return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    console.log('email', email);
    try {
        const userFound = await usersModel.findByEmail(email);
        if (userFound) {
            return res.json({
                status:'success',
                data:{
                    email:email,
                    phone:userFound.phone,
                    firstname:userFound.firstname,
                    lastname:userFound.lastname,
                    password:""
                }
            });
        } else {
            return res.status(404).json({ status: 'fail', message: 'The user is not found' });
        }
    } catch (error) {
        console.log("error get user by email", error);
        return res.status(500).json({ status: "error", data: error })
    }
}