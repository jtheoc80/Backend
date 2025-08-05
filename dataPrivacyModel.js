const { db } = require('./database');
const privacyConfig = require('./privacyConfig');

class DataPrivacy {
    // Log data processing activity
    static async logDataProcessing(userId, dataType, purpose, legalBasis, metadata = {}) {
        const sql = `INSERT INTO data_processing_logs 
                    (user_id, data_type, processing_purpose, legal_basis, processor, 
                     data_location, retention_period, metadata) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const processor = 'ValveChain-API';
        const dataLocation = await DataPrivacy.getUserDataLocation(userId);
        const retentionPeriod = privacyConfig.retentionPeriods[dataType] || 
            privacyConfig.retentionPeriods.USER_DATA;
        
        return await db.run(sql, [
            userId,
            dataType,
            purpose,
            legalBasis,
            processor,
            dataLocation,
            retentionPeriod,
            JSON.stringify(metadata)
        ]);
    }

    // Get user's data location based on region
    static async getUserDataLocation(userId) {
        const sql = 'SELECT data_region FROM users WHERE id = ?';
        const rows = await db.query(sql, [userId]);
        
        if (rows.length === 0) {
            return 'global';
        }
        
        const region = rows[0].data_region || 'GLOBAL';
        const regionConfig = privacyConfig.dataResidency[region];
        
        return regionConfig ? regionConfig.dataLocation : 'multi-region';
    }

    // Export all user data for right-to-access requests
    static async exportUserData(userId) {
        try {
            const userData = {
                exportDate: new Date().toISOString(),
                userId: userId,
                regulation: 'Multiple (GDPR, CCPA, LGPD, PDPA)',
                data: {}
            };

            // User profile data
            const userProfile = await db.query(
                'SELECT id, username, email, role, created_at, updated_at, is_verified, data_region, marketing_consent, analytics_consent, privacy_settings FROM users WHERE id = ?',
                [userId]
            );
            userData.data.profile = userProfile[0] || {};

            // User consent records
            const consents = await db.query(
                'SELECT * FROM user_consent WHERE user_id = ?',
                [userId]
            );
            userData.data.consents = consents;

            // Audit logs
            const auditLogs = await db.query(
                'SELECT action, metadata, outcome, timestamp FROM audit_logs WHERE user_id = ?',
                [userId]
            );
            userData.data.auditLogs = auditLogs;

            // Data processing logs
            const processingLogs = await db.query(
                'SELECT * FROM data_processing_logs WHERE user_id = ?',
                [userId]
            );
            userData.data.processingLogs = processingLogs;

            // Data requests history
            const dataRequests = await db.query(
                'SELECT request_type, status, request_date, completion_date, notes FROM user_data_requests WHERE user_id = ?',
                [userId]
            );
            userData.data.dataRequests = dataRequests;

            // Valve-related data (if user is a manufacturer or has valve records)
            const valveData = await db.query(
                'SELECT v.* FROM valves v JOIN manufacturers m ON v.manufacturer_id = m.id WHERE m.wallet_address IN (SELECT DISTINCT ip_address FROM user_consent WHERE user_id = ?) OR v.current_owner_id = ?',
                [userId, userId.toString()]
            );
            if (valveData.length > 0) {
                userData.data.valves = valveData;
            }

            return userData;
        } catch (error) {
            console.error('Error exporting user data:', error);
            throw new Error('Failed to export user data');
        }
    }

    // Delete all user data for right-to-erase requests
    static async deleteUserData(userId, requestId) {
        try {
            // Start transaction-like operation
            const deletionResults = {
                requestId,
                userId,
                deletionDate: new Date().toISOString(),
                deletedRecords: {}
            };

            // Delete consent records
            const consentResult = await db.run('DELETE FROM user_consent WHERE user_id = ?', [userId]);
            deletionResults.deletedRecords.consents = consentResult.changes;

            // Delete data processing logs
            const processingResult = await db.run('DELETE FROM data_processing_logs WHERE user_id = ?', [userId]);
            deletionResults.deletedRecords.processingLogs = processingResult.changes;

            // Delete audit logs (with retention consideration)
            const auditResult = await db.run('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
            deletionResults.deletedRecords.auditLogs = auditResult.changes;

            // Delete data requests (except the current one)
            const requestsResult = await db.run('DELETE FROM user_data_requests WHERE user_id = ? AND id != ?', [userId, requestId]);
            deletionResults.deletedRecords.dataRequests = requestsResult.changes;

            // Handle valve data - anonymize rather than delete for regulatory compliance
            const valveResult = await db.run(
                'UPDATE valves SET current_owner_id = NULL WHERE current_owner_id = ?',
                [userId.toString()]
            );
            deletionResults.deletedRecords.valveAnonymized = valveResult.changes;

            // Finally, delete the user record
            const userResult = await db.run('DELETE FROM users WHERE id = ?', [userId]);
            deletionResults.deletedRecords.user = userResult.changes;

            return deletionResults;
        } catch (error) {
            console.error('Error deleting user data:', error);
            throw new Error('Failed to delete user data');
        }
    }

    // Create a data request (access, delete, portability, rectification)
    static async createDataRequest(userId, requestType, requestData = {}) {
        const validTypes = ['access', 'delete', 'portability', 'rectification'];
        if (!validTypes.includes(requestType)) {
            throw new Error(`Invalid request type: ${requestType}`);
        }

        const sql = `INSERT INTO user_data_requests 
                    (user_id, request_type, request_data, status) 
                    VALUES (?, ?, ?, 'pending')`;
        
        const result = await db.run(sql, [
            userId,
            requestType,
            JSON.stringify(requestData)
        ]);

        // Log the data request
        await DataPrivacy.logDataProcessing(
            userId,
            'DATA_REQUEST',
            privacyConfig.processingPurposes.CUSTOMER_SUPPORT,
            privacyConfig.legalBases.LEGITIMATE_INTEREST,
            { requestType, requestId: result.lastID }
        );

        return result.lastID;
    }

    // Process a data request
    static async processDataRequest(requestId, processedBy, status = 'completed', responseData = null, notes = null) {
        const validStatuses = ['pending', 'processing', 'completed', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }

        const sql = `UPDATE user_data_requests 
                    SET status = ?, completion_date = CURRENT_TIMESTAMP, 
                        processed_by = ?, response_data = ?, notes = ?
                    WHERE id = ?`;
        
        const responseDataJson = responseData ? JSON.stringify(responseData) : null;
        
        return await db.run(sql, [
            status,
            processedBy,
            responseDataJson,
            notes,
            requestId
        ]);
    }

    // Get data request by ID
    static async getDataRequest(requestId) {
        const sql = 'SELECT * FROM user_data_requests WHERE id = ?';
        const rows = await db.query(sql, [requestId]);
        
        return rows.length > 0 ? rows[0] : null;
    }

    // Get all data requests for a user
    static async getUserDataRequests(userId) {
        const sql = `SELECT * FROM user_data_requests WHERE user_id = ? ORDER BY request_date DESC`;
        return await db.query(sql, [userId]);
    }

    // Get pending data requests (for admin processing)
    static async getPendingDataRequests() {
        const sql = `SELECT dr.*, u.username, u.email 
                    FROM user_data_requests dr 
                    JOIN users u ON dr.user_id = u.id 
                    WHERE dr.status = 'pending' 
                    ORDER BY dr.request_date ASC`;
        return await db.query(sql);
    }

    // Check data retention compliance
    static async checkRetentionCompliance() {
        const retentionChecks = [];

        // Check user data retention
        const userRetentionDays = privacyConfig.retentionPeriods.USER_DATA;
        if (userRetentionDays) {
            const sql = `SELECT id, username, email, created_at, data_retention_date 
                        FROM users 
                        WHERE data_retention_date IS NOT NULL 
                        AND data_retention_date < date('now')
                        OR (data_retention_date IS NULL 
                            AND created_at < datetime('now', '-${userRetentionDays} days'))`;
            
            const expiredUsers = await db.query(sql);
            retentionChecks.push({
                dataType: 'USER_DATA',
                retentionPeriod: userRetentionDays,
                expiredRecords: expiredUsers.length,
                records: expiredUsers
            });
        }

        // Check audit logs retention
        const auditRetentionDays = privacyConfig.retentionPeriods.AUDIT_LOGS;
        if (auditRetentionDays) {
            const sql = `SELECT COUNT(*) as count 
                        FROM audit_logs 
                        WHERE timestamp < datetime('now', '-${auditRetentionDays} days')`;
            
            const expiredAudits = await db.query(sql);
            retentionChecks.push({
                dataType: 'AUDIT_LOGS',
                retentionPeriod: auditRetentionDays,
                expiredRecords: expiredAudits[0].count
            });
        }

        return retentionChecks;
    }

    // Set user data region
    static async setUserDataRegion(userId, region) {
        const regionConfig = privacyConfig.dataResidency[region.toUpperCase()];
        if (!regionConfig) {
            throw new Error(`Invalid region: ${region}`);
        }

        const sql = 'UPDATE users SET data_region = ? WHERE id = ?';
        const result = await db.run(sql, [region.toUpperCase(), userId]);

        // Log the region change
        await DataPrivacy.logDataProcessing(
            userId,
            'USER_DATA',
            'Data residency configuration',
            privacyConfig.legalBases.LEGITIMATE_INTEREST,
            { oldRegion: 'unknown', newRegion: region.toUpperCase() }
        );

        return result;
    }

    // Get data residency information
    static async getDataResidencyInfo(region) {
        const sql = 'SELECT * FROM data_residency_config WHERE region = ?';
        const rows = await db.query(sql, [region.toUpperCase()]);
        
        return rows.length > 0 ? rows[0] : null;
    }

    // Get all supported regions
    static async getSupportedRegions() {
        const sql = 'SELECT * FROM data_residency_config ORDER BY region_name';
        return await db.query(sql);
    }
}

module.exports = DataPrivacy;