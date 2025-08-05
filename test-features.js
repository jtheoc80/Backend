/**
 * Basic test script to verify autoscaling and throttling features
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Testing Autoscaling and Throttling Features\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Health check passed');
    console.log(`   Status: ${healthResponse.data.status}`);
    console.log(`   Features enabled: ${Object.keys(healthResponse.data.features).filter(k => healthResponse.data.features[k]).join(', ')}`);
    console.log('');

    // Test 2: Autoscaling Metrics
    console.log('2. Testing Autoscaling Metrics...');
    const metricsResponse = await axios.get(`${API_BASE}/api/autoscaling/metrics`);
    console.log('✅ Autoscaling metrics retrieved');
    console.log(`   RPS: ${metricsResponse.data.rps.toFixed(2)}`);
    console.log(`   Memory Usage: ${metricsResponse.data.memoryUsagePercent.toFixed(1)}%`);
    console.log(`   Recommendations: ${metricsResponse.data.recommendations.length}`);
    console.log('');

    // Test 3: Rate Limiting Stats
    console.log('3. Testing Rate Limiting Stats...');
    const rateLimitResponse = await axios.get(`${API_BASE}/api/rate-limit/stats`);
    console.log('✅ Rate limiting stats retrieved');
    console.log(`   Redis enabled: ${rateLimitResponse.data.redisEnabled}`);
    console.log(`   Available tiers: ${rateLimitResponse.data.config.tiers.join(', ')}`);
    console.log('');

    // Test 4: Circuit Breaker Stats
    console.log('4. Testing Circuit Breaker Stats...');
    const circuitBreakerResponse = await axios.get(`${API_BASE}/api/circuit-breaker/stats`);
    console.log('✅ Circuit breaker stats retrieved');
    console.log(`   Total breakers: ${circuitBreakerResponse.data.totalBreakers}`);
    console.log(`   Cache size: ${circuitBreakerResponse.data.cacheSize}`);
    console.log('');

    // Test 5: Prometheus Metrics
    console.log('5. Testing Prometheus Metrics...');
    const prometheusResponse = await axios.get(`${API_BASE}/metrics`);
    console.log('✅ Prometheus metrics retrieved');
    console.log(`   Content length: ${prometheusResponse.data.length} characters`);
    console.log('');

    // Test 6: Rate Limiting (Multiple Requests)
    console.log('6. Testing Rate Limiting...');
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(axios.get(`${API_BASE}/api/health`));
    }
    
    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log('✅ Rate limiting test completed');
    console.log(`   Successful requests: ${successful}`);
    console.log(`   Failed/Limited requests: ${failed}`);
    console.log('');

    // Test 7: Different API Tiers
    console.log('7. Testing API Tier Headers...');
    
    const tierTests = ['free', 'premium', 'enterprise'];
    for (const tier of tierTests) {
      try {
        const response = await axios.get(`${API_BASE}/api/health`, {
          headers: { 'X-API-Tier': tier }
        });
        console.log(`   ✅ ${tier} tier: ${response.status}`);
      } catch (error) {
        console.log(`   ❌ ${tier} tier: ${error.response?.status || 'Error'}`);
      }
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests only if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };