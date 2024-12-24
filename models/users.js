const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const connectToUsersDB = require('mongoose');
const connectionString =
    'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/users?retryWrites=true&w=majority';

const userSchema = connectToUsersDB.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    phone: { type: String },
    firstname: { type: String },
    lastname: { type: String }
})
const userModel = connectToUsersDB.model('users', userSchema);
const conn = connectToUsersDB.createConnection(connectionString);
class UserCollection {
    static async findAll() {
        const users = await userModel.find({});
        console.log('findAll:- ', users);
        return users;
    }
    static async findById(id) {
        const user = await userModel.findById(id);
        console.log('findById:- ', user);
        return user;
    }
    static async create(user) {
        console.log('error', conn);
        // return conn.connections;
        const new_user = new userModel(user);
        try {
            await new_user.save();
            return new_user;
        }
        catch (error) {
            if (error.code == 11000) {
                return "users already exist";
            } else {
                return error;
            }
        };


        // try {
        //     await new_user.save();
        //     console.log('create:- ', new_user);
        //     return { success: true, data: new_user };
        // } catch (error) {
        //     console.log('Awaab.code: ', error.code);
        //     if (error.code == 11000) {
        //         return { success: false, message: "users already exist" };
        //     } else {
        //         return { success: false, message: error };
        //     }
        // }
    }
    static async findAndUpdate(id, user) {
        console.log('id: ', id);
        try {
            const foundedUser = await userModel.findOne({ email: id });
            if (foundedUser) {
                const updatedUser = await userModel.findByIdAndUpdate(foundedUser._id, user);
                console.log('findAndUpdate:- ', updatedUser);
                return { status: 'success', data: updatedUser };
            }
            return { status: 'fail', message: 'user not founded by email: ' + id }

        } catch (error) {
            return { status: 'fail', message: error.message };

        }
    }
    static async findAndDelete(id) {
        try {
            const deltedUser = await userModel.findByIdAndDelete(id);
            console.log('findAndDelete:- ', deltedUser);
            return { success: true, data: deltedUser };
        } catch (error) {
            return { success: false, message: error };
        }
    }

    //for login purpose
    static async findByEmail(email) {
        const foundedUser = await userModel.findOne({ email: email });
        console.log('find user by email:- ', foundedUser);
        return foundedUser;
    }
}
module.exports = UserCollection;