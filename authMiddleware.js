// Authentication middleware
import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: { message: 'No token provided', status: 401 } 
            });
        }
        
        // Simulate async token verification
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Mock token verification (in production, use proper JWT verification)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = decoded;
        next();
    } catch (error) {
        // This error will be caught by the error middleware
        if (error.name === 'JsonWebTokenError') {
            error.message = 'Invalid token format';
        } else if (error.name === 'TokenExpiredError') {
            error.message = 'Token has expired';
        }
        
        return res.status(401).json({ 
            success: false, 
            error: { message: error.message, status: 401 } 
        });
    }
};

export default authMiddleware;