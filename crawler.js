const axios = require('axios');
const cheerio = require('cheerio');
const logActivity = require('./logActivity');

class ValveCrawler {
    constructor() {
        this.sources = [
            'https://www.valvemagazine.com/',
            'https://www.flowcontrolnetwork.com/',
            'https://www.processing-magazine.com/'
        ];
        this.timeout = 10000; // 10 seconds timeout
        this.maxRetries = 3;
    }

    /**
     * Extract valve-related content from a single URL
     * @param {string} url - The URL to crawl
     * @returns {Promise<Object>} - Extracted content object
     */
    async crawlSingle(url) {
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                console.log(`Crawling ${url} (attempt ${retries + 1})`);
                
                const response = await axios.get(url, {
                    timeout: this.timeout,
                    headers: {
                        'User-Agent': 'ValveGPT-Crawler/1.0.0',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });

                const $ = cheerio.load(response.data);
                
                // Extract title
                const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
                
                // Extract valve-related content
                const content = this.extractValveContent($);
                
                // Extract metadata
                const metadata = {
                    url,
                    title,
                    crawledAt: new Date().toISOString(),
                    wordCount: content.split(/\s+/).length,
                    relevanceScore: this.calculateRelevanceScore(title + ' ' + content)
                };

                return {
                    url,
                    title,
                    content,
                    metadata,
                    success: true
                };

            } catch (error) {
                retries++;
                console.error(`Error crawling ${url} (attempt ${retries}):`, error.message);
                
                if (retries >= this.maxRetries) {
                    return {
                        url,
                        title: null,
                        content: null,
                        metadata: {
                            url,
                            crawledAt: new Date().toISOString(),
                            error: error.message
                        },
                        success: false
                    };
                }
                
                // Wait before retry (exponential backoff)
                await this.sleep(1000 * Math.pow(2, retries - 1));
            }
        }
    }

    /**
     * Extract valve-related text content from the page
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {string} - Extracted content
     */
    extractValveContent($) {
        // Remove unwanted elements
        $('script, style, nav, header, footer, .advertisement, .ad, .sidebar').remove();
        
        // Valve-related keywords to look for
        const valveKeywords = [
            'valve', 'valves', 'ball valve', 'gate valve', 'globe valve', 'butterfly valve',
            'check valve', 'relief valve', 'control valve', 'solenoid valve', 'needle valve',
            'flow control', 'pressure relief', 'pipeline', 'fluid control', 'industrial valve',
            'valve maintenance', 'valve repair', 'valve installation', 'valve testing',
            'valve certification', 'valve standards', 'API', 'ASME', 'ISO'
        ];

        let relevantContent = '';
        
        // Extract content from paragraphs, articles, and main content areas
        const contentSelectors = [
            'article p',
            '.content p',
            '.main p', 
            '.post-content p',
            '.entry-content p',
            'main p',
            'p'
        ];

        for (const selector of contentSelectors) {
            $(selector).each((i, elem) => {
                const text = $(elem).text().trim();
                if (text.length > 50 && this.containsValveKeywords(text.toLowerCase(), valveKeywords)) {
                    relevantContent += text + '\n\n';
                }
            });
            
            if (relevantContent.length > 0) break; // Use first successful selector
        }

        // If no paragraph content found, try headings and other elements
        if (relevantContent.length < 100) {
            $('h1, h2, h3, h4, h5, h6, li, td').each((i, elem) => {
                const text = $(elem).text().trim();
                if (text.length > 20 && this.containsValveKeywords(text.toLowerCase(), valveKeywords)) {
                    relevantContent += text + '\n';
                }
            });
        }

        return relevantContent.trim().substring(0, 10000); // Limit to 10k characters
    }

    /**
     * Check if text contains valve-related keywords
     * @param {string} text - Text to check
     * @param {Array<string>} keywords - Keywords to search for
     * @returns {boolean} - True if keywords found
     */
    containsValveKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    }

    /**
     * Calculate relevance score based on keyword density
     * @param {string} text - Text to analyze
     * @returns {number} - Relevance score (0-100)
     */
    calculateRelevanceScore(text) {
        if (!text || text.length === 0) return 0;
        
        const valveKeywords = [
            'valve', 'valves', 'ball valve', 'gate valve', 'control valve',
            'flow control', 'pressure', 'industrial', 'maintenance', 'repair'
        ];
        
        const words = text.toLowerCase().split(/\s+/);
        const keywordMatches = words.filter(word => 
            valveKeywords.some(keyword => keyword.includes(word) || word.includes(keyword))
        ).length;
        
        const score = Math.min(100, (keywordMatches / words.length) * 1000);
        return Math.round(score);
    }

    /**
     * Crawl all configured sources
     * @returns {Promise<Array>} - Array of crawled content objects
     */
    async crawlAll() {
        console.log(`Starting crawl of ${this.sources.length} sources...`);
        const startTime = Date.now();
        
        try {
            const results = await Promise.allSettled(
                this.sources.map(url => this.crawlSingle(url))
            );

            const processedResults = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return {
                        url: this.sources[index],
                        title: null,
                        content: null,
                        metadata: {
                            url: this.sources[index],
                            crawledAt: new Date().toISOString(),
                            error: result.reason?.message || 'Unknown error'
                        },
                        success: false
                    };
                }
            });

            const successCount = processedResults.filter(r => r.success).length;
            const totalTime = Date.now() - startTime;

            console.log(`Crawl completed: ${successCount}/${this.sources.length} sources successful in ${totalTime}ms`);

            // Log activity for audit trail
            await logActivity(
                null, // No specific user for system tasks
                'CRAWLER_EXECUTION',
                {
                    sourcesAttempted: this.sources.length,
                    sourcesSuccessful: successCount,
                    executionTimeMs: totalTime,
                    timestamp: new Date().toISOString()
                },
                successCount > 0 ? 'SUCCESS' : 'FAILURE'
            );

            return processedResults;

        } catch (error) {
            console.error('Error during crawl execution:', error);
            
            await logActivity(
                null,
                'CRAWLER_EXECUTION',
                {
                    sourcesAttempted: this.sources.length,
                    error: error.message,
                    timestamp: new Date().toISOString()
                },
                'FAILURE'
            );

            throw error;
        }
    }

    /**
     * Add a new source URL to crawl
     * @param {string} url - URL to add
     */
    addSource(url) {
        if (url && !this.sources.includes(url)) {
            this.sources.push(url);
            console.log(`Added new crawl source: ${url}`);
        }
    }

    /**
     * Remove a source URL
     * @param {string} url - URL to remove
     */
    removeSource(url) {
        const index = this.sources.indexOf(url);
        if (index > -1) {
            this.sources.splice(index, 1);
            console.log(`Removed crawl source: ${url}`);
        }
    }

    /**
     * Get current list of sources
     * @returns {Array<string>} - Current source URLs
     */
    getSources() {
        return [...this.sources];
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ValveCrawler;