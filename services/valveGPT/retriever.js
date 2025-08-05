const vectorClient = require('../../utils/vectorClient');
const { getEmbedding } = require('./embed');

/**
 * Retrieve relevant valve context from Pinecone for a given question
 * @param {string} question - The question to find context for
 * @returns {Promise<string>} - Concatenated context text
 */
async function retrieveValveContext(question) {
    try {
        // Get embedding for the question
        const questionEmbedding = await getEmbedding(question);
        
        // Query Pinecone for top 5 matches
        const index = vectorClient.index(process.env.PINECONE_INDEX_NAME);
        const queryResponse = await index.query({
            vector: questionEmbedding,
            topK: 5,
            includeMetadata: true,
        });
        
        // Extract and concatenate context text from matches
        const contextTexts = queryResponse.matches.map(match => 
            match.metadata?.text || ''
        ).filter(text => text.length > 0);
        
        return contextTexts.join('\n\n');
    } catch (error) {
        console.error('Error retrieving valve context:', error);
        throw new Error('Failed to retrieve context');
    }
}

module.exports = {
    retrieveValveContext
};