const cron = require('node-cron');
const ValveCrawler = require('./crawler');
const ValveContentIngestor = require('./ingest');
const logActivity = require('./logActivity');

class ValveGPTScheduler {
    constructor() {
        this.crawler = new ValveCrawler();
        this.ingestor = new ValveContentIngestor();
        this.jobs = {};
        this.isRunning = false;
        this.lastRun = null;
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            totalContentProcessed: 0,
            totalEmbeddingsGenerated: 0
        };

        // Default schedule: Every 6 hours
        this.defaultSchedule = '0 */6 * * *';
    }

    /**
     * Initialize the scheduler and its components
     */
    async initialize() {
        try {
            console.log('Initializing ValveGPT Self-Learning Scheduler...');
            
            // Initialize ingestor (which will init OpenAI and Pinecone)
            await this.ingestor.initialize();
            
            console.log('Scheduler initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize scheduler:', error);
            throw error;
        }
    }

    /**
     * Start the scheduled crawler and ingest job
     * @param {string} schedule - Cron schedule (optional, defaults to every 6 hours)
     */
    start(schedule = this.defaultSchedule) {
        try {
            if (this.jobs.main) {
                console.log('Scheduler is already running');
                return;
            }

            // Validate cron expression
            if (!cron.validate(schedule)) {
                throw new Error(`Invalid cron expression: ${schedule}`);
            }

            console.log(`Starting ValveGPT scheduler with schedule: ${schedule}`);

            this.jobs.main = cron.schedule(schedule, async () => {
                await this.runCrawlAndIngest();
            }, {
                scheduled: true,
                timezone: process.env.SCHEDULER_TIMEZONE || 'UTC'
            });

            console.log('ValveGPT self-learning scheduler started successfully');
            
            // Log scheduler start
            logActivity(
                null,
                'SCHEDULER_START',
                {
                    schedule,
                    timezone: process.env.SCHEDULER_TIMEZONE || 'UTC',
                    timestamp: new Date().toISOString()
                },
                'SUCCESS'
            );

        } catch (error) {
            console.error('Failed to start scheduler:', error);
            throw error;
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        try {
            if (this.jobs.main) {
                this.jobs.main.stop();
                this.jobs.main.destroy();
                delete this.jobs.main;
                console.log('Scheduler stopped successfully');
                
                // Log scheduler stop
                logActivity(
                    null,
                    'SCHEDULER_STOP',
                    {
                        timestamp: new Date().toISOString(),
                        stats: this.stats
                    },
                    'SUCCESS'
                );
            }
        } catch (error) {
            console.error('Error stopping scheduler:', error);
        }
    }

    /**
     * Run the crawl and ingest process manually
     * @returns {Promise<Object>} - Execution results
     */
    async runCrawlAndIngest() {
        if (this.isRunning) {
            console.log('Crawl and ingest process is already running, skipping...');
            return { skipped: true };
        }

        this.isRunning = true;
        const startTime = Date.now();
        let results = {};

        try {
            console.log('=== Starting ValveGPT Self-Learning Process ===');
            this.stats.totalRuns++;

            // Step 1: Crawl content
            console.log('Step 1: Crawling valve-related content...');
            const crawledContent = await this.crawler.crawlAll();
            
            const successfulCrawls = crawledContent.filter(item => item.success);
            console.log(`Crawling completed: ${successfulCrawls.length}/${crawledContent.length} sources successful`);

            // Step 2: Process and ingest content
            if (successfulCrawls.length > 0) {
                console.log('Step 2: Processing and embedding content...');
                const ingestResults = await this.ingestor.processContent(successfulCrawls);
                
                console.log(`Content processing completed: ${ingestResults.processed} items processed, ${ingestResults.embeddings.length} embeddings generated`);
                
                results = {
                    crawled: crawledContent.length,
                    successful: successfulCrawls.length,
                    processed: ingestResults.processed,
                    failed: ingestResults.failed,
                    embeddings: ingestResults.embeddings.length,
                    errors: ingestResults.errors,
                    executionTimeMs: Date.now() - startTime
                };

                // Update stats
                this.stats.successfulRuns++;
                this.stats.totalContentProcessed += ingestResults.processed;
                this.stats.totalEmbeddingsGenerated += ingestResults.embeddings.length;

            } else {
                console.log('No successful crawls to process');
                results = {
                    crawled: crawledContent.length,
                    successful: 0,
                    processed: 0,
                    failed: 0,
                    embeddings: 0,
                    errors: [],
                    executionTimeMs: Date.now() - startTime
                };
                this.stats.failedRuns++;
            }

            this.lastRun = {
                timestamp: new Date().toISOString(),
                success: true,
                results
            };

            console.log(`=== ValveGPT Self-Learning Process Completed in ${results.executionTimeMs}ms ===`);

            // Log successful execution
            await logActivity(
                null,
                'SELF_LEARNING_RUN',
                {
                    ...results,
                    timestamp: new Date().toISOString()
                },
                'SUCCESS'
            );

            return results;

        } catch (error) {
            console.error('Error during crawl and ingest process:', error);
            
            const errorResults = {
                error: error.message,
                executionTimeMs: Date.now() - startTime
            };

            this.lastRun = {
                timestamp: new Date().toISOString(),
                success: false,
                error: error.message
            };

            this.stats.failedRuns++;

            // Log failed execution
            await logActivity(
                null,
                'SELF_LEARNING_RUN',
                {
                    ...errorResults,
                    timestamp: new Date().toISOString()
                },
                'FAILURE'
            );

            throw error;

        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get scheduler status and statistics
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            isActive: !!this.jobs.main,
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            stats: { ...this.stats },
            ingestorStats: this.ingestor.getStats(),
            crawlerSources: this.crawler.getSources()
        };
    }

    /**
     * Update crawler sources
     * @param {Array<string>} sources - New source URLs
     */
    updateCrawlerSources(sources) {
        if (!Array.isArray(sources)) {
            throw new Error('Sources must be an array of URLs');
        }

        // Clear existing sources and add new ones
        const currentSources = this.crawler.getSources();
        currentSources.forEach(url => this.crawler.removeSource(url));
        sources.forEach(url => this.crawler.addSource(url));

        console.log(`Updated crawler sources: ${sources.length} sources configured`);
        
        // Log configuration change
        logActivity(
            null,
            'CRAWLER_CONFIG_UPDATE',
            {
                newSources: sources,
                timestamp: new Date().toISOString()
            },
            'SUCCESS'
        );
    }

    /**
     * Add a single crawler source
     * @param {string} url - URL to add
     */
    addCrawlerSource(url) {
        this.crawler.addSource(url);
        
        logActivity(
            null,
            'CRAWLER_SOURCE_ADD',
            {
                url,
                timestamp: new Date().toISOString()
            },
            'SUCCESS'
        );
    }

    /**
     * Remove a crawler source
     * @param {string} url - URL to remove
     */
    removeCrawlerSource(url) {
        this.crawler.removeSource(url);
        
        logActivity(
            null,
            'CRAWLER_SOURCE_REMOVE',
            {
                url,
                timestamp: new Date().toISOString()
            },
            'SUCCESS'
        );
    }

    /**
     * Search for similar content using the ingestor
     * @param {string} query - Search query
     * @param {number} topK - Number of results
     * @returns {Promise<Array>} - Search results
     */
    async searchContent(query, topK = 5) {
        try {
            return await this.ingestor.searchSimilar(query, topK);
        } catch (error) {
            console.error('Error searching content:', error);
            return [];
        }
    }

    /**
     * Run a one-time crawl and ingest (for testing or manual execution)
     * @returns {Promise<Object>} - Execution results
     */
    async runOnce() {
        console.log('Running one-time crawl and ingest...');
        return await this.runCrawlAndIngest();
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Shutting down ValveGPT scheduler...');
        
        try {
            // Stop scheduler
            this.stop();
            
            // Wait for any running process to complete
            if (this.isRunning) {
                console.log('Waiting for running process to complete...');
                let attempts = 0;
                while (this.isRunning && attempts < 30) { // Wait up to 30 seconds
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }
            }

            console.log('ValveGPT scheduler shutdown complete');
            
        } catch (error) {
            console.error('Error during scheduler shutdown:', error);
        }
    }
}

module.exports = ValveGPTScheduler;