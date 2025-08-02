const logActivity = async (db, userId, action, metadata, outcome) => {
    try {
        // Sanitize metadata to ensure no sensitive information is logged
        const sanitizedMetadata = sanitizeMetadata(metadata);
        
        await db.query(
            'INSERT INTO audit_logs (user_id, action, metadata, outcome) VALUES ($1, $2, $3, $4)',
            [userId, action, JSON.stringify(sanitizedMetadata), outcome]
        );
    } catch (err) {
        // Log error without exposing sensitive details
        console.error('Failed to log activity for user:', userId, 'action:', action);
    }
};

// Function to sanitize metadata and remove sensitive information
const sanitizeMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
        return metadata;
    }
    
    const sensitiveKeys = [
        'password', 'token', 'secret', 'private_key', 'auth_token',
        'api_key', 'jwt', 'session_id', 'csrf_token', 'reset_token'
    ];
    
    const sanitized = { ...metadata };
    
    // Remove or redact sensitive keys
    Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        }
    });
    
    return sanitized;
};

module.exports = logActivity;