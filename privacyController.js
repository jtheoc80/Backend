const UserConsent = require('./consentModel');
const DataPrivacy = require('./dataPrivacyModel');
const privacyConfig = require('./privacyConfig');
const logActivity = require('./logActivity');
const { db } = require('./database');

class PrivacyController {
    // Get user's privacy dashboard data
    static async getPrivacyDashboard(req, res) {
        try {
            const userId = req.user.id;
            
            // Get consent summary
            const consentSummary = await UserConsent.getConsentSummary(userId);
            
            // Get data requests
            const dataRequests = await DataPrivacy.getUserDataRequests(userId);
            
            // Get user region and compliance info
            const user = await db.query('SELECT data_region FROM users WHERE id = ?', [userId]);
            const userRegion = (user[0]?.data_region || 'GLOBAL').toUpperCase();
            const compliance = userRegion !== 'GLOBAL' 
                ? await UserConsent.checkRegionalCompliance(userId, userRegion)
                : { compliant: true, region: 'GLOBAL', regulation: 'Mixed' };
            
            // Get supported regions
            const supportedRegions = await DataPrivacy.getSupportedRegions();
            
            const dashboardData = {
                user: {
                    id: userId,
                    region: userRegion
                },
                consents: consentSummary,
                compliance,
                dataRequests: dataRequests.slice(0, 10), // Last 10 requests
                supportedRegions,
                privacyRights: privacyConfig.userRights[compliance.regulation] || privacyConfig.userRights.GDPR
            };
            
            await logActivity(userId, 'PRIVACY_DASHBOARD_VIEW', { region: userRegion }, 'success');
            
            res.json(dashboardData);
        } catch (error) {
            console.error('Privacy dashboard error:', error);
            await logActivity(req.user?.id, 'PRIVACY_DASHBOARD_VIEW', { error: error.message }, 'failed');
            res.status(500).json({
                error: 'Failed to load privacy dashboard',
                code: 'DASHBOARD_ERROR'
            });
        }
    }

    // Update user consent preferences
    static async updateConsent(req, res) {
        try {
            const userId = req.user.id;
            const { consents } = req.body;
            
            if (!Array.isArray(consents)) {
                return res.status(400).json({
                    error: 'Consents must be an array',
                    code: 'INVALID_CONSENT_FORMAT'
                });
            }
            
            const results = await UserConsent.updateMultipleConsents(
                userId,
                consents,
                req.consentContext.ipAddress,
                req.consentContext.userAgent
            );
            
            // Update user privacy settings in users table
            const marketingConsent = consents.find(c => c.consentType === 'marketing')?.isGranted || false;
            const analyticsConsent = consents.find(c => c.consentType === 'analytics')?.isGranted || false;
            
            await db.run(
                'UPDATE users SET marketing_consent = ?, analytics_consent = ? WHERE id = ?',
                [marketingConsent ? 1 : 0, analyticsConsent ? 1 : 0, userId]
            );
            
            await logActivity(userId, 'CONSENT_UPDATE', { 
                consents: consents.map(c => ({ type: c.consentType, granted: c.isGranted }))
            }, 'success');
            
            res.json({
                message: 'Consent preferences updated successfully',
                results,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Consent update error:', error);
            await logActivity(req.user?.id, 'CONSENT_UPDATE', { error: error.message }, 'failed');
            res.status(500).json({
                error: 'Failed to update consent preferences',
                code: 'CONSENT_UPDATE_ERROR'
            });
        }
    }

    // Get consent requirements for user's region
    static async getConsentRequirements(req, res) {
        try {
            const userId = req.user?.id;
            const region = req.query.region || req.user?.data_region || 'GLOBAL';
            
            const regionConfig = privacyConfig.dataResidency[region.toUpperCase()];
            if (!regionConfig) {
                return res.status(400).json({
                    error: 'Invalid region',
                    code: 'INVALID_REGION'
                });
            }
            
            const requirements = {
                region: region.toUpperCase(),
                regionName: regionConfig.name,
                regulation: regionConfig.regulation,
                requiredConsents: regionConfig.requiredConsent || [],
                consentTypes: {}
            };
            
            // Add consent type details
            Object.keys(privacyConfig.consentTypes).forEach(type => {
                const config = privacyConfig.consentTypes[type];
                requirements.consentTypes[type.toLowerCase()] = {
                    type: config.type,
                    name: config.name,
                    description: config.description,
                    required: config.required || requirements.requiredConsents.includes(config.type),
                    legalBasis: config.legalBasis,
                    defaultExpiry: config.defaultExpiry
                };
            });
            
            // If user is authenticated, include current consent status
            if (userId) {
                requirements.currentConsents = await UserConsent.getConsentSummary(userId);
            }
            
            res.json(requirements);
        } catch (error) {
            console.error('Consent requirements error:', error);
            res.status(500).json({
                error: 'Failed to get consent requirements',
                code: 'REQUIREMENTS_ERROR'
            });
        }
    }

    // Request user data export (right to access)
    static async requestDataExport(req, res) {
        try {
            const userId = req.user.id;
            const { format = 'json', includeMetadata = true } = req.body;
            
            // Create data request record
            const requestId = await DataPrivacy.createDataRequest(userId, 'access', {
                format,
                includeMetadata,
                requestedAt: new Date()
            });
            
            // For immediate export (small datasets), process now
            // For larger datasets, this would be queued for background processing
            try {
                const exportData = await DataPrivacy.exportUserData(userId);
                
                await DataPrivacy.processDataRequest(
                    requestId,
                    userId, // Self-service
                    'completed',
                    exportData,
                    'Automatic data export completed'
                );
                
                await logActivity(userId, 'DATA_EXPORT_REQUEST', { requestId, format }, 'success');
                
                res.json({
                    message: 'Data export completed',
                    requestId,
                    data: exportData,
                    completedAt: new Date()
                });
            } catch (exportError) {
                await DataPrivacy.processDataRequest(
                    requestId,
                    null,
                    'rejected',
                    null,
                    `Export failed: ${exportError.message}`
                );
                throw exportError;
            }
        } catch (error) {
            console.error('Data export error:', error);
            await logActivity(req.user?.id, 'DATA_EXPORT_REQUEST', { error: error.message }, 'failed');
            res.status(500).json({
                error: 'Failed to export user data',
                code: 'EXPORT_ERROR'
            });
        }
    }

    // Request user data deletion (right to erasure)
    static async requestDataDeletion(req, res) {
        try {
            const userId = req.user.id;
            const { reason, confirmDeletion } = req.body;
            
            if (!confirmDeletion) {
                return res.status(400).json({
                    error: 'Deletion confirmation required',
                    code: 'DELETION_NOT_CONFIRMED'
                });
            }
            
            // Create data request record
            const requestId = await DataPrivacy.createDataRequest(userId, 'delete', {
                reason,
                confirmDeletion,
                requestedAt: new Date()
            });
            
            // Process deletion immediately for demo purposes
            // In production, this might require admin approval or be queued
            try {
                const deletionResults = await DataPrivacy.deleteUserData(userId, requestId);
                
                await DataPrivacy.processDataRequest(
                    requestId,
                    userId, // Self-service
                    'completed',
                    deletionResults,
                    'User data deletion completed'
                );
                
                await logActivity(userId, 'DATA_DELETION_REQUEST', { 
                    requestId, 
                    reason,
                    deletedRecords: deletionResults.deletedRecords 
                }, 'success');
                
                res.json({
                    message: 'User data deletion completed',
                    requestId,
                    deletionResults,
                    completedAt: new Date()
                });
            } catch (deletionError) {
                await DataPrivacy.processDataRequest(
                    requestId,
                    null,
                    'rejected',
                    null,
                    `Deletion failed: ${deletionError.message}`
                );
                throw deletionError;
            }
        } catch (error) {
            console.error('Data deletion error:', error);
            await logActivity(req.user?.id, 'DATA_DELETION_REQUEST', { error: error.message }, 'failed');
            res.status(500).json({
                error: 'Failed to delete user data',
                code: 'DELETION_ERROR'
            });
        }
    }

    // Update user data region
    static async updateDataRegion(req, res) {
        try {
            const userId = req.user.id;
            const { region } = req.body;
            
            if (!region) {
                return res.status(400).json({
                    error: 'Region is required',
                    code: 'REGION_REQUIRED'
                });
            }
            
            const regionConfig = privacyConfig.dataResidency[region.toUpperCase()];
            if (!regionConfig) {
                return res.status(400).json({
                    error: 'Invalid region',
                    code: 'INVALID_REGION',
                    supportedRegions: Object.keys(privacyConfig.dataResidency)
                });
            }
            
            await DataPrivacy.setUserDataRegion(userId, region);
            
            // Check if new region requires additional consents
            const compliance = await UserConsent.checkRegionalCompliance(userId, region.toUpperCase());
            
            await logActivity(userId, 'DATA_REGION_UPDATE', { 
                newRegion: region.toUpperCase(),
                compliance 
            }, 'success');
            
            res.json({
                message: 'Data region updated successfully',
                region: region.toUpperCase(),
                regionName: regionConfig.name,
                regulation: regionConfig.regulation,
                compliance,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Data region update error:', error);
            await logActivity(req.user?.id, 'DATA_REGION_UPDATE', { error: error.message }, 'failed');
            res.status(500).json({
                error: 'Failed to update data region',
                code: 'REGION_UPDATE_ERROR'
            });
        }
    }

    // Get supported regions and their privacy regulations
    static async getSupportedRegions(req, res) {
        try {
            const regions = await DataPrivacy.getSupportedRegions();
            
            const regionsWithConfig = regions.map(region => ({
                ...region,
                privacyRights: privacyConfig.userRights[region.regulatory_framework] || [],
                requiredConsents: privacyConfig.dataResidency[region.region]?.requiredConsent || []
            }));
            
            res.json({
                regions: regionsWithConfig,
                defaultRegion: 'GLOBAL'
            });
        } catch (error) {
            console.error('Get regions error:', error);
            res.status(500).json({
                error: 'Failed to get supported regions',
                code: 'REGIONS_ERROR'
            });
        }
    }

    // Get user's data processing history
    static async getDataProcessingHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 50 } = req.query;
            
            const offset = (page - 1) * limit;
            const sql = `SELECT * FROM data_processing_logs 
                        WHERE user_id = ? 
                        ORDER BY processing_date DESC 
                        LIMIT ? OFFSET ?`;
                        
            const logs = await db.query(sql, [userId, limit, offset]);
            
            const totalCount = await db.query(
                'SELECT COUNT(*) as count FROM data_processing_logs WHERE user_id = ?',
                [userId]
            );
            
            res.json({
                logs: logs.map(log => ({
                    ...log,
                    metadata: log.metadata ? JSON.parse(log.metadata) : null
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount[0].count,
                    pages: Math.ceil(totalCount[0].count / limit)
                }
            });
        } catch (error) {
            console.error('Data processing history error:', error);
            res.status(500).json({
                error: 'Failed to get data processing history',
                code: 'HISTORY_ERROR'
            });
        }
    }
}

module.exports = PrivacyController;