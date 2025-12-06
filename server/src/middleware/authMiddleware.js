const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[AuthMiddleware] Decoded JWT:', JSON.stringify(decoded, null, 2));
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
