# Redis ElastiCache Module for describe_it

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.subnet_ids

  tags = var.tags
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.name_prefix}-redis-"
  vpc_id      = var.vpc_id
  description = "Security group for Redis ElastiCache cluster"

  ingress {
    description     = "Redis from allowed security groups"
    from_port       = var.redis_port
    to_port         = var.redis_port
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-sg"
  })
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.name_prefix}-redis-auth"
  description = "Redis authentication token"
  
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = random_password.redis_auth_token.result
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.name_prefix}-redis"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_cache_nodes
  parameter_group_name = var.redis_parameter_group
  port                 = var.redis_port
  
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Enable auth token
  auth_token                 = random_password.redis_auth_token.result
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  
  # Maintenance window
  maintenance_window = "sun:03:00-sun:04:00"
  
  # Snapshot settings
  snapshot_retention_limit = 3
  snapshot_window         = "01:00-03:00"
  
  # Backup settings
  final_snapshot_identifier = "${var.name_prefix}-redis-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.name_prefix}-redis/slow-log"
  retention_in_days = 7

  tags = var.tags
}