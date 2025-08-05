const { db } = require('./database');
const privacyConfig = require('./privacyConfig');

class UserConsent {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.consent_type = data.consent_type;
        this.purpose = data.purpose;
        this.is_granted = data.is_granted;
        this.consent_date = data.consent_date;
        this.expiry_date = data.expiry_date;
        this.withdrawal_date = data.withdrawal_date;
        this.consent_source = data.consent_source;
        this.ip_address = data.ip_address;
        this.user_agent = data.user_agent;
        this.legal_basis = data.legal_basis;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create or update user consent
    static async updateConsent(userId, consentData) {
        const { consentType, isGranted, ipAddress, userAgent, source = 'web' } = consentData;
        
        const consentConfig = privacyConfig.consentTypes[consentType.toUpperCase()];
        if (!consentConfig) {
            throw new Error(`Invalid consent type: ${consentType}`);
        }

        const expiryDate = consentConfig.defaultExpiry 
            ? new Date(Date.now() + consentConfig.defaultExpiry * 24 * 60 * 60 * 1000) 
            : null;

        // Check if consent already exists
        const existingConsent = await db.query(
            'SELECT * FROM user_consent WHERE user_id = ? AND consent_type = ?',
            [userId, consentType]
        );

        if (existingConsent.length > 0) {
            // Update existing consent
            const sql = `UPDATE user_consent 
                        SET is_granted = ?, consent_date = CURRENT_TIMESTAMP, 
                            expiry_date = ?, withdrawal_date = ?, 
                            consent_source = ?, ip_address = ?, user_agent = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ? AND consent_type = ?`;
            
            await db.run(sql, [
                isGranted ? 1 : 0,
                expiryDate,
                isGranted ? null : new Date(),
                source,
                ipAddress,
                userAgent,
                userId,
                consentType
            ]);
        } else {
            // Create new consent record
            const sql = `INSERT INTO user_consent 
                        (user_id, consent_type, purpose, is_granted, consent_date, 
                         expiry_date, withdrawal_date, consent_source, ip_address, 
                         user_agent, legal_basis) 
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)`;
            
            await db.run(sql, [
                userId,
                consentType,
                consentConfig.description,
                isGranted ? 1 : 0,
                expiryDate,
                isGranted ? null : new Date(),
                source,
                ipAddress,
                userAgent,
                consentConfig.legalBasis
            ]);
        }

        return await UserConsent.getUserConsent(userId, consentType);
    }

    // Get user consent for a specific type
    static async getUserConsent(userId, consentType) {
        const sql = 'SELECT * FROM user_consent WHERE user_id = ? AND consent_type = ?';
        const rows = await db.query(sql, [userId, consentType]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new UserConsent(rows[0]);
    }

    // Get all consents for a user
    static async getAllUserConsents(userId) {
        const sql = 'SELECT * FROM user_consent WHERE user_id = ? ORDER BY consent_type';
        const rows = await db.query(sql, [userId]);
        
        return rows.map(row => new UserConsent(row));
    }

    // Check if user has valid consent for a specific type
    static async hasValidConsent(userId, consentType) {
        const consent = await UserConsent.getUserConsent(userId, consentType);
        
        if (!consent || !consent.is_granted) {
            return false;
        }

        // Check if consent has expired
        if (consent.expiry_date && new Date(consent.expiry_date) < new Date()) {
            return false;
        }

        // Check if consent was withdrawn
        if (consent.withdrawal_date) {
            return false;
        }

        return true;
    }

    // Get consent status summary for a user
    static async getConsentSummary(userId) {
        const consents = await UserConsent.getAllUserConsents(userId);
        const summary = {};

        // Initialize all consent types
        Object.keys(privacyConfig.consentTypes).forEach(type => {
            const config = privacyConfig.consentTypes[type];
            summary[type.toLowerCase()] = {
                type: config.type,
                name: config.name,
                description: config.description,
                required: config.required,
                granted: false,
                consentDate: null,
                expiryDate: null,
                valid: config.required // Essential consents are always valid
            };
        });

        // Update with actual consent data
        consents.forEach(consent => {
            const type = consent.consent_type.toLowerCase();
            if (summary[type]) {
                summary[type].granted = consent.is_granted;
                summary[type].consentDate = consent.consent_date;
                summary[type].expiryDate = consent.expiry_date;
                summary[type].valid = consent.is_granted && 
                    (!consent.expiry_date || new Date(consent.expiry_date) > new Date()) &&
                    !consent.withdrawal_date;
            }
        });

        return summary;
    }

    // Withdraw all consents for a user (used in data deletion)
    static async withdrawAllConsents(userId) {
        const sql = `UPDATE user_consent 
                    SET is_granted = 0, withdrawal_date = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND is_granted = 1`;
        
        return await db.run(sql, [userId]);
    }

    // Get expired consents that need renewal
    static async getExpiredConsents() {
        const sql = `SELECT * FROM user_consent 
                    WHERE is_granted = 1 
                    AND expiry_date IS NOT NULL 
                    AND expiry_date < CURRENT_TIMESTAMP`;
        
        const rows = await db.query(sql);
        return rows.map(row => new UserConsent(row));
    }

    // Bulk update consent for multiple types
    static async updateMultipleConsents(userId, consentsData, ipAddress, userAgent) {
        const results = [];
        
        for (const { consentType, isGranted } of consentsData) {
            try {
                const result = await UserConsent.updateConsent(userId, {
                    consentType,
                    isGranted,
                    ipAddress,
                    userAgent
                });
                results.push(result);
            } catch (error) {
                console.error(`Error updating consent ${consentType}:`, error);
                throw error;
            }
        }
        
        return results;
    }

    // Check regional consent requirements
    static async checkRegionalCompliance(userId, region) {
        const regionConfig = privacyConfig.dataResidency[region.toUpperCase()];
        if (!regionConfig) {
            throw new Error(`Unknown region: ${region}`);
        }

        const requiredConsents = regionConfig.requiredConsent || [];
        const compliance = {
            region,
            regulation: regionConfig.regulation,
            compliant: true,
            missingConsents: []
        };

        for (const consentType of requiredConsents) {
            const hasConsent = await UserConsent.hasValidConsent(userId, consentType);
            if (!hasConsent) {
                compliance.compliant = false;
                compliance.missingConsents.push(consentType);
            }
        }

        return compliance;
    }
}

module.exports = UserConsent;