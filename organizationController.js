const Organization = require('./organizationModel');
const User = require('./userModel');
const Project = require('./projectModel');
const blockchainService = require('./blockchainService');
const logActivity = require('./logActivity');

// Register organization on blockchain (only one allowed)
const registerOrganization = async (req, res) => {
    try {
        const { id, name, description, wallet_address } = req.body;

        // Validate required fields
        if (!id || !name || !wallet_address) {
            return res.status(400).json({
                error: 'Organization ID, name, and wallet address are required'
            });
        }

        // Check if any organization is already registered on blockchain
        const isRegistered = await blockchainService.isOrganizationRegistered();
        if (isRegistered) {
            return res.status(403).json({
                error: 'Only one company can register on the blockchain. A company is already registered.'
            });
        }

        // Check if organization already exists
        const existingOrg = await Organization.findById(id);
        if (existingOrg) {
            return res.status(409).json({
                error: 'Organization with this ID already exists'
            });
        }

        // Create organization
        const organization = await Organization.create({
            id,
            name,
            description,
            wallet_address
        });

        // Register on blockchain
        const blockchainResult = await blockchainService.registerOrganization({
            id,
            name,
            wallet_address
        });

        if (!blockchainResult.success) {
            // Delete organization if blockchain registration fails
            await organization.remove();
            return res.status(500).json({
                error: 'Failed to register organization on blockchain',
                details: blockchainResult.error
            });
        }

        // Update organization with blockchain registration
        await organization.registerOnBlockchain(blockchainResult.transactionHash);

        // Log activity
        await logActivity(req.user?.id, 'organization_registered', {
            organization_id: id,
            organization_name: name,
            transaction_hash: blockchainResult.transactionHash
        }, 'success');

        res.status(201).json({
            message: 'Organization registered successfully on blockchain',
            organization: organization.toJSON(),
            blockchain_transaction: blockchainResult.transactionHash
        });

    } catch (error) {
        console.error('Organization registration error:', error);
        await logActivity(req.user?.id, 'organization_registration_failed', {
            error: error.message
        }, 'error');
        
        res.status(500).json({
            error: 'Failed to register organization',
            details: error.message
        });
    }
};

// Get organization details
const getOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({
                error: 'Organization not found'
            });
        }

        // Check access permissions
        if (req.user.role !== 'admin' && req.user.organization_id !== id) {
            return res.status(403).json({
                error: 'Access denied. You can only view your own organization.'
            });
        }

        res.json({
            organization: organization.toJSON()
        });

    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            error: 'Failed to retrieve organization',
            details: error.message
        });
    }
};

// Get organization users (admin only)
const getOrganizationUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Check if user can manage this organization
        if (req.user.role !== 'admin' && 
            (req.user.organization_id !== id || req.user.organization_role !== 'admin')) {
            return res.status(403).json({
                error: 'Access denied. Organization administrator role required.'
            });
        }

        const users = await User.findByOrganization(id, page, limit);
        
        // Remove sensitive data
        const sanitizedUsers = users.map(user => user.toJSON());

        res.json({
            users: sanitizedUsers,
            pagination: {
                page,
                limit,
                total: users.length
            }
        });

    } catch (error) {
        console.error('Get organization users error:', error);
        res.status(500).json({
            error: 'Failed to retrieve organization users',
            details: error.message
        });
    }
};

// Grant/revoke user access within organization
const manageUserAccess = async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, organization_role } = req.body; // action: 'grant', 'revoke', 'update_role'

        // Get target user
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Check if current user can manage the target user
        if (!req.user.canManageUser(targetUser)) {
            return res.status(403).json({
                error: 'Access denied. You cannot manage this user.'
            });
        }

        let result;
        let activityAction;

        switch (action) {
            case 'grant':
                // Grant access by assigning user to organization
                result = await targetUser.update({
                    organization_id: req.user.organization_id,
                    organization_role: organization_role || 'user'
                });
                activityAction = 'user_access_granted';
                break;

            case 'revoke':
                // Revoke access by removing from organization
                result = await targetUser.update({
                    organization_id: null,
                    organization_role: 'user'
                });
                activityAction = 'user_access_revoked';
                break;

            case 'update_role':
                // Update organization role
                if (!['admin', 'user'].includes(organization_role)) {
                    return res.status(400).json({
                        error: 'Invalid organization role. Must be "admin" or "user".'
                    });
                }
                result = await targetUser.update({ organization_role });
                activityAction = 'user_role_updated';
                break;

            default:
                return res.status(400).json({
                    error: 'Invalid action. Must be "grant", "revoke", or "update_role".'
                });
        }

        // Log activity
        await logActivity(req.user.id, activityAction, {
            target_user_id: userId,
            target_username: targetUser.username,
            action,
            organization_role,
            organization_id: req.user.organization_id
        }, 'success');

        res.json({
            message: `User access ${action} successful`,
            user: result.toJSON()
        });

    } catch (error) {
        console.error('Manage user access error:', error);
        await logActivity(req.user?.id, 'user_access_management_failed', {
            target_user_id: req.params.userId,
            action: req.body.action,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to manage user access',
            details: error.message
        });
    }
};

// Get organization projects
const getOrganizationProjects = async (req, res) => {
    try {
        const { id } = req.params;
        const status = req.query.status;

        // Check access permissions
        if (req.user.role !== 'admin' && req.user.organization_id !== id) {
            return res.status(403).json({
                error: 'Access denied. You can only view projects in your organization.'
            });
        }

        const projects = await Project.findByOrganization(id, status);

        res.json({
            projects: projects.map(p => p.toJSON())
        });

    } catch (error) {
        console.error('Get organization projects error:', error);
        res.status(500).json({
            error: 'Failed to retrieve organization projects',
            details: error.message
        });
    }
};

// Create project within organization
const createProject = async (req, res) => {
    try {
        const { name, description, assigned_users = [], due_date } = req.body;
        const organization_id = req.user.organization_id;

        // Validate required fields
        if (!name || !organization_id) {
            return res.status(400).json({
                error: 'Project name and organization are required'
            });
        }

        // Only organization admins can create projects
        if (req.user.organization_role !== 'admin' && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied. Organization administrator role required to create projects.'
            });
        }

        const project = await Project.create({
            name,
            description,
            organization_id,
            created_by: req.user.id,
            assigned_users,
            due_date
        });

        // Log activity
        await logActivity(req.user.id, 'project_created', {
            project_id: project.id,
            project_name: name,
            organization_id,
            assigned_users
        }, 'success');

        res.status(201).json({
            message: 'Project created successfully',
            project: project.toJSON()
        });

    } catch (error) {
        console.error('Create project error:', error);
        await logActivity(req.user?.id, 'project_creation_failed', {
            project_name: req.body.name,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to create project',
            details: error.message
        });
    }
};

module.exports = {
    registerOrganization,
    getOrganization,
    getOrganizationUsers,
    manageUserAccess,
    getOrganizationProjects,
    createProject
};