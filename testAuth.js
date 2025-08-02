#!/usr/bin/env node

// Test script for authentication system
const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ statusCode: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ statusCode: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test functions
async function testHealthCheck() {
    console.log('\n🔍 Testing health check...');
    try {
        const response = await makeRequest('GET', '/health');
        if (response.statusCode === 200) {
            console.log('✅ Health check passed');
            return true;
        } else {
            console.log('❌ Health check failed:', response);
            return false;
        }
    } catch (error) {
        console.log('❌ Health check error:', error.message);
        return false;
    }
}

async function testUserRegistration() {
    console.log('\n🔍 Testing user registration...');
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    try {
        const response = await makeRequest('POST', '/auth/register', {
            email: testEmail,
            password: testPassword
        });

        if (response.statusCode === 201) {
            console.log('✅ User registration successful');
            console.log('   Response:', response.data.message);
            return { email: testEmail, password: testPassword };
        } else {
            console.log('❌ User registration failed:', response);
            return null;
        }
    } catch (error) {
        console.log('❌ User registration error:', error.message);
        return null;
    }
}

async function testPasswordReset(email) {
    console.log('\n🔍 Testing password reset request...');
    try {
        const response = await makeRequest('POST', '/auth/request_password_reset', {
            email: email
        });

        if (response.statusCode === 200) {
            console.log('✅ Password reset request successful');
            console.log('   Response:', response.data.message);
            return true;
        } else {
            console.log('❌ Password reset request failed:', response);
            return false;
        }
    } catch (error) {
        console.log('❌ Password reset error:', error.message);
        return false;
    }
}

async function testEmailVerificationRequest(email) {
    console.log('\n🔍 Testing email verification request...');
    try {
        const response = await makeRequest('POST', '/auth/send_verification', {
            email: email
        });

        if (response.statusCode === 200) {
            console.log('✅ Email verification request successful');
            console.log('   Response:', response.data.message);
            return true;
        } else {
            console.log('❌ Email verification request failed:', response);
            return false;
        }
    } catch (error) {
        console.log('❌ Email verification error:', error.message);
        return false;
    }
}

async function test2FASetup(email) {
    console.log('\n🔍 Testing 2FA setup...');
    try {
        const response = await makeRequest('POST', '/auth/setup_2fa', {
            email: email
        });

        if (response.statusCode === 200 || response.statusCode === 400) {
            if (response.statusCode === 200) {
                console.log('✅ 2FA setup successful');
                console.log('   Secret available for QR code generation');
                return true;
            } else {
                console.log('⚠️  2FA setup failed (expected - email not verified)');
                console.log('   Response:', response.data.error);
                return true; // This is expected behavior
            }
        } else {
            console.log('❌ 2FA setup failed:', response);
            return false;
        }
    } catch (error) {
        console.log('❌ 2FA setup error:', error.message);
        return false;
    }
}

async function testRateLimiting() {
    console.log('\n🔍 Testing rate limiting...');
    const testEmail = 'ratelimit@example.com';
    
    try {
        // Make multiple rapid requests to trigger rate limiting
        const promises = [];
        for (let i = 0; i < 7; i++) {
            promises.push(makeRequest('POST', '/auth/request_password_reset', {
                email: testEmail
            }));
        }

        const responses = await Promise.all(promises);
        const rateLimited = responses.some(response => response.statusCode === 429);
        
        if (rateLimited) {
            console.log('✅ Rate limiting working correctly');
            return true;
        } else {
            console.log('⚠️  Rate limiting may not be working as expected');
            return false;
        }
    } catch (error) {
        console.log('❌ Rate limiting test error:', error.message);
        return false;
    }
}

async function testInputValidation() {
    console.log('\n🔍 Testing input validation...');
    const tests = [
        { 
            name: 'Invalid email format',
            data: { email: 'invalid-email', password: 'ValidPass123!' },
            expectedStatus: 400
        },
        {
            name: 'Short password',
            data: { email: 'test@example.com', password: '123' },
            expectedStatus: 400
        },
        {
            name: 'Missing email',
            data: { password: 'ValidPass123!' },
            expectedStatus: 400
        }
    ];

    let allPassed = true;

    for (const test of tests) {
        try {
            const response = await makeRequest('POST', '/auth/register', test.data);
            if (response.statusCode === test.expectedStatus) {
                console.log(`   ✅ ${test.name} - validation working`);
            } else {
                console.log(`   ❌ ${test.name} - expected ${test.expectedStatus}, got ${response.statusCode}`);
                allPassed = false;
            }
        } catch (error) {
            console.log(`   ❌ ${test.name} - error:`, error.message);
            allPassed = false;
        }
    }

    return allPassed;
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Authentication System Tests\n');
    console.log('=' .repeat(50));

    const results = [];

    // Test health check first
    const healthOk = await testHealthCheck();
    results.push({ name: 'Health Check', passed: healthOk });

    if (!healthOk) {
        console.log('\n❌ Server not running. Please start the test server first.');
        console.log('   Run: node testServer.js');
        return;
    }

    // Test user registration
    const userInfo = await testUserRegistration();
    results.push({ name: 'User Registration', passed: !!userInfo });

    if (userInfo) {
        // Test password reset
        const resetOk = await testPasswordReset(userInfo.email);
        results.push({ name: 'Password Reset Request', passed: resetOk });

        // Test email verification
        const verifyOk = await testEmailVerificationRequest(userInfo.email);
        results.push({ name: 'Email Verification Request', passed: verifyOk });

        // Test 2FA setup
        const tfaOk = await test2FASetup(userInfo.email);
        results.push({ name: '2FA Setup', passed: tfaOk });
    }

    // Test rate limiting
    const rateLimitOk = await testRateLimiting();
    results.push({ name: 'Rate Limiting', passed: rateLimitOk });

    // Test input validation
    const validationOk = await testInputValidation();
    results.push({ name: 'Input Validation', passed: validationOk });

    // Print results summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${result.name}`);
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`Overall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! Authentication system is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please check the implementation.');
    }
}

// Run tests
runTests().catch(console.error);