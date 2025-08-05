const UserConsent = require('./consentModel');
const DataPrivacy = require('./dataPrivacyModel');
const privacyConfig = require('./privacyConfig');
const { db } = require('./database');

// Middleware to check if user has valid consent for a specific processing type
const requireConsent = (consentType, purpose = null) => {
    return async (req, res, next) => {
        try {
            // Skip consent check for essential processing
            if (consentType === 'essential') {
                return next();
            }

            // Extract user ID from token
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Check if consent is required for user's region
            const user = await db.query('SELECT data_region FROM users WHERE id = ?', [userId]);
            const userRegion = user[0]?.data_region || 'GLOBAL';
            const regionConfig = privacyConfig.dataResidency[userRegion];
            
            if (regionConfig && regionConfig.requiredConsent.includes(consentType)) {
                const hasConsent = await UserConsent.hasValidConsent(userId, consentType);
                
                if (!hasConsent) {
                    return res.status(403).json({
                        error: 'Consent required for this operation',
                        code: 'CONSENT_REQUIRED',
                        consentType,
                        purpose: purpose || privacyConfig.processingPurposes[consentType.toUpperCase()],
                        region: userRegion,
                        regulation: regionConfig.regulation
                    });
                }
            }

            // Log the data processing activity
            if (purpose) {
                await DataPrivacy.logDataProcessing(
                    userId,
                    consentType.toUpperCase(),
                    purpose,
                    privacyConfig.legalBases.CONSENT,
                    {
                        endpoint: req.path,
                        method: req.method,
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                );
            }

            next();
        } catch (error) {
            console.error('Consent middleware error:', error);
            res.status(500).json({
                error: 'Internal server error checking consent',
                code: 'CONSENT_CHECK_ERROR'
            });
        }
    };
};

// Middleware to validate data residency requirements
const validateDataResidency = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(); // Skip if no user context
        }

        // Get user's data region
        const user = await db.query('SELECT data_region FROM users WHERE id = ?', [userId]);
        const userRegion = user[0]?.data_region || 'GLOBAL';
        
        // Check if the processing is allowed in this region
        const residencyInfo = await DataPrivacy.getDataResidencyInfo(userRegion);
        if (residencyInfo && !residencyInfo.allowed_processing) {
            return res.status(403).json({
                error: 'Data processing not allowed in this region',
                code: 'REGION_RESTRICTION',
                region: userRegion
            });
        }

        // Add region info to request for downstream use
        req.userRegion = userRegion;
        req.residencyInfo = residencyInfo;
        
        next();
    } catch (error) {
        console.error('Data residency middleware error:', error);
        res.status(500).json({
            error: 'Internal server error checking data residency',
            code: 'RESIDENCY_CHECK_ERROR'
        });
    }
};

// Middleware to capture user consent from request headers/cookies
const captureConsentContext = (req, res, next) => {
    // Extract consent information from request
    req.consentContext = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        source: req.get('X-Consent-Source') || 'api'
    };
    
    next();
};

// Middleware for GDPR cookie consent banner requirements
const checkCookieConsent = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        
        // Skip for non-authenticated requests
        if (!userId) {
            return next();
        }

        // Check if user is in EU region
        const user = await db.query('SELECT data_region FROM users WHERE id = ?', [userId]);
        const userRegion = user[0]?.data_region || 'GLOBAL';
        
        if (userRegion === 'EU') {
            // Check if user has made consent choices
            const consents = await UserConsent.getAllUserConsents(userId);
            
            if (consents.length === 0) {
                // No consent recorded, user needs to see consent banner
                res.setHeader('X-Consent-Required', 'true');
                res.setHeader('X-Consent-Region', 'EU');
                res.setHeader('X-Consent-Regulation', 'GDPR');
            }
        }
        
        next();
    } catch (error) {
        console.error('Cookie consent middleware error:', error);
        next(); // Don't block request on error
    }
};

// Middleware to log data processing activities
const logDataProcessing = (dataType, purpose, legalBasis = 'legitimate_interest') => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            
            if (userId) {
                await DataPrivacy.logDataProcessing(
                    userId,
                    dataType,
                    purpose,
                    legalBasis,
                    {
                        endpoint: req.path,
                        method: req.method,
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                );
            }
            
            next();
        } catch (error) {
            console.error('Data processing logging error:', error);
            next(); // Don't block request on logging error
        }
    };
};

// Middleware to validate user data retention
const checkDataRetention = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        
        if (userId) {
            const user = await db.query(
                'SELECT data_retention_date FROM users WHERE id = ?',
                [userId]
            );
            
            const retentionDate = user[0]?.data_retention_date;
            if (retentionDate && new Date(retentionDate) < new Date()) {
                return res.status(403).json({
                    error: 'Account has expired due to data retention policy',
                    code: 'DATA_RETENTION_EXPIRED',
                    message: 'Please contact support to reactivate your account'
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('Data retention check error:', error);
        next(); // Don't block request on error
    }
};

// Rate limiting for privacy-sensitive operations
const privacyRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 10) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip + ':' + (req.user?.id || 'anonymous');
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [k, timestamps] of requests.entries()) {
            requests.set(k, timestamps.filter(t => t > windowStart));
            if (requests.get(k).length === 0) {
                requests.delete(k);
            }
        }
        
        // Check current request count
        const userRequests = requests.get(key) || [];
        
        if (userRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many privacy requests',
                code: 'PRIVACY_RATE_LIMIT',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        // Add current request
        userRequests.push(now);
        requests.set(key, userRequests);
        
        next();
    };
};

module.exports = {
    requireConsent,
    validateDataResidency,
    captureConsentContext,
    checkCookieConsent,
    logDataProcessing,
    checkDataRetention,
    privacyRateLimit
};