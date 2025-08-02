const request = require('supertest');
const express = require('express');

// Mock fs module to avoid reading actual files during testing
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('[]')
}));

// Mock ethers module
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Wallet: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => ({
      registerValve: jest.fn(),
      logMaintenance: jest.fn(),
      transferValve: jest.fn(),
      requestRepair: jest.fn(),
      logRepair: jest.fn()
    })),
    parseEther: jest.fn().mockImplementation((amount) => amount)
  }
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Set up environment variables
process.env.PRIVATE_KEY = 'mock-private-key';
process.env.RPC_URL = 'http://localhost:8545';
process.env.CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
process.env.PORT = '3000';

describe('ValveChain API Endpoints', () => {
  let app;
  let mockContract;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock contract instance that we can control
    mockContract = {
      registerValve: jest.fn(),
      logMaintenance: jest.fn(),
      transferValve: jest.fn(),
      requestRepair: jest.fn(),
      logRepair: jest.fn()
    };

    // Override the ethers.Contract constructor to return our mock
    const { ethers } = require('ethers');
    ethers.Contract.mockReturnValue(mockContract);
    
    // Import app after mocking (to ensure mocks are applied)
    delete require.cache[require.resolve('../index.js')];
    app = require('../index.js');
  });

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
    it('should register a valve with valid input', async () => {
      const mockTx = {
        hash: '0xabcdef123456',
        wait: jest.fn().mockResolvedValue({})
      };
      mockContract.registerValve.mockResolvedValue(mockTx);

      const valveData = {
        serialNumber: 'VLV-001',
        details: 'High-pressure valve for gas line'
      };

      const response = await request(app)
        .post('/api/register-valve')
        .send(valveData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: '0xabcdef123456'
      });

      expect(mockContract.registerValve).toHaveBeenCalledWith(
        'VLV-001',
        'High-pressure valve for gas line'
      );
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('should return 400 error when serialNumber is missing', async () => {
      const response = await request(app)
        .post('/api/register-valve')
        .send({ details: 'Some details' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and details required'
      });

      expect(mockContract.registerValve).not.toHaveBeenCalled();
    });

    it('should return 400 error when details is missing', async () => {
      const response = await request(app)
        .post('/api/register-valve')
        .send({ serialNumber: 'VLV-001' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and details required'
      });

      expect(mockContract.registerValve).not.toHaveBeenCalled();
    });

    it('should return 400 error when both fields are missing', async () => {
      const response = await request(app)
        .post('/api/register-valve')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber and details required'
      });

      expect(mockContract.registerValve).not.toHaveBeenCalled();
    });

    it('should handle blockchain errors gracefully', async () => {
      mockContract.registerValve.mockRejectedValue(new Error('Transaction failed'));

      const valveData = {
        serialNumber: 'VLV-001',
        details: 'High-pressure valve'
      };

      const response = await request(app)
        .post('/api/register-valve')
        .send(valveData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Transaction failed'
      });
    });
  });

  describe('POST /api/maintenance', () => {
    it('should log maintenance with valid input', async () => {
      const mockTx = {
        hash: '0xmaintenance123',
        wait: jest.fn().mockResolvedValue({})
      };
      mockContract.logMaintenance.mockResolvedValue(mockTx);

      const maintenanceData = {
        serialNumber: 'VLV-001',
        description: 'Routine valve inspection',
        reportHash: '0x123456789abcdef'
      };

      const response = await request(app)
        .post('/api/maintenance')
        .send(maintenanceData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        txHash: '0xmaintenance123'
      });

      expect(mockContract.logMaintenance).toHaveBeenCalledWith(
        'VLV-001',
        'Routine valve inspection',
        '0x123456789abcdef'
      );
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('should return 400 error when serialNumber is missing', async () => {
      const response = await request(app)
        .post('/api/maintenance')
        .send({
          description: 'Maintenance work',
          reportHash: '0x123456'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, description, and reportHash required'
      });

      expect(mockContract.logMaintenance).not.toHaveBeenCalled();
    });

    it('should return 400 error when description is missing', async () => {
      const response = await request(app)
        .post('/api/maintenance')
        .send({
          serialNumber: 'VLV-001',
          reportHash: '0x123456'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, description, and reportHash required'
      });

      expect(mockContract.logMaintenance).not.toHaveBeenCalled();
    });

    it('should return 400 error when reportHash is missing', async () => {
      const response = await request(app)
        .post('/api/maintenance')
        .send({
          serialNumber: 'VLV-001',
          description: 'Maintenance work'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, description, and reportHash required'
      });

      expect(mockContract.logMaintenance).not.toHaveBeenCalled();
    });

    it('should return 400 error when all fields are missing', async () => {
      const response = await request(app)
        .post('/api/maintenance')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'serialNumber, description, and reportHash required'
      });

      expect(mockContract.logMaintenance).not.toHaveBeenCalled();
    });

    it('should handle blockchain errors gracefully', async () => {
      mockContract.logMaintenance.mockRejectedValue(new Error('Smart contract error'));

      const maintenanceData = {
        serialNumber: 'VLV-001',
        description: 'Routine maintenance',
        reportHash: '0x123456'
      };

      const response = await request(app)
        .post('/api/maintenance')
        .send(maintenanceData)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Smart contract error'
      });
    });
  });
});