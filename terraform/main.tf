# Main Terraform configuration for describe_it infrastructure
# This file orchestrates all modules for production deployment

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "describe-it-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "describe-it"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

# Configure Kubernetes Provider
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# Configure Helm Provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# Data sources
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # EKS specific tags
  public_subnet_tags = {
    "kubernetes.io/cluster/${local.name_prefix}-cluster" = "shared"
    "kubernetes.io/role/elb"                            = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/${local.name_prefix}-cluster" = "shared"
    "kubernetes.io/role/internal-elb"                   = "1"
  }

  tags = local.common_tags
}

# EKS Cluster Module
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cluster endpoint configuration
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs

  # Cluster encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  # EKS Managed Node Group(s)
  eks_managed_node_group_defaults = {
    instance_types = var.node_instance_types
    
    attach_cluster_primary_security_group = true
    
    # Disabling and using externally provided security groups
    create_security_group = false
  }

  eks_managed_node_groups = {
    main = {
      name = "${local.name_prefix}-main"
      
      instance_types = var.node_instance_types
      
      min_size     = var.node_group_min_size
      max_size     = var.node_group_max_size
      desired_size = var.node_group_desired_size

      # Use latest EKS Optimized AMI
      ami_type = "AL2_x86_64"
      
      capacity_type = var.node_capacity_type

      # Remote access cannot be specified with a launch template
      remote_access = {
        ec2_ssh_key               = var.ec2_ssh_key
        source_security_group_ids = [aws_security_group.remote_access.id]
      }

      # Ensure that irsa permissions are created
      create_iam_role          = true
      iam_role_name            = "${local.name_prefix}-eks-node-group-role"
      iam_role_use_name_prefix = false
      iam_role_description     = "EKS managed node group IAM role"
      iam_role_tags = {
        Purpose = "Protector of the kubelet"
      }

      iam_role_additional_policies = {
        AmazonEKSWorkerNodePolicy          = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
        AmazonEKS_CNI_Policy              = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
        AmazonEC2ContainerRegistryReadOnly = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
      }
    }
  }

  # Security groups
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    
    egress_all = {
      description      = "Node all egress"
      protocol         = "-1"
      from_port        = 0
      to_port          = 0
      type             = "egress"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
    }
  }

  tags = local.common_tags
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.name_prefix}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# Security group for remote access
resource "aws_security_group" "remote_access" {
  name_prefix = "${local.name_prefix}-remote-access"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  tags = local.common_tags
}

# Redis Module
module "redis" {
  source = "./modules/redis"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnets
  
  redis_node_type         = var.redis_node_type
  redis_num_cache_nodes   = var.redis_num_cache_nodes
  redis_parameter_group   = var.redis_parameter_group
  redis_port              = var.redis_port
  
  allowed_security_groups = [module.eks.node_security_group_id]
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix = local.name_prefix
  cluster_name = module.eks.cluster_name
  
  # Prometheus configuration
  prometheus_storage_class = var.prometheus_storage_class
  prometheus_storage_size  = var.prometheus_storage_size
  
  # Grafana configuration
  grafana_admin_password = var.grafana_admin_password
  
  tags = local.common_tags
}

# Secrets Module
module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix
  
  # Application secrets
  openai_api_key              = var.openai_api_key
  supabase_url               = var.supabase_url
  supabase_service_role_key  = var.supabase_service_role_key
  supabase_anon_key          = var.supabase_anon_key
  
  tags = local.common_tags
}