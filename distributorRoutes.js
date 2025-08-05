const express = require('express');
const router = express.Router();
const distributorController = require('./distributorController');
const territoryController = require('./territoryController');
const { rateLimit } = require('./authMiddleware');

// Rate limiting for distributor API
const distributorRateLimit = rateLimit(15 * 60 * 1000, 30); // 30 requests per 15 minutes

// Distributor management routes
router.post('/distributors/register', distributorRateLimit, distributorController.registerDistributor);
router.get('/distributors', distributorRateLimit, distributorController.getAllDistributors);
router.get('/distributors/:id', distributorRateLimit, distributorController.getDistributorById);
router.put('/distributors/:id', distributorRateLimit, distributorController.updateDistributor);
router.delete('/distributors/:id', distributorRateLimit, distributorController.deactivateDistributor);

// Distributor relationship management routes
router.post('/distributor-relationships/assign', distributorRateLimit, distributorController.assignDistributorRights);
router.delete('/distributor-relationships/:relationshipId/revoke', distributorRateLimit, distributorController.revokeDistributorRights);
router.get('/manufacturers/:manufacturerId/distributors', distributorRateLimit, distributorController.getManufacturerDistributors);

// Valve ownership transfer routes
router.post('/valves/transfer-ownership', distributorRateLimit, distributorController.transferValveOwnership);
router.post('/valves/transfer-to-distributor', distributorRateLimit, distributorController.transferValveToDistributor);
router.post('/valves/transfer-to-plant', distributorRateLimit, distributorController.transferValveToPlant);

// Territory management routes
router.get('/territories', distributorRateLimit, territoryController.getAllTerritories);
router.get('/territories/type/:type', distributorRateLimit, territoryController.getTerritoriesByType);
router.get('/territories/:id', distributorRateLimit, territoryController.getTerritoryById);

module.exports = router;