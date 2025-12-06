const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const DB = require('../lib/db');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    phone: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    userRole: { type: String },
    status: { type: Number },
    appName: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

function getUserModel() {
    try {
        return DB.getModel('users', 'users', userSchema);
    } catch (err) {
        return DB.getModel(null, 'users', userSchema);
    }
}
class UserCollection {
    static async findAll() {
        const users = await getUserModel().find({});
        // console.log('findAll:- ', users);
        return users;
    }
    static async findById(id) {
        const user = await getUserModel().findById(id);
        // console.log('findById:- ', user);
        return user;
    }
    static async create(user) {
        console.log('create user model user:', user);
        const Model = getUserModel();
        const new_user = new Model(user);
        try {
            await new_user.save();
            return new_user;
        } catch (error) {
            if (error && error.code === 11000) {
                return 'users already exist';
            }
            return error;
        }
    }
    static async findAndUpdate(id, user) {
        console.log('id: ', id);
        try {
            const foundedUser = await getUserModel().findOne({ email: id });
            if (foundedUser) {
                const updatedUser = await getUserModel().findByIdAndUpdate(foundedUser._id, user);
                // console.log('findAndUpdate:- ', updatedUser);
                return { status: 'success', data: updatedUser };
            }
            return { status: 'fail', message: 'user not founded by email: ' + id }

        } catch (error) {
            return { status: 'fail', message: error.message };

        }
    }
    static async findAndDelete(id) {
        try {
            const deletedUser = await getUserModel().findByIdAndDelete(id);
            // console.log('findAndDelete:- ', deletedUser);
            return { success: true, data: deletedUser };
        } catch (error) {
            return { success: false, message: error };
        }
    }

    //for login purpose
    static async findByEmail(email) {
        try {
            const foundedUser = await getUserModel().findOne({ email: email });
            return foundedUser;
        } catch (error) {
            return error;
        }
    }
}
module.exports = UserCollection;