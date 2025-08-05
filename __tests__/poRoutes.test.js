const request = require('supertest');
const express = require('express');
const poRoutes = require('../poRoutes');
const PurchaseOrder = require('../poModel');
const { generateToken } = require('../authMiddleware');

// Mock the database and models
jest.mock('../poModel');
jest.mock('../logActivity', () => jest.fn());
jest.mock('../userModel');

// Mock the User model for authentication
const User = require('../userModel');
User.findById = jest.fn();

// Create test app
const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api', poRoutes);
    return app;
};

describe('PO Routes', () => {
    let app;
    let mockUser;
    let authToken;

    beforeEach(() => {
        app = createTestApp();
        mockUser = {
            id: 1,
            username: 'testuser',
            role: 'admin'
        };
        authToken = generateToken(mockUser.id, mockUser.role);
        
        // Mock User.findById to return mockUser for authentication
        User.findById.mockResolvedValue(mockUser);
        
        // Clear all mocks
        jest.clearAllMocks();
        User.findById.mockResolvedValue(mockUser); // Re-set after clearing
    });

    describe('POST /api/pos - Create Purchase Order', () => {
        const validPOData = {
            po_number: 'PO-2024-001',
            manufacturer_id: 'mfg001',
            distributor_id: 'dist001',
            total_amount: 1000.50,
            currency: 'USD',
            items: [
                {
                    valve_id: 'valve-001',
                    quantity: 2,
                    unit_price: 500.25,
                    description: 'Ball Valve 1/2"'
                }
            ],
            notes: 'Urgent order for Q1 delivery'
        };

        it('should create a purchase order successfully with valid data', async () => {
            const mockPO = { id: 1, ...validPOData, status: 'pending' };
            PurchaseOrder.findByPONumber.mockResolvedValue(null);
            PurchaseOrder.create.mockResolvedValue(mockPO);

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validPOData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Purchase order created successfully');
            expect(response.body.purchaseOrder).toEqual(mockPO);
            expect(PurchaseOrder.create).toHaveBeenCalledWith(validPOData);
        });

        it('should return 400 for missing required fields', async () => {
            const invalidData = { ...validPOData };
            delete invalidData.po_number;

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 for empty items array', async () => {
            const invalidData = { ...validPOData, items: [] };

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Items must be a non-empty array');
        });

        it('should return 400 for non-array items', async () => {
            const invalidData = { ...validPOData, items: 'not-an-array' };

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Items must be a non-empty array');
        });

        it('should return 400 for negative total amount', async () => {
            const invalidData = { ...validPOData, total_amount: -100 };

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Total amount must be greater than 0');
        });

        it('should return 409 for duplicate PO number', async () => {
            const existingPO = { id: 999, po_number: validPOData.po_number };
            PurchaseOrder.findByPONumber.mockResolvedValue(existingPO);

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validPOData);

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Purchase order number already exists');
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .post('/api/pos')
                .send(validPOData);

            expect(response.status).toBe(401);
        });

        it('should handle database errors gracefully', async () => {
            PurchaseOrder.findByPONumber.mockResolvedValue(null);
            PurchaseOrder.create.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/pos')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validPOData);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to create purchase order');
        });
    });

    describe('GET /api/pos/:id - Fetch Purchase Order by ID', () => {
        it('should fetch purchase order by valid ID', async () => {
            const mockPO = {
                id: 1,
                po_number: 'PO-2024-001',
                status: 'pending',
                total_amount: 1000.50
            };
            PurchaseOrder.findById.mockResolvedValue(mockPO);

            const response = await request(app)
                .get('/api/pos/1')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.purchaseOrder).toEqual(mockPO);
            expect(PurchaseOrder.findById).toHaveBeenCalledWith(1);
        });

        it('should return 400 for invalid ID', async () => {
            const response = await request(app)
                .get('/api/pos/invalid')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid purchase order ID');
        });

        it('should return 404 for non-existent PO', async () => {
            PurchaseOrder.findById.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/pos/999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Purchase order not found');
        });

        it('should handle database errors', async () => {
            PurchaseOrder.findById.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/pos/1')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to retrieve purchase order');
        });
    });

    describe('GET /api/pos/number/:po_number - Fetch Purchase Order by Number', () => {
        it('should fetch purchase order by PO number', async () => {
            const mockPO = {
                id: 1,
                po_number: 'PO-2024-001',
                status: 'pending'
            };
            PurchaseOrder.findByPONumber.mockResolvedValue(mockPO);

            const response = await request(app)
                .get('/api/pos/number/PO-2024-001')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.purchaseOrder).toEqual(mockPO);
            expect(PurchaseOrder.findByPONumber).toHaveBeenCalledWith('PO-2024-001');
        });

        it('should return 404 for non-existent PO number', async () => {
            PurchaseOrder.findByPONumber.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/pos/number/NONEXISTENT')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Purchase order not found');
        });
    });

    describe('GET /api/pos - List Purchase Orders', () => {
        it('should list purchase orders with default pagination', async () => {
            const mockPOs = [
                { id: 1, po_number: 'PO-2024-001', status: 'pending' },
                { id: 2, po_number: 'PO-2024-002', status: 'approved' }
            ];
            PurchaseOrder.findAll.mockResolvedValue(mockPOs);
            PurchaseOrder.getCount.mockResolvedValue(2);

            const response = await request(app)
                .get('/api/pos')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.purchaseOrders).toEqual(mockPOs);
            expect(response.body.pagination).toEqual({
                currentPage: 1,
                totalPages: 1,
                totalCount: 2,
                limit: 10,
                hasNext: false,
                hasPrev: false
            });
        });

        it('should handle custom pagination parameters', async () => {
            const mockPOs = [{ id: 1, po_number: 'PO-2024-001' }];
            PurchaseOrder.findAll.mockResolvedValue(mockPOs);
            PurchaseOrder.getCount.mockResolvedValue(15);

            const response = await request(app)
                .get('/api/pos?page=2&limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.pagination.currentPage).toBe(2);
            expect(response.body.pagination.limit).toBe(5);
            expect(response.body.pagination.totalPages).toBe(3);
            expect(response.body.pagination.hasNext).toBe(true);
            expect(response.body.pagination.hasPrev).toBe(true);
        });

        it('should filter by status', async () => {
            const mockPOs = [{ id: 1, status: 'approved' }];
            PurchaseOrder.findAll.mockResolvedValue(mockPOs);
            PurchaseOrder.getCount.mockResolvedValue(1);

            const response = await request(app)
                .get('/api/pos?status=approved')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(PurchaseOrder.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'approved' })
            );
        });

        it('should return 400 for invalid pagination parameters', async () => {
            const response = await request(app)
                .get('/api/pos?page=0&limit=101')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid pagination parameters');
        });

        it('should return 400 for invalid sort field', async () => {
            const response = await request(app)
                .get('/api/pos?sortBy=invalid_field')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid sort field');
        });

        it('should return 400 for invalid status filter', async () => {
            const response = await request(app)
                .get('/api/pos?status=invalid_status')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid status');
        });
    });

    describe('POST /api/pos/:id/approve - Approve Purchase Order', () => {
        it('should approve purchase order successfully', async () => {
            const mockPO = {
                id: 1,
                po_number: 'PO-2024-001',
                status: 'approved',
                approved_by: mockUser.id
            };
            PurchaseOrder.approve.mockResolvedValue(mockPO);

            const response = await request(app)
                .post('/api/pos/1/approve')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Purchase order approved successfully');
            expect(response.body.purchaseOrder).toEqual(mockPO);
            expect(PurchaseOrder.approve).toHaveBeenCalledWith(1, mockUser.id);
        });

        it('should return 400 for invalid PO ID', async () => {
            const response = await request(app)
                .post('/api/pos/invalid/approve')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid purchase order ID');
        });

        it('should return 404 for non-existent or already processed PO', async () => {
            PurchaseOrder.approve.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/pos/999/approve')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Purchase order not found or already processed');
        });

        it('should handle database errors', async () => {
            PurchaseOrder.approve.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/pos/1/approve')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to approve purchase order');
        });
    });

    describe('POST /api/pos/:id/reject - Reject Purchase Order', () => {
        it('should reject purchase order successfully', async () => {
            const mockPO = {
                id: 1,
                po_number: 'PO-2024-001',
                status: 'rejected',
                approved_by: mockUser.id
            };
            PurchaseOrder.reject.mockResolvedValue(mockPO);

            const response = await request(app)
                .post('/api/pos/1/reject')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notes: 'Insufficient budget' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Purchase order rejected successfully');
            expect(response.body.purchaseOrder).toEqual(mockPO);
            expect(PurchaseOrder.reject).toHaveBeenCalledWith(1, mockUser.id, 'Insufficient budget');
        });

        it('should reject without notes', async () => {
            const mockPO = { id: 1, status: 'rejected' };
            PurchaseOrder.reject.mockResolvedValue(mockPO);

            const response = await request(app)
                .post('/api/pos/1/reject')
                .set('Authorization', `Bearer ${authToken}`)
                .send({}); // Send empty object instead of nothing

            expect(response.status).toBe(200);
            expect(PurchaseOrder.reject).toHaveBeenCalledWith(1, mockUser.id, undefined);
        });
    });

    describe('PUT /api/pos/:id - Update Purchase Order', () => {
        const updateData = {
            total_amount: 1500.00,
            notes: 'Updated delivery requirements'
        };

        it('should update purchase order successfully', async () => {
            const mockPO = { id: 1, ...updateData };
            PurchaseOrder.update.mockResolvedValue(mockPO);

            const response = await request(app)
                .put('/api/pos/1')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Purchase order updated successfully');
            expect(response.body.purchaseOrder).toEqual(mockPO);
            expect(PurchaseOrder.update).toHaveBeenCalledWith(1, updateData);
        });

        it('should return 400 for invalid update data', async () => {
            const response = await request(app)
                .put('/api/pos/1')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ invalid_field: 'value' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('No valid fields to update');
        });

        it('should return 400 for negative total amount', async () => {
            const response = await request(app)
                .put('/api/pos/1')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ total_amount: -100 });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Total amount must be greater than 0');
        });

        it('should return 400 for invalid items array', async () => {
            const response = await request(app)
                .put('/api/pos/1')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ items: [] });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Items must be a non-empty array');
        });

        it('should return 404 for non-existent or non-editable PO', async () => {
            PurchaseOrder.update.mockResolvedValue(null);

            const response = await request(app)
                .put('/api/pos/999')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Purchase order not found or not in editable state');
        });
    });

    describe('Authentication and Authorization', () => {
        it('should require authentication for all endpoints', async () => {
            const endpoints = [
                { method: 'post', path: '/api/pos' },
                { method: 'get', path: '/api/pos' },
                { method: 'get', path: '/api/pos/1' },
                { method: 'put', path: '/api/pos/1' },
                { method: 'post', path: '/api/pos/1/approve' }
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)[endpoint.method](endpoint.path);
                expect(response.status).toBe(401);
            }
        });

        it('should reject invalid tokens', async () => {
            const response = await request(app)
                .get('/api/pos')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
        });
    });
});