const JwtManager = require('../jwt/jwtManager');
const bcrypt = require('bcrypt');
const userModel = require('../models/users');
const connectUsersDB = require('mongoose');
const connectionString =
    'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/users?retryWrites=true&w=majority';
exports.login = async (req, res) => {
    console.log("login controller");
    const { email, password } = req.body;
    console.log(`username: ${email}, password: ${password}`);
    // await connectUsersDB.connect(connectionString)
    //     .then(async () => {

    if (email, password) {
        try {
            const userFound = await userModel.findByEmail(email);
            console.log('user', userFound);
            if (userFound) {  
                console.log('User found, checking password');
                console.log('user data:', userFound);              
                if (bcrypt.compareSync(password, userFound.password)) {
                    const data = { email: email, password: password };
                    const jwt = new JwtManager();
                    const token = jwt.generate(data);
                    console.log("Token: ", token);
                    res.json({ status: 'success', accessToken: token, email: email, _id: userFound._id });
                } else {
                    res.send({ status: 'fail', message: 'Wrong password' });
                }
            } else {
                // console.log('Awaab', userFound);
                res.send({ status: 'fail', message: 'The user is not found' });
            }
        }
        catch (error) {
            console.log("Route Users login catch connected", error);
            res.send({ status: "error", data: error })
        }
    } else {
        res.send({ status: 'fail', data: 'Please provide the email and password' });
    }


}
exports.authorize = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('No Authorization header');
        return res.status(401).json({ status: 'fail', message: 'no Authorization' });
    }

    console.log('Authorization Header:', authHeader.split(' '));
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ status: 'fail', message: 'Invalid Authorization format' });
    }

    const token = parts[1];
    const jwt = new JwtManager();
    try {
        const data = jwt.verify(token);
        if (!data) {
            return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
        }
        // attach verified data to request for downstream handlers
        req.user = data;
        return next();
    } catch (err) {
        console.log('Token verification error', err);
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }

}