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
                console.log('Awaab', userFound);
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
    if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = new JwtManager();
        const data = jwt.verify(token)
        console.log('Data', data);
        if (!data) {
            res.send({ status: 'fail', message: 'Unauthenticated' });
        }
        next();
        // console.log('user', user);
        // jwt.verify(token,(err, user)=>{
        //     req.user = user;
        //     if(err){
        //         console.log('err',err);
        //         if (err.TokenExpiredError = 'jwt expired') {
        //             res.status(401).send({success:false, message:'token is expires'});
        //         } else {
        //             res.status(403).send({success: false, message:'Forbidden'});
        //         }
        //     }else{
        //         next();
        //         }
        // })
    } else {
        res.send({ status: 'fail', message: 'Unauthenticated' });
    }

}