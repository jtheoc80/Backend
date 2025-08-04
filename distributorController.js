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
            data: relationships.map(r => r.toJSONWithDetails()),
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

        // Perform blockchain transfer
        const blockchainResult = await blockchainService.transferValveOwnership(
            valveTokenId,
            manufacturerId,
            distributorId,
            'distributor'
        );

        if (!blockchainResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to transfer valve ownership on blockchain',
                errors: [blockchainResult.error || 'Blockchain transfer failed']
            });
        }

        // Transfer ownership in database
        const transferResult = await valve.transferOwnership(distributorId, 'distributor', 'transfer', reason);

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
        res.status(500).json({
            success: false,
            message: 'Internal server error during valve ownership transfer',
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
    transferValveOwnership
};