const mongoose = require('mongoose');
const DB = require('../lib/db');

const userSchema = new mongoose.Schema({
    email: { type: String, unique:true },
    ownerEmail: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    password: { type: String },
    userRole: { type: String },
    status: { type: Number }
});

function getAutoModel() {
    try {
        return DB.getModel('carshop', 'autoUsers', userSchema);
    } catch (err) {
        return DB.getModel(null, 'autoUsers', userSchema);
    }
}
class AutoCollection {
    static async getUserInfo(email) {
        // console.log('email',email);
        try {
            const user = await getAutoModel().findOne({ email: email });
            return user;
        } catch (error) {
            return error;
        }
    }
    static async addNewUser(user) {
        const temp_user = {
            email: user.email,
            ownerEmail: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            password: user.firstname,
            userRole:"Admin",
            status: 1
        }
        const Model = getAutoModel();
        const new_user = new Model(temp_user);
        try {
            await new_user.save();
            return new_user;
        } catch (error) {
            if (error && error.code === 11000) return 'user already exist';
            return error;
        }

    }
}
module.exports = AutoCollection;