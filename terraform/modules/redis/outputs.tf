# Outputs for Redis module

output "cluster_id" {
  description = "ID of the ElastiCache cluster"
  value       = aws_elasticache_cluster.redis.cluster_id
}

output "cluster_address" {
  description = "DNS name of the cache cluster without the port appended"
  value       = aws_elasticache_cluster.redis.cluster_address
}

output "port" {
  description = "The port number on which the cache nodes are listening"
  value       = aws_elasticache_cluster.redis.port
}

output "parameter_group_name" {
  description = "The name of the parameter group associated with the cache cluster"
  value       = aws_elasticache_cluster.redis.parameter_group_name
}

output "security_group_id" {
  description = "ID of the security group associated with the Redis cluster"
  value       = aws_security_group.redis.id
}

output "subnet_group_name" {
  description = "Name of the subnet group associated with the cache cluster"
  value       = aws_elasticache_subnet_group.redis.name
}

output "auth_token_secret_arn" {
  description = "ARN of the secret containing Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth.arn
  sensitive   = true
}

output "connection_string" {
  description = "Redis connection string"
  value       = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_cluster.redis.cluster_address}:${aws_elasticache_cluster.redis.port}"
  sensitive   = true
}