#!/usr/bin/env node

/**
 * ValveGPT Self-Learning Demo Script
 * 
 * This script demonstrates the self-learning capabilities of the ValveGPT system.
 * It shows how content is crawled, processed, and made searchable.
 */

const ValveCrawler = require('./crawler');
const ValveContentIngestor = require('./ingest');
const ValveGPTScheduler = require('./scheduler');

async function demo() {
    console.log('🔧 ValveGPT Self-Learning System Demo');
    console.log('=====================================\n');

    try {
        // 1. Basic Crawler Demo
        console.log('1️⃣  Testing Content Crawler...');
        const crawler = new ValveCrawler();
        
        // Add a demo source for testing
        crawler.addSource('https://httpbin.org/html'); // Returns HTML for testing
        
        console.log(`   📡 Configured ${crawler.getSources().length} sources`);
        console.log('   🔍 Sources:', crawler.getSources().slice(0, 2).map(s => s.substring(0, 30) + '...'));

        // 2. Content Ingestor Demo (without API calls)
        console.log('\n2️⃣  Testing Content Ingestor...');
        const ingestor = new ValveContentIngestor();
        
        // Simulate processing without actual API calls
        const mockContent = [{
            success: true,
            title: 'Ball Valve Maintenance Guide',
            url: 'https://example.com/ball-valve-guide',
            content: 'Ball valves are quarter-turn valves used to control flow in pipelines. Regular maintenance includes checking seals, lubricating actuators, and testing pressure ratings. Proper maintenance extends valve life and ensures safety compliance.',
            metadata: {
                crawledAt: new Date().toISOString(),
                relevanceScore: 95,
                wordCount: 35
            }
        }];

        console.log('   📄 Mock content prepared for processing');
        console.log('   🎯 Content relevance score:', mockContent[0].metadata.relevanceScore);

        // 3. Scheduler Demo
        console.log('\n3️⃣  Testing Scheduler Integration...');
        const scheduler = new ValveGPTScheduler();
        
        console.log('   ⏰ Scheduler initialized');
        console.log('   📊 Default schedule: Every 6 hours (0 */6 * * *)');
        
        const status = scheduler.getStatus();
        console.log('   📈 Current status:', {
            isActive: status.isActive,
            totalRuns: status.stats.totalRuns,
            sourcesConfigured: status.crawlerSources.length
        });

        // 4. Content Processing Simulation
        console.log('\n4️⃣  Simulating Content Processing Flow...');
        
        // Calculate relevance score
        const text = mockContent[0].title + ' ' + mockContent[0].content;
        const relevanceScore = calculateMockRelevanceScore(text);
        console.log('   🎯 Calculated relevance score:', relevanceScore);
        
        // Generate mock embedding dimensions
        const embeddingDimensions = 1536; // OpenAI text-embedding-3-small dimensions
        console.log('   🧠 Embedding dimensions:', embeddingDimensions);
        
        // Simulate search capability
        console.log('   🔍 Search capability: Ready for semantic search');

        // 5. API Endpoints Demo
        console.log('\n5️⃣  Available API Endpoints:');
        const endpoints = [
            'GET  /api/valvegpt/status - Get system status and statistics',
            'POST /api/valvegpt/run-once - Manually trigger crawl and ingest',
            'POST /api/valvegpt/search - Search for valve-related content',
            'POST /api/valvegpt/sources - Update crawler sources'
        ];
        
        endpoints.forEach(endpoint => {
            console.log('   🌐', endpoint);
        });

        // 6. Configuration Options
        console.log('\n6️⃣  Environment Configuration:');
        const config = [
            'OPENAI_API_KEY - Required for content summarization and embeddings',
            'PINECONE_API_KEY - Optional for vector database (falls back to local storage)',
            'PINECONE_INDEX_NAME - Pinecone index name for embeddings',
            'VALVEGPT_AUTO_START - Auto-start scheduler on server startup (default: true)',
            'VALVEGPT_SCHEDULE - Cron schedule for automatic updates (default: 0 */6 * * *)'
        ];
        
        config.forEach(item => {
            console.log('   ⚙️ ', item);
        });

        console.log('\n✅ Demo completed successfully!');
        console.log('\n💡 To use with real API keys:');
        console.log('   1. Set OPENAI_API_KEY in your .env file');
        console.log('   2. Optionally set PINECONE_API_KEY and PINECONE_INDEX_NAME');
        console.log('   3. Start the server: npm start');
        console.log('   4. The system will automatically crawl and learn from valve industry sources');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    }
}

/**
 * Calculate a mock relevance score for demonstration
 */
function calculateMockRelevanceScore(text) {
    const valveKeywords = [
        'valve', 'valves', 'ball valve', 'gate valve', 'control valve',
        'flow control', 'pressure', 'maintenance', 'repair', 'pipeline'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const keywordMatches = words.filter(word => 
        valveKeywords.some(keyword => keyword.includes(word) || word.includes(keyword))
    ).length;
    
    const score = Math.min(100, (keywordMatches / words.length) * 1000);
    return Math.round(score);
}

// Run demo if called directly
if (require.main === module) {
    demo().catch(console.error);
}

module.exports = { demo };