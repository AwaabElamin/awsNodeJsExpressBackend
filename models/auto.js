const DB = require('../lib/db');
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    firstName: String,
    lastName: String,
    firstname: String,
    lastname: String,
    userRole: { type: String, default: 'Employee' },
    status: { type: Number, default: 1 }
});
const userModel = DB.getModel('carshop', 'autoUsers', userSchema);
class AutoCollection {
    static async getUserInfo(email) {
        return userModel.findOne({ email: email.trim().toLowerCase() }).exec();
    }
    static async addNewUser(user) {
        return userModel.create({
            email: user.email.trim().toLowerCase(),
            firstName: user.firstName,
            lastName: user.lastName,
            firstname: user.firstName,
            lastname: user.lastName,
            userRole: 'Employee',
            status: 1
        });
    }
}
module.exports = AutoCollection;