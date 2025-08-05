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
const { authenticate } = require('./authMiddleware');

/**
 * Valve Return Routes
 * 
 * API endpoints for managing valve returns, burns, and ownership restoration
 */

// Create a new return request
router.post('/valve-returns', authenticate, createReturnRequest);

// Get return requests with filtering
router.get('/valve-returns', authenticate, getReturnRequests);

// Get specific return request by ID
router.get('/valve-returns/:returnId', authenticate, getReturnRequestById);

// Approve return request (admin only)
router.post('/valve-returns/:returnId/approve', authenticate, approveReturnRequest);

// Burn valve token (admin only)
router.post('/valves/:valveId/burn', authenticate, burnValveToken);

// Restore valve ownership (admin only)
router.post('/valves/:valveId/restore', authenticate, restoreValveOwnership);

module.exports = router;