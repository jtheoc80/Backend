const express = require('express');
const router = express.Router();
const PrivacyController = require('./privacyController');
const { verifyToken, requireAdmin } = require('./authMiddleware');
const { 
    captureConsentContext, 
    validateDataResidency, 
    privacyRateLimit,
    checkDataRetention,
    logDataProcessing
} = require('./privacyMiddleware');

// Rate limiting for privacy-sensitive operations
const strictRateLimit = privacyRateLimit(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const generalRateLimit = privacyRateLimit(15 * 60 * 1000, 20); // 20 requests per 15 minutes

// Public consent information (no auth required for these)
router.get('/consent/requirements', 
    captureConsentContext,
    PrivacyController.getConsentRequirements
);

router.get('/regions', PrivacyController.getSupportedRegions);

// Apply common middleware to authenticated privacy routes
router.use(captureConsentContext);
router.use(verifyToken);
router.use(checkDataRetention);
router.use(validateDataResidency);

// User privacy dashboard and settings
router.get('/dashboard', 
    generalRateLimit,
    logDataProcessing('PRIVACY_DASHBOARD', 'Privacy dashboard access'),
    PrivacyController.getPrivacyDashboard
);

// Consent management
router.post('/consent', 
    generalRateLimit,
    logDataProcessing('CONSENT_UPDATE', 'User consent preferences update'),
    PrivacyController.updateConsent
);

// Data region management
router.put('/region', 
    strictRateLimit,
    logDataProcessing('DATA_REGION', 'Data residency region update'),
    PrivacyController.updateDataRegion
);

// Right to access - Data export
router.post('/data/export', 
    strictRateLimit,
    logDataProcessing('DATA_EXPORT', 'Personal data export request'),
    PrivacyController.requestDataExport
);

// Right to erasure - Data deletion
router.post('/data/delete', 
    strictRateLimit,
    logDataProcessing('DATA_DELETION', 'Personal data deletion request'),
    PrivacyController.requestDataDeletion
);

// Data processing history
router.get('/data/processing-history', 
    generalRateLimit,
    logDataProcessing('PROCESSING_HISTORY', 'Data processing history access'),
    PrivacyController.getDataProcessingHistory
);

module.exports = router;