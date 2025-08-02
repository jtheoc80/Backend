const request = require('supertest');
const app = require('../app');

// Set test environment
process.env.NODE_ENV = 'test';

describe('ValveChain API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ValveChain Sidecar API running'
      });
    });
  });

  describe('POST /api/register-valve', () => {
    it('should register a valve successfully', async () => {
      const valveData = {
        serialNumber: 'VALVE-001',
        details: 'High-pressure safety valve'
      };

      const response = await request(app)
        .post('/api/register-valve')
        .send(valveData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: 'mock-tx-hash'
      });
    });

    it('should return 400 if serialNumber is missing', async () => {
      const valveData = {
        details: 'High-pressure safety valve'
      };

      const response = await request(app)
        .post('/api/register-valve')
        .send(valveData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and details required'
      });
    });

    it('should return 400 if details is missing', async () => {
      const valveData = {
        serialNumber: 'VALVE-001'
      };

      const response = await request(app)
        .post('/api/register-valve')
        .send(valveData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and details required'
      });
    });

    it('should return 400 if both serialNumber and details are missing', async () => {
      const response = await request(app)
        .post('/api/register-valve')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and details required'
      });
    });
  });

  describe('POST /api/transfer-valve', () => {
    it('should transfer a valve successfully', async () => {
      const transferData = {
        serialNumber: 'VALVE-001',
        to: '0x742d35Cc6635Bc0532E3D35DEA8DC3A2B6320e17'
      };

      const response = await request(app)
        .post('/api/transfer-valve')
        .send(transferData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: 'mock-tx-hash'
      });
    });

    it('should return 400 if serialNumber is missing', async () => {
      const transferData = {
        to: '0x742d35Cc6635Bc0532E3D35DEA8DC3A2B6320e17'
      };

      const response = await request(app)
        .post('/api/transfer-valve')
        .send(transferData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and to required'
      });
    });

    it('should return 400 if to address is missing', async () => {
      const transferData = {
        serialNumber: 'VALVE-001'
      };

      const response = await request(app)
        .post('/api/transfer-valve')
        .send(transferData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and to required'
      });
    });
  });

  describe('POST /api/maintenance', () => {
    it('should log maintenance successfully', async () => {
      const maintenanceData = {
        serialNumber: 'VALVE-001',
        description: 'Routine pressure test',
        reportHash: '0xabc123def456'
      };

      const response = await request(app)
        .post('/api/maintenance')
        .send(maintenanceData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: 'mock-tx-hash'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const maintenanceData = {
        serialNumber: 'VALVE-001'
        // missing description and reportHash
      };

      const response = await request(app)
        .post('/api/maintenance')
        .send(maintenanceData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, description, and reportHash required'
      });
    });
  });

  describe('POST /api/repair-request', () => {
    it('should create a repair request successfully', async () => {
      const repairData = {
        serialNumber: 'VALVE-001',
        contractor: '0x742d35Cc6635Bc0532E3D35DEA8DC3A2B6320e17',
        amountEth: '0.1'
      };

      const response = await request(app)
        .post('/api/repair-request')
        .send(repairData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: 'mock-tx-hash'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const repairData = {
        serialNumber: 'VALVE-001'
        // missing contractor and amountEth
      };

      const response = await request(app)
        .post('/api/repair-request')
        .send(repairData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, contractor, and amountEth required'
      });
    });
  });

  describe('POST /api/repair', () => {
    it('should log repair successfully', async () => {
      const repairData = {
        serialNumber: 'VALVE-001',
        preTestHash: '0xpre123',
        repairHash: '0xrepair456',
        postTestHash: '0xpost789'
      };

      const response = await request(app)
        .post('/api/repair')
        .send(repairData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: 'mock-tx-hash'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const repairData = {
        serialNumber: 'VALVE-001',
        preTestHash: '0xpre123'
        // missing repairHash and postTestHash
      };

      const response = await request(app)
        .post('/api/repair')
        .send(repairData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, preTestHash, repairHash, and postTestHash required'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/register-valve')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});