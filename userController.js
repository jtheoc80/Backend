const User = require('./userModel');
const { generateToken } = require('./authMiddleware');
const { sendEmail } = require('./emailUtils');
const logActivity = require('./logActivity');
const { db } = require('./database');
const blockchainService = require('./blockchainService');
const crypto = require('crypto');

// Register new user
const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Username, email, and password are required.'
            });
        }

        // Check if user already exists
        const existingUserByEmail = await User.findByEmail(email);
        if (existingUserByEmail) {
            return res.status(409).json({
                error: 'User with this email already exists.'
            });
        }

        const existingUserByUsername = await User.findByUsername(username);
        if (existingUserByUsername) {
            return res.status(409).json({
                error: 'Username already taken.'
            });
        }

        // Create new user
        const userData = { username, email, password };
        if (role && ['admin', 'user'].includes(role)) {
            userData.role = role;
        }

        const user = await User.create(userData);

        // Generate token
        const token = generateToken(user.id, user.role);

        // Log activity
        await logActivity(db, user.id, 'USER_REGISTER', { username, email }, 'success');

        res.status(201).json({
            message: 'User registered successfully.',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        // Log failed activity
        if (req.body.email) {
            await logActivity(db, null, 'USER_REGISTER', { 
                email: req.body.email, 
                error: error.message 
            }, 'failure');
        }
        
        res.status(500).json({
            error: 'Failed to register user.'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required.'
            });
        }

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            await logActivity(db, null, 'USER_LOGIN', { email }, 'failure');
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        // Verify password
        const isPasswordValid = await user.verifyPassword(password);
        if (!isPasswordValid) {
            await logActivity(db, user.id, 'USER_LOGIN', { email }, 'failure');
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        // Generate token
        const token = generateToken(user.id, user.role);

        // Log successful login
        await logActivity(db, user.id, 'USER_LOGIN', { email }, 'success');

        res.json({
            message: 'Login successful.',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        
        // Log failed activity
        if (req.body.email) {
            await logActivity(db, null, 'USER_LOGIN', { 
                email: req.body.email, 
                error: error.message 
            }, 'failure');
        }
        
        res.status(500).json({
            error: 'Failed to login.'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        res.json({
            user: req.user.toJSON()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get user profile.'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const updateData = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update.'
            });
        }

        // Check for existing username/email if updating
        if (username && username !== req.user.username) {
            const existingUser = await User.findByUsername(username);
            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(409).json({
                    error: 'Username already taken.'
                });
            }
        }

        if (email && email !== req.user.email) {
            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(409).json({
                    error: 'Email already in use.'
                });
            }
        }

        await req.user.update(updateData);

        // Log activity
        await logActivity(db, req.user.id, 'USER_UPDATE_PROFILE', updateData, 'success');

        res.json({
            message: 'Profile updated successfully.',
            user: req.user.toJSON()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_UPDATE_PROFILE', { 
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to update profile.'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required.'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await req.user.verifyPassword(currentPassword);
        if (!isCurrentPasswordValid) {
            await logActivity(db, req.user.id, 'USER_CHANGE_PASSWORD', {}, 'failure');
            return res.status(401).json({
                error: 'Current password is incorrect.'
            });
        }

        // Update password
        await req.user.updatePassword(newPassword);

        // Log activity
        await logActivity(db, req.user.id, 'USER_CHANGE_PASSWORD', {}, 'success');

        res.json({
            message: 'Password changed successfully.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_CHANGE_PASSWORD', { 
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to change password.'
        });
    }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const users = await User.findAll(page, limit);

        // Log activity
        await logActivity(db, req.user.id, 'USER_LIST_ALL', { page, limit }, 'success');

        res.json({
            users: users.map(user => user.toJSON()),
            page,
            limit
        });
    } catch (error) {
        console.error('Get all users error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_LIST_ALL', { 
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to get users.'
        });
    }
};

// Get user by ID (admin only or own profile)
const getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        // Log activity
        await logActivity(db, req.user.id, 'USER_GET_BY_ID', { targetUserId: userId }, 'success');

        res.json({
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_GET_BY_ID', { 
            targetUserId: req.params.id,
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to get user.'
        });
    }
};

// Update user by ID (admin only)
const updateUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, email, role, is_verified } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (role && ['admin', 'user'].includes(role)) updateData.role = role;
        if (typeof is_verified === 'boolean') updateData.is_verified = is_verified ? 1 : 0;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update.'
            });
        }

        await user.update(updateData);

        // Log activity
        await logActivity(db, req.user.id, 'USER_UPDATE_BY_ADMIN', { 
            targetUserId: userId, 
            updateData 
        }, 'success');

        res.json({
            message: 'User updated successfully.',
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Update user by ID error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_UPDATE_BY_ADMIN', { 
            targetUserId: req.params.id,
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to update user.'
        });
    }
};

// Delete user by ID (admin only)
const deleteUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({
                error: 'Cannot delete your own account.'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        await user.delete();

        // Log activity
        await logActivity(db, req.user.id, 'USER_DELETE_BY_ADMIN', { 
            targetUserId: userId,
            deletedUsername: user.username 
        }, 'success');

        res.json({
            message: 'User deleted successfully.'
        });
    } catch (error) {
        console.error('Delete user by ID error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_DELETE_BY_ADMIN', { 
            targetUserId: req.params.id,
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to delete user.'
        });
    }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email is required.'
            });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({
                message: 'If the email exists, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        await user.setResetToken(resetToken);

        // Send reset email (in production, this should be properly configured)
        try {
            await sendEmail(
                email,
                'Password Reset Request',
                `Click here to reset your password: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
            );
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            // Continue anyway - we don't want to reveal if the email exists
        }

        // Log activity
        await logActivity(db, user.id, 'USER_PASSWORD_RESET_REQUEST', { email }, 'success');

        res.json({
            message: 'If the email exists, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            error: 'Failed to process password reset request.'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Token and new password are required.'
            });
        }

        const user = await User.verifyResetToken(token);
        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired reset token.'
            });
        }

        // Update password and clear reset token
        await user.updatePassword(newPassword);
        await user.clearResetToken();

        // Log activity
        await logActivity(db, user.id, 'USER_PASSWORD_RESET', {}, 'success');

        res.json({
            message: 'Password reset successfully.'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            error: 'Failed to reset password.'
        });
    }
};

// Generate test token (for testing purposes only)
const generateTestToken = async (req, res) => {
    try {
        // Only allow in non-production environments
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Test token generation is disabled in production.'
            });
        }

        const { role = 'user', userId = 999, username = 'testuser' } = req.body;

        // Validate role
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({
                error: 'Role must be either "admin" or "user".'
            });
        }

        // Generate token with test user data
        const token = generateToken(userId, role);

        // Log activity (using null for userId since this is a test token)
        await logActivity(db, null, 'TEST_TOKEN_GENERATED', { 
            role, 
            testUserId: userId, 
            testUsername: username 
        }, 'success');

        res.json({
            message: 'Test token generated successfully.',
            token,
            testUser: {
                id: userId,
                username,
                role
            },
            instructions: {
                usage: 'Include this token in the Authorization header as "Bearer <token>"',
                example: `Authorization: Bearer ${token}`,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h',
                warning: 'This is a test token and should only be used for development/testing purposes.'
            }
        });
    } catch (error) {
        console.error('Generate test token error:', error);
        
        // Log failed activity
        await logActivity(db, null, 'TEST_TOKEN_GENERATED', { 
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to generate test token.'
        });
    }
};

// Request profile deletion (self-service)
const requestProfileDeletion = async (req, res) => {
    try {
        const { confirmationPassword } = req.body;

        // Require password confirmation for security
        if (!confirmationPassword) {
            return res.status(400).json({
                error: 'Password confirmation is required to delete your profile.'
            });
        }

        // Verify current password
        const isPasswordValid = await req.user.verifyPassword(confirmationPassword);
        if (!isPasswordValid) {
            await logActivity(db, req.user.id, 'USER_DELETE_REQUEST', { 
                reason: 'Invalid password confirmation' 
            }, 'failure');
            return res.status(401).json({
                error: 'Password confirmation is incorrect.'
            });
        }

        // Generate deletion confirmation token
        const deletionToken = crypto.randomBytes(32).toString('hex');
        await req.user.setDeletionToken(deletionToken);

        // Send confirmation email (in production, this should be properly configured)
        try {
            const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirm-deletion?token=${deletionToken}`;
            await sendEmail(
                req.user.email,
                'Profile Deletion Confirmation',
                `You have requested to delete your profile. This action cannot be undone.\n\nTo confirm deletion, click here: ${confirmationUrl}\n\nIf you did not request this, please ignore this email and change your password immediately.`
            );
        } catch (emailError) {
            console.error('Failed to send deletion confirmation email:', emailError);
            // Continue anyway - user can still use API endpoint with token
        }

        // Log activity
        await logActivity(db, req.user.id, 'USER_DELETE_REQUEST', { 
            email: req.user.email
        }, 'success');

        res.json({
            message: 'Profile deletion request submitted. Please check your email for confirmation instructions.',
            confirmationToken: deletionToken,
            instructions: 'Use the confirmation token with the DELETE /api/auth/profile/delete endpoint to complete deletion, or click the link in your email.'
        });
    } catch (error) {
        console.error('Request profile deletion error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_DELETE_REQUEST', { 
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to process profile deletion request.'
        });
    }
};

// Confirm and execute profile deletion
const confirmProfileDeletion = async (req, res) => {
    try {
        const { confirmationToken } = req.body;

        if (!confirmationToken) {
            return res.status(400).json({
                error: 'Confirmation token is required to complete profile deletion.'
            });
        }

        // Verify deletion token
        const isValidToken = await req.user.verifyDeletionToken(confirmationToken);
        if (!isValidToken) {
            await logActivity(db, req.user.id, 'USER_DELETE_CONFIRM', { 
                reason: 'Invalid or expired deletion token' 
            }, 'failure');
            return res.status(400).json({
                error: 'Invalid or expired deletion confirmation token.'
            });
        }

        // Perform secure data cleanup
        await performSecureUserDataCleanup(req.user);

        // Log successful deletion before actually deleting the user
        await logActivity(db, req.user.id, 'USER_DELETE_SELF', { 
            username: req.user.username,
            email: req.user.email,
            deletedAt: new Date().toISOString()
        }, 'success');

        // Delete the user from database (this will cascade to related data)
        await req.user.delete();

        res.json({
            message: 'Profile deleted successfully. All associated data has been removed.'
        });
    } catch (error) {
        console.error('Confirm profile deletion error:', error);
        
        // Log failed activity
        await logActivity(db, req.user.id, 'USER_DELETE_CONFIRM', { 
            error: error.message 
        }, 'failure');
        
        res.status(500).json({
            error: 'Failed to complete profile deletion.'
        });
    }
};

// Helper function to perform secure user data cleanup
const performSecureUserDataCleanup = async (user) => {
    try {
        // Clean up blockchain records if user has any associated data
        await cleanupBlockchainRecords(user);
        
        // Clean up related database records
        await cleanupRelatedData(user);

        console.log(`Secure data cleanup completed for user ${user.id}`);
    } catch (error) {
        console.error('Error during secure data cleanup:', error);
        throw error;
    }
};

// Helper function to cleanup blockchain records
const cleanupBlockchainRecords = async (user) => {
    try {
        // Check if user has any manufacturer or distributor records
        const manufacturerRecords = await db.query(
            'SELECT id FROM manufacturers WHERE id = ? OR wallet_address = ?', 
            [user.username, user.email]
        );
        
        const distributorRecords = await db.query(
            'SELECT id FROM distributors WHERE id = ? OR contact_email = ?', 
            [user.username, user.email]
        );

        // Update blockchain if user had manufacturer/distributor roles
        if (manufacturerRecords.length > 0 || distributorRecords.length > 0) {
            try {
                await blockchainService.deactivateUserRecords({
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    manufacturerIds: manufacturerRecords.map(r => r.id),
                    distributorIds: distributorRecords.map(r => r.id)
                });
            } catch (blockchainError) {
                console.warn('Blockchain cleanup failed (continuing with deletion):', blockchainError);
                // Don't fail the deletion if blockchain cleanup fails
            }
        }
    } catch (error) {
        console.error('Error during blockchain cleanup:', error);
        // Don't throw - blockchain cleanup is not critical for user deletion
    }
};

// Helper function to cleanup related data
const cleanupRelatedData = async (user) => {
    try {
        // Deactivate any manufacturer records associated with this user
        await db.run(
            'UPDATE manufacturers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR wallet_address = ?',
            [user.username, user.email]
        );

        // Deactivate any distributor records associated with this user  
        await db.run(
            'UPDATE distributors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR contact_email = ?',
            [user.username, user.email]
        );

        // Deactivate any manufacturer-distributor relationships
        await db.run(
            'UPDATE manufacturer_distributor_relationships SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE manufacturer_id = ? OR distributor_id = ?',
            [user.username, user.username]
        );

        console.log(`Related data cleanup completed for user ${user.id}`);
    } catch (error) {
        console.error('Error during related data cleanup:', error);
        throw error;
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUserById,
    deleteUserById,
    requestPasswordReset,
    resetPassword,
    generateTestToken,
    requestProfileDeletion,
    confirmProfileDeletion
};