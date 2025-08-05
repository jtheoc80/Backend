#!/bin/bash

# GCP Deployment Script for ValveChain Backend

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="valvechain-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Deploying ValveChain Backend to Google Cloud Run..."
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"

# Authenticate with Google Cloud (if not already authenticated)
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set the project
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Build and push the container image
echo "Building container image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Create secrets (if they don't exist)
echo "Creating secrets..."
gcloud secrets create valvechain-private-key --data-file=- <<< "your_private_key_here" || echo "Secret already exists"
gcloud secrets create valvechain-jwt-secret --data-file=- <<< "your-jwt-secret-here" || echo "Secret already exists"
gcloud secrets create valvechain-rpc-url --data-file=- <<< "https://sepolia.infura.io/v3/your-key" || echo "Secret already exists"
gcloud secrets create valvechain-contract-address --data-file=- <<< "0xYourValveChainContractAddress" || echo "Secret already exists"
gcloud secrets create valvechain-po-contract-address --data-file=- <<< "0xYourPurchaseOrderContractAddress" || echo "Secret already exists"
gcloud secrets create valvechain-fee-wallet-address --data-file=- <<< "0xYourFeeWalletAddress" || echo "Secret already exists"

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --concurrency 100 \
    --max-instances 100 \
    --min-instances 1 \
    --port 3000 \
    --set-env-vars NODE_ENV=production,PORT=3000 \
    --set-secrets PRIVATE_KEY=valvechain-private-key:latest,JWT_SECRET=valvechain-jwt-secret:latest,RPC_URL=valvechain-rpc-url:latest,CONTRACT_ADDRESS=valvechain-contract-address:latest,PO_CONTRACT_ADDRESS=valvechain-po-contract-address:latest,FEE_WALLET_ADDRESS=valvechain-fee-wallet-address:latest

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format "value(status.url)")

echo "Deployment completed successfully!"
echo "Service URL: ${SERVICE_URL}"
echo "Health check: ${SERVICE_URL}/api/health"