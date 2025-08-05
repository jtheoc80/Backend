/**
 * Transaction Fee Service
 * 
 * Provides role-based transaction fee calculation for blockchain operations.
 * Fees are calculated in basis points (bps) where 1 bps = 0.01%.
 * 
 * Fee Structure:
 * - General transactions: 60 bps (0.60%)
 * - Distributors: 10 bps (0.10%)
 * - Repair vendors: 10 bps (0.10%)
 * - Plants: 40 bps (0.40%)
 */

class TransactionFeeService {
    constructor() {
        // Fee configuration in basis points (bps)
        // 1 bps = 0.01% = 0.0001 as decimal
        this.feeConfig = {
            // Default fee for general transactions
            default: 60, // 60 bps = 0.60%
            
            // Role-specific fees
            distributor: 10, // 10 bps = 0.10%
            repair_vendor: 10, // 10 bps = 0.10%
            plant: 40, // 40 bps = 0.40%
            
            // Additional roles can be added here
            admin: 0, // Admins don't pay fees
        };
        
        // Basis points to decimal conversion
        this.BPS_TO_DECIMAL = 0.0001;
    }

    /**
     * Calculate transaction fee based on user role and transaction amount
     * @param {string} userRole - The role of the user initiating the transaction
     * @param {number} transactionAmount - The transaction amount in ETH (as decimal)
     * @returns {Object} Fee calculation result
     */
    calculateFee(userRole, transactionAmount) {
        try {
            // Validate inputs
            if (typeof transactionAmount !== 'number' || transactionAmount < 0) {
                throw new Error('Transaction amount must be a non-negative number');
            }

            if (!userRole || typeof userRole !== 'string') {
                throw new Error('User role must be a valid string');
            }

            // Normalize role to lowercase for consistency
            const normalizedRole = userRole.toLowerCase().trim();
            
            // Get fee rate in basis points
            const feeBps = this.getFeeRateForRole(normalizedRole);
            
            // Convert basis points to decimal
            const feeRate = feeBps * this.BPS_TO_DECIMAL;
            
            // Calculate fee amount
            const feeAmount = transactionAmount * feeRate;
            
            return {
                success: true,
                role: normalizedRole,
                transactionAmount,
                feeBasisPoints: feeBps,
                feeRate,
                feeAmount,
                netAmount: transactionAmount - feeAmount,
                calculation: {
                    formula: `${transactionAmount} ETH × ${feeBps} bps = ${feeAmount} ETH`,
                    percentage: `${(feeRate * 100).toFixed(2)}%`
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                role: userRole,
                transactionAmount
            };
        }
    }

    /**
     * Get fee rate in basis points for a specific role
     * @param {string} role - User role (normalized to lowercase)
     * @returns {number} Fee rate in basis points
     */
    getFeeRateForRole(role) {
        // Check if role has a specific fee configuration
        if (this.feeConfig.hasOwnProperty(role)) {
            return this.feeConfig[role];
        }
        
        // Check for role mappings (for flexibility in role naming)
        const roleMappings = {
            'repair': 'repair_vendor',
            'repairvendor': 'repair_vendor',
            'repair-vendor': 'repair_vendor',
            'dist': 'distributor',
            'distribution': 'distributor'
        };
        
        const mappedRole = roleMappings[role];
        if (mappedRole && this.feeConfig.hasOwnProperty(mappedRole)) {
            return this.feeConfig[mappedRole];
        }
        
        // Return default fee rate if role not found
        return this.feeConfig.default;
    }

    /**
     * Get all available fee tiers
     * @returns {Object} All fee configurations with descriptions
     */
    getAllFeeTiers() {
        return {
            tiers: Object.entries(this.feeConfig).map(([role, bps]) => ({
                role,
                basisPoints: bps,
                percentage: `${(bps * this.BPS_TO_DECIMAL * 100).toFixed(2)}%`,
                description: this.getRoleDescription(role)
            })),
            metadata: {
                bpsToDecimal: this.BPS_TO_DECIMAL,
                formula: 'Fee = Transaction Amount × (Basis Points × 0.0001)'
            }
        };
    }

    /**
     * Add or update fee tier for a role
     * @param {string} role - Role name
     * @param {number} basisPoints - Fee in basis points
     * @returns {boolean} Success status
     */
    setFeeTier(role, basisPoints) {
        try {
            if (typeof role !== 'string' || !role.trim()) {
                throw new Error('Role must be a non-empty string');
            }
            
            if (typeof basisPoints !== 'number' || basisPoints < 0) {
                throw new Error('Basis points must be a non-negative number');
            }
            
            const normalizedRole = role.toLowerCase().trim();
            this.feeConfig[normalizedRole] = basisPoints;
            
            return true;
        } catch (error) {
            console.error('Error setting fee tier:', error);
            return false;
        }
    }

    /**
     * Get description for a role
     * @param {string} role - Role name
     * @returns {string} Role description
     */
    getRoleDescription(role) {
        const descriptions = {
            default: 'General transactions',
            distributor: 'Distributor transactions',
            repair_vendor: 'Repair vendor transactions',
            plant: 'Plant facility transactions',
            admin: 'Administrative operations'
        };
        
        return descriptions[role] || 'Custom role';
    }

    /**
     * Validate fee calculation result
     * @param {Object} feeResult - Result from calculateFee
     * @returns {boolean} True if valid
     */
    isValidFeeCalculation(feeResult) {
        if (!feeResult || !feeResult.success) {
            return false;
        }
        
        return (
            typeof feeResult.feeAmount === 'number' &&
            feeResult.feeAmount >= 0 &&
            feeResult.feeAmount <= feeResult.transactionAmount &&
            feeResult.netAmount >= 0
        );
    }
}

// Export singleton instance
const transactionFeeService = new TransactionFeeService();

module.exports = transactionFeeService;