const privacyConfig = {
    // Consent types and their purposes
    consentTypes: {
        ESSENTIAL: {
            type: 'essential',
            name: 'Essential Cookies & Processing',
            description: 'Necessary for the website to function properly',
            required: true,
            legalBasis: 'legitimate_interest',
            defaultExpiry: null // No expiry for essential consent
        },
        ANALYTICS: {
            type: 'analytics',
            name: 'Analytics & Performance',
            description: 'Help us understand how you use our website',
            required: false,
            legalBasis: 'consent',
            defaultExpiry: 365 // 1 year
        },
        MARKETING: {
            type: 'marketing',
            name: 'Marketing Communications',
            description: 'Send you promotional materials and updates',
            required: false,
            legalBasis: 'consent',
            defaultExpiry: 730 // 2 years
        },
        FUNCTIONAL: {
            type: 'functional',
            name: 'Enhanced Functionality',
            description: 'Remember your preferences and settings',
            required: false,
            legalBasis: 'consent',
            defaultExpiry: 365 // 1 year
        }
    },

    // Data processing purposes
    processingPurposes: {
        USER_AUTHENTICATION: 'User authentication and authorization',
        PROFILE_MANAGEMENT: 'User profile management and preferences',
        AUDIT_LOGGING: 'Security audit and activity logging',
        VALVE_TOKENIZATION: 'Valve tokenization and blockchain operations',
        DISTRIBUTOR_MANAGEMENT: 'Distributor relationship management',
        ANALYTICS: 'Website analytics and performance monitoring',
        MARKETING: 'Marketing communications and promotions',
        CUSTOMER_SUPPORT: 'Customer support and service delivery'
    },

    // Legal bases for processing (GDPR Article 6)
    legalBases: {
        CONSENT: 'consent',
        CONTRACT: 'contract',
        LEGAL_OBLIGATION: 'legal_obligation',
        VITAL_INTERESTS: 'vital_interests',
        PUBLIC_TASK: 'public_task',
        LEGITIMATE_INTEREST: 'legitimate_interest'
    },

    // Data retention periods (in days)
    retentionPeriods: {
        USER_DATA: 2555, // 7 years for regulatory compliance
        AUDIT_LOGS: 2555, // 7 years for security compliance
        CONSENT_RECORDS: 2555, // 7 years for legal compliance
        VALVE_DATA: null, // Indefinite for business records
        MARKETING_DATA: 1095, // 3 years or until consent withdrawn
        ANALYTICS_DATA: 365 // 1 year
    },

    // Regional data residency rules
    dataResidency: {
        EU: {
            region: 'EU',
            name: 'European Union',
            regulation: 'GDPR',
            dataLocation: 'eu-west-1',
            transferRestrictions: [
                'Standard Contractual Clauses required for non-EU transfers',
                'Adequacy decisions required for third countries',
                'Data subject rights must be maintained'
            ],
            requiredConsent: ['marketing', 'analytics', 'functional']
        },
        US: {
            region: 'US',
            name: 'United States',
            regulation: 'CCPA',
            dataLocation: 'us-east-1',
            transferRestrictions: [
                'CCPA opt-out rights must be honored',
                'Data sale restrictions apply'
            ],
            requiredConsent: ['marketing']
        },
        BR: {
            region: 'BR',
            name: 'Brazil',
            regulation: 'LGPD',
            dataLocation: 'sa-east-1',
            transferRestrictions: [
                'ANPD approval required for international transfers',
                'Data subject rights equivalent to GDPR'
            ],
            requiredConsent: ['marketing', 'analytics', 'functional']
        },
        SG: {
            region: 'SG',
            name: 'Singapore',
            regulation: 'PDPA',
            dataLocation: 'ap-southeast-1',
            transferRestrictions: [
                'Consent required for overseas transfers',
                'Data breach notification requirements'
            ],
            requiredConsent: ['marketing', 'analytics']
        }
    },

    // User rights by regulation
    userRights: {
        GDPR: [
            'right_to_access',
            'right_to_rectification', 
            'right_to_erasure',
            'right_to_data_portability',
            'right_to_restrict_processing',
            'right_to_object',
            'right_to_withdraw_consent'
        ],
        CCPA: [
            'right_to_know',
            'right_to_delete',
            'right_to_opt_out',
            'right_to_non_discrimination'
        ],
        LGPD: [
            'right_to_access',
            'right_to_correction',
            'right_to_deletion',
            'right_to_data_portability',
            'right_to_withdraw_consent'
        ],
        PDPA: [
            'right_to_access',
            'right_to_correction',
            'right_to_withdraw_consent',
            'right_to_data_portability'
        ]
    },

    // Default privacy settings
    defaultPrivacySettings: {
        marketing_consent: false,
        analytics_consent: false,
        functional_consent: false,
        data_retention_override: null,
        communication_preferences: {
            email: true,
            sms: false,
            push: false
        }
    }
};

module.exports = privacyConfig;