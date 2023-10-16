const JwtManager = require('../jwt/jwtManager');
const bcrypt = require('bcrypt');
const userModel = require('../models/users');

exports.login = async (req, res) => {
    console.log("login controller");
    const { email, password } = req.body;
    console.log(`username: ${email}, password: ${password}`);
    let user = await userModel.findByEmail(email);
    if (email, password) {
        if (user) {
            console.log('user', user);
            if (bcrypt.compareSync(password, user.password)) {
                const data = { email: email, password: pass };
                const jwt = new JwtManager();
                const token = jwt.generate(data);
                res.json({ status: 'success', accessToken: token, email: email, _id: result[0]._id });
            } else {
                res.send({ success: false, message: 'Wrong password' });
            }
        } else {
            res.send({ success: false, message: 'The user is not found' });
        }
    } else {
        res.send({ success: false, data: 'Please provide the email and password' });
    }
}
exports.authorize = (req, res, next) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];

        const jwt = new JwtManager();
        const data = jwt.verify(token)
        console.log('Data', data);
        if (!data) {
            res.status(401).send({ success: false, message: 'Unauthenticated' });
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
            res.status(401).send({ success: false, message: 'Unauthenticated' });
        }
    
}