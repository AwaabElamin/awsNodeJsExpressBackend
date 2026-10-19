const jwt = require('jsonwebtoken');

function getSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return process.env.JWT_SECRET;
}

class jwtManager {
    generate(data) {
        const token = jwt.sign(data, getSecret(), { expiresIn: Number(process.env.JWT_EXPIRES_IN || 4 * 60 * 60) });
        return token;
    }
    verify(token){
        // console.log('token from jwt', token);
        try {
            const data = jwt.verify(token, getSecret());
            // console.log('data from jwt', data);
            return data;
        } catch (error) {
            // console.log('jwt error', error);
        }
    }
}

module.exports = jwtManager;