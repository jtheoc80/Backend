const request = require('supertest');
const express = require('express');
const valveReturnRoutes = require('../valveReturnRoutes');
const Valve = require('../valveModel');
const transactionFeeService = require('../transactionFeeService');
const logActivity = require('../logActivity');

// Mock dependencies
jest.mock('../valveModel');
jest.mock('../transactionFeeService');
jest.mock('../logActivity');
jest.mock('../authMiddleware', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, role: 'admin', username: 'testuser' };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api', valveReturnRoutes);

describe('Valve Return Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/valve-returns', () => {
        const validReturnData = {
            valveId: 1,
            returnType: 'damaged',
            returnReason: 'Valve is damaged beyond repair',
            returnFee: 100
        };

        it('should create return request successfully', async () => {
            const mockValve = {
                id: 1,
                valve_id: 'VLV001',
                is_burned: false
            };

            const mockReturnRequest = {
                id: 1,
                valve_id: 1,
                return_type: 'damaged',
                status: 'pending'
            };

            Valve.findById.mockResolvedValue(mockValve);
            Valve.createReturnRequest.mockResolvedValue(mockReturnRequest);
            logActivity.mockResolvedValue();

            const response = await request(app)
                .post('/api/valve-returns')
                .send(validReturnData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Return request created successfully');
            expect(response.body.returnRequest).toEqual(mockReturnRequest);
            expect(Valve.createReturnRequest).toHaveBeenCalledWith({
                valveId: 1,
                returnType: 'damaged',
                returnedById: 'testuser',
                returnedByType: 'manufacturer', // Admins default to manufacturer
                returnReason: 'Valve is damaged beyond repair',
                returnFee: 100
            });
        });

        it('should reject return request for burned valve', async () => {
            const mockValve = {
                id: 1,
                valve_id: 'VLV001',
                is_burned: true
            };

            Valve.findById.mockResolvedValue(mockValve);

            const response = await request(app)
                .post('/api/valve-returns')
                .send(validReturnData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Cannot return a burned valve');
        });

        it('should reject invalid return type', async () => {
            const invalidData = { ...validReturnData, returnType: 'invalid_type' };

            const response = await request(app)
                .post('/api/valve-returns')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid return type');
            expect(response.body.validTypes).toContain('damaged');
        });

        it('should reject missing required fields', async () => {
            const incompleteData = { valveId: 1 };

            const response = await request(app)
                .post('/api/valve-returns')
                .send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields: valveId, returnType, returnReason');
        });
    });

    describe('GET /api/valve-returns', () => {
        it('should get return requests with pagination', async () => {
            const mockReturnRequests = [
                { id: 1, valve_id: 1, status: 'pending' },
                { id: 2, valve_id: 2, status: 'approved_for_burn' }
            ];

            Valve.getReturnRequests.mockResolvedValue(mockReturnRequests);

            const response = await request(app)
                .get('/api/valve-returns?page=1&limit=10&status=pending');

            expect(response.status).toBe(200);
            expect(response.body.returnRequests).toEqual(mockReturnRequests);
            expect(response.body.pagination).toEqual({
                currentPage: 1,
                limit: 10
            });
            expect(Valve.getReturnRequests).toHaveBeenCalledWith(
                { status: 'pending' },
                1,
                10
            );
        });
    });

    describe('POST /api/valve-returns/:returnId/approve', () => {
        const approvalData = {
            approvalType: 'approved_for_burn',
            adminNotes: 'Valve is beyond repair'
        };

        it('should approve return request successfully', async () => {
            const mockReturnRequest = {
                id: 1,
                valve_id: 1,
                status: 'pending'
            };

            const mockUpdatedRequest = {
                ...mockReturnRequest,
                status: 'approved_for_burn',
                approved_by: 1
            };

            Valve.getReturnRequest.mockResolvedValue(mockReturnRequest);
            Valve.approveReturnRequest.mockResolvedValue(mockUpdatedRequest);
            Valve.generateTransactionHash.mockReturnValue('0xabcdef123456');
            logActivity.mockResolvedValue();

            const response = await request(app)
                .post('/api/valve-returns/1/approve')
                .send(approvalData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Return request approved for burn successfully');
            expect(response.body.returnRequest).toEqual(mockUpdatedRequest);
            expect(response.body.blockchainTransaction).toBe('0xabcdef123456');
        });

        it('should reject approval by non-admin', async () => {
            const mockReturnRequest = {
                id: 1,
                valve_id: 1,
                status: 'pending'
            };

            // Mock auth to return non-admin user
            jest.doMock('../authMiddleware', () => ({
                authenticate: (req, res, next) => {
                    req.user = { id: 2, role: 'user', username: 'regularuser' };
                    next();
                }
            }));

            Valve.getReturnRequest.mockResolvedValue(mockReturnRequest);
            
            // Create separate app with non-admin middleware
            const nonAdminApp = express();
            nonAdminApp.use(express.json());
            nonAdminApp.use((req, res, next) => {
                req.user = { id: 2, role: 'user', username: 'regularuser' };
                next();
            });
            nonAdminApp.use('/api', require('../valveReturnRoutes'));

            const response = await request(nonAdminApp)
                .post('/api/valve-returns/1/approve')
                .send(approvalData);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Only administrators can approve return requests');
        });

        it('should reject invalid approval type', async () => {
            const invalidApproval = {
                approvalType: 'invalid_approval',
                adminNotes: 'Test'
            };

            const response = await request(app)
                .post('/api/valve-returns/1/approve')
                .send(invalidApproval);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid approval type');
        });
    });

    describe('POST /api/valves/:valveId/burn', () => {
        const burnData = {
            burnReason: 'Valve is damaged beyond repair',
            returnFee: 100
        };

        it('should burn valve token successfully', async () => {
            const mockValve = {
                id: 1,
                valve_id: 'VLV001',
                token_id: 'VLV123456',
                is_burned: false,
                burnToken: jest.fn().mockResolvedValue({ success: true }),
                toJSON: jest.fn().mockReturnValue({ id: 1, valve_id: 'VLV001' })
            };

            const mockFeeCalc = {
                feeAmount: 0.5,
                feeRate: 0.005,
                feeWalletAddress: '0xFEEWALLET123'
            };

            Valve.findById.mockResolvedValue(mockValve);
            Valve.generateTransactionHash.mockReturnValue('0xburnhash123');
            transactionFeeService.calculateFee.mockReturnValue(mockFeeCalc);
            transactionFeeService.recordFeePayment.mockResolvedValue({ success: true });
            logActivity.mockResolvedValue();

            const response = await request(app)
                .post('/api/valves/1/burn')
                .send(burnData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valve token burned successfully');
            expect(mockValve.burnToken).toHaveBeenCalledWith(1, burnData.burnReason);
        });

        it('should reject burning already burned valve', async () => {
            const mockValve = {
                id: 1,
                valve_id: 'VLV001',
                is_burned: true
            };

            Valve.findById.mockResolvedValue(mockValve);

            const response = await request(app)
                .post('/api/valves/1/burn')
                .send(burnData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Valve is already burned');
        });

        it('should reject burn by non-admin', async () => {
            // Create separate app with different user role
            const nonAdminApp = express();
            nonAdminApp.use(express.json());
            nonAdminApp.use((req, res, next) => {
                req.user = { id: 2, role: 'user', username: 'regularuser' };
                next();
            });
            nonAdminApp.use('/api', valveReturnRoutes);

            const response = await request(nonAdminApp)
                .post('/api/valves/1/burn')
                .send(burnData);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Only administrators can burn valve tokens');
        });
    });

    describe('POST /api/valves/:valveId/restore', () => {
        const restoreData = {
            newOwnerId: 'mfg001',
            newOwnerType: 'manufacturer',
            restoreReason: 'Valve can be resold after refurbishment',
            returnFee: 50
        };

        it('should restore valve ownership successfully', async () => {
            const mockValve = {
                id: 1,
                valve_id: 'VLV001',
                token_id: 'VLV123456',
                is_burned: true,
                restoreOwnership: jest.fn().mockResolvedValue({ success: true }),
                toJSON: jest.fn().mockReturnValue({ id: 1, valve_id: 'VLV001' })
            };

            const mockFeeCalc = {
                feeAmount: 0.25,
                feeRate: 0.005,
                feeWalletAddress: '0xFEEWALLET123'
            };

            Valve.findById.mockResolvedValue(mockValve);
            Valve.generateTransactionHash.mockReturnValue('0xrestorehash123');
            transactionFeeService.calculateFee.mockReturnValue(mockFeeCalc);
            transactionFeeService.recordFeePayment.mockResolvedValue({ success: true });
            logActivity.mockResolvedValue();

            const response = await request(app)
                .post('/api/valves/1/restore')
                .send(restoreData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Valve ownership restored successfully');
            expect(mockValve.restoreOwnership).toHaveBeenCalledWith(
                'mfg001',
                'manufacturer',
                1,
                'Valve can be resold after refurbishment'
            );
        });

        it('should reject restoring non-burned valve', async () => {
            const mockValve = {
                id: 1,
                valve_id: 'VLV001',
                is_burned: false
            };

            Valve.findById.mockResolvedValue(mockValve);

            const response = await request(app)
                .post('/api/valves/1/restore')
                .send(restoreData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Cannot restore ownership: valve is not burned');
        });

        it('should reject invalid owner type', async () => {
            const invalidRestoreData = {
                ...restoreData,
                newOwnerType: 'invalid_type'
            };

            const response = await request(app)
                .post('/api/valves/1/restore')
                .send(invalidRestoreData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid owner type. Must be manufacturer or distributor');
        });
    });

    describe('Error handling', () => {
        it('should handle database errors gracefully', async () => {
            Valve.findById.mockRejectedValue(new Error('Database connection failed'));
            logActivity.mockResolvedValue();

            const response = await request(app)
                .post('/api/valve-returns')
                .send({
                    valveId: 1,
                    returnType: 'damaged',
                    returnReason: 'Test reason'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to create return request');
            expect(response.body.details).toBe('Database connection failed');
        });
    });
});