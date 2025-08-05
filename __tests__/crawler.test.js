const ValveCrawler = require('../crawler');
const logActivity = require('../logActivity');

// Mock dependencies
jest.mock('../logActivity');
jest.mock('axios');

const axios = require('axios');

describe('ValveCrawler', () => {
    let crawler;

    beforeEach(() => {
        crawler = new ValveCrawler();
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default sources', () => {
            expect(crawler.getSources()).toHaveLength(3);
            expect(crawler.getSources()).toContain('https://www.valvemagazine.com/');
        });

        test('should set default configuration', () => {
            expect(crawler.timeout).toBe(10000);
            expect(crawler.maxRetries).toBe(3);
        });
    });

    describe('Source Management', () => {
        test('should add new source', () => {
            const newUrl = 'https://example.com';
            crawler.addSource(newUrl);
            expect(crawler.getSources()).toContain(newUrl);
        });

        test('should not add duplicate source', () => {
            const existingUrl = crawler.getSources()[0];
            const initialLength = crawler.getSources().length;
            crawler.addSource(existingUrl);
            expect(crawler.getSources()).toHaveLength(initialLength);
        });

        test('should remove source', () => {
            const urlToRemove = crawler.getSources()[0];
            crawler.removeSource(urlToRemove);
            expect(crawler.getSources()).not.toContain(urlToRemove);
        });
    });

    describe('Content Extraction', () => {
        test('should extract valve-related content', () => {
            const mockHtml = `
                <html>
                    <head><title>Ball Valve Guide</title></head>
                    <body>
                        <p>This article covers ball valve maintenance procedures.</p>
                        <p>Gate valves are different from ball valves in operation.</p>
                        <p>Regular maintenance ensures optimal valve performance.</p>
                        <script>console.log('should be removed');</script>
                    </body>
                </html>
            `;

            const $ = cheerio.load(mockHtml);
            const content = crawler.extractValveContent($);

            expect(content).toContain('ball valve maintenance');
            expect(content).toContain('Gate valves');
            expect(content).not.toContain('should be removed');
        });

        test('should filter out non-valve content', () => {
            const mockHtml = `
                <html>
                    <body>
                        <p>This is about cooking recipes.</p>
                        <p>Weather forecast for tomorrow.</p>
                    </body>
                </html>
            `;

            const $ = cheerio.load(mockHtml);
            const content = crawler.extractValveContent($);

            expect(content).toBe('');
        });
    });

    describe('Keyword Detection', () => {
        test('should detect valve keywords', () => {
            const keywords = ['valve', 'ball valve', 'maintenance'];
            
            expect(crawler.containsValveKeywords('ball valve maintenance guide', keywords)).toBe(true);
            expect(crawler.containsValveKeywords('cooking recipes', keywords)).toBe(false);
        });
    });

    describe('Relevance Scoring', () => {
        test('should calculate relevance score', () => {
            const highRelevanceText = 'ball valve gate valve control valve maintenance';
            const lowRelevanceText = 'the quick brown fox jumps over the lazy dog';

            const highScore = crawler.calculateRelevanceScore(highRelevanceText);
            const lowScore = crawler.calculateRelevanceScore(lowRelevanceText);

            expect(highScore).toBeGreaterThan(lowScore);
            expect(highScore).toBeGreaterThan(0);
            expect(lowScore).toBe(0);
        });

        test('should handle empty text', () => {
            expect(crawler.calculateRelevanceScore('')).toBe(0);
            expect(crawler.calculateRelevanceScore(null)).toBe(0);
        });
    });

    describe('Single Site Crawling', () => {
        test('should successfully crawl a single site', async () => {
            const mockResponse = {
                data: `
                    <html>
                        <head><title>Valve Testing Standards</title></head>
                        <body>
                            <p>This article covers API 598 valve testing standards.</p>
                        </body>
                    </html>
                `
            };

            axios.get.mockResolvedValue(mockResponse);
            
            // Mock cheerio.load to return a function that returns our mock object
            const cheerioMock = jest.fn().mockReturnValue({
                text: jest.fn().mockReturnValue('Valve Testing Standards'),
                first: jest.fn().mockReturnThis(),
                trim: jest.fn().mockReturnValue('Valve Testing Standards'),
                remove: jest.fn().mockReturnThis(),
                each: jest.fn((callback) => {
                    // Simulate finding valve-related content
                    callback(0, { text: () => 'This article covers API 598 valve testing standards.' });
                }),
                substring: jest.fn().mockReturnValue('This article covers API 598 valve testing standards.')
            });
            
            // Mock the actual crawler's extractValveContent method to return expected content
            crawler.extractValveContent = jest.fn().mockReturnValue('This article covers API 598 valve testing standards.');

            const result = await crawler.crawlSingle('https://example.com');

            expect(result.success).toBe(true);
            expect(result.url).toBe('https://example.com');
            expect(result.metadata).toBeDefined();
        });

        test('should handle crawling errors with retries', async () => {
            axios.get
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Final error'));

            const result = await crawler.crawlSingle('https://example.com');

            expect(result.success).toBe(false);
            expect(result.metadata.error).toBe('Final error');
            expect(axios.get).toHaveBeenCalledTimes(3);
        });
    });

    describe('Batch Crawling', () => {
        test('should crawl all sources', async () => {
            // Mock successful response for all sources
            axios.get.mockResolvedValue({
                data: '<html><head><title>Test</title></head><body><p>valve content</p></body></html>'
            });

            // Mock the extractValveContent method to return consistent results
            crawler.extractValveContent = jest.fn().mockReturnValue('valve content');

            const results = await crawler.crawlAll();

            expect(results).toHaveLength(3);
            expect(logActivity).toHaveBeenCalledWith(
                null,
                'CRAWLER_EXECUTION',
                expect.any(Object),
                expect.any(String)
            );
        });

        test('should handle mixed success/failure results', async () => {
            axios.get
                .mockResolvedValueOnce({ data: '<html><body><p>valve content</p></body></html>' })
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ data: '<html><body><p>control valve guide</p></body></html>' });

            // Mock extractValveContent for successful calls
            crawler.extractValveContent = jest.fn()
                .mockReturnValueOnce('valve content')
                .mockReturnValueOnce('control valve guide');

            const results = await crawler.crawlAll();

            expect(results).toHaveLength(3);
            const successfulResults = results.filter(r => r.success);
            const failedResults = results.filter(r => !r.success);

            expect(successfulResults).toHaveLength(2);
            expect(failedResults).toHaveLength(1);
        });
    });

    describe('Utility Methods', () => {
        test('should implement sleep function', async () => {
            const start = Date.now();
            await crawler.sleep(100);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThanOrEqual(95); // Allow some variance
        });
    });
});