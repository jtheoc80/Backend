const express = require('express');
const router = express.Router();
const {
    createReturnRequest,
    getReturnRequests,
    getReturnRequestById,
    approveReturnRequest,
    burnValveToken,
    restoreValveOwnership
} = require('./valveReturnController');
const { verifyToken } = require('./authMiddleware');

/**
 * Valve Return Routes
 * 
 * API endpoints for managing valve returns, burns, and ownership restoration
 */

// Create a new return request
router.post('/valve-returns', verifyToken, createReturnRequest);

// Get return requests with filtering
router.get('/valve-returns', verifyToken, getReturnRequests);

// Get specific return request by ID
router.get('/valve-returns/:returnId', verifyToken, getReturnRequestById);

// Approve return request (admin only)
router.post('/valve-returns/:returnId/approve', verifyToken, approveReturnRequest);

// Burn valve token (admin only)
router.post('/valves/:valveId/burn', verifyToken, burnValveToken);

// Restore valve ownership (admin only)
router.post('/valves/:valveId/restore', verifyToken, restoreValveOwnership);

module.exports = router;