const request = require('supertest');
const path = require('path');

// Set up test database
process.env.NODE_ENV = 'test';
const dbPath = path.join(__dirname, '..', 'test.db');
process.env.DB_PATH = dbPath;

const app = require('../index');
const Valve = require('../valveModel');
const Manufacturer = require('../manufacturerModel');
const Distributor = require('../distributorModel');
const { db } = require('../database');

describe('Valve Ownership Transfer Limits', () => {
    let testManufacturer;
    let testDistributor1;
    let testDistributor2;
    let testValve;
    let testTokenId;

    beforeAll(async () => {
        // Clear test database
        await db.run('DELETE FROM valve_ownership_transfers');
        await db.run('DELETE FROM valves');
        await db.run('DELETE FROM manufacturers');
        await db.run('DELETE FROM distributors');

        // Create test manufacturer using direct database insert
        await db.run(`INSERT INTO manufacturers (id, name, wallet_address, permissions, is_active) 
                     VALUES (?, ?, ?, ?, ?)`, [
            'test-mfg-001',
            'Test Manufacturer',
            '0x1234567890123456789012345678901234567890',
            'tokenize_valves,manage_distributors',
            1
        ]);
        testManufacturer = await Manufacturer.findById('test-mfg-001');

        // Create test distributors
        testDistributor1 = await Distributor.create({
            id: 'test-dist-001',
            name: 'Test Distributor 1',
            wallet_address: '0x1111111111111111111111111111111111111111'
        });

        testDistributor2 = await Distributor.create({
            id: 'test-dist-002',
            name: 'Test Distributor 2',
            wallet_address: '0x2222222222222222222222222222222222222222'
        });

        // Create test valve
        testTokenId = Valve.generateTokenId();
        testValve = await Valve.create({
            token_id: testTokenId,
            valve_id: `TEST-${testTokenId}`,
            serial_number: 'TEST-SERIAL-001',
            type: 'ball_valve',
            manufacturer_id: testManufacturer.id,
            model: 'Test Model',
            diameter: 2.5,
            pressure: 150,
            temperature: 200,
            material: 'Stainless Steel',
            connection_type: 'Flanged',
            flow_coefficient: 100,
            manufacture_date: '2024-01-01',
            warranty_months: 24,
            certifications: ['ISO 9001'],
            transaction_hash: '0xtest123'
        });
    });

    afterAll(async () => {
        // Clean up test database
        await db.run('DELETE FROM valve_ownership_transfers');
        await db.run('DELETE FROM valves');
        await db.run('DELETE FROM manufacturers');
        await db.run('DELETE FROM distributors');
    });

    describe('Manufacturer Assignment Limit', () => {
        test('should prevent duplicate valve serial number assignment', async () => {
            const duplicateValveData = {
                valveDetails: {
                    serialNumber: 'TEST-SERIAL-001', // Same as existing valve
                    type: 'gate_valve',
                    manufacturer: 'Test Manufacturer',
                    model: 'Another Model',
                    specifications: {
                        diameter: 3.0,
                        pressure: 200,
                        temperature: 250,
                        material: 'Carbon Steel',
                        connectionType: 'Threaded',
                        flowCoefficient: 150
                    },
                    manufactureDate: '2024-02-01',
                    warrantyMonths: 12,
                    certifications: ['ANSI']
                },
                manufacturerId: testManufacturer.id
            };

            const response = await request(app)
                .post('/api/manufacturer/tokenize-valve')
                .send(duplicateValveData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already been tokenized');
            expect(response.body.errors).toContain('Duplicate serial number');
        });
    });

    describe('Manufacturer Transfer Limit', () => {
        test('should allow first manufacturer-to-distributor transfer', async () => {
            // Mock the hasRelationshipWith method to return true
            const originalMethod = testDistributor1.hasRelationshipWith;
            testDistributor1.hasRelationshipWith = jest.fn().mockResolvedValue(true);
            
            // Mock blockchain service to avoid actual blockchain calls
            const blockchainService = require('../blockchainService');
            const originalTransfer = blockchainService.transferValveOwnership;
            blockchainService.transferValveOwnership = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0xmockhash123',
                blockNumber: 12345
            });

            const transferData = {
                valveTokenId: testTokenId,
                distributorId: testDistributor1.id,
                manufacturerId: testManufacturer.id,
                reason: 'Initial distribution'
            };

            const response = await request(app)
                .post('/api/valves/transfer-ownership')
                .send(transferData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('successfully');

            // Restore original functions
            testDistributor1.hasRelationshipWith = originalMethod;
            blockchainService.transferValveOwnership = originalTransfer;
        });

        test('should prevent second manufacturer-to-distributor transfer', async () => {
            // Try to transfer back to manufacturer first (for testing)
            const valve = await Valve.findByTokenId(testTokenId);
            await valve.transferOwnership(testManufacturer.id, 'manufacturer', 'test', 'Test reversal', true);

            const transferData = {
                valveTokenId: testTokenId,
                distributorId: testDistributor2.id,
                manufacturerId: testManufacturer.id,
                reason: 'Second attempt'
            };

            const response = await request(app)
                .post('/api/valves/transfer-ownership')
                .send(transferData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Manufacturer can only transfer ownership of a valve to a distributor once');
            expect(response.body.errorCode).toBe('MANUFACTURER_TRANSFER_LIMIT_EXCEEDED');
        });
    });

    describe('Distributor Transfer Limit', () => {
        test('should allow first distributor-to-distributor transfer', async () => {
            // Set valve back to distributor ownership for testing
            const valve = await Valve.findByTokenId(testTokenId);
            await valve.transferOwnership(testDistributor1.id, 'distributor', 'test', 'Test setup', true);

            // Mock blockchain service
            const blockchainService = require('../blockchainService');
            const originalTransfer = blockchainService.transferValveOwnership;
            blockchainService.transferValveOwnership = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0xmockhash456',
                blockNumber: 12346
            });

            const transferData = {
                valveTokenId: testTokenId,
                toDistributorId: testDistributor2.id,
                fromDistributorId: testDistributor1.id,
                reason: 'First distributor transfer'
            };

            const response = await request(app)
                .post('/api/valves/transfer-to-distributor')
                .send(transferData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('successfully between distributors');

            // Restore original function
            blockchainService.transferValveOwnership = originalTransfer;
        });

        test('should allow second distributor-to-distributor transfer', async () => {
            // Mock blockchain service
            const blockchainService = require('../blockchainService');
            const originalTransfer = blockchainService.transferValveOwnership;
            blockchainService.transferValveOwnership = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0xmockhash789',
                blockNumber: 12347
            });

            const transferData = {
                valveTokenId: testTokenId,
                toDistributorId: testDistributor1.id,
                fromDistributorId: testDistributor2.id,
                reason: 'Second distributor transfer'
            };

            const response = await request(app)
                .post('/api/valves/transfer-to-distributor')
                .send(transferData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('successfully between distributors');

            // Restore original function
            blockchainService.transferValveOwnership = originalTransfer;
        });

        test('should prevent third distributor-to-distributor transfer', async () => {
            const transferData = {
                valveTokenId: testTokenId,
                toDistributorId: testDistributor2.id,
                fromDistributorId: testDistributor1.id,
                reason: 'Third attempt - should fail'
            };

            const response = await request(app)
                .post('/api/valves/transfer-to-distributor')
                .send(transferData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('combined total of two ownership transfers');
            expect(response.body.errorCode).toBe('DISTRIBUTOR_TRANSFER_LIMIT_EXCEEDED');
        });
    });

    describe('Global Transfer Cap', () => {
        test('should prevent transfers beyond global limit before plant', async () => {
            // At this point we should have 3 total transfers, reaching the global limit
            const valve = await Valve.findByTokenId(testTokenId);
            const totalTransfers = await valve.getTotalTransferCount();
            expect(totalTransfers).toBe(3);

            const transferData = {
                valveTokenId: testTokenId,
                toDistributorId: testDistributor2.id,
                fromDistributorId: testDistributor1.id,
                reason: 'Should be blocked by global limit'
            };

            const response = await request(app)
                .post('/api/valves/transfer-to-distributor')
                .send(transferData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('maximum of three ownership transfers');
            expect(response.body.errorCode).toBe('GLOBAL_TRANSFER_LIMIT_EXCEEDED');
        });
    });

    describe('Plant Transfer (Final State)', () => {
        test('should allow transfer to plant even at global limit', async () => {
            // Mock blockchain service
            const blockchainService = require('../blockchainService');
            const originalTransfer = blockchainService.transferValveOwnership;
            blockchainService.transferValveOwnership = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0xmockhashplant',
                blockNumber: 12348
            });

            const transferData = {
                valveTokenId: testTokenId,
                plantId: 'plant-001',
                currentOwnerId: testDistributor1.id,
                currentOwnerType: 'distributor',
                reason: 'Final installation at plant'
            };

            const response = await request(app)
                .post('/api/valves/transfer-to-plant')
                .send(transferData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('No further transfers are allowed');

            // Restore original function
            blockchainService.transferValveOwnership = originalTransfer;
        });

        test('should prevent any transfers once valve is owned by plant', async () => {
            const transferData = {
                valveTokenId: testTokenId,
                toDistributorId: testDistributor2.id,
                fromDistributorId: 'plant-001',
                reason: 'Should be blocked - plant ownership is final'
            };

            const response = await request(app)
                .post('/api/valves/transfer-to-distributor')
                .send(transferData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('No ownership transfers are allowed once a valve is transferred to a plant');
            expect(response.body.errorCode).toBe('PLANT_OWNERSHIP_FINAL');
        });
    });

    describe('Audit Trail', () => {
        test('should log all transfer attempts in audit trail', async () => {
            const valve = await Valve.findByTokenId(testTokenId);
            const history = await valve.getOwnershipHistory();

            // Should have all successful and blocked attempts logged
            expect(history.length).toBeGreaterThan(0);

            // Check for blocked attempts
            const blockedAttempts = history.filter(h => h.is_completed === 0);
            expect(blockedAttempts.length).toBeGreaterThan(0);

            // Check for successful attempts
            const successfulAttempts = history.filter(h => h.is_completed === 1);
            expect(successfulAttempts.length).toBeGreaterThan(0);

            // Check for specific blocked reasons
            const plantFinalBlocked = history.find(h => h.reason && h.reason.includes('PLANT_OWNERSHIP_FINAL'));
            expect(plantFinalBlocked).toBeDefined();
        });
    });

    describe('Validation Methods', () => {
        test('validateTransferLimits should return correct validation results', async () => {
            const valve = await Valve.findByTokenId(testTokenId);

            // Should be blocked for any transfer since it's owned by plant
            const validation = await valve.validateTransferLimits('distributor');
            expect(validation.canTransfer).toBe(false);
            expect(validation.errorCode).toBe('PLANT_OWNERSHIP_FINAL');
        });

        test('transfer count methods should return accurate counts', async () => {
            const valve = await Valve.findByTokenId(testTokenId);

            const totalTransfers = await valve.getTotalTransferCount();
            const manufacturerTransfers = await valve.getManufacturerTransferCount();
            const distributorTransfers = await valve.getDistributorTransferCount();

            expect(totalTransfers).toBeGreaterThan(0);
            expect(manufacturerTransfers).toBeGreaterThan(0);
            expect(distributorTransfers).toBeGreaterThan(0);

            // Should respect business rules
            expect(manufacturerTransfers).toBeLessThanOrEqual(1);
            expect(distributorTransfers).toBeLessThanOrEqual(2);
        });

        test('isOwnedByPlant should return correct status', async () => {
            const valve = await Valve.findByTokenId(testTokenId);
            expect(valve.isOwnedByPlant()).toBe(true);
        });
    });
});