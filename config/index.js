import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Centralized configuration module
 * Validates and exports all environment variables used across the application
 */

// Required environment variables
const requiredVars = [
  'PRIVATE_KEY',
  'RPC_URL', 
  'CONTRACT_ADDRESS',
  'EMAIL_USER',
  'EMAIL_PASS'
];

// Optional environment variables with defaults
const optionalVars = {
  PORT: 3000,
  EMAIL_SERVICE: 'Gmail'
};

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required variable is missing
 */
function validateConfig() {
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Validate configuration on module load
validateConfig();

// Export centralized configuration object
export const config = {
  // Server configuration
  port: parseInt(process.env.PORT) || optionalVars.PORT,
  
  // Blockchain configuration  
  blockchain: {
    privateKey: process.env.PRIVATE_KEY,
    rpcUrl: process.env.RPC_URL,
    contractAddress: process.env.CONTRACT_ADDRESS
  },
  
  // Email configuration
  email: {
    service: process.env.EMAIL_SERVICE || optionalVars.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

// Export validation function for testing
export { validateConfig };