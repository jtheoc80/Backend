// Comprehensive error handling test
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function runTests() {
    console.log('🧪 Comprehensive Error Handling Test\n');
    
    const tests = [
        {
            name: 'Health Check (Success)',
            url: `${API_BASE}/api/health`,
            method: 'GET',
            expectedStatus: 200,
            expectSuccess: true
        },
        {
            name: '404 Error - Route Not Found',
            url: `${API_BASE}/api/non-existent`,
            method: 'GET',
            expectedStatus: 404,
            expectSuccess: false
        },
        {
            name: 'Async Error Test',
            url: `${API_BASE}/api/test-error`,
            method: 'GET',
            expectedStatus: 500,
            expectSuccess: false
        },
        {
            name: 'Validation Error - Missing Name',
            url: `${API_BASE}/api/test-validation`,
            method: 'POST',
            body: { email: 'test@example.com' },
            expectedStatus: 400,
            expectSuccess: false
        },
        {
            name: 'Validation Error - Invalid Email',
            url: `${API_BASE}/api/test-validation`,
            method: 'POST',
            body: { name: 'Test User', email: 'invalid-email' },
            expectedStatus: 400,
            expectSuccess: false
        },
        {
            name: 'Validation Success',
            url: `${API_BASE}/api/test-validation`,
            method: 'POST',
            body: { name: 'Test User', email: 'test@example.com' },
            expectedStatus: 200,
            expectSuccess: true
        },
        {
            name: 'Missing Required Fields',
            url: `${API_BASE}/api/register-valve`,
            method: 'POST',
            body: { serialNumber: 'TEST123' }, // missing details
            expectedStatus: 400,
            expectSuccess: false
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`\n🔧 ${test.name}`);
            
            const options = {
                method: test.method,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (test.body) {
                options.body = JSON.stringify(test.body);
            }
            
            const response = await fetch(test.url, options);
            const data = await response.json();
            
            const statusMatch = response.status === test.expectedStatus;
            const successMatch = test.expectSuccess ? data.success !== false : data.success === false;
            const testPassed = statusMatch && successMatch;
            
            console.log(`   Status: ${response.status} ${statusMatch ? '✅' : '❌'}`);
            console.log(`   Success Field: ${data.success} ${successMatch ? '✅' : '❌'}`);
            console.log(`   Overall: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
            
            if (data.error) {
                console.log(`   Error: ${data.error.message}`);
            }
            
            if (testPassed) {
                passed++;
            } else {
                failed++;
                console.log(`   Response:`, JSON.stringify(data, null, 2));
            }
            
        } catch (error) {
            console.log(`   Exception: ${error.message} ❌ FAIL`);
            failed++;
        }
    }
    
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log(`\n🎉 All tests passed! Error handling is working correctly.`);
    } else {
        console.log(`\n⚠️  Some tests failed. Please review the error handling implementation.`);
    }
}

runTests();