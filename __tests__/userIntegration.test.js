const request = require('supertest');
const express = require('express');
const userRoutes = require('../userRoutes');
const { db } = require('../database');

// Create test app without rate limiting for testing
const app = express();
app.use(express.json());

// Mock the rate limiting middleware to avoid conflicts during testing
jest.mock('../authMiddleware', () => {
    const original = jest.requireActual('../authMiddleware');
    return {
        ...original,
        rateLimit: () => (req, res, next) => next() // Bypass rate limiting in tests
    };
});

app.use('/api/auth', userRoutes);

// Test data
const testUser = {
    username: 'testuser' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123'
};

const adminUser = {
    username: 'adminuser' + Date.now(),
    email: `admin${Date.now()}@example.com`,
    password: 'adminpassword123',
    role: 'admin'
};

describe('User API Integration Tests', () => {
    let userToken;
    let adminToken;
    let createdUserId;
    let createdAdminId;

    beforeAll(async () => {
        // Wait for database initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(async () => {
        // Clean up test data
        if (createdUserId) {
            try {
                await db.run('DELETE FROM users WHERE id = ?', [createdUserId]);
            } catch (error) {
                console.log('Cleanup error:', error);
            }
        }
        if (createdAdminId) {
            try {
                await db.run('DELETE FROM users WHERE id = ?', [createdAdminId]);
            } catch (error) {
                console.log('Cleanup error:', error);
            }
        }
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully.');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('username', testUser.username);
            expect(response.body.user).toHaveProperty('email', testUser.email);
            expect(response.body.user).toHaveProperty('role', 'user');
            expect(response.body.user).toHaveProperty('is_verified', false);
            expect(response.body.user).toHaveProperty('is_active', true);
            expect(response.body.user).not.toHaveProperty('password');

            createdUserId = response.body.user.id;
            userToken = response.body.token;
        });

        it('should register an admin user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(adminUser)
                .expect(201);

            expect(response.body.user).toHaveProperty('role', 'admin');
            createdAdminId = response.body.user.id;
            adminToken = response.body.token;
        });

        it('should return 409 for duplicate email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(409);

            expect(response.body).toHaveProperty('error', 'User with this email already exists.');
        });

        it('should return 409 for duplicate username', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: testUser.username,
                    email: 'different' + Date.now() + '@example.com',
                    password: 'password123'
                })
                .expect(409);

            expect(response.body).toHaveProperty('error', 'Username already taken.');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ username: 'incomplete' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful.');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', testUser.email);
            expect(response.body.user).toHaveProperty('is_verified', false);
            expect(response.body.user).toHaveProperty('is_active', true);
        });

        it('should return 401 for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid email or password.');
        });

        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent' + Date.now() + '@example.com',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid email or password.');
        });
    });

    describe('GET /api/auth/profile', () => {
        it('should get user profile successfully', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('username', testUser.username);
            expect(response.body.user).toHaveProperty('email', testUser.email);
            expect(response.body.user).toHaveProperty('is_verified', false);
            expect(response.body.user).toHaveProperty('is_active', true);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get('/api/auth/profile')
                .expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);
        });
    });

    describe('PUT /api/auth/profile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                username: 'updateduser' + Date.now(),
                email: 'updated' + Date.now() + '@example.com'
            };

            const response = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Profile updated successfully.');
            expect(response.body.user).toHaveProperty('username', updateData.username);
            expect(response.body.user).toHaveProperty('email', updateData.email);
        });

        it('should return 409 for duplicate username', async () => {
            const response = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ username: adminUser.username })
                .expect(409);

            expect(response.body).toHaveProperty('error', 'Username already taken.');
        });

        it('should return 400 for no valid fields', async () => {
            const response = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error', 'No valid fields to update.');
        });
    });

    describe('PUT /api/auth/change-password', () => {
        it('should change password successfully', async () => {
            const newPassword = 'newpassword123';
            const response = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    currentPassword: testUser.password,
                    newPassword: newPassword
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Password changed successfully.');

            // Update testUser password for future tests
            testUser.password = newPassword;
        });

        it('should return 401 for incorrect current password', async () => {
            const response = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'newpassword123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Current password is incorrect.');
        });
    });

    describe('Admin Routes', () => {
        describe('GET /api/auth/users', () => {
            it('should get all users for admin', async () => {
                const response = await request(app)
                    .get('/api/auth/users')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('users');
                expect(response.body).toHaveProperty('page', 1);
                expect(response.body).toHaveProperty('limit', 10);
                expect(Array.isArray(response.body.users)).toBe(true);
                expect(response.body.users.length).toBeGreaterThan(0);
            });

            it('should return 403 for non-admin user', async () => {
                await request(app)
                    .get('/api/auth/users')
                    .set('Authorization', `Bearer ${userToken}`)
                    .expect(403);
            });
        });

        describe('GET /api/auth/users/:id', () => {
            it('should get user by id for admin', async () => {
                const response = await request(app)
                    .get(`/api/auth/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('user');
                expect(response.body.user).toHaveProperty('id', createdUserId);
            });

            it('should allow user to get their own profile', async () => {
                const response = await request(app)
                    .get(`/api/auth/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${userToken}`)
                    .expect(200);

                expect(response.body.user).toHaveProperty('id', createdUserId);
            });

            it('should return 404 for non-existent user', async () => {
                await request(app)
                    .get('/api/auth/users/99999')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(404);
            });
        });

        describe('PUT /api/auth/users/:id', () => {
            it('should update user by id for admin', async () => {
                const updateData = {
                    is_verified: true,
                    is_active: false,
                    role: 'admin'
                };

                const response = await request(app)
                    .put(`/api/auth/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updateData)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'User updated successfully.');
                expect(response.body.user).toHaveProperty('is_verified', true);
                expect(response.body.user).toHaveProperty('is_active', false);
                expect(response.body.user).toHaveProperty('role', 'admin');
            });

            it('should return 403 for non-admin user trying to update different user', async () => {
                // First, revert the user back to regular user role for this test
                await request(app)
                    .put(`/api/auth/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ role: 'user' })
                    .expect(200);

                // Now test that non-admin user can't update different user
                await request(app)
                    .put(`/api/auth/users/${createdAdminId}`)
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ is_verified: true })
                    .expect(403);
            });
        });

        describe('DELETE /api/auth/users/:id', () => {
            it('should return 400 when admin tries to delete themselves', async () => {
                const response = await request(app)
                    .delete(`/api/auth/users/${createdAdminId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(400);

                expect(response.body).toHaveProperty('error', 'Cannot delete your own account.');
            });

            it('should return 403 for non-admin user trying to delete others', async () => {
                // Ensure user is regular user, not admin (in case previous tests changed the role)
                await request(app)
                    .put(`/api/auth/users/${createdUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ role: 'user' })
                    .expect(200);

                // Test that non-admin user can't delete others
                await request(app)
                    .delete(`/api/auth/users/${createdAdminId}`)
                    .set('Authorization', `Bearer ${userToken}`)
                    .expect(403);
            });
        });
    });

    describe('Password Reset Flow', () => {
        it('should request password reset successfully', async () => {
            const response = await request(app)
                .post('/api/auth/request-password-reset')
                .send({ email: testUser.email })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'If the email exists, a password reset link has been sent.');
        });

        it('should return same message for non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/request-password-reset')
                .send({ email: 'nonexistent' + Date.now() + '@example.com' })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'If the email exists, a password reset link has been sent.');
        });
    });

    describe('Boolean Conversion Tests', () => {
        it('should return proper boolean values in API responses', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            // Verify boolean fields are actual booleans, not integers
            expect(typeof response.body.user.is_verified).toBe('boolean');
            expect(typeof response.body.user.is_active).toBe('boolean');
        });

        it('should handle boolean input in admin updates', async () => {
            const response = await request(app)
                .put(`/api/auth/users/${createdUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    is_verified: true,
                    is_active: true
                })
                .expect(200);

            expect(response.body.user.is_verified).toBe(true);
            expect(response.body.user.is_active).toBe(true);
            expect(typeof response.body.user.is_verified).toBe('boolean');
            expect(typeof response.body.user.is_active).toBe('boolean');
        });
    });
});