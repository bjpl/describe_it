# Outputs for describe_it Terraform configuration

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

# EKS Outputs
output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

# Redis Outputs
output "redis_cluster_id" {
  description = "ID of the ElastiCache cluster"
  value       = module.redis.cluster_id
}

output "redis_cluster_address" {
  description = "DNS name of the cache cluster without the port appended"
  value       = module.redis.cluster_address
}

output "redis_port" {
  description = "The port number on which the cache nodes are listening"
  value       = module.redis.port
}

output "redis_parameter_group_name" {
  description = "The name of the parameter group associated with the cache cluster"
  value       = module.redis.parameter_group_name
}

# Monitoring Outputs
output "prometheus_service_name" {
  description = "Name of the Prometheus service"
  value       = module.monitoring.prometheus_service_name
}

output "grafana_service_name" {
  description = "Name of the Grafana service"
  value       = module.monitoring.grafana_service_name
}

output "monitoring_namespace" {
  description = "Kubernetes namespace for monitoring stack"
  value       = module.monitoring.namespace
}

# Secrets Outputs
output "secrets_manager_arns" {
  description = "ARNs of AWS Secrets Manager secrets"
  value       = module.secrets.secrets_manager_arns
  sensitive   = true
}

# KMS Outputs
output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the KMS key"
  value       = aws_kms_key.eks.arn
}

output "kms_key_id" {
  description = "The globally unique identifier for the KMS key"
  value       = aws_kms_key.eks.key_id
}

# Security Group Outputs
output "remote_access_security_group_id" {
  description = "ID of the security group for remote access"
  value       = aws_security_group.remote_access.id
}

# Account and Region Info
output "aws_caller_identity" {
  description = "AWS caller identity"
  value = {
    account_id = data.aws_caller_identity.current.account_id
    arn        = data.aws_caller_identity.current.arn
    user_id    = data.aws_caller_identity.current.user_id
  }
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

# kubectl config command
output "kubectl_config_command" {
  description = "kubectl config command to configure access to the EKS cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}