const { ethers } = require('ethers');
const transactionFeeService = require('./transactionFeeService');

class BlockchainService {
    constructor() {
        // Mock blockchain configuration - replace with actual blockchain integration
        this.contractABI = [];
        try {
            this.contractABI = require('./valvechainabi.json');
        } catch (error) {
            console.log('ABI file not found or invalid, using empty ABI for mock mode');
        }
        this.contractAddress = process.env.CONTRACT_ADDRESS || '0x742d35Cc6436C0532925a3b8D0000a5492d95a8b';
        this.rpcUrl = process.env.RPC_URL || 'https://sepolia.infura.io/v3/your-project-id';
        this.privateKey = process.env.PRIVATE_KEY;
        
        // Initialize provider (mock for now)
        this.provider = null;
        this.contract = null;
        this.wallet = null;
        
        // For development, we'll use mock functions
        this.mockMode = true;
    }

    // Initialize blockchain connection
    async initialize() {
        if (this.mockMode) {
            console.log('Blockchain service initialized in mock mode');
            return true;
        }

        try {
            this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
            this.wallet = new ethers.Wallet(this.privateKey, this.provider);
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
            
            console.log('Blockchain service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize blockchain service:', error);
            return false;
        }
    }

    // Register distributor on blockchain
    async registerDistributor(distributorData) {
        if (this.mockMode) {
            return this.mockRegisterDistributor(distributorData);
        }

        try {
            const tx = await this.contract.registerDistributor(
                distributorData.id,
                distributorData.name,
                distributorData.walletAddress
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Blockchain distributor registration failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Assign distributor rights on blockchain
    async assignDistributorRights(manufacturerId, distributorId, territoryId, permissions) {
        if (this.mockMode) {
            return this.mockAssignDistributorRights(manufacturerId, distributorId, territoryId, permissions);
        }

        try {
            const tx = await this.contract.assignDistributorRights(
                manufacturerId,
                distributorId,
                territoryId,
                permissions.join(',')
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                contractAddress: this.contractAddress,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Blockchain distributor rights assignment failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Revoke distributor rights on blockchain
    async revokeDistributorRights(manufacturerId, distributorId, territoryId) {
        if (this.mockMode) {
            return this.mockRevokeDistributorRights(manufacturerId, distributorId, territoryId);
        }

        try {
            const tx = await this.contract.revokeDistributorRights(
                manufacturerId,
                distributorId,
                territoryId
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Blockchain distributor rights revocation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Transfer valve ownership on blockchain
    async transferValveOwnership(valveTokenId, fromOwnerId, toOwnerId, ownerType) {
        if (this.mockMode) {
            return this.mockTransferValveOwnership(valveTokenId, fromOwnerId, toOwnerId, ownerType);
        }

        try {
            const tx = await this.contract.transferValveOwnership(
                valveTokenId,
                fromOwnerId,
                toOwnerId,
                ownerType
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Blockchain valve ownership transfer failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mock functions for development

    mockRegisterDistributor(distributorData) {
        const transactionHash = this.generateMockTransactionHash();
        console.log(`Mock: Registered distributor ${distributorData.id} on blockchain`);
        
        return {
            success: true,
            transactionHash,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasUsed: (Math.floor(Math.random() * 50000) + 21000).toString()
        };
    }

    mockAssignDistributorRights(manufacturerId, distributorId, territoryId, permissions) {
        const transactionHash = this.generateMockTransactionHash();
        console.log(`Mock: Assigned rights to distributor ${distributorId} for manufacturer ${manufacturerId} in territory ${territoryId}`);
        
        return {
            success: true,
            transactionHash,
            contractAddress: this.contractAddress,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasUsed: (Math.floor(Math.random() * 50000) + 21000).toString()
        };
    }

    mockRevokeDistributorRights(manufacturerId, distributorId, territoryId) {
        const transactionHash = this.generateMockTransactionHash();
        console.log(`Mock: Revoked rights from distributor ${distributorId} for manufacturer ${manufacturerId} in territory ${territoryId}`);
        
        return {
            success: true,
            transactionHash,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasUsed: (Math.floor(Math.random() * 50000) + 21000).toString()
        };
    }

    mockTransferValveOwnership(valveTokenId, fromOwnerId, toOwnerId, ownerType) {
        const transactionHash = this.generateMockTransactionHash();
        console.log(`Mock: Transferred valve ${valveTokenId} from ${fromOwnerId} to ${toOwnerId} (${ownerType})`);
        
        return {
            success: true,
            transactionHash,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasUsed: (Math.floor(Math.random() * 50000) + 21000).toString()
        };
    }

    // Generate mock transaction hash
    generateMockTransactionHash() {
        return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    // Verify transaction on blockchain
    async verifyTransaction(transactionHash) {
        if (this.mockMode) {
            return {
                success: true,
                confirmed: true,
                blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
                timestamp: new Date().toISOString()
            };
        }

        try {
            const receipt = await this.provider.getTransactionReceipt(transactionHash);
            
            if (!receipt) {
                return {
                    success: false,
                    confirmed: false,
                    error: 'Transaction not found'
                };
            }
            
            return {
                success: true,
                confirmed: receipt.status === 1,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                confirmed: false,
                error: error.message
            };
        }
    }

    // Calculate transaction fee based on user role and amount
    calculateTransactionFee(userRole, transactionAmount) {
        return transactionFeeService.calculateFee(userRole, transactionAmount);
    }

    // Execute transaction with fee calculation
    async executeTransactionWithFees(userRole, transactionAmount, transactionFunction, ...args) {
        try {
            // Calculate fees
            const feeCalculation = this.calculateTransactionFee(userRole, transactionAmount);
            
            if (!feeCalculation.success) {
                return {
                    success: false,
                    error: 'Fee calculation failed: ' + feeCalculation.error,
                    feeCalculation
                };
            }

            // Validate fee calculation
            if (!transactionFeeService.isValidFeeCalculation(feeCalculation)) {
                return {
                    success: false,
                    error: 'Invalid fee calculation result',
                    feeCalculation
                };
            }

            // Execute the actual transaction
            const transactionResult = await transactionFunction.apply(this, args);
            
            // Add fee information to the result
            if (transactionResult.success) {
                transactionResult.feeDetails = {
                    originalAmount: feeCalculation.transactionAmount,
                    feeAmount: feeCalculation.feeAmount,
                    netAmount: feeCalculation.netAmount,
                    feeBasisPoints: feeCalculation.feeBasisPoints,
                    feePercentage: feeCalculation.calculation.percentage,
                    userRole: feeCalculation.role
                };
            }

            return transactionResult;
        } catch (error) {
            console.error('Transaction with fees failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Enhanced distributor registration with fees
    async registerDistributorWithFees(distributorData, userRole, estimatedTransactionValue = 0.01) {
        return await this.executeTransactionWithFees(
            userRole,
            estimatedTransactionValue,
            this.registerDistributor,
            distributorData
        );
    }

    // Enhanced distributor rights assignment with fees
    async assignDistributorRightsWithFees(manufacturerId, distributorId, territoryId, permissions, userRole, estimatedTransactionValue = 0.01) {
        return await this.executeTransactionWithFees(
            userRole,
            estimatedTransactionValue,
            this.assignDistributorRights,
            manufacturerId,
            distributorId,
            territoryId,
            permissions
        );
    }

    // Enhanced distributor rights revocation with fees
    async revokeDistributorRightsWithFees(manufacturerId, distributorId, territoryId, userRole, estimatedTransactionValue = 0.01) {
        return await this.executeTransactionWithFees(
            userRole,
            estimatedTransactionValue,
            this.revokeDistributorRights,
            manufacturerId,
            distributorId,
            territoryId
        );
    }

    // Enhanced valve ownership transfer with fees
    async transferValveOwnershipWithFees(valveTokenId, fromOwnerId, toOwnerId, ownerType, userRole, estimatedTransactionValue = 0.01) {
        return await this.executeTransactionWithFees(
            userRole,
            estimatedTransactionValue,
            this.transferValveOwnership,
            valveTokenId,
            fromOwnerId,
            toOwnerId,
            ownerType
        );
    }

    // Get fee estimate for a transaction
    async getTransactionFeeEstimate(userRole, transactionType = 'general', estimatedValue = 0.01) {
        const feeCalculation = this.calculateTransactionFee(userRole, estimatedValue);
        
        return {
            success: feeCalculation.success,
            transactionType,
            userRole: feeCalculation.role,
            estimatedTransactionValue: estimatedValue,
            feeDetails: feeCalculation.success ? {
                feeBasisPoints: feeCalculation.feeBasisPoints,
                feeRate: feeCalculation.feeRate,
                feeAmount: feeCalculation.feeAmount,
                feePercentage: feeCalculation.calculation.percentage,
                netAmount: feeCalculation.netAmount,
                formula: feeCalculation.calculation.formula
            } : null,
            error: feeCalculation.error
        };
    }
}

// Singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;