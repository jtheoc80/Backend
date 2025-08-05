const openaiClient = require('../../utils/openaiClient');
const { retrieveValveContext } = require('./retriever');
const { logInteraction } = require('./log');

/**
 * Answer a valve-related query using GPT-4o with retrieved context
 * @param {string} question - The question to answer
 * @returns {Promise<string>} - The answer
 */
async function answerValveQuery(question) {
    try {
        // Retrieve relevant context
        const context = await retrieveValveContext(question);
        
        // Construct prompt for GPT-4o
        const prompt = `You are a knowledgeable assistant specializing in industrial valves. Use the following context to answer the user's question accurately and helpfully.

Context:
${context}

Question: ${question}

Please provide a detailed and accurate answer based on the context provided. If the context doesn't contain enough information to fully answer the question, acknowledge this and provide what information you can.`;

        // Call GPT-4o
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant specializing in industrial valves and valve technology.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });
        
        const answer = response.choices[0].message.content;
        
        // Log the interaction
        await logInteraction(question, context, answer);
        
        return answer;
    } catch (error) {
        console.error('Error answering valve query:', error);
        throw new Error('Failed to process query');
    }
}

module.exports = {
    answerValveQuery
};