const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String },
    phone: { type: String },
    profilePhoto: { type: String, default: '' },
    firstname: { type: String },
    lastname: { type: String },
    role: { type: String, enum: ['Visitors', 'Client', 'Admin'], default: 'Client' },
    platforms: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, default: null },
    verificationTokenExpiresAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetTokenExpiresAt: { type: Date, default: null },
    educations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Education' }],
    experiences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Experience' }]
}, { timestamps: true });

const userModel = mongoose.model('User', userSchema);
class UserCollection {
    static async createWorkspace(email) {
        return userModel.findOneAndUpdate(
            { email, role: 'Visitors', emailVerified: { $ne: false } },
            { $set: { role: 'Client' } },
            { new: true, runValidators: true, projection: 'email firstname lastname role' }
        ).lean();
    }
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
    static async listAllForAdmin() {
        return userModel.find({})
            .select('email username firstname lastname phone role platforms emailVerified createdAt')
            .sort({ createdAt: -1 })
            .lean();
    }
    static async updateClientForAdmin(id, fields) {
        return userModel.findOneAndUpdate(
            { _id: id, role: 'Client' },
            { $set: fields },
            { new: true, runValidators: true, projection: 'email username firstname lastname phone role platforms emailVerified createdAt' }
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

    static async findPlatformOwnerById(id, platformId) {
        return userModel.findOne({ _id: id, emailVerified: { $ne: false }, platforms: platformId })
            .select('_id email')
            .lean()
            .exec();
    }

    static async getPublicSellerProfiles(ownerIds, emails, platformId) {
        return userModel.find({
            $or: [{ _id: { $in: ownerIds } }, { email: { $in: emails } }],
            emailVerified: { $ne: false },
            platforms: platformId
        }).select('_id firstname lastname email').lean().exec();
    }

    static async findPlatformOwnerByEmail(email, platformId) {
        return userModel.findOne({
            email: String(email).trim().toLowerCase(),
            emailVerified: { $ne: false },
            platforms: platformId
        })
            .select('_id email')
            .lean()
            .exec();
    }

    static async enablePlatform(email, platformId) {
        return userModel.findOneAndUpdate(
            { email: String(email).trim().toLowerCase(), emailVerified: { $ne: false }, role: { $in: ['Client', 'Admin', null] } },
            { $addToSet: { platforms: platformId } },
            { new: true, projection: 'email firstname lastname phone role platforms emailVerified' }
        ).lean();
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

    static async updateProfile(id, fields) {
        return userModel.findByIdAndUpdate(
            id,
            { $set: fields },
            { new: true, runValidators: true, projection: 'email firstname lastname phone profilePhoto' }
        ).lean().exec();
    }

    static async setPasswordResetToken(email, tokenHash, expiresAt) {
        return userModel.findOneAndUpdate(
            { email, emailVerified: { $ne: false } },
            { $set: { passwordResetTokenHash: tokenHash, passwordResetTokenExpiresAt: expiresAt } },
            { new: true, projection: 'email firstname' }
        ).lean();
    }

    static async clearPasswordResetToken(tokenHash) {
        return userModel.updateOne(
            { passwordResetTokenHash: tokenHash },
            { $unset: { passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1 } }
        );
    }

    static async consumePasswordResetToken(tokenHash, passwordHash, now = new Date()) {
        return userModel.findOneAndUpdate(
            {
                passwordResetTokenHash: tokenHash,
                passwordResetTokenExpiresAt: { $gt: now },
                emailVerified: { $ne: false }
            },
            {
                $set: { password: passwordHash },
                $unset: { passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1 }
            },
            { new: true }
        );
    }
}

module.exports = UserCollection;