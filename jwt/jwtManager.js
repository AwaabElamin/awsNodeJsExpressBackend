const jwt = require('jsonwebtoken');
const secret = 'top-secret';

class jwtManager {
    generate(data) {
        const token = jwt.sign(data,secret,{ expiresIn: 4 * 60 * 60 });
        return token;
    }
    verify(token){
        // console.log('token from jwt', token);
        try {
            const data = jwt.verify(token,secret);
            // console.log('data from jwt', data);
            return data;
        } catch (error) {
            // console.log('jwt error', error);
        }
    }
}

module.exports = jwtManager;