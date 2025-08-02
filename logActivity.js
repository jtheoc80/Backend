import logger from './logger.js';

const logActivity = async (db, userId, action, metadata, outcome) => {
    try {
        await db.query(
            'INSERT INTO audit_logs (user_id, action, metadata, outcome) VALUES ($1, $2, $3, $4)',
            [userId, action, JSON.stringify(metadata), outcome]
        );
        
        logger.info('Activity logged', {
            userId,
            action,
            metadata,
            outcome
        });
    } catch (err) {
        logger.error('Failed to log activity', {
            error: {
                message: err.message,
                stack: err.stack
            },
            userId,
            action,
            metadata,
            outcome
        });
    }
};

export default logActivity;