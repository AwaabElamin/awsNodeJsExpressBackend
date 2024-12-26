const connectAutoDB = require('mongoose');
const userSchema = {
    email: { type: String },
    ownerEmail: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    password: { type: String },
    userRole: { type: String },
    status: { type: Number }
}
const userModel = connectAutoDB.model('autoUsers', userSchema);
const connectionString = 'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/CarShop?retryWrites=true&w=majority';
class AutoCollection {
    static async getUserInfo(email) {
        // console.log('email',email);
        const foundedUser = await connectAutoDB.connect(connectionString)
            .then(async () => {
                const user = await userModel.findOne({ ownerEmail: email });
                // console.log('user', user);
                return user;
            }).catch((error) => {
                return error;
            });
        return foundedUser;
    }
}
module.exports = AutoCollection;