const express = require('express');
const poController = require('./poController');
const { verifyToken } = require('./authMiddleware');

const router = express.Router();

// All PO routes require authentication
router.use(verifyToken);

// POST /api/pos - Create a new purchase order
router.post('/pos', poController.createPO);

// GET /api/pos - List purchase orders with pagination and filtering
router.get('/pos', poController.listPOs);

// GET /api/pos/:id - Get purchase order by ID
router.get('/pos/:id', poController.getPOById);

// GET /api/pos/number/:po_number - Get purchase order by PO number
router.get('/pos/number/:po_number', poController.getPOByNumber);

// PUT /api/pos/:id - Update purchase order (only if pending)
router.put('/pos/:id', poController.updatePO);

// POST /api/pos/:id/approve - Approve purchase order
router.post('/pos/:id/approve', poController.approvePO);

// POST /api/pos/:id/reject - Reject purchase order
router.post('/pos/:id/reject', poController.rejectPO);

module.exports = router;