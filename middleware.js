const jwt = require('jsonwebtoken');
const db = require('./database');

// Mock admin check middleware - should be implemented according to your auth system
const checkAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // For now, we'll accept any valid JWT token as admin
        // In a real implementation, you'd check user roles/permissions
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        
        // Simple admin check - you may want to verify admin role from database
        if (decoded.role === 'admin' || decoded.isAdmin) {
            next();
        } else {
            return res.status(403).json({ error: 'Admin access required' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = {
    checkAdmin,
    db
};