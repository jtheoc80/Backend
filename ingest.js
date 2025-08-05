const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const logActivity = require('./logActivity');

class ValveContentIngestor {
    constructor() {
        this.openai = null;
        this.pinecone = null;
        this.index = null;
        this.initialized = false;
        
        // Configuration
        this.embeddingModel = 'text-embedding-3-small';
        this.summaryModel = 'gpt-3.5-turbo';
        this.maxContentLength = 8000; // Max chars for OpenAI processing
        this.batchSize = 10; // Process in batches
    }

    /**
     * Initialize OpenAI and Pinecone clients
     */
    async initialize() {
        try {
            // Initialize OpenAI
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY environment variable is required');
            }

            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            // Initialize Pinecone (optional, graceful fallback)
            if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
                try {
                    this.pinecone = new Pinecone({
                        apiKey: process.env.PINECONE_API_KEY
                    });

                    this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
                    console.log('Pinecone initialized successfully');
                } catch (pineconeError) {
                    console.warn('Pinecone initialization failed, will store embeddings locally:', pineconeError.message);
                    this.pinecone = null;
                    this.index = null;
                }
            } else {
                console.log('Pinecone credentials not provided, will store embeddings locally');
            }

            this.initialized = true;
            console.log('Content ingestor initialized successfully');

        } catch (error) {
            console.error('Failed to initialize content ingestor:', error);
            throw error;
        }
    }

    /**
     * Summarize content using OpenAI
     * @param {string} content - Content to summarize
     * @param {string} title - Content title for context
     * @returns {Promise<string>} - Generated summary
     */
    async summarizeContent(content, title = '') {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Truncate content if too long
            const truncatedContent = content.length > this.maxContentLength 
                ? content.substring(0, this.maxContentLength) + '...'
                : content;

            const prompt = `Please provide a concise technical summary of the following valve industry content. Focus on key technical information, specifications, maintenance procedures, standards, and best practices that would be valuable for valve professionals.

Title: ${title}

Content: ${truncatedContent}

Summary:`;

            const response = await this.openai.chat.completions.create({
                model: this.summaryModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in industrial valves and fluid control systems. Provide concise, technical summaries that focus on actionable information for valve professionals.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });

            return response.choices[0]?.message?.content?.trim() || 'No summary generated';

        } catch (error) {
            console.error('Error summarizing content:', error);
            return `Error generating summary: ${error.message}`;
        }
    }

    /**
     * Generate embeddings for text content
     * @param {string} text - Text to embed
     * @returns {Promise<Array<number>>} - Embedding vector
     */
    async generateEmbedding(text) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Truncate text if too long
            const truncatedText = text.length > this.maxContentLength 
                ? text.substring(0, this.maxContentLength)
                : text;

            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: truncatedText
            });

            return response.data[0]?.embedding || [];

        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Store embeddings in vector database
     * @param {Array<Object>} embeddings - Array of embedding objects
     * @returns {Promise<boolean>} - Success status
     */
    async storeEmbeddings(embeddings) {
        if (!embeddings || embeddings.length === 0) {
            return true;
        }

        try {
            if (this.index) {
                // Store in Pinecone
                const vectors = embeddings.map(item => ({
                    id: item.id,
                    values: item.embedding,
                    metadata: {
                        title: item.title,
                        url: item.url,
                        summary: item.summary,
                        crawledAt: item.crawledAt,
                        relevanceScore: item.relevanceScore,
                        wordCount: item.wordCount
                    }
                }));

                // Process in batches
                for (let i = 0; i < vectors.length; i += this.batchSize) {
                    const batch = vectors.slice(i, i + this.batchSize);
                    await this.index.upsert(batch);
                    console.log(`Stored batch ${Math.floor(i / this.batchSize) + 1} of ${Math.ceil(vectors.length / this.batchSize)} in Pinecone`);
                }

                console.log(`Successfully stored ${embeddings.length} embeddings in Pinecone`);
                return true;

            } else {
                // Store locally (fallback)
                const localStorage = this.getLocalStorage();
                for (const item of embeddings) {
                    localStorage[item.id] = {
                        embedding: item.embedding,
                        metadata: {
                            title: item.title,
                            url: item.url,
                            summary: item.summary,
                            crawledAt: item.crawledAt,
                            relevanceScore: item.relevanceScore,
                            wordCount: item.wordCount
                        }
                    };
                }
                this.saveLocalStorage(localStorage);
                console.log(`Successfully stored ${embeddings.length} embeddings locally`);
                return true;
            }

        } catch (error) {
            console.error('Error storing embeddings:', error);
            return false;
        }
    }

    /**
     * Process crawled content: summarize and embed
     * @param {Array<Object>} crawledContent - Content from crawler
     * @returns {Promise<Object>} - Processing results
     */
    async processContent(crawledContent) {
        if (!this.initialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        const results = {
            processed: 0,
            failed: 0,
            embeddings: [],
            errors: []
        };

        console.log(`Starting content processing for ${crawledContent.length} items...`);

        for (const item of crawledContent) {
            try {
                // Skip failed crawls
                if (!item.success || !item.content || item.content.trim().length < 100) {
                    results.failed++;
                    continue;
                }

                console.log(`Processing: ${item.title || item.url}`);

                // Generate summary
                const summary = await this.summarizeContent(item.content, item.title);

                // Generate embedding for summary + title (more efficient than full content)
                const textToEmbed = `${item.title || ''}\n\n${summary}`;
                const embedding = await this.generateEmbedding(textToEmbed);

                // Create embedding object
                const embeddingObj = {
                    id: this.generateId(item.url, item.metadata.crawledAt),
                    title: item.title,
                    url: item.url,
                    summary,
                    embedding,
                    crawledAt: item.metadata.crawledAt,
                    relevanceScore: item.metadata.relevanceScore || 0,
                    wordCount: item.metadata.wordCount || 0
                };

                results.embeddings.push(embeddingObj);
                results.processed++;

                // Add small delay to avoid rate limiting
                await this.sleep(100);

            } catch (error) {
                console.error(`Error processing content from ${item.url}:`, error);
                results.failed++;
                results.errors.push({
                    url: item.url,
                    error: error.message
                });
            }
        }

        // Store all embeddings
        if (results.embeddings.length > 0) {
            const storeSuccess = await this.storeEmbeddings(results.embeddings);
            if (!storeSuccess) {
                console.error('Failed to store some embeddings');
            }
        }

        const processingTime = Date.now() - startTime;
        console.log(`Content processing completed: ${results.processed} processed, ${results.failed} failed in ${processingTime}ms`);

        // Log activity for audit trail
        await logActivity(
            null,
            'CONTENT_INGESTION',
            {
                itemsProcessed: results.processed,
                itemsFailed: results.failed,
                embeddingsGenerated: results.embeddings.length,
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            },
            results.processed > 0 ? 'SUCCESS' : 'FAILURE'
        );

        return results;
    }

    /**
     * Generate unique ID for content
     * @param {string} url - Source URL
     * @param {string} timestamp - Crawl timestamp
     * @returns {string} - Unique ID
     */
    generateId(url, timestamp) {
        const urlHash = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        const timeHash = new Date(timestamp).getTime().toString(36);
        return `valve_${urlHash}_${timeHash}`;
    }

    /**
     * Get local storage for embeddings (fallback)
     * @returns {Object} - Local storage object
     */
    getLocalStorage() {
        try {
            const fs = require('fs');
            const path = './data/embeddings.json';
            
            if (fs.existsSync(path)) {
                const data = fs.readFileSync(path, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Could not read local embeddings storage:', error.message);
        }
        return {};
    }

    /**
     * Save embeddings to local storage (fallback)
     * @param {Object} storage - Storage object to save
     */
    saveLocalStorage(storage) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Ensure data directory exists
            const dataDir = './data';
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const filePath = path.join(dataDir, 'embeddings.json');
            fs.writeFileSync(filePath, JSON.stringify(storage, null, 2));
        } catch (error) {
            console.warn('Could not save local embeddings storage:', error.message);
        }
    }

    /**
     * Search similar content (basic implementation)
     * @param {string} query - Search query
     * @param {number} topK - Number of results to return
     * @returns {Promise<Array>} - Similar content results
     */
    async searchSimilar(query, topK = 5) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Generate query embedding
            const queryEmbedding = await this.generateEmbedding(query);

            if (this.index) {
                // Search in Pinecone
                const response = await this.index.query({
                    vector: queryEmbedding,
                    topK,
                    includeMetadata: true
                });

                return response.matches.map(match => ({
                    id: match.id,
                    score: match.score,
                    title: match.metadata.title,
                    url: match.metadata.url,
                    summary: match.metadata.summary
                }));

            } else {
                // Search locally (basic cosine similarity)
                const localStorage = this.getLocalStorage();
                const results = [];

                for (const [id, data] of Object.entries(localStorage)) {
                    const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
                    results.push({
                        id,
                        score: similarity,
                        title: data.metadata.title,
                        url: data.metadata.url,
                        summary: data.metadata.summary
                    });
                }

                return results
                    .sort((a, b) => b.score - a.score)
                    .slice(0, topK);
            }

        } catch (error) {
            console.error('Error searching similar content:', error);
            return [];
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array<number>} a - Vector A
     * @param {Array<number>} b - Vector B
     * @returns {number} - Similarity score
     */
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get processing statistics
     * @returns {Object} - Statistics object
     */
    getStats() {
        const localStorage = this.getLocalStorage();
        return {
            totalEmbeddings: Object.keys(localStorage).length,
            storageType: this.index ? 'Pinecone' : 'Local',
            initialized: this.initialized
        };
    }
}

module.exports = ValveContentIngestor;