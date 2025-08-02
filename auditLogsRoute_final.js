const express = require('express');
const router = express.Router();
const { checkAdmin, db } = require('./middleware');

router.get('/audit_logs', checkAdmin, async (req, res) => {
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

        const logs = await db.query(query, [user, action, startDate, endDate, limit, ..." 
