const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('./authMiddleware');
const { db } = require('./database');

router.get('/audit_logs', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, user, action, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT * FROM audit_logs
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (user) {
            query += ` AND user_id = ?`;
            params.push(user);
        }

        if (action) {
            query += ` AND action = ?`;
            params.push(action);
        }

        if (startDate) {
            query += ` AND date(timestamp) >= date(?)`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND date(timestamp) <= date(?)`;
            params.push(endDate);
        }

        query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const logs = await db.query(query, params);

        res.json({
            logs,
            page: parseInt(page),
            limit: parseInt(limit),
            total: logs.length
        });
    } catch (err) {
        console.error('Audit logs error:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;