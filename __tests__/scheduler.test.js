const ValveGPTScheduler = require('../scheduler');
const ValveCrawler = require('../crawler');
const ValveContentIngestor = require('../ingest');
const logActivity = require('../logActivity');
const cron = require('node-cron');

// Mock dependencies
jest.mock('../crawler');
jest.mock('../ingest');
jest.mock('../logActivity');
jest.mock('node-cron');

describe('ValveGPTScheduler', () => {
    let scheduler;
    let mockCrawler;
    let mockIngestor;
    let mockCronJob;

    beforeEach(() => {
        // Mock crawler
        mockCrawler = {
            crawlAll: jest.fn(),
            getSources: jest.fn().mockReturnValue(['https://example.com']),
            addSource: jest.fn(),
            removeSource: jest.fn()
        };
        ValveCrawler.mockImplementation(() => mockCrawler);

        // Mock ingestor
        mockIngestor = {
            initialize: jest.fn().mockResolvedValue(),
            processContent: jest.fn(),
            searchSimilar: jest.fn(),
            getStats: jest.fn().mockReturnValue({ totalEmbeddings: 0 })
        };
        ValveContentIngestor.mockImplementation(() => mockIngestor);

        // Mock cron job
        mockCronJob = {
            stop: jest.fn(),
            destroy: jest.fn()
        };
        cron.schedule.mockReturnValue(mockCronJob);
        cron.validate.mockReturnValue(true);

        scheduler = new ValveGPTScheduler();
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await scheduler.initialize();

            expect(mockIngestor.initialize).toHaveBeenCalled();
            expect(scheduler.isRunning).toBe(false);
        });

        test('should handle initialization errors', async () => {
            mockIngestor.initialize.mockRejectedValue(new Error('Initialization failed'));

            await expect(scheduler.initialize()).rejects.toThrow('Initialization failed');
        });
    });

    describe('Scheduler Management', () => {
        test('should start scheduler with default schedule', () => {
            scheduler.start();

            expect(cron.validate).toHaveBeenCalledWith('0 */6 * * *');
            expect(cron.schedule).toHaveBeenCalledWith(
                '0 */6 * * *',
                expect.any(Function),
                expect.objectContaining({
                    scheduled: true,
                    timezone: 'UTC'
                })
            );
            expect(scheduler.jobs.main).toBe(mockCronJob);
        });

        test('should start scheduler with custom schedule', () => {
            const customSchedule = '0 0 * * *';
            scheduler.start(customSchedule);

            expect(cron.validate).toHaveBeenCalledWith(customSchedule);
            expect(cron.schedule).toHaveBeenCalledWith(
                customSchedule,
                expect.any(Function),
                expect.any(Object)
            );
        });

        test('should reject invalid cron expression', () => {
            cron.validate.mockReturnValue(false);

            expect(() => scheduler.start('invalid cron')).toThrow('Invalid cron expression: invalid cron');
        });

        test('should not start if already running', () => {
            scheduler.jobs.main = mockCronJob;
            
            scheduler.start();

            expect(cron.schedule).not.toHaveBeenCalled();
        });

        test('should stop scheduler', () => {
            scheduler.jobs.main = mockCronJob;
            
            scheduler.stop();

            expect(mockCronJob.stop).toHaveBeenCalled();
            expect(mockCronJob.destroy).toHaveBeenCalled();
            expect(scheduler.jobs.main).toBeUndefined();
        });

        test('should handle stop when not running', () => {
            expect(() => scheduler.stop()).not.toThrow();
        });
    });

    describe('Crawl and Ingest Process', () => {
        test('should run crawl and ingest successfully', async () => {
            const mockCrawledContent = [
                {
                    success: true,
                    title: 'Valve Guide',
                    url: 'https://example.com',
                    content: 'valve content',
                    metadata: { crawledAt: '2024-01-01T00:00:00.000Z' }
                }
            ];

            const mockIngestResults = {
                processed: 1,
                failed: 0,
                embeddings: [{ id: 'test-1' }],
                errors: []
            };

            mockCrawler.crawlAll.mockResolvedValue(mockCrawledContent);
            mockIngestor.processContent.mockResolvedValue(mockIngestResults);

            const results = await scheduler.runCrawlAndIngest();

            expect(results).toEqual({
                crawled: 1,
                successful: 1,
                processed: 1,
                failed: 0,
                embeddings: 1,
                errors: [],
                executionTimeMs: expect.any(Number)
            });

            expect(scheduler.stats.successfulRuns).toBe(1);
            expect(scheduler.stats.totalContentProcessed).toBe(1);
            expect(scheduler.stats.totalEmbeddingsGenerated).toBe(1);
        });

        test('should handle no successful crawls', async () => {
            const mockCrawledContent = [
                {
                    success: false,
                    url: 'https://example.com',
                    metadata: { error: 'Network error' }
                }
            ];

            mockCrawler.crawlAll.mockResolvedValue(mockCrawledContent);

            const results = await scheduler.runCrawlAndIngest();

            expect(results).toEqual({
                crawled: 1,
                successful: 0,
                processed: 0,
                failed: 0,
                embeddings: 0,
                errors: [],
                executionTimeMs: expect.any(Number)
            });

            expect(scheduler.stats.failedRuns).toBe(1);
        });

        test('should skip if already running', async () => {
            scheduler.isRunning = true;

            const results = await scheduler.runCrawlAndIngest();

            expect(results).toEqual({ skipped: true });
            expect(mockCrawler.crawlAll).not.toHaveBeenCalled();
        });

        test('should handle processing errors', async () => {
            mockCrawler.crawlAll.mockRejectedValue(new Error('Crawl failed'));

            await expect(scheduler.runCrawlAndIngest()).rejects.toThrow('Crawl failed');
            
            expect(scheduler.stats.failedRuns).toBe(1);
            expect(scheduler.isRunning).toBe(false);
        });

        test('should set isRunning flag correctly', async () => {
            expect(scheduler.isRunning).toBe(false);

            // Mock crawlAll to return a valid array
            mockCrawler.crawlAll.mockResolvedValue([]);
            
            const promise = scheduler.runCrawlAndIngest();
            expect(scheduler.isRunning).toBe(true);

            await promise;

            expect(scheduler.isRunning).toBe(false);
        });
    });

    describe('Status and Statistics', () => {
        test('should return status information', () => {
            scheduler.jobs.main = mockCronJob;
            scheduler.lastRun = {
                timestamp: '2024-01-01T00:00:00.000Z',
                success: true,
                results: { processed: 5 }
            };

            const status = scheduler.getStatus();

            expect(status).toEqual({
                isActive: true,
                isRunning: false,
                lastRun: {
                    timestamp: '2024-01-01T00:00:00.000Z',
                    success: true,
                    results: { processed: 5 }
                },
                stats: expect.any(Object),
                ingestorStats: { totalEmbeddings: 0 },
                crawlerSources: ['https://example.com']
            });
        });

        test('should return inactive status when not running', () => {
            const status = scheduler.getStatus();
            expect(status.isActive).toBe(false);
        });
    });

    describe('Source Management', () => {
        test('should update crawler sources', () => {
            const newSources = ['https://newsite1.com', 'https://newsite2.com'];
            
            scheduler.updateCrawlerSources(newSources);

            expect(mockCrawler.removeSource).toHaveBeenCalledWith('https://example.com');
            expect(mockCrawler.addSource).toHaveBeenCalledWith('https://newsite1.com');
            expect(mockCrawler.addSource).toHaveBeenCalledWith('https://newsite2.com');
        });

        test('should reject invalid sources', () => {
            expect(() => scheduler.updateCrawlerSources('not an array')).toThrow('Sources must be an array of URLs');
        });

        test('should add single source', () => {
            scheduler.addCrawlerSource('https://newsite.com');
            
            expect(mockCrawler.addSource).toHaveBeenCalledWith('https://newsite.com');
            expect(logActivity).toHaveBeenCalledWith(
                null,
                'CRAWLER_SOURCE_ADD',
                expect.objectContaining({ url: 'https://newsite.com' }),
                'SUCCESS'
            );
        });

        test('should remove single source', () => {
            scheduler.removeCrawlerSource('https://example.com');
            
            expect(mockCrawler.removeSource).toHaveBeenCalledWith('https://example.com');
            expect(logActivity).toHaveBeenCalledWith(
                null,
                'CRAWLER_SOURCE_REMOVE',
                expect.objectContaining({ url: 'https://example.com' }),
                'SUCCESS'
            );
        });
    });

    describe('Content Search', () => {
        test('should search content using ingestor', async () => {
            const mockResults = [
                { id: '1', score: 0.95, title: 'Valve Guide' }
            ];
            mockIngestor.searchSimilar.mockResolvedValue(mockResults);

            const results = await scheduler.searchContent('valve maintenance', 5);

            expect(results).toEqual(mockResults);
            expect(mockIngestor.searchSimilar).toHaveBeenCalledWith('valve maintenance', 5);
        });

        test('should handle search errors', async () => {
            mockIngestor.searchSimilar.mockRejectedValue(new Error('Search failed'));

            const results = await scheduler.searchContent('test query');

            expect(results).toEqual([]);
        });
    });

    describe('Manual Execution', () => {
        test('should run once manually', async () => {
            mockCrawler.crawlAll.mockResolvedValue([]);
            
            const results = await scheduler.runOnce();
            
            expect(results).toBeDefined();
            expect(mockCrawler.crawlAll).toHaveBeenCalled();
        });
    });

    describe('Graceful Shutdown', () => {
        test('should shutdown gracefully when not running', async () => {
            scheduler.jobs.main = mockCronJob;
            
            await scheduler.shutdown();

            expect(mockCronJob.stop).toHaveBeenCalled();
            expect(mockCronJob.destroy).toHaveBeenCalled();
        });

        test('should wait for running process to complete', async () => {
            scheduler.jobs.main = mockCronJob;
            scheduler.isRunning = true;

            // Simulate process completing after 500ms
            setTimeout(() => {
                scheduler.isRunning = false;
            }, 500);

            const start = Date.now();
            await scheduler.shutdown();
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThanOrEqual(450);
            expect(mockCronJob.stop).toHaveBeenCalled();
        });

        test('should timeout waiting for running process', async () => {
            scheduler.jobs.main = mockCronJob;
            scheduler.isRunning = true; // Never set to false

            const start = Date.now();
            await scheduler.shutdown();
            const elapsed = Date.now() - start;

            // Should timeout after ~30 seconds, but we'll check for at least 1 second
            expect(elapsed).toBeGreaterThanOrEqual(1000);
        }, 35000); // Increase test timeout
    });
});