const request = require('supertest');
const express = require('express');
const valveGPTRoutes = require('../routes/valveGPT');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api', valveGPTRoutes);

describe('ValveGPT Routes', () => {
    describe('POST /api/valvegpt/query', () => {
        test('should return 400 when question is missing', async () => {
            const response = await request(app)
                .post('/api/valvegpt/query')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Question is required and must be a non-empty string');
        });
        
        test('should return 400 when question is empty string', async () => {
            const response = await request(app)
                .post('/api/valvegpt/query')
                .send({ question: '' });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Question is required and must be a non-empty string');
        });
        
        test('should return 400 when question is not a string', async () => {
            const response = await request(app)
                .post('/api/valvegpt/query')
                .send({ question: 123 });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Question is required and must be a non-empty string');
        });
        
        // Note: We can't test the successful case without valid API keys
        // and would need to mock the external services for full testing
    });
});