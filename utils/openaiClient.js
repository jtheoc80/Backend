const { OpenAI } = require('openai');

// Initialize OpenAI client
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'test-key',
});

module.exports = openaiClient;