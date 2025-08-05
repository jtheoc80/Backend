const database = require('./database');
const logger = require('./logger');

async function initializeProductionDatabase() {
    try {
        logger.info('Initializing production database...');
        
        // Call the existing database initialization
        await database.initDatabase();
        
        logger.info('Production database initialized successfully');
        return true;
    } catch (error) {
        logger.error('Failed to initialize production database', { error: error.message });
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    initializeProductionDatabase()
        .then((success) => {
            process.exit(success ? 0 : 1);
        });
}

module.exports = {
    initializeProductionDatabase
};