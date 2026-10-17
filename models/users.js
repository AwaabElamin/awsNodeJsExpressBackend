const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const connectToUsersDB = require('mongoose');

const userSchema = connectToUsersDB.Schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String },
    phone: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    role: { type: String, enum: ['Client', 'Admin'], default: 'Client' },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, default: null },
    verificationTokenExpiresAt: { type: Date, default: null }
})
const userModel = connectToUsersDB.model('users', userSchema);
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
    static async listAllForAdmin() {
        return userModel.find({})
            .select('email username firstname lastname phone role emailVerified createdAt')
            .sort({ createdAt: -1 })
            .lean();
    }
    static async updateClientForAdmin(id, fields) {
        return userModel.findOneAndUpdate(
            { _id: id, role: 'Client' },
            { $set: fields },
            { new: true, runValidators: true, projection: 'email username firstname lastname phone role emailVerified createdAt' }
        ).lean();
    }
    static async deleteClientForAdmin(id) {
        return userModel.findOneAndDelete({ _id: id, role: 'Client' })
            .select('_id email')
            .lean();
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

    static async findByLoginId(loginId) {
        const normalizedId = String(loginId || '').trim();
        return userModel.findOne({
            $or: [
                { email: normalizedId.toLowerCase() },
                { username: normalizedId.toLowerCase() }
            ]
        });
    }

    static async findByVerificationToken(tokenHash) {
        return userModel.findOne({ verificationTokenHash: tokenHash, emailVerified: false });
    }

    static async markEmailVerified(id) {
        return userModel.findByIdAndUpdate(
            id,
            { $set: { emailVerified: true }, $unset: { verificationTokenHash: 1, verificationTokenExpiresAt: 1 } },
            { new: true }
        );
    }
}
module.exports = UserCollection;