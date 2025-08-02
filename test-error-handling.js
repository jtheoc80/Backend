// Test script to verify error handling
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testErrorHandling() {
    console.log('Testing error handling...\n');
    
    const tests = [
        {
            name: 'Test 404 - Route not found',
            url: `${API_BASE}/api/non-existent-route`,
            method: 'GET',
            expectedStatus: 404
        },
        {
            name: 'Test 400 - Missing required fields',
            url: `${API_BASE}/api/register-valve`,
            method: 'POST',
            body: { serialNumber: 'ABC123' }, // missing details
            expectedStatus: 400
        },
        {
            name: 'Test 200 - Health check',
            url: `${API_BASE}/api/health`,
            method: 'GET',
            expectedStatus: 200
        }
    ];
    
    for (const test of tests) {
        try {
            console.log(`🧪 ${test.name}`);
            
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
            console.log(`   Status: ${response.status} ${statusMatch ? '✅' : '❌'}`);
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            console.log();
            
        } catch (error) {
            console.log(`   Error: ${error.message} ❌`);
            console.log();
        }
    }
}

// Check if we can reach the server
async function checkServer() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        if (response.ok) {
            console.log('✅ Server is running, starting tests...\n');
            await testErrorHandling();
        } else {
            console.log('❌ Server returned non-OK response');
        }
    } catch (error) {
        console.log('❌ Server is not running. Please start the server first.');
        console.log('   Run: node index.js');
    }
}

checkServer();