const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN, 10) : 4 * 60 * 60;

if (!SECRET) {
    console.warn('JWT_SECRET is not set. Generate and set JWT_SECRET in environment for production.');
}

class JwtManager {
    generate(data) {
        const token = jwt.sign(data, SECRET, { expiresIn: EXPIRES_IN });
        return token;
    }
    verify(token){
        try {
            const data = jwt.verify(token, SECRET);
            return data;
        } catch (error) {
            return null;
        }
    }
}

module.exports = JwtManager;