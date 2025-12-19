
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    phone: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    educations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Education' }],
    experiences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Experience' }]
}, { timestamps: true });

const userModel = mongoose.model('User', userSchema);

class UserCollection {
    // Add an education ObjectId to a user
    static async addEducation(userId, educationId) {
        try {
            return await userModel.findByIdAndUpdate(
                userId,
                { $push: { educations: educationId } },
                { new: true }
            );
        } catch (error) {
            throw error;
        }
    }

    // Add an experience ObjectId to a user
    static async addExperience(userId, experienceId) {
        try {
            return await userModel.findByIdAndUpdate(
                userId,
                { $push: { experiences: experienceId } },
                { new: true }
            );
        } catch (error) {
            throw error;
        }
    }

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
        const new_user = new userModel(user);
        try {
            await new_user.save();
            return new_user;
        } catch (error) {
            if (error && error.code == 11000) {
                return "users already exist";
            }
            throw error;
        }
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
        try {
            const foundedUser = await userModel.findOne({ email: email });
            return foundedUser;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserCollection;