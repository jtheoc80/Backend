#!/bin/bash

# Build script for ValveChain Backend

set -e

echo "🏗️  Building ValveChain Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGISTRY="valvechain"
TAG="latest"
PUSH=false
PLATFORM="linux/amd64"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --push)
      PUSH=true
      shift
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --registry REGISTRY  Container registry (default: valvechain)"
      echo "  --tag TAG           Image tag (default: latest)"
      echo "  --push              Push images to registry"
      echo "  --platform PLATFORM Target platform (default: linux/amd64)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Build images
BACKEND_IMAGE="${REGISTRY}/valvechain-backend:${TAG}"
PYTHON_IMAGE="${REGISTRY}/valvechain-python:${TAG}"

echo -e "${BLUE}📦 Building Node.js backend image...${NC}"
docker build -t "${BACKEND_IMAGE}" --platform "${PLATFORM}" .

echo -e "${BLUE}📦 Building Python service image...${NC}"
docker build -f Dockerfile.python -t "${PYTHON_IMAGE}" --platform "${PLATFORM}" .

echo -e "${GREEN}✅ Images built successfully:${NC}"
echo "  - ${BACKEND_IMAGE}"
echo "  - ${PYTHON_IMAGE}"

# Push if requested
if [ "$PUSH" = true ]; then
  echo -e "${YELLOW}🚀 Pushing images to registry...${NC}"
  docker push "${BACKEND_IMAGE}"
  docker push "${PYTHON_IMAGE}"
  echo -e "${GREEN}✅ Images pushed successfully${NC}"
fi

# Show image info
echo -e "${BLUE}📊 Image information:${NC}"
docker images | grep valvechain

echo -e "${GREEN}🎉 Build completed successfully!${NC}"