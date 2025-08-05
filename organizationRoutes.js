const express = require('express');
const router = express.Router();
const organizationController = require('./organizationController');
const projectController = require('./projectController');
const { 
    verifyToken, 
    requireOrganizationAdmin, 
    requireOrganizationAccess,
    rateLimit 
} = require('./authMiddleware');

// Apply rate limiting to all organization routes
router.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Organization management routes
router.post('/organizations/register', 
    verifyToken, 
    organizationController.registerOrganization
);

router.get('/organizations/:id', 
    verifyToken, 
    requireOrganizationAccess,
    organizationController.getOrganization
);

router.get('/organizations/:id/users', 
    verifyToken, 
    requireOrganizationAdmin,
    organizationController.getOrganizationUsers
);

router.post('/organizations/users/:userId/access', 
    verifyToken, 
    requireOrganizationAdmin,
    organizationController.manageUserAccess
);

router.get('/organizations/:id/projects', 
    verifyToken, 
    requireOrganizationAccess,
    organizationController.getOrganizationProjects
);

router.post('/organizations/projects', 
    verifyToken, 
    requireOrganizationAdmin,
    organizationController.createProject
);

// Project management routes
router.get('/projects/:id', 
    verifyToken, 
    projectController.getProject
);

router.put('/projects/:id', 
    verifyToken, 
    projectController.updateProject
);

router.post('/projects/:id/assign', 
    verifyToken, 
    projectController.assignUserToProject
);

router.delete('/projects/:id/users/:userId', 
    verifyToken, 
    projectController.removeUserFromProject
);

router.post('/projects/:id/complete', 
    verifyToken, 
    projectController.completeProject
);

router.get('/users/projects', 
    verifyToken, 
    projectController.getUserProjects
);

router.delete('/projects/:id', 
    verifyToken, 
    projectController.deleteProject
);

module.exports = router;