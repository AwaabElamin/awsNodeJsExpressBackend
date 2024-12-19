const connectAutoDB = require('mongoose');
const userSchema = {
    email: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    password: { type: String },
    userRole: { type: String },
    status : {type:Number}
}
// const userModel = connectAutoDB.model('users',userSchema);
class AutoCollection{
    static async getUserInfo(email){
        try {
            // const user = await userModel.findOne({email:email});
            return "user";
        } catch (error) {
            return error;
        }
    }
}
module.exports = AutoCollection;