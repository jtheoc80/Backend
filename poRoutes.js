const express = require('express');
const poController = require('./poController');
const { verifyToken } = require('./authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// All PO routes require authentication
router.use(verifyToken);

// Rate limiting middleware: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});
router.use(limiter);

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