const connectAutoDB = require('mongoose');
const userSchema = {
    email: { type: String, unique:true },
    ownerEmail: { type: String },
    firstname: { type: String },
    lastname: { type: String },
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
                const user = await userModel.findOne({ email: email });
                console.log('user', user);
                return user;
            }).catch((error) => {
                return error;
            });
        return foundedUser;
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
        const result = await connectAutoDB.connect(connectionString)
            .then(async () => {
                await new_user.save();
                return new_user;
            })
            .catch(error => {
                if (error.code == 1100) {
                    return "user already exist";
                } else {
                    return error;
                }
            });
        return result;

    }
}
module.exports = AutoCollection;