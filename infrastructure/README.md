# AWS Deployment Instructions

This guide provides instructions on how to deploy the Sentiment-Driven Algorithmic Paper Trader to AWS.

## Prerequisites
- AWS Account
- AWS CLI installed and configured
- Docker installed locally

## Option 1: AWS Elastic Beanstalk (Easiest)

1. **Install the EB CLI**:
   ```bash
   pip install awsebcli
   ```
2. **Initialize EB in the root folder**:
   ```bash
   eb init -p docker
   ```
3. **Create an environment and deploy**:
   ```bash
   eb create sentiment-trader-env
   eb deploy
   ```

## Option 2: AWS ECS (Elastic Container Service) & Fargate (Scalable)

1. **Push Images to ECR (Elastic Container Registry)**:
   - Create two repositories in ECR: `sentiment-backend` and `sentiment-frontend`.
   - Build and push your images to these repos:
     ```bash
     aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com
     
     docker build -t sentiment-backend ./backend
     docker tag sentiment-backend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/sentiment-backend:latest
     docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/sentiment-backend:latest
     
     docker build -t sentiment-frontend ./frontend
     docker tag sentiment-frontend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/sentiment-frontend:latest
     docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/sentiment-frontend:latest
     ```

2. **Create an ECS Cluster**:
   - Go to the ECS Console and create a new cluster using AWS Fargate.

3. **Create Task Definitions**:
   - Create a task definition for the backend using the `sentiment-backend` image (expose port 8000).
   - Create a task definition for the frontend using the `sentiment-frontend` image (expose port 3000). Set `NEXT_PUBLIC_API_URL` to the backend service's URL.

4. **Create Services**:
   - Run the task definitions as Services within your ECS Cluster.
   - Use an Application Load Balancer (ALB) for the frontend if you want to expose it publicly over port 80/443.

## Option 3: EC2 Instance (Manual)

1. Launch an EC2 Instance (e.g., Ubuntu t3.medium).
2. SSH into the instance and install Docker & Docker Compose.
3. Clone this repository to the instance.
4. Run: `docker-compose up -d --build`
