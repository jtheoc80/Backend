"// Re-export middleware functions for compatibility
const { authenticateToken, checkAdmin, checkUserAccess, rateLimit } = require('./middleware');

module.exports = {
    authenticateToken,
    checkAdmin,
    checkUserAccess,
    rateLimit
};" 
