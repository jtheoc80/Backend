const express = require('express');
const router = express.Router();
const { checkAdmin, db } = require('./middleware');
const rateLimit = require('express-rate-limit');

const auditLogsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});

router.get('/audit_logs', auditLogsLimiter, checkAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, user, action, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT * FROM audit_logs
            WHERE ($1::varchar IS NULL OR user_id = $1)
            AND ($2::varchar IS NULL OR action = $2)
            AND ($3::date IS NULL OR timestamp >= $3)
            AND ($4::date IS NULL OR timestamp <= $4)
            ORDER BY timestamp DESC
            LIMIT $5 OFFSET $6
        `;

        const logs = await db.query(query, [user, action, startDate, endDate, limit, offset]);
        
        const countQuery = `
            SELECT COUNT(*) as total FROM audit_logs
            WHERE ($1::varchar IS NULL OR user_id = $1)
            AND ($2::varchar IS NULL OR action = $2)
            AND ($3::date IS NULL OR timestamp >= $3)
            AND ($4::date IS NULL OR timestamp <= $4)
        `;
        
        const countResult = await db.query(countQuery, [user, action, startDate, endDate]);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            logs: logs.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;