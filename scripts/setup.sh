#!/bin/bash

# Development setup script for ValveChain Backend

set -e

echo "🚀 Setting up ValveChain Backend for development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or later.${NC}"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: ${NODE_VERSION}${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: ${NPM_VERSION}${NC}"
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker found: ${DOCKER_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found. Container features will not be available.${NC}"
fi

# Check Python (optional)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python found: ${PYTHON_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠️  Python not found. Python service features will not be available.${NC}"
fi

# Install Node.js dependencies
echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
npm install

# Setup environment file
echo -e "${BLUE}⚙️  Setting up environment configuration...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual configuration values${NC}"
else
    echo -e "${YELLOW}ℹ️  .env file already exists${NC}"
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p data logs uploads

# Initialize database (if needed)
echo -e "${BLUE}🗄️  Initializing database...${NC}"
if [ ! -f data/users.db ]; then
    echo -e "${GREEN}✅ Database will be initialized on first run${NC}"
else
    echo -e "${YELLOW}ℹ️  Database already exists${NC}"
fi

# Install Python dependencies (if Python is available)
if command -v python3 &> /dev/null && [ -f requirements.txt ]; then
    echo -e "${BLUE}🐍 Installing Python dependencies...${NC}"
    python3 -m pip install -r requirements.txt || echo -e "${YELLOW}⚠️  Failed to install Python dependencies${NC}"
fi

# Run tests to verify setup
echo -e "${BLUE}🧪 Running tests to verify setup...${NC}"
npm test || echo -e "${YELLOW}⚠️  Some tests failed, but setup can continue${NC}"

echo -e "${GREEN}🎉 Development setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "  1. Edit .env file with your configuration"
echo "  2. Run 'npm start' to start the development server"
echo "  3. Visit http://localhost:3000/api/health to verify it's running"
echo ""
echo -e "${BLUE}🐳 Docker commands:${NC}"
echo "  - Build: docker build -t valvechain-backend ."
echo "  - Run: docker-compose up"
echo ""
echo -e "${BLUE}☁️  Cloud deployment:${NC}"
echo "  - See CLOUD_DEPLOYMENT.md for detailed instructions"