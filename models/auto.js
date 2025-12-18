const DB = require('../lib/db');
const userSchema = {
    email: { type: String, unique:true },
    ownerEmail: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    password: { type: String },
    userRole: { type: String },
    status: { type: Number }
}
// Use named connection 'carshop'
const userModel = DB.getModel('carshop', 'autoUsers', userSchema);
class AutoCollection {
    static async getUserInfo(email) {
        try {
            const user = await userModel.findOne({ email: email });
            console.log('user', user);
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
        const new_user = new userModel(temp_user);
        try {
            await new_user.save();
            return new_user;
        } catch (error) {
            if (error && error.code == 11000) {
                return "user already exist";
            }
            throw error;
        }
    }
}
module.exports = AutoCollection;