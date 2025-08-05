const Project = require('./projectModel');
const User = require('./userModel');
const logActivity = require('./logActivity');

// Get project details
const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found'
            });
        }

        // Check access permissions
        const canManage = await project.canUserManage(req.user.id, req.user.role, req.user.organization_role);
        const isAssigned = project.isUserAssigned(req.user.id);
        const sameOrg = req.user.organization_id === project.organization_id;

        if (!canManage && !isAssigned && !sameOrg && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied. You cannot view this project.'
            });
        }

        res.json({
            project: project.toJSON()
        });

    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({
            error: 'Failed to retrieve project',
            details: error.message
        });
    }
};

// Update project
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found'
            });
        }

        // Check if user can manage this project
        const canManage = await project.canUserManage(req.user.id, req.user.role, req.user.organization_role);
        if (!canManage) {
            return res.status(403).json({
                error: 'Access denied. You cannot manage this project.'
            });
        }

        const updatedProject = await project.update(updateData);

        // Log activity
        await logActivity(req.user.id, 'project_updated', {
            project_id: id,
            project_name: project.name,
            updates: Object.keys(updateData)
        }, 'success');

        res.json({
            message: 'Project updated successfully',
            project: updatedProject.toJSON()
        });

    } catch (error) {
        console.error('Update project error:', error);
        await logActivity(req.user?.id, 'project_update_failed', {
            project_id: req.params.id,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to update project',
            details: error.message
        });
    }
};

// Assign user to project
const assignUserToProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found'
            });
        }

        // Check if user can manage this project
        const canManage = await project.canUserManage(req.user.id, req.user.role, req.user.organization_role);
        if (!canManage) {
            return res.status(403).json({
                error: 'Access denied. You cannot manage project assignments.'
            });
        }

        // Verify the user exists and belongs to the same organization
        const targetUser = await User.findById(user_id);
        if (!targetUser) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        if (targetUser.organization_id !== project.organization_id) {
            return res.status(400).json({
                error: 'User must belong to the same organization as the project'
            });
        }

        await project.assignUser(user_id);

        // Log activity
        await logActivity(req.user.id, 'user_assigned_to_project', {
            project_id: id,
            project_name: project.name,
            assigned_user_id: user_id,
            assigned_username: targetUser.username
        }, 'success');

        res.json({
            message: 'User assigned to project successfully',
            project: project.toJSON()
        });

    } catch (error) {
        console.error('Assign user to project error:', error);
        await logActivity(req.user?.id, 'project_assignment_failed', {
            project_id: req.params.id,
            user_id: req.body.user_id,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to assign user to project',
            details: error.message
        });
    }
};

// Remove user from project
const removeUserFromProject = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found'
            });
        }

        // Check if user can manage this project
        const canManage = await project.canUserManage(req.user.id, req.user.role, req.user.organization_role);
        if (!canManage) {
            return res.status(403).json({
                error: 'Access denied. You cannot manage project assignments.'
            });
        }

        await project.removeUser(parseInt(userId));

        // Log activity
        await logActivity(req.user.id, 'user_removed_from_project', {
            project_id: id,
            project_name: project.name,
            removed_user_id: userId
        }, 'success');

        res.json({
            message: 'User removed from project successfully',
            project: project.toJSON()
        });

    } catch (error) {
        console.error('Remove user from project error:', error);
        await logActivity(req.user?.id, 'project_unassignment_failed', {
            project_id: req.params.id,
            user_id: req.params.userId,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to remove user from project',
            details: error.message
        });
    }
};

// Complete project task (users can only mark tasks as completed)
const completeProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found'
            });
        }

        // Users can complete projects they are assigned to
        const canManage = await project.canUserManage(req.user.id, req.user.role, req.user.organization_role);
        const isAssigned = project.isUserAssigned(req.user.id);

        if (!canManage && !isAssigned) {
            return res.status(403).json({
                error: 'Access denied. You can only complete projects you are assigned to or manage.'
            });
        }

        await project.complete();

        // Log activity
        await logActivity(req.user.id, 'project_completed', {
            project_id: id,
            project_name: project.name,
            completed_by: req.user.username
        }, 'success');

        res.json({
            message: 'Project marked as completed successfully',
            project: project.toJSON()
        });

    } catch (error) {
        console.error('Complete project error:', error);
        await logActivity(req.user?.id, 'project_completion_failed', {
            project_id: req.params.id,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to complete project',
            details: error.message
        });
    }
};

// Get user's assigned projects
const getUserProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const organizationId = req.user.organization_id;

        const projects = await Project.findByAssignedUser(userId, organizationId);

        res.json({
            projects: projects.map(p => p.toJSON())
        });

    } catch (error) {
        console.error('Get user projects error:', error);
        res.status(500).json({
            error: 'Failed to retrieve user projects',
            details: error.message
        });
    }
};

// Delete project (admin only)
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                error: 'Project not found'
            });
        }

        // Check if user can manage this project
        const canManage = await project.canUserManage(req.user.id, req.user.role, req.user.organization_role);
        if (!canManage) {
            return res.status(403).json({
                error: 'Access denied. You cannot delete this project.'
            });
        }

        await project.delete();

        // Log activity
        await logActivity(req.user.id, 'project_deleted', {
            project_id: id,
            project_name: project.name
        }, 'success');

        res.json({
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('Delete project error:', error);
        await logActivity(req.user?.id, 'project_deletion_failed', {
            project_id: req.params.id,
            error: error.message
        }, 'error');

        res.status(500).json({
            error: 'Failed to delete project',
            details: error.message
        });
    }
};

module.exports = {
    getProject,
    updateProject,
    assignUserToProject,
    removeUserFromProject,
    completeProject,
    getUserProjects,
    deleteProject
};