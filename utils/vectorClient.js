const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize Pinecone client
const vectorClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || 'test-key',
});

module.exports = vectorClient;