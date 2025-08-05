const Distributor = require('./distributorModel');
const Manufacturer = require('./manufacturerModel');
const Territory = require('./territoryModel');
const ManufacturerDistributorRelationship = require('./manufacturerDistributorRelationshipModel');
const Valve = require('./valveModel');
const blockchainService = require('./blockchainService');
// const logActivity = require('./logActivity');

// Register a new distributor
const registerDistributor = async (req, res) => {
    try {
        const { name, walletAddress, contactEmail, contactPhone, address } = req.body;

        if (!name || !walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Distributor name and wallet address are required',
                errors: ['Missing required fields']
            });
        }

        // Check if distributor with this wallet address already exists
        const existingDistributor = await Distributor.findByWalletAddress(walletAddress);
        if (existingDistributor) {
            return res.status(409).json({
                success: false,
                message: 'A distributor with this wallet address already exists',
                errors: ['Duplicate wallet address']
            });
        }

        // Register on blockchain first
        const blockchainResult = await blockchainService.registerDistributor({
            name,
            walletAddress
        });

        if (!blockchainResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to register distributor on blockchain',
                errors: [blockchainResult.error || 'Blockchain registration failed']
            });
        }

        // Generate distributor ID
        const distributorId = Distributor.generateDistributorId();

        // Create distributor record
        const distributorData = {
            id: distributorId,
            name,
            wallet_address: walletAddress,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            address,
            blockchain_registration_hash: blockchainResult.transactionHash
        };

        const distributor = await Distributor.create(distributorData);

        // await logActivity(null, 'distributor_registered', { 
        //     distributorId, 
        //     name, 
        //     walletAddress,
        //     blockchainHash: blockchainResult.transactionHash 
        // }, 'success');

        res.status(201).json({
            success: true,
            data: distributor.toJSON(),
            blockchainTransaction: {
                hash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber
            },
            message: 'Distributor registered successfully'
        });

    } catch (error) {
        console.error('Distributor registration error:', error);
        // await logActivity(null, 'distributor_registration_error', { error: error.message }, 'failure');
        res.status(500).json({
            success: false,
            message: 'Internal server error during distributor registration',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get all distributors
const getAllDistributors = async (req, res) => {
    try {
        const distributors = await Distributor.findAll();
        
        res.json({
            success: true,
            data: distributors.map(d => d.toJSON()),
            message: `Retrieved ${distributors.length} distributors`
        });

    } catch (error) {
        console.error('Get distributors error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving distributors',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get distributor by ID
const getDistributorById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const distributor = await Distributor.findById(id);
        
        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found',
                errors: ['Invalid distributor ID']
            });
        }

        res.json({
            success: true,
            data: distributor.toJSON(),
            message: 'Distributor retrieved successfully'
        });

    } catch (error) {
        console.error('Get distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving distributor',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Update distributor
const updateDistributor = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const distributor = await Distributor.findById(id);
        
        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found',
                errors: ['Invalid distributor ID']
            });
        }

        const updatedDistributor = await distributor.update(updateData);

        // await logActivity(null, 'distributor_updated', { 
        //     distributorId: id, 
        //     updateData 
        // }, 'success');

        res.json({
            success: true,
            data: updatedDistributor.toJSON(),
            message: 'Distributor updated successfully'
        });

    } catch (error) {
        console.error('Update distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating distributor',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Deactivate distributor
const deactivateDistributor = async (req, res) => {
    try {
        const { id } = req.params;
        
        const distributor = await Distributor.findById(id);
        
        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found',
                errors: ['Invalid distributor ID']
            });
        }

        await distributor.deactivate();

        // await logActivity(null, 'distributor_deactivated', { distributorId: id }, 'success');

        res.json({
            success: true,
            message: 'Distributor deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivate distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while deactivating distributor',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Assign distributor rights to manufacturer
const assignDistributorRights = async (req, res) => {
    try {
        const { manufacturerId, distributorId, territoryId, permissions } = req.body;

        if (!manufacturerId || !distributorId || !territoryId) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer ID, distributor ID, and territory ID are required',
                errors: ['Missing required fields']
            });
        }

        // Validate manufacturer exists
        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        // Check manufacturer permissions
        if (!manufacturer.hasPermission('manage_distributors')) {
            return res.status(403).json({
                success: false,
                message: 'Manufacturer does not have permission to manage distributors',
                errors: ['Insufficient permissions']
            });
        }

        // Validate distributor exists
        const distributor = await Distributor.findById(distributorId);
        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found',
                errors: ['Invalid distributor ID']
            });
        }

        // Validate territory exists
        const territory = await Territory.findById(territoryId);
        if (!territory) {
            return res.status(404).json({
                success: false,
                message: 'Territory not found',
                errors: ['Invalid territory ID']
            });
        }

        // Check if relationship already exists
        const existingRelationship = await ManufacturerDistributorRelationship.findRelationship(
            manufacturerId, distributorId, territoryId
        );

        if (existingRelationship) {
            return res.status(409).json({
                success: false,
                message: 'Distributor relationship already exists for this territory',
                errors: ['Duplicate relationship']
            });
        }

        // Assign rights on blockchain
        const blockchainResult = await blockchainService.assignDistributorRights(
            manufacturerId, 
            distributorId, 
            territoryId, 
            permissions || ['receive_valve_ownership']
        );

        if (!blockchainResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to assign distributor rights on blockchain',
                errors: [blockchainResult.error || 'Blockchain assignment failed']
            });
        }

        // Create relationship record
        const relationshipData = {
            manufacturer_id: manufacturerId,
            distributor_id: distributorId,
            territory_id: territoryId,
            permissions: permissions || ['receive_valve_ownership'],
            contract_address: blockchainResult.contractAddress,
            blockchain_assignment_hash: blockchainResult.transactionHash
        };

        const relationship = await ManufacturerDistributorRelationship.create(relationshipData);

        // await logActivity(null, 'distributor_rights_assigned', { 
        //     manufacturerId, 
        //     distributorId, 
        //     territoryId, 
        //     permissions,
        //     blockchainHash: blockchainResult.transactionHash 
        // }, 'success');

        res.status(201).json({
            success: true,
            data: relationship.toJSON(),
            blockchainTransaction: {
                hash: blockchainResult.transactionHash,
                contractAddress: blockchainResult.contractAddress,
                blockNumber: blockchainResult.blockNumber
            },
            message: 'Distributor rights assigned successfully'
        });

    } catch (error) {
        console.error('Assign distributor rights error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while assigning distributor rights',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Revoke distributor rights
const revokeDistributorRights = async (req, res) => {
    try {
        const { relationshipId } = req.params;
        const { manufacturerId } = req.body;

        if (!manufacturerId) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer ID is required',
                errors: ['Missing manufacturer ID']
            });
        }

        // Validate manufacturer
        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer || !manufacturer.hasPermission('manage_distributors')) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to revoke distributor rights',
                errors: ['Access denied']
            });
        }

        // Find relationship
        const relationship = await ManufacturerDistributorRelationship.findById(relationshipId);
        if (!relationship) {
            return res.status(404).json({
                success: false,
                message: 'Distributor relationship not found',
                errors: ['Invalid relationship ID']
            });
        }

        // Verify manufacturer owns this relationship
        if (relationship.manufacturer_id !== manufacturerId) {
            return res.status(403).json({
                success: false,
                message: 'You can only revoke your own distributor relationships',
                errors: ['Access denied']
            });
        }

        // Revoke rights on blockchain
        const blockchainResult = await blockchainService.revokeDistributorRights(
            relationship.manufacturer_id,
            relationship.distributor_id,
            relationship.territory_id
        );

        if (!blockchainResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to revoke distributor rights on blockchain',
                errors: [blockchainResult.error || 'Blockchain revocation failed']
            });
        }

        // Revoke relationship
        await relationship.revoke();

        // await logActivity(null, 'distributor_rights_revoked', { 
        //     relationshipId,
        //     manufacturerId: relationship.manufacturer_id,
        //     distributorId: relationship.distributor_id,
        //     territoryId: relationship.territory_id,
        //     blockchainHash: blockchainResult.transactionHash 
        // }, 'success');

        res.json({
            success: true,
            blockchainTransaction: {
                hash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber
            },
            message: 'Distributor rights revoked successfully'
        });

    } catch (error) {
        console.error('Revoke distributor rights error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while revoking distributor rights',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get manufacturer's distributor relationships
const getManufacturerDistributors = async (req, res) => {
    try {
        const { manufacturerId } = req.params;

        // Validate manufacturer
        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        const relationships = await ManufacturerDistributorRelationship.findByManufacturer(manufacturerId);

        res.json({
            success: true,
            data: relationships.map(r => {
                const relationship = r instanceof ManufacturerDistributorRelationship ? r : new ManufacturerDistributorRelationship(r);
                return relationship.toJSONWithDetails();
            }),
            message: `Retrieved ${relationships.length} distributor relationships`
        });

    } catch (error) {
        console.error('Get manufacturer distributors error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving distributor relationships',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Transfer valve ownership to distributor
const transferValveOwnership = async (req, res) => {
    try {
        const { valveTokenId, distributorId, manufacturerId, reason } = req.body;

        if (!valveTokenId || !distributorId || !manufacturerId) {
            return res.status(400).json({
                success: false,
                message: 'Valve token ID, distributor ID, and manufacturer ID are required',
                errors: ['Missing required fields']
            });
        }

        // Validate manufacturer
        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        // Validate distributor
        const distributor = await Distributor.findById(distributorId);
        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found',
                errors: ['Invalid distributor ID']
            });
        }

        // Find valve
        const valve = await Valve.findByTokenId(valveTokenId);
        if (!valve) {
            return res.status(404).json({
                success: false,
                message: 'Valve not found',
                errors: ['Invalid token ID']
            });
        }

        // Verify manufacturer owns the valve
        if (valve.current_owner_id !== manufacturerId || valve.current_owner_type !== 'manufacturer') {
            return res.status(403).json({
                success: false,
                message: 'You can only transfer valves you own',
                errors: ['Access denied']
            });
        }

        // Check if distributor has relationship with manufacturer
        const hasRelationship = await distributor.hasRelationshipWith(manufacturerId);
        if (!hasRelationship) {
            return res.status(403).json({
                success: false,
                message: 'Distributor does not have a relationship with this manufacturer',
                errors: ['No active distributor relationship']
            });
        }

        // Validate transfer limits using the enhanced business logic
        const validation = await valve.validateTransferLimits('distributor');
        if (!validation.canTransfer) {
            // Log the blocked attempt for audit
            await valve.logTransferAttempt(distributorId, 'distributor', false, validation.reason, validation.errorCode);
            
            // Return appropriate HTTP status based on error type
            let statusCode = 409; // Conflict by default
            if (validation.errorCode === 'PLANT_OWNERSHIP_FINAL') {
                statusCode = 403; // Forbidden
            }
            
            return res.status(statusCode).json({
                success: false,
                message: validation.reason,
                errors: [validation.errorCode || 'Transfer limit exceeded'],
                errorCode: validation.errorCode
            });
        }

        // Perform blockchain transfer
        const blockchainResult = await blockchainService.transferValveOwnership(
            valveTokenId,
            manufacturerId,
            distributorId,
            'distributor'
        );

        if (!blockchainResult.success) {
            // Log the failed blockchain attempt
            await valve.logTransferAttempt(distributorId, 'distributor', false, 'Blockchain transfer failed', 'BLOCKCHAIN_ERROR');
            
            return res.status(500).json({
                success: false,
                message: 'Failed to transfer valve ownership on blockchain',
                errors: [blockchainResult.error || 'Blockchain transfer failed']
            });
        }

        // Transfer ownership in database (skip validation since we already validated)
        const transferResult = await valve.transferOwnership(distributorId, 'distributor', 'transfer', reason, true);

        // Log successful transfer for audit
        await valve.logTransferAttempt(distributorId, 'distributor', true, reason);

        // await logActivity(null, 'valve_ownership_transferred', { 
        //     valveTokenId,
        //     fromOwner: manufacturerId,
        //     toOwner: distributorId,
        //     reason,
        //     blockchainHash: blockchainResult.transactionHash 
        // }, 'success');

        res.json({
            success: true,
            data: {
                valve: await Valve.findByTokenId(valveTokenId).then(v => v.toJSON()),
                transfer: transferResult
            },
            blockchainTransaction: {
                hash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber
            },
            message: 'Valve ownership transferred successfully'
        });

    } catch (error) {
        console.error('Transfer valve ownership error:', error);
        
        // Log error attempt if we have valve info
        if (req.body.valveTokenId && req.body.distributorId) {
            try {
                const valve = await Valve.findByTokenId(req.body.valveTokenId);
                if (valve) {
                    await valve.logTransferAttempt(req.body.distributorId, 'distributor', false, error.message, 'INTERNAL_ERROR');
                }
            } catch (logError) {
                console.error('Error logging failed attempt:', logError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error during valve ownership transfer',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Transfer valve ownership between distributors
const transferValveToDistributor = async (req, res) => {
    try {
        const { valveTokenId, toDistributorId, fromDistributorId, reason } = req.body;

        if (!valveTokenId || !toDistributorId || !fromDistributorId) {
            return res.status(400).json({
                success: false,
                message: 'Valve token ID, to distributor ID, and from distributor ID are required',
                errors: ['Missing required fields']
            });
        }

        // Validate from distributor
        const fromDistributor = await Distributor.findById(fromDistributorId);
        if (!fromDistributor) {
            return res.status(404).json({
                success: false,
                message: 'Source distributor not found',
                errors: ['Invalid from distributor ID']
            });
        }

        // Validate to distributor
        const toDistributor = await Distributor.findById(toDistributorId);
        if (!toDistributor) {
            return res.status(404).json({
                success: false,
                message: 'Target distributor not found',
                errors: ['Invalid to distributor ID']
            });
        }

        // Find valve
        const valve = await Valve.findByTokenId(valveTokenId);
        if (!valve) {
            return res.status(404).json({
                success: false,
                message: 'Valve not found',
                errors: ['Invalid token ID']
            });
        }

        // Verify from distributor owns the valve
        if (valve.current_owner_id !== fromDistributorId || valve.current_owner_type !== 'distributor') {
            return res.status(403).json({
                success: false,
                message: 'You can only transfer valves you own',
                errors: ['Access denied']
            });
        }

        // Validate transfer limits using the enhanced business logic
        const validation = await valve.validateTransferLimits('distributor');
        if (!validation.canTransfer) {
            // Log the blocked attempt for audit
            await valve.logTransferAttempt(toDistributorId, 'distributor', false, validation.reason, validation.errorCode);
            
            // Return appropriate HTTP status based on error type
            let statusCode = 409; // Conflict by default
            if (validation.errorCode === 'PLANT_OWNERSHIP_FINAL') {
                statusCode = 403; // Forbidden
            }
            
            return res.status(statusCode).json({
                success: false,
                message: validation.reason,
                errors: [validation.errorCode || 'Transfer limit exceeded'],
                errorCode: validation.errorCode
            });
        }

        // Perform blockchain transfer
        const blockchainResult = await blockchainService.transferValveOwnership(
            valveTokenId,
            fromDistributorId,
            toDistributorId,
            'distributor'
        );

        if (!blockchainResult.success) {
            // Log the failed blockchain attempt
            await valve.logTransferAttempt(toDistributorId, 'distributor', false, 'Blockchain transfer failed', 'BLOCKCHAIN_ERROR');
            
            return res.status(500).json({
                success: false,
                message: 'Failed to transfer valve ownership on blockchain',
                errors: [blockchainResult.error || 'Blockchain transfer failed']
            });
        }

        // Transfer ownership in database (skip validation since we already validated)
        const transferResult = await valve.transferOwnership(toDistributorId, 'distributor', 'transfer', reason, true);

        // Log successful transfer for audit
        await valve.logTransferAttempt(toDistributorId, 'distributor', true, reason);

        res.json({
            success: true,
            data: {
                valve: await Valve.findByTokenId(valveTokenId).then(v => v.toJSON()),
                transfer: transferResult
            },
            blockchainTransaction: {
                hash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber
            },
            message: 'Valve ownership transferred successfully between distributors'
        });

    } catch (error) {
        console.error('Transfer valve between distributors error:', error);
        
        // Log error attempt if we have valve info
        if (req.body.valveTokenId && req.body.toDistributorId) {
            try {
                const valve = await Valve.findByTokenId(req.body.valveTokenId);
                if (valve) {
                    await valve.logTransferAttempt(req.body.toDistributorId, 'distributor', false, error.message, 'INTERNAL_ERROR');
                }
            } catch (logError) {
                console.error('Error logging failed attempt:', logError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error during valve ownership transfer',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Transfer valve ownership to plant (final transfer)
const transferValveToPlant = async (req, res) => {
    try {
        const { valveTokenId, plantId, currentOwnerId, currentOwnerType, reason } = req.body;

        if (!valveTokenId || !plantId || !currentOwnerId || !currentOwnerType) {
            return res.status(400).json({
                success: false,
                message: 'Valve token ID, plant ID, current owner ID, and current owner type are required',
                errors: ['Missing required fields']
            });
        }

        // Find valve
        const valve = await Valve.findByTokenId(valveTokenId);
        if (!valve) {
            return res.status(404).json({
                success: false,
                message: 'Valve not found',
                errors: ['Invalid token ID']
            });
        }

        // Verify current owner owns the valve
        if (valve.current_owner_id !== currentOwnerId || valve.current_owner_type !== currentOwnerType) {
            return res.status(403).json({
                success: false,
                message: 'You can only transfer valves you own',
                errors: ['Access denied']
            });
        }

        // Plant transfers are always allowed (no limits apply)
        // This is the terminal state for valve ownership

        // Perform blockchain transfer
        const blockchainResult = await blockchainService.transferValveOwnership(
            valveTokenId,
            currentOwnerId,
            plantId,
            'plant'
        );

        if (!blockchainResult.success) {
            // Log the failed blockchain attempt
            await valve.logTransferAttempt(plantId, 'plant', false, 'Blockchain transfer failed', 'BLOCKCHAIN_ERROR');
            
            return res.status(500).json({
                success: false,
                message: 'Failed to transfer valve ownership on blockchain',
                errors: [blockchainResult.error || 'Blockchain transfer failed']
            });
        }

        // Transfer ownership in database (skip validation since plant transfers are always allowed)
        const transferResult = await valve.transferOwnership(plantId, 'plant', 'transfer', reason, true);

        // Log successful transfer for audit
        await valve.logTransferAttempt(plantId, 'plant', true, reason);

        res.json({
            success: true,
            data: {
                valve: await Valve.findByTokenId(valveTokenId).then(v => v.toJSON()),
                transfer: transferResult
            },
            blockchainTransaction: {
                hash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber
            },
            message: 'Valve ownership transferred to plant successfully. No further transfers are allowed.'
        });

    } catch (error) {
        console.error('Transfer valve to plant error:', error);
        
        // Log error attempt if we have valve info
        if (req.body.valveTokenId && req.body.plantId) {
            try {
                const valve = await Valve.findByTokenId(req.body.valveTokenId);
                if (valve) {
                    await valve.logTransferAttempt(req.body.plantId, 'plant', false, error.message, 'INTERNAL_ERROR');
                }
            } catch (logError) {
                console.error('Error logging failed attempt:', logError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error during valve ownership transfer to plant',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

module.exports = {
    registerDistributor,
    getAllDistributors,
    getDistributorById,
    updateDistributor,
    deactivateDistributor,
    assignDistributorRights,
    revokeDistributorRights,
    getManufacturerDistributors,
    transferValveOwnership,
    transferValveToDistributor,
    transferValveToPlant
};