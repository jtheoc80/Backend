import bcrypt from 'bcryptjs';

// In-memory user storage (replace with real database in production)
let users = [];
let nextUserId = 1;

/**
 * User Model - Handles user data operations
 */
class User {
  constructor(username, email, password, role = 'user') {
    this.id = nextUserId++;
    this.username = username;
    this.email = email;
    this.password = password; // Should be hashed
    this.role = role;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.isActive = true;
  }

  // Instance method to convert to safe object (without password)
  toSafeObject() {
    const { password, ...safeUser } = this;
    return safeUser;
  }
}

/**
 * User Model Methods
 */
const UserModel = {
  // Create a new user
  async create(userData) {
    const { username, email, password, role } = userData;
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User(username, email, hashedPassword, role);
    users.push(newUser);
    
    return newUser.toSafeObject();
  },

  // Find user by ID
  async findById(id) {
    const user = users.find(u => u.id === parseInt(id) && u.isActive);
    return user ? user.toSafeObject() : null;
  },

  // Find user by email
  async findByEmail(email) {
    return users.find(u => u.email === email && u.isActive);
  },

  // Find user by username
  async findByUsername(username) {
    return users.find(u => u.username === username && u.isActive);
  },

  // Authenticate user
  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    return user.toSafeObject();
  },

  // Update user
  async update(id, updateData) {
    const userIndex = users.findIndex(u => u.id === parseInt(id) && u.isActive);
    if (userIndex === -1) {
      return null;
    }

    // Hash password if being updated
    if (updateData.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    // Update user
    users[userIndex] = { 
      ...users[userIndex], 
      ...updateData, 
      updatedAt: new Date() 
    };

    return users[userIndex].toSafeObject();
  },

  // Soft delete user
  async delete(id) {
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    if (userIndex === -1) {
      return false;
    }

    users[userIndex].isActive = false;
    users[userIndex].updatedAt = new Date();
    return true;
  },

  // Get all users (admin only)
  async findAll(options = {}) {
    const { page = 1, limit = 10, includeInactive = false } = options;
    
    let filteredUsers = includeInactive ? users : users.filter(u => u.isActive);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      users: filteredUsers.slice(startIndex, endIndex).map(u => u.toSafeObject()),
      total: filteredUsers.length,
      page,
      limit,
      totalPages: Math.ceil(filteredUsers.length / limit)
    };
  },

  // Change user password
  async changePassword(id, oldPassword, newPassword) {
    const user = users.find(u => u.id === parseInt(id) && u.isActive);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidOldPassword) {
      throw new Error('Invalid old password');
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updatedAt = new Date();

    return true;
  }
};

export default UserModel;