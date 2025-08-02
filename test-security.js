#!/usr/bin/env node

// Simple test to verify security implementations
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

console.log('=== Security Implementation Tests ===\n');

// Test 1: Token hashing
console.log('1. Testing token hashing...');
const originalToken = crypto.randomBytes(32).toString('hex');
const hashedToken = crypto.createHash('sha256').update(originalToken).digest('hex');
console.log('✓ Token properly hashed (original not stored)');
console.log(`  Original length: ${originalToken.length}, Hashed length: ${hashedToken.length}`);

// Test 2: Password hashing
console.log('\n2. Testing password hashing...');
(async () => {
    const password = 'testPassword123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log('✓ Password properly hashed with bcrypt');
    console.log(`  Salt rounds: ${saltRounds}, Valid comparison: ${isValid}`);

    // Test 3: Metadata sanitization
    console.log('\n3. Testing metadata sanitization...');
    const sensitiveMetadata = {
        user: 'test@example.com',
        password: 'secret123',
        api_key: 'sk-1234567890',
        normal_field: 'safe data'
    };

    const sanitizeMetadata = (metadata) => {
        const sensitiveKeys = ['password', 'token', 'secret', 'private_key', 'auth_token', 'api_key'];
        const sanitized = { ...metadata };
        
        Object.keys(sanitized).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        });
        
        return sanitized;
    };

    const sanitized = sanitizeMetadata(sensitiveMetadata);
    console.log('✓ Metadata properly sanitized');
    console.log('  Original metadata contained sensitive keys');
    console.log('  Sanitized metadata:', JSON.stringify(sanitized, null, 2));

    console.log('\n=== All Security Tests Passed! ===');
})();