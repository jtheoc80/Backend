const logActivity = async (db, userId, action, metadata, outcome) => {
    try {
        await db.query(
            'INSERT INTO audit_logs (user_id, action, metadata, outcome) VALUES ($1, $2, $3, $4)',
            [userId, action, JSON.stringify(metadata), outcome]
        );
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
};

module.exports = logActivity;
