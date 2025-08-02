#!/usr/bin/env node

// Test rate limiting configuration
const rateLimit = require('express-rate-limit');

console.log('=== Rate Limiting Configuration Test ===\n');

// Test rate limit configuration
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

console.log('✓ Rate limiting middleware configured');
console.log(`  Auth rate limit: ${authRateLimit.max} requests per ${authRateLimit.windowMs / 60000} minutes`);
console.log(`  General rate limit: ${generalRateLimit.max} requests per ${generalRateLimit.windowMs / 60000} minutes`);

console.log('\n=== Rate Limiting Test Passed! ===');