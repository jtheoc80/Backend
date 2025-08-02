import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates that a required environment variable is present
 * @param {string} name - Name of the environment variable
 * @param {string} value - Value of the environment variable
 * @throws {Error} If the environment variable is missing or empty
 */
function validateEnvVar(name, value) {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

// Extract environment variables
const {
  PRIVATE_KEY,
  RPC_URL,
  CONTRACT_ADDRESS,
  PORT,
  EMAIL_USER,
  EMAIL_PASS
} = process.env;

// Validate required environment variables
validateEnvVar('PRIVATE_KEY', PRIVATE_KEY);
validateEnvVar('RPC_URL', RPC_URL);
validateEnvVar('CONTRACT_ADDRESS', CONTRACT_ADDRESS);
validateEnvVar('EMAIL_USER', EMAIL_USER);
validateEnvVar('EMAIL_PASS', EMAIL_PASS);

// Export centralized configuration
const config = {
  // Blockchain configuration
  blockchain: {
    privateKey: PRIVATE_KEY,
    rpcUrl: RPC_URL,
    contractAddress: CONTRACT_ADDRESS
  },
  
  // Server configuration
  server: {
    port: PORT || 3000
  },
  
  // Email configuration
  email: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
};

export default config;