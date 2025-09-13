# Variables for Redis module

variable "name_prefix" {
  description = "Name prefix for all resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Redis will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Redis subnet group"
  type        = list(string)
}

variable "redis_node_type" {
  description = "The compute and memory capacity of the nodes"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "The number of cache nodes"
  type        = number
  default     = 1
}

variable "redis_parameter_group" {
  description = "The name of the parameter group to associate with this cache cluster"
  type        = string
  default     = "default.redis7"
}

variable "redis_port" {
  description = "The port number on which each of the cache nodes will accept connections"
  type        = number
  default     = 6379
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access Redis"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}