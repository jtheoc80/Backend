const openaiClient = require('../../utils/openaiClient');

/**
 * Get embedding for text using OpenAI's text-embedding-3-small model
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function getEmbedding(text) {
    try {
        const response = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error getting embedding:', error);
        throw new Error('Failed to get embedding');
    }
}

module.exports = {
    getEmbedding
};