const express = require('express');
const router = express.Router();
const organizationController = require('./organizationController');
const projectController = require('./projectController');
const { 
    verifyToken, 
    requireOrganizationAdmin, 
    requireOrganizationAccess
} = require('./authMiddleware');

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all organization routes
router.use(limiter);

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