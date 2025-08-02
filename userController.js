import UserModel from './userModel.js';
import logActivity from './logActivity.js';
import { sendEmail } from './emailUtils.js';
import jwt from 'jsonwebtoken';

/**
 * User Controller - Handles HTTP requests for user operations
 */
const userController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      // Basic validation
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: 'Username, email, and password are required' 
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Password validation
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long' 
        });
      }

      const user = await UserModel.create({ username, email, password, role });
      
      // Log activity (if db is available - for now we'll skip this)
      // await logActivity(db, user.id, 'USER_REGISTERED', { email, username }, 'SUCCESS');

      // Send welcome email (optional)
      try {
        await sendEmail(
          email, 
          'Welcome to ValveChain', 
          `Welcome ${username}! Your account has been created successfully.`
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      const user = await UserModel.authenticate(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token (we'll implement this in authMiddleware)
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user.userId; // Set by auth middleware
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { username, email } = req.body;

      const updatedUser = await UserModel.update(userId, { username, email });
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Old password and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'New password must be at least 6 characters long' 
        });
      }

      await UserModel.changePassword(userId, oldPassword, newPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }

      const { page, limit, includeInactive } = req.query;
      const result = await UserModel.findAll({ 
        page: parseInt(page) || 1, 
        limit: parseInt(limit) || 10,
        includeInactive: includeInactive === 'true'
      });

      res.json(result);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user by ID (admin only)
  getUserById: async (req, res) => {
    try {
      // Check if user is admin or requesting own profile
      const requestingUserId = req.user.userId;
      const targetUserId = req.params.id;
      
      if (req.user.role !== 'admin' && requestingUserId !== parseInt(targetUserId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await UserModel.findById(targetUserId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete user (admin only)
  deleteUser: async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }

      const userId = req.params.id;
      const deleted = await UserModel.delete(userId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export default userController;