const User = require('../userModel');
const { db } = require('../database');

describe('User Database Compatibility', () => {
    let testUser;
    
    beforeAll(async () => {
        // Ensure database is initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    afterEach(async () => {
        // Clean up test user if it exists
        if (testUser) {
            try {
                await testUser.delete();
                testUser = null;
            } catch (error) {
                // User might already be deleted
            }
        }
    });
    
    describe('Database Schema', () => {
        test('should have users table with correct schema', async () => {
            const schemaInfo = await db.query("PRAGMA table_info(users)");
            const columnNames = schemaInfo.map(col => col.name);
            
            const expectedColumns = [
                'id', 'username', 'email', 'password', 'role', 
                'created_at', 'updated_at', 'is_verified', 
                'reset_token', 'reset_token_expires'
            ];
            
            expectedColumns.forEach(column => {
                expect(columnNames).toContain(column);
            });
        });
        
        test('should have correct data types and constraints', async () => {
            const schemaInfo = await db.query("PRAGMA table_info(users)");
            const idColumn = schemaInfo.find(col => col.name === 'id');
            const usernameColumn = schemaInfo.find(col => col.name === 'username');
            const emailColumn = schemaInfo.find(col => col.name === 'email');
            
            expect(idColumn.pk).toBe(1); // Primary key
            expect(usernameColumn.notnull).toBe(1); // Not null
            expect(emailColumn.notnull).toBe(1); // Not null
        });
    });
    
    describe('User CRUD Operations', () => {
        test('should create a new user', async () => {
            testUser = await User.create({
                username: 'testuser123',
                email: 'test123@example.com',
                password: 'testpassword123',
                role: 'user'
            });
            
            expect(testUser).toBeDefined();
            expect(testUser.id).toBeDefined();
            expect(testUser.username).toBe('testuser123');
            expect(testUser.email).toBe('test123@example.com');
            expect(testUser.role).toBe('user');
        });
        
        test('should find user by email', async () => {
            testUser = await User.create({
                username: 'findtest',
                email: 'findtest@example.com',
                password: 'password123'
            });
            
            const foundUser = await User.findByEmail('findtest@example.com');
            expect(foundUser).toBeDefined();
            expect(foundUser.id).toBe(testUser.id);
            expect(foundUser.username).toBe('findtest');
        });
        
        test('should find user by username', async () => {
            testUser = await User.create({
                username: 'uniqueuser',
                email: 'unique@example.com',
                password: 'password123'
            });
            
            const foundUser = await User.findByUsername('uniqueuser');
            expect(foundUser).toBeDefined();
            expect(foundUser.id).toBe(testUser.id);
            expect(foundUser.email).toBe('unique@example.com');
        });
        
        test('should update user', async () => {
            testUser = await User.create({
                username: 'updatetest',
                email: 'update@example.com',
                password: 'password123'
            });
            
            await testUser.update({
                username: 'updateduser',
                role: 'admin'
            });
            
            expect(testUser.username).toBe('updateduser');
            expect(testUser.role).toBe('admin');
        });
        
        test('should verify password correctly', async () => {
            testUser = await User.create({
                username: 'passwordtest',
                email: 'passwordtest@example.com',
                password: 'mypassword123'
            });
            
            const isValidCorrect = await testUser.verifyPassword('mypassword123');
            const isValidIncorrect = await testUser.verifyPassword('wrongpassword');
            
            expect(isValidCorrect).toBe(true);
            expect(isValidIncorrect).toBe(false);
        });
    });
    
    describe('Authentication Features', () => {
        test('should set and verify reset token', async () => {
            testUser = await User.create({
                username: 'resettest',
                email: 'resettest@example.com',
                password: 'password123'
            });
            
            await testUser.setResetToken('test_token_123', 3600000);
            expect(testUser.reset_token).toBe('test_token_123');
            
            const userWithToken = await User.verifyResetToken('test_token_123');
            expect(userWithToken).toBeDefined();
            expect(userWithToken.id).toBe(testUser.id);
        });
        
        test('should clear reset token', async () => {
            testUser = await User.create({
                username: 'cleartest',
                email: 'cleartest@example.com',
                password: 'password123'
            });
            
            await testUser.setResetToken('token_to_clear');
            await testUser.clearResetToken();
            
            expect(testUser.reset_token).toBeNull();
            expect(testUser.reset_token_expires).toBeNull();
        });
    });
    
    describe('Data Integrity', () => {
        test('should enforce unique constraints', async () => {
            testUser = await User.create({
                username: 'uniquetest',
                email: 'uniquetest@example.com',
                password: 'password123'
            });
            
            // Try to create another user with same email
            await expect(User.create({
                username: 'different',
                email: 'uniquetest@example.com',
                password: 'password123'
            })).rejects.toThrow();
            
            // Try to create another user with same username
            await expect(User.create({
                username: 'uniquetest',
                email: 'different@example.com',
                password: 'password123'
            })).rejects.toThrow();
        });
        
        test('should return null for non-existent users', async () => {
            const nonExistentUser = await User.findByEmail('nonexistent@example.com');
            expect(nonExistentUser).toBeNull();
            
            const nonExistentById = await User.findById(99999);
            expect(nonExistentById).toBeNull();
        });
    });
    
    describe('JSON Serialization', () => {
        test('should exclude sensitive data from JSON', async () => {
            testUser = await User.create({
                username: 'jsontest',
                email: 'jsontest@example.com',
                password: 'password123'
            });
            
            const userJson = testUser.toJSON();
            
            expect(userJson.password).toBeUndefined();
            expect(userJson.reset_token).toBeUndefined();
            expect(userJson.reset_token_expires).toBeUndefined();
            expect(userJson.username).toBe('jsontest');
            expect(userJson.email).toBe('jsontest@example.com');
        });
    });
});