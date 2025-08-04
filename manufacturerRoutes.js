const express = require('express');
const router = express.Router();
const manufacturerController = require('./manufacturerController');
const { rateLimit } = require('./authMiddleware');

// Rate limiting for manufacturer API
const manufacturerRateLimit = rateLimit(15 * 60 * 1000, 50); // 50 requests per 15 minutes

// Manufacturer validation
router.post('/manufacturers/validate', manufacturerRateLimit, manufacturerController.validateManufacturer);

// Get all manufacturers
router.get('/manufacturers', manufacturerRateLimit, manufacturerController.getAllManufacturers);

// Get manufacturer by ID
router.get('/manufacturers/:id', manufacturerRateLimit, manufacturerController.getManufacturerById);

// Get valves for a manufacturer
router.get('/manufacturers/:id/valves', manufacturerRateLimit, manufacturerController.getManufacturerValves);

// Tokenize a new valve
router.post('/valves/tokenize', manufacturerRateLimit, manufacturerController.tokenizeValve);

// Get all valves
router.get('/valves', manufacturerRateLimit, manufacturerController.getAllValves);

// Get valve by token ID
router.get('/valves/:tokenId', manufacturerRateLimit, manufacturerController.getValveByTokenId);

module.exports = router;