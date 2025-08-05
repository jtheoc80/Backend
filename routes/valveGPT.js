const express = require('express');
const router = express.Router();
const { answerValveQuery } = require('../services/valveGPT/pipeline');

/**
 * POST /api/valvegpt/query
 * Answer a valve-related query using ValveGPT
 */
router.post('/valvegpt/query', async (req, res) => {
    console.log('ValveGPT route hit with body:', req.body);
    try {
        const { question } = req.body;
        
        // Validate input
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({
                error: 'Question is required and must be a non-empty string'
            });
        }
        
        // Process the query
        const answer = await answerValveQuery(question.trim());
        
        // Return the answer
        res.json({
            question: question.trim(),
            answer: answer
        });
        
    } catch (error) {
        console.error('ValveGPT query error:', error);
        res.status(500).json({
            error: 'Failed to process query'
        });
    }
});

// Test with different route path
router.post('/test-ai/query', (req, res) => {
    console.log('Test AI route hit');
    res.json({ message: 'Alternative route works', path: req.path });
});

// Simple test route
router.get('/valvegpt/test', (req, res) => {
    console.log('ValveGPT test route hit');
    res.json({ message: 'ValveGPT route is working' });
});

// Simple test POST route
router.post('/valvegpt/simple', (req, res) => {
    console.log('ValveGPT simple POST route hit');
    res.json({ message: 'ValveGPT POST route is working' });
});

module.exports = router;