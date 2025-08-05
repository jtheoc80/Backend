const ValveContentIngestor = require('../ingest');
const logActivity = require('../logActivity');

// Mock dependencies
jest.mock('../logActivity', () => jest.fn().mockResolvedValue());
jest.mock('openai');
jest.mock('@pinecone-database/pinecone');
jest.mock('fs');

const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');

describe('ValveContentIngestor', () => {
    let ingestor;
    let mockOpenAI;
    let mockPinecone;
    let mockIndex;

    beforeEach(() => {
        ingestor = new ValveContentIngestor();
        
        // Mock OpenAI
        mockOpenAI = {
            chat: {
                completions: {
                    create: jest.fn()
                }
            },
            embeddings: {
                create: jest.fn()
            }
        };
        OpenAI.mockImplementation(() => mockOpenAI);

        // Mock Pinecone
        mockIndex = {
            upsert: jest.fn().mockResolvedValue({}),
            query: jest.fn().mockResolvedValue({ matches: [] })
        };
        mockPinecone = {
            index: jest.fn().mockReturnValue(mockIndex)
        };
        Pinecone.mockImplementation(() => mockPinecone);

        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with OpenAI API key', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            
            await ingestor.initialize();
            
            expect(ingestor.initialized).toBe(true);
            expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
        });

        test('should throw error without OpenAI API key', async () => {
            delete process.env.OPENAI_API_KEY;
            
            await expect(ingestor.initialize()).rejects.toThrow('OPENAI_API_KEY environment variable is required');
        });

        test('should initialize Pinecone when credentials provided', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            process.env.PINECONE_API_KEY = 'pinecone-key';
            process.env.PINECONE_INDEX_NAME = 'test-index';
            
            await ingestor.initialize();
            
            expect(Pinecone).toHaveBeenCalledWith({ apiKey: 'pinecone-key' });
            expect(mockPinecone.index).toHaveBeenCalledWith('test-index');
        });

        test('should gracefully handle Pinecone initialization failure', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            process.env.PINECONE_API_KEY = 'pinecone-key';
            process.env.PINECONE_INDEX_NAME = 'test-index';
            
            Pinecone.mockImplementation(() => {
                throw new Error('Pinecone connection failed');
            });
            
            await ingestor.initialize();
            
            expect(ingestor.initialized).toBe(true);
            expect(ingestor.pinecone).toBe(null);
        });
    });

    describe('Content Summarization', () => {
        beforeEach(async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            await ingestor.initialize();
        });

        test('should generate summary using OpenAI', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: 'This is a test summary of valve maintenance procedures.'
                    }
                }]
            };
            mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

            const content = 'This is test content about valve maintenance and repair procedures.';
            const summary = await ingestor.summarizeContent(content, 'Valve Maintenance Guide');

            expect(summary).toBe('This is a test summary of valve maintenance procedures.');
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-3.5-turbo',
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'system' }),
                        expect.objectContaining({ role: 'user' })
                    ])
                })
            );
        });

        test('should handle OpenAI API errors', async () => {
            mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

            const summary = await ingestor.summarizeContent('test content');

            expect(summary).toContain('Error generating summary');
        });

        test('should truncate long content', async () => {
            const longContent = 'a'.repeat(10000);
            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{ message: { content: 'Summary' } }]
            });

            await ingestor.summarizeContent(longContent);

            const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
            const userMessage = callArgs.messages.find(m => m.role === 'user');
            expect(userMessage.content.length).toBeLessThan(longContent.length);
        });
    });

    describe('Embedding Generation', () => {
        beforeEach(async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            await ingestor.initialize();
        });

        test('should generate embeddings using OpenAI', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: mockEmbedding }]
            });

            const embedding = await ingestor.generateEmbedding('test content');

            expect(embedding).toEqual(mockEmbedding);
            expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
                model: 'text-embedding-3-small',
                input: 'test content'
            });
        });

        test('should handle embedding API errors', async () => {
            mockOpenAI.embeddings.create.mockRejectedValue(new Error('API Error'));

            await expect(ingestor.generateEmbedding('test')).rejects.toThrow('API Error');
        });
    });

    describe('Content Processing', () => {
        beforeEach(async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            await ingestor.initialize();
        });

        test('should process crawled content successfully', async () => {
            const crawledContent = [
                {
                    success: true,
                    title: 'Valve Guide',
                    url: 'https://example.com',
                    content: 'This is content about valve maintenance procedures and best practices.',
                    metadata: {
                        crawledAt: '2024-01-01T00:00:00.000Z',
                        relevanceScore: 85,
                        wordCount: 10
                    }
                }
            ];

            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{ message: { content: 'Test summary' } }]
            });

            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: [0.1, 0.2, 0.3] }]
            });

            const results = await ingestor.processContent(crawledContent);

            expect(results.processed).toBe(1);
            expect(results.failed).toBe(0);
            expect(results.embeddings).toHaveLength(1);
            expect(logActivity).toHaveBeenCalledWith(
                null,
                'CONTENT_INGESTION',
                expect.any(Object),
                'SUCCESS'
            );
        });

        test('should skip failed crawls', async () => {
            const crawledContent = [
                {
                    success: false,
                    url: 'https://example.com',
                    content: null
                }
            ];

            const results = await ingestor.processContent(crawledContent);

            expect(results.processed).toBe(0);
            expect(results.failed).toBe(1);
            expect(results.embeddings).toHaveLength(0);
        });

        test('should skip content that is too short', async () => {
            const crawledContent = [
                {
                    success: true,
                    title: 'Short',
                    url: 'https://example.com',
                    content: 'Short',
                    metadata: { crawledAt: '2024-01-01T00:00:00.000Z' }
                }
            ];

            const results = await ingestor.processContent(crawledContent);

            expect(results.processed).toBe(0);
            expect(results.failed).toBe(1);
        });
    });

    describe('Embedding Storage', () => {
        beforeEach(async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            process.env.PINECONE_API_KEY = 'pinecone-key';
            process.env.PINECONE_INDEX_NAME = 'test-index';
            await ingestor.initialize();
        });

        test('should store embeddings in Pinecone', async () => {
            const embeddings = [
                {
                    id: 'test-1',
                    title: 'Test Title',
                    url: 'https://example.com',
                    summary: 'Test summary',
                    embedding: [0.1, 0.2, 0.3],
                    crawledAt: '2024-01-01T00:00:00.000Z',
                    relevanceScore: 85,
                    wordCount: 10
                }
            ];

            const success = await ingestor.storeEmbeddings(embeddings);

            expect(success).toBe(true);
            expect(mockIndex.upsert).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'test-1',
                    values: [0.1, 0.2, 0.3],
                    metadata: expect.objectContaining({
                        title: 'Test Title',
                        url: 'https://example.com'
                    })
                })
            ]);
        });

        test('should store embeddings locally when Pinecone unavailable', async () => {
            ingestor.index = null; // Simulate no Pinecone
            
            fs.existsSync.mockReturnValue(false);
            fs.mkdirSync.mockImplementation(() => {});
            fs.writeFileSync.mockImplementation(() => {});

            const embeddings = [{
                id: 'test-1',
                title: 'Test',
                url: 'https://example.com',
                summary: 'Summary',
                embedding: [0.1, 0.2],
                crawledAt: '2024-01-01T00:00:00.000Z'
            }];

            const success = await ingestor.storeEmbeddings(embeddings);

            expect(success).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });

    describe('Content Search', () => {
        beforeEach(async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            process.env.PINECONE_API_KEY = 'pinecone-key';
            process.env.PINECONE_INDEX_NAME = 'test-index';
            await ingestor.initialize();
        });

        test('should search using Pinecone', async () => {
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: [0.1, 0.2, 0.3] }]
            });

            mockIndex.query.mockResolvedValue({
                matches: [
                    {
                        id: 'test-1',
                        score: 0.95,
                        metadata: {
                            title: 'Valve Guide',
                            url: 'https://example.com',
                            summary: 'Test summary'
                        }
                    }
                ]
            });

            const results = await ingestor.searchSimilar('valve maintenance', 5);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                id: 'test-1',
                score: 0.95,
                title: 'Valve Guide',
                url: 'https://example.com',
                summary: 'Test summary'
            });
        });

        test('should search locally when Pinecone unavailable', async () => {
            ingestor.index = null;
            
            mockOpenAI.embeddings.create.mockResolvedValue({
                data: [{ embedding: [0.1, 0.2, 0.3] }]
            });

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                'test-1': {
                    embedding: [0.1, 0.2, 0.3],
                    metadata: {
                        title: 'Test Title',
                        url: 'https://example.com',
                        summary: 'Test summary'
                    }
                }
            }));

            const results = await ingestor.searchSimilar('test query', 5);

            expect(results).toHaveLength(1);
        });
    });

    describe('Utility Functions', () => {
        test('should generate unique IDs', () => {
            const id1 = ingestor.generateId('https://example.com', '2024-01-01T00:00:00.000Z');
            const id2 = ingestor.generateId('https://example.com', '2024-01-01T01:00:00.000Z');
            
            expect(id1).toMatch(/^valve_/);
            expect(id1).not.toBe(id2);
        });

        test('should calculate cosine similarity', () => {
            const a = [1, 0, 0];
            const b = [1, 0, 0];
            const c = [0, 1, 0];

            expect(ingestor.cosineSimilarity(a, b)).toBe(1);
            expect(ingestor.cosineSimilarity(a, c)).toBe(0);
        });

        test('should handle invalid vectors in cosine similarity', () => {
            expect(ingestor.cosineSimilarity(null, [1, 2, 3])).toBe(0);
            expect(ingestor.cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
            expect(ingestor.cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
        });

        test('should return stats', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({ 'test-1': {}, 'test-2': {} }));

            const stats = ingestor.getStats();

            expect(stats).toEqual({
                totalEmbeddings: 2,
                storageType: 'Pinecone',
                initialized: false
            });
        });
    });
});