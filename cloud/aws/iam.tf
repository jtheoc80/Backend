# IAM Roles and Policies for ECS

# ECS Execution Role
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.app_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-ecs-execution-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.app_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-ecs-task-role"
    Environment = var.environment
  }
}

# Secrets Manager Access
resource "aws_iam_policy" "secrets_access" {
  name        = "${var.app_name}-secrets-access"
  description = "Policy for accessing secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.app_secrets.arn,
          aws_secretsmanager_secret.jwt_secret.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_secrets" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.app_name}-app-secrets"
  description = "Application secrets for ValveChain"

  tags = {
    Name        = "${var.app_name}-app-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    PRIVATE_KEY         = "your_private_key_here"
    RPC_URL            = "https://sepolia.infura.io/v3/your-key"
    CONTRACT_ADDRESS   = "0xYourValveChainContractAddress"
    PO_CONTRACT_ADDRESS = "0xYourPurchaseOrderContractAddress"
    FEE_WALLET_ADDRESS = "0xYourFeeWalletAddress"
    PINECONE_API_KEY   = "your-pinecone-api-key-here"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.app_name}-jwt-secret"
  description = "JWT secret for ValveChain"

  tags = {
    Name        = "${var.app_name}-jwt-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "your-jwt-secret-here"

  lifecycle {
    ignore_changes = [secret_string]
  }
}