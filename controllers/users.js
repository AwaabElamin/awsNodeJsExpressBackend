const bcrypt = require('bcrypt');
const crypto = require('crypto');
const usersModel = require('../models/users');
const { sendVerificationEmail } = require('../lib/mailer');
// const connectToUsersDB = require('mongoose');
// const connectionString =
//     'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/users?retryWrites=true&w=majority';
exports.create = async (req, res) => {
    // Input validation
    if (!req.body || !req.body.user) {
        return res.status(400).json({ status: 'fail', message: 'User payload is required' });
    }

    const { email, password, phone, firstname, lastname } = req.body.user;
    if (!email || !password) {
        return res.status(400).json({ status: 'fail', message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ status: 'fail', message: 'A valid email address is required' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 30) * 60 * 1000);

    const user = {
        email: normalizedEmail,
        password: bcrypt.hashSync(password, 8),
        phone,
        firstname,
        lastname,
        emailVerified: false,
        verificationTokenHash,
        verificationTokenExpiresAt
    };

    try {
        const userAdded = await usersModel.create(user);
        if (typeof userAdded === 'string') {
            return res.status(409).json({ status: 'fail', message: 'User already exists' });
        }

        const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const verificationUrl = `${frontendUrl}/login/verify?token=${verificationToken}`;
        try {
            await sendVerificationEmail({ email: normalizedEmail, firstName: firstname || 'there', verificationUrl });
        } catch (mailError) {
            console.error('Verification email delivery failed', {
                code: mailError && mailError.code,
                responseCode: mailError && mailError.responseCode,
                response: mailError && mailError.response
            });
            await usersModel.findAndDelete(userAdded._id);
            return res.status(503).json({ status: 'error', message: 'We could not send the confirmation email. Please try again later.' });
        }

        return res.status(201).json({
            status: 'success',
            message: 'Confirmation email sent. Check your inbox to finish creating your account.',
            data: { email: normalizedEmail }
        });
    } catch (error) {
        console.log('Route users create catch connected', error);
        if (error && error.code === 11000) {
            return res.status(409).json({ status: 'fail', message: 'User already exist' });
        }
        return res.status(500).json({ status: 'error', data: error });
    }
    // await connectToUsersDB.connect(connectionString)
    // .then(async()=>{
    //     console.log("req.body.user", req.body.user);
    //     const user = {
    //         email: req.body.user.email,
    //         password: bcrypt.hashSync(req.body.user.password, 8),
    //         phone: req.body.user.phone,
    //         firstname: req.body.user.firstname,
    //         lastname: req.body.user.lastname
    //     }
    //     const userAdded = await usersModel.create(user);
    //     console.log('add user', userAdded);
    //     res.send({status:"success",data:userAdded});
    // })
    // .catch(error =>{
    //     console.log("Route users create catch connected",error);
    //     res.send({status:"error",data:error})
    // });
}
exports.getAll = async (req, res) => {
    if (!req.user) {
        console.log('Unauthorized access to getAll - aborting DB operation');
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const users = await usersModel.findAll();
    res.send(users);
}
exports.update = async (req, res) => {
    // Validate request
    if (!req.body || !req.body.email) {
        return res.status(400).json({ status: 'fail', message: 'Email is required' });
    }

    const { email, password, phone, firstname, lastname } = req.body;

    // Require at least one field to update
    if (!password && !phone && !firstname && !lastname) {
        return res.status(400).json({ status: 'fail', message: 'At least one field is required to update' });
    }

    const user = {};
    try {
        if (password) user.password = bcrypt.hashSync(password, 8);
        if (phone) user.phone = phone;
        if (firstname) user.firstname = firstname;
        if (lastname) user.lastname = lastname;
    } catch (error) {
        console.log('Error preparing update payload', error);
        return res.status(400).json({ status: 'error', data: error });
    }

    try {
        const updatedUser = await usersModel.findAndUpdate(email, user);
        return res.json(updatedUser);
    } catch (error) {
        console.log('Route users update error', error);
        return res.status(500).json({ status: 'error', data: error });
    }
}
exports.delete = async (req, res) => {
    const id = req.query.id;
    const deletedUser = await usersModel.findAndDelete(id);
    console.log('deleted user:- ', deletedUser);
    res.send(deletedUser);
}
exports.getUserByEmail = async(req,res) =>{
    // Authentication guard
    if (!req.user) {
        console.log('Unauthorized access to getUserByEmail - aborting DB operation');
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }

    const email = req.body.email;
    if (!email) {
        return res.status(400).json({ status: 'fail', message: 'Please provide the email' });
    }

    // Only allow the token owner to fetch their own profile
    if (!req.user.email || req.user.email !== email) {
        console.log('Authenticated user trying to access another user profile:', { requester: req.user.email, target: email });
        return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    console.log('email', email);
    try {
        const userFound = await usersModel.findByEmail(email);
        if (userFound) {
            return res.json({
                status:'success',
                data:{
                    email:email,
                    phone:userFound.phone,
                    firstname:userFound.firstname,
                    lastname:userFound.lastname,
                    password:""
                }
            });
        } else {
            return res.status(404).json({ status: 'fail', message: 'The user is not found' });
        }
    } catch (error) {
        console.log("error get user by email", error);
        return res.status(500).json({ status: "error", data: error })
    }
}

exports.verifyEmail = async (req, res) => {
    const token = String(req.query.token || '').trim();
    if (!token) {
        return res.status(400).json({ status: 'fail', message: 'Verification token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
        const user = await usersModel.findByVerificationToken(tokenHash);
        if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
            return res.status(400).json({ status: 'fail', message: 'This verification link is invalid or expired.' });
        }

        const verifiedUser = await usersModel.markEmailVerified(user._id);
        return res.json({ status: 'success', message: 'Email verified. You can now sign in.', data: { email: verifiedUser.email } });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'We could not verify this email address.' });
    }
};