# Cloud Deployment Guide

This guide covers deploying the ValveChain Backend to various cloud providers.

## Prerequisites

- Docker installed locally
- Cloud provider CLI tools installed
- Proper authentication credentials configured

## Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual values:
   - Replace all placeholder values
   - Use strong, unique secrets
   - Never commit the actual `.env` file

## Container Building

Build the application containers:

```bash
# Build Node.js backend
docker build -t valvechain-backend .

# Build Python service (if needed separately)
docker build -f Dockerfile.python -t valvechain-python .

# Test locally with docker-compose
docker-compose up
```

## AWS Deployment

### Prerequisites
- AWS CLI installed and configured
- Terraform installed

### Deployment Steps

1. Navigate to AWS configuration:
   ```bash
   cd cloud/aws
   ```

2. Initialize Terraform:
   ```bash
   terraform init
   ```

3. Review and apply:
   ```bash
   terraform plan
   terraform apply
   ```

4. Update secrets in AWS Secrets Manager:
   - Navigate to AWS Console > Secrets Manager
   - Update `valvechain-app-secrets` with actual values
   - Update `valvechain-jwt-secret` with a strong secret

### Features
- **ECS Fargate** for container orchestration
- **Application Load Balancer** for traffic distribution
- **Secrets Manager** for secure credential storage
- **CloudWatch** for logging and monitoring
- **Auto-scaling** based on CPU/memory usage

### Estimated Costs
- ~$50-100/month for small production workload
- Costs scale with usage and resources

## Azure Deployment

### Prerequisites
- Azure CLI installed and configured
- Resource group created

### Deployment Steps

1. Login to Azure:
   ```bash
   az login
   ```

2. Create resource group (if not exists):
   ```bash
   az group create --name valvechain-rg --location eastus
   ```

3. Deploy using ARM template:
   ```bash
   az deployment group create \
     --resource-group valvechain-rg \
     --template-file cloud/azure/container-app.json \
     --parameters appName=valvechain environment=production
   ```

4. Update secrets in Azure:
   - Navigate to Azure Portal > Container Apps
   - Update environment variables and secrets

### Features
- **Container Apps** for serverless containers
- **Log Analytics** for monitoring
- **Auto-scaling** based on HTTP requests
- **Managed identity** for secure access

### Estimated Costs
- ~$30-80/month for small production workload
- Pay-per-use pricing model

## Google Cloud Platform Deployment

### Prerequisites
- Google Cloud SDK installed and configured
- Project created with billing enabled

### Deployment Steps

1. Run the deployment script:
   ```bash
   cd cloud/gcp
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. Or deploy manually:
   ```bash
   # Set variables
   export PROJECT_ID=your-project-id
   export REGION=us-central1
   
   # Build and deploy
   gcloud builds submit --tag gcr.io/${PROJECT_ID}/valvechain-backend
   gcloud run deploy valvechain-backend \
     --image gcr.io/${PROJECT_ID}/valvechain-backend \
     --platform managed \
     --region ${REGION} \
     --allow-unauthenticated
   ```

3. Update secrets:
   ```bash
   # Create secrets
   gcloud secrets create valvechain-private-key --data-file=-
   gcloud secrets create valvechain-jwt-secret --data-file=-
   ```

### Features
- **Cloud Run** for serverless containers
- **Secret Manager** for credential storage
- **Cloud Build** for CI/CD
- **Stackdriver** for monitoring
- **Auto-scaling** to zero when not in use

### Estimated Costs
- ~$20-60/month for small production workload
- True pay-per-use with generous free tier

## Kubernetes Deployment

### Prerequisites
- kubectl configured to access your cluster
- Kubernetes cluster running (EKS, AKS, GKE, or self-managed)

### Deployment Steps

1. Create namespace and secrets:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   
   # Create secrets (replace with actual values)
   kubectl create secret generic valvechain-secrets \
     --from-literal=PRIVATE_KEY=your_private_key \
     --from-literal=JWT_SECRET=your_jwt_secret \
     --from-literal=RPC_URL=your_rpc_url \
     -n valvechain
   ```

2. Deploy applications:
   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/pvc.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

3. Check deployment status:
   ```bash
   kubectl get pods -n valvechain
   kubectl get services -n valvechain
   ```

### Features
- **High availability** with multiple replicas
- **Persistent storage** for database files
- **Ingress controller** for external access
- **Health checks** and auto-restart
- **Horizontal Pod Autoscaling**

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. **Tests** the code on every PR
2. **Builds** container images on main branch pushes
3. **Deploys** to configured cloud environments
4. **Updates** services with new container versions

### Required Secrets

Add these secrets to your GitHub repository settings:

**Container Registry:**
- `CONTAINER_REGISTRY`: Your container registry URL
- `REGISTRY_USERNAME`: Registry username
- `REGISTRY_PASSWORD`: Registry password

**AWS:**
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: Deployment region

**Azure:**
- `AZURE_CREDENTIALS`: Service principal credentials JSON
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID
- `AZURE_RESOURCE_GROUP`: Resource group name

**GCP:**
- `GCP_SA_KEY`: Service account key JSON
- `GCP_PROJECT_ID`: Google Cloud project ID
- `GCP_REGION`: Deployment region

**Kubernetes:**
- `KUBE_CONFIG`: Base64-encoded kubeconfig file

## Monitoring and Maintenance

### Health Checks
- **Health endpoint**: `/api/health` - Basic health status
- **Ready endpoint**: `/api/ready` - Kubernetes readiness probe

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking with stack traces
- Cloud-native logging to stdout/stderr

### Metrics
- Application metrics via health endpoints
- Cloud provider native monitoring
- Custom metrics can be added using Prometheus

### Security
- Secrets stored in cloud-native secret stores
- Non-root container users
- Resource limits and quotas
- Network policies (Kubernetes)

### Scaling
- **Horizontal scaling**: Increase replica count
- **Vertical scaling**: Increase CPU/memory limits
- **Auto-scaling**: Based on CPU, memory, or HTTP requests

## Troubleshooting

### Common Issues

1. **Database initialization failures**:
   - Check persistent volume permissions
   - Verify database path in environment variables

2. **Connection timeouts**:
   - Check security group/firewall rules
   - Verify network connectivity

3. **Secret access errors**:
   - Confirm IAM permissions for secret access
   - Check secret names match configuration

4. **Image pull failures**:
   - Verify container registry authentication
   - Check image tags and availability

### Debug Commands

```bash
# Check logs
kubectl logs -f deployment/valvechain-backend -n valvechain

# Access container
kubectl exec -it deployment/valvechain-backend -n valvechain -- /bin/sh

# Check resources
kubectl describe pod <pod-name> -n valvechain
```

## Cost Optimization

1. **Right-size resources**: Start small and scale as needed
2. **Use auto-scaling**: Scale down during low usage
3. **Optimize images**: Use multi-stage builds and Alpine base images
4. **Monitor usage**: Set up billing alerts
5. **Use spot instances**: For non-critical workloads (AWS/GCP)

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use least privilege** IAM policies
3. **Enable encryption** at rest and in transit
4. **Regular security updates** for base images
5. **Network segmentation** with proper security groups
6. **Audit logging** enabled for all services