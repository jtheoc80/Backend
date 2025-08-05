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
            // Default fee for general transactions (0.5% as per requirements)
            default: 50, // 50 bps = 0.50%
            
            // Role-specific fees (maintaining existing structure but adjusting to 0.5% baseline)
            distributor: 50, // 50 bps = 0.50% - standardized as per requirements
            repair_vendor: 50, // 50 bps = 0.50%
            plant: 50, // 50 bps = 0.50%
            manufacturer: 50, // 50 bps = 0.50%
            
            // Additional roles can be added here
            admin: 0, // Admins don't pay fees
        };
        
        // Organization fee wallet address for collecting fees
        this.feeWalletAddress = process.env.FEE_WALLET_ADDRESS || '0xFEEWALLETADDRESS123456789ABCDEF';
        
        // Basis points to decimal conversion
        this.BPS_TO_DECIMAL = 0.0001;
    }

    /**
     * Calculate transaction fee based on user role and transaction amount
     * @param {string} userRole - The role of the user initiating the transaction
     * @param {number} transactionAmount - The transaction amount in ETH (as decimal)
     * @param {number} returnFee - Optional return fee negotiated between parties
     * @returns {Object} Fee calculation result
     */
    calculateFee(userRole, transactionAmount, returnFee = 0) {
        try {
            // Validate inputs
            if (typeof transactionAmount !== 'number' || transactionAmount < 0) {
                throw new Error('Transaction amount must be a non-negative number');
            }

            if (!userRole || typeof userRole !== 'string') {
                throw new Error('User role must be a valid string');
            }

            if (typeof returnFee !== 'number' || returnFee < 0) {
                throw new Error('Return fee must be a non-negative number');
            }

            // Normalize role to lowercase for consistency
            const normalizedRole = userRole.toLowerCase().trim();
            
            // Get fee rate in basis points
            const feeBps = this.getFeeRateForRole(normalizedRole);
            
            // Convert basis points to decimal
            const feeRate = feeBps * this.BPS_TO_DECIMAL;
            
            // Calculate fee amount (0.5% of transaction total)
            const totalTransactionAmount = transactionAmount + returnFee;
            const feeAmount = totalTransactionAmount * feeRate;
            
            return {
                success: true,
                role: normalizedRole,
                transactionAmount,
                returnFee,
                totalTransactionAmount,
                feeBasisPoints: feeBps,
                feeRate,
                feeAmount,
                netAmount: totalTransactionAmount - feeAmount,
                feeWalletAddress: this.feeWalletAddress,
                calculation: {
                    formula: `(${transactionAmount} + ${returnFee}) ETH × ${feeBps} bps = ${feeAmount} ETH`,
                    percentage: `${(feeRate * 100).toFixed(2)}%`
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                role: userRole,
                transactionAmount,
                returnFee
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
     * Record transaction fee payment
     * @param {Object} feeData - Fee transaction data
     * @returns {Object} Recording result
     */
    async recordFeePayment(feeData) {
        try {
            const { db } = require('./database');
            
            const {
                transactionType,
                transactionId,
                userId,
                userRole,
                transactionAmount,
                feeRate,
                feeAmount,
                blockchainTransactionHash,
                status = 'pending'
            } = feeData;

            const sql = `INSERT INTO transaction_fees (
                transaction_type, transaction_id, user_id, user_role,
                transaction_amount, fee_rate, fee_amount, fee_wallet_address,
                blockchain_transaction_hash, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const result = await db.run(sql, [
                transactionType, transactionId, userId, userRole,
                transactionAmount, feeRate, feeAmount, this.feeWalletAddress,
                blockchainTransactionHash, status
            ]);

            return {
                success: true,
                feeRecordId: result.lastID,
                feeWalletAddress: this.feeWalletAddress
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update fee payment status
     * @param {number} feeRecordId - Fee record ID
     * @param {string} status - New status
     * @param {string} blockchainHash - Blockchain transaction hash
     * @returns {Object} Update result
     */
    async updateFeePaymentStatus(feeRecordId, status, blockchainHash = null) {
        try {
            const { db } = require('./database');
            
            let sql = `UPDATE transaction_fees SET status = ?`;
            let params = [status, feeRecordId];
            
            if (blockchainHash) {
                sql += `, blockchain_transaction_hash = ?`;
                params = [status, blockchainHash, feeRecordId];
            }
            
            sql += ` WHERE id = ?`;

            await db.run(sql, params);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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
            feeResult.feeAmount <= feeResult.totalTransactionAmount &&
            feeResult.netAmount >= 0
        );
    }
}

// Export singleton instance
const transactionFeeService = new TransactionFeeService();

module.exports = transactionFeeService;