const Valve = require('./valveModel');
const transactionFeeService = require('./transactionFeeService');
const logActivity = require('./logActivity');

/**
 * Valve Return Controller
 * Handles valve return requests, burning, and ownership restoration
 */

// Create valve return request
const createReturnRequest = async (req, res) => {
    try {
        const { valveId, returnType, returnReason, returnFee = 0 } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Validate required fields
        if (!valveId || !returnType || !returnReason) {
            return res.status(400).json({
                error: 'Missing required fields: valveId, returnType, returnReason'
            });
        }

        // Validate return type
        const validReturnTypes = ['damaged', 'not_operable', 'custom', 'not_resellable', 'resellable'];
        if (!validReturnTypes.includes(returnType)) {
            return res.status(400).json({
                error: 'Invalid return type',
                validTypes: validReturnTypes
            });
        }

        // Check if valve exists and get current owner
        const valve = await Valve.findById(valveId);
        if (!valve) {
            return res.status(404).json({ error: 'Valve not found' });
        }

        // Check if valve is already burned
        if (valve.is_burned) {
            return res.status(400).json({ error: 'Cannot return a burned valve' });
        }

        // Determine returner info based on user role
        let returnedById, returnedByType;
        returnedById = req.user.username || req.user.id;
        returnedByType = getReturnedByType(userRole);
        if (!returnedByType) {
            return res.status(403).json({ 
                error: 'Only manufacturers, distributors, and admins can create return requests' 
            });
        }

        // Create return request
        const returnRequest = await Valve.createReturnRequest({
            valveId,
            returnType,
            returnedById,
            returnedByType,
            returnReason,
            returnFee
        });

        // Log activity
        await logActivity(userId, 'VALVE_RETURN_REQUESTED', {
            valveId: valve.valve_id,
            returnType,
            returnReason,
            returnFee
        }, 'success');

        res.status(201).json({
            message: 'Return request created successfully',
            returnRequest
        });

    } catch (error) {
        console.error('Create return request error:', error);
        
        // Log failed activity
        await logActivity(req.user?.id, 'VALVE_RETURN_REQUESTED', {
            valveId: req.body.valveId,
            error: error.message
        }, 'failure');

        res.status(500).json({
            error: 'Failed to create return request',
            details: error.message
        });
    }
};

// Get return requests (with filtering)
const getReturnRequests = async (req, res) => {
    try {
        const {
            status,
            returnType,
            returnedById,
            page = 1,
            limit = 10
        } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (returnType) filters.returnType = returnType;
        if (returnedById) filters.returnedById = returnedById;

        const returnRequests = await Valve.getReturnRequests(
            filters,
            parseInt(page),
            Math.min(parseInt(limit), 100)
        );

        res.json({
            returnRequests,
            pagination: {
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get return requests error:', error);
        res.status(500).json({
            error: 'Failed to retrieve return requests',
            details: error.message
        });
    }
};

// Get return request by ID
const getReturnRequestById = async (req, res) => {
    try {
        const { returnId } = req.params;

        const returnRequest = await Valve.getReturnRequest(returnId);
        if (!returnRequest) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        res.json({ returnRequest });

    } catch (error) {
        console.error('Get return request error:', error);
        res.status(500).json({
            error: 'Failed to retrieve return request',
            details: error.message
        });
    }
};

// Approve return request (admin only)
const approveReturnRequest = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { approvalType, adminNotes } = req.body;
        const adminId = req.user.id;

        // Check admin permissions
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Only administrators can approve return requests' 
            });
        }

        // Validate approval type
        const validApprovalTypes = ['approved_for_burn', 'approved_for_restore', 'rejected'];
        if (!validApprovalTypes.includes(approvalType)) {
            return res.status(400).json({
                error: 'Invalid approval type',
                validTypes: validApprovalTypes
            });
        }

        // Get return request
        const returnRequest = await Valve.getReturnRequest(returnId);
        if (!returnRequest) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        if (returnRequest.status !== 'pending') {
            return res.status(400).json({ 
                error: 'Return request is not pending approval' 
            });
        }

        // TODO: Replace with real blockchain transaction in production.
        // The following is a development placeholder. DO NOT USE IN PRODUCTION.
        let blockchainHash;
        if (process.env.NODE_ENV === 'production') {
            // throw error or perform real blockchain transaction
            throw new Error('Blockchain transaction integration required in production.');
        } else {
            blockchainHash = Valve.generateTransactionHash();
        }

        // Approve the return request
        const updatedRequest = await Valve.approveReturnRequest(
            returnId,
            adminId,
            approvalType,
            blockchainHash
        );

        // Log activity
        await logActivity(adminId, 'VALVE_RETURN_APPROVED', {
            returnId,
            valveId: returnRequest.valve_id,
            approvalType,
            adminNotes,
            blockchainHash
        }, 'success');

        res.json({
            message: `Return request ${approvalType.replace(/_/g, ' ')} successfully`,
            returnRequest: updatedRequest,
            blockchainTransaction: blockchainHash
        });

    } catch (error) {
        console.error('Approve return request error:', error);
        
        // Log failed activity
        await logActivity(req.user?.id, 'VALVE_RETURN_APPROVED', {
            returnId: req.params.returnId,
            error: error.message
        }, 'failure');

        res.status(500).json({
            error: 'Failed to approve return request',
            details: error.message
        });
    }
};

// Burn valve token (admin only, after approval)
const burnValveToken = async (req, res) => {
    try {
        const { valveId } = req.params;
        const { burnReason, returnFee = 0 } = req.body;
        const adminId = req.user.id;
        const adminRole = req.user.role;

        // Check admin permissions
        if (adminRole !== 'admin') {
            return res.status(403).json({ 
                error: 'Only administrators can burn valve tokens' 
            });
        }

        if (!burnReason) {
            return res.status(400).json({
                error: 'Burn reason is required'
            });
        }

        // Get valve
        const valve = await Valve.findById(valveId);
        if (!valve) {
            return res.status(404).json({ error: 'Valve not found' });
        }

        if (valve.is_burned) {
            return res.status(400).json({ error: 'Valve is already burned' });
        }

        // Calculate transaction fees (0.5% of total transaction)
        const feeCalc = transactionFeeService.calculateFee(adminRole, returnFee, returnFee);
        
        // Burn the valve token
        const burnResult = await valve.burnToken(adminId, burnReason);

        // Record fee transaction if there was a return fee
        let feeRecord = null;
        if (returnFee > 0) {
            feeRecord = await transactionFeeService.recordFeePayment({
                transactionType: 'valve_burn',
                transactionId: `burn_${valve.valve_id}_${Date.now()}`,
                userId: adminId,
                userRole: adminRole,
                transactionAmount: returnFee,
                feeRate: feeCalc.feeRate,
                feeAmount: feeCalc.feeAmount,
                blockchainTransactionHash: Valve.generateTransactionHash(),
                status: 'completed'
            });
        }

        // Log activity
        await logActivity(adminId, 'VALVE_TOKEN_BURNED', {
            valveId: valve.valve_id,
            tokenId: valve.token_id,
            burnReason,
            returnFee,
            feeAmount: feeCalc.feeAmount,
            feeWalletAddress: feeCalc.feeWalletAddress
        }, 'success');

        res.json({
            message: 'Valve token burned successfully',
            valve: valve.toJSON(),
            feeTransaction: feeCalc,
            burnResult
        });

    } catch (error) {
        console.error('Burn valve token error:', error);
        
        // Log failed activity
        await logActivity(req.user?.id, 'VALVE_TOKEN_BURNED', {
            valveId: req.params.valveId,
            error: error.message
        }, 'failure');

        res.status(500).json({
            error: 'Failed to burn valve token',
            details: error.message
        });
    }
};

// Restore valve ownership (admin only, for resellable valves)
const restoreValveOwnership = async (req, res) => {
    try {
        const { valveId } = req.params;
        const { newOwnerId, newOwnerType, restoreReason, returnFee = 0 } = req.body;
        const adminId = req.user.id;
        const adminRole = req.user.role;

        // Check admin permissions
        if (adminRole !== 'admin') {
            return res.status(403).json({ 
                error: 'Only administrators can restore valve ownership' 
            });
        }

        // Validate required fields
        if (!newOwnerId || !newOwnerType || !restoreReason) {
            return res.status(400).json({
                error: 'Missing required fields: newOwnerId, newOwnerType, restoreReason'
            });
        }

        // Validate owner type
        if (!['manufacturer', 'distributor'].includes(newOwnerType)) {
            return res.status(400).json({
                error: 'Invalid owner type. Must be manufacturer or distributor'
            });
        }

        // Get valve
        const valve = await Valve.findById(valveId);
        if (!valve) {
            return res.status(404).json({ error: 'Valve not found' });
        }

        if (!valve.is_burned) {
            return res.status(400).json({ 
                error: 'Cannot restore ownership: valve is not burned' 
            });
        }

        // Calculate transaction fees (0.5% of total transaction)
        const feeCalc = transactionFeeService.calculateFee(adminRole, 0, returnFee);

        // Restore valve ownership
        const restoreResult = await valve.restoreOwnership(
            newOwnerId, 
            newOwnerType, 
            adminId, 
            restoreReason
        );

        // Record fee transaction if there was a return fee
        let feeRecord = null;
        if (returnFee > 0) {
            feeRecord = await transactionFeeService.recordFeePayment({
                transactionType: 'valve_restore',
                transactionId: `restore_${valve.valve_id}_${Date.now()}`,
                userId: adminId,
                userRole: adminRole,
                transactionAmount: returnFee,
                feeRate: feeCalc.feeRate,
                feeAmount: feeCalc.feeAmount,
                blockchainTransactionHash: Valve.generateTransactionHash(),
                status: 'completed'
            });
        }

        // Log activity
        await logActivity(adminId, 'VALVE_OWNERSHIP_RESTORED', {
            valveId: valve.valve_id,
            tokenId: valve.token_id,
            newOwnerId,
            newOwnerType,
            restoreReason,
            returnFee,
            feeAmount: feeCalc.feeAmount,
            feeWalletAddress: feeCalc.feeWalletAddress
        }, 'success');

        res.json({
            message: 'Valve ownership restored successfully',
            valve: valve.toJSON(),
            feeTransaction: feeCalc,
            restoreResult
        });

    } catch (error) {
        console.error('Restore valve ownership error:', error);
        
        // Log failed activity
        await logActivity(req.user?.id, 'VALVE_OWNERSHIP_RESTORED', {
            valveId: req.params.valveId,
            error: error.message
        }, 'failure');

        res.status(500).json({
            error: 'Failed to restore valve ownership',
            details: error.message
        });
    }
};

module.exports = {
    createReturnRequest,
    getReturnRequests,
    getReturnRequestById,
    approveReturnRequest,
    burnValveToken,
    restoreValveOwnership
};