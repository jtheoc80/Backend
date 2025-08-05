const { db } = require('../../database');

/**
 * Log interaction to database
 * @param {string} question - The question asked
 * @param {string} context - The context retrieved
 * @param {string} answer - The answer provided
 * @returns {Promise<void>}
 */
async function logInteraction(question, context, answer) {
    try {
        await db.run(
            `INSERT INTO valve_gpt_interactions (question, context, answer, created_at) 
             VALUES (?, ?, ?, datetime('now'))`,
            [question, context, answer]
        );
        console.log('ValveGPT interaction logged successfully');
    } catch (error) {
        console.error('Error logging ValveGPT interaction:', error);
        // Don't throw error - logging failure shouldn't break the main flow
    }
}

module.exports = {
    logInteraction
};