# HashiCorp Vault configuration for describe_it secrets management

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

# Disable mlock for containerized environment
disable_mlock = true

# API address
api_addr = "http://0.0.0.0:8200"

# Cluster address (for HA setup)
cluster_addr = "http://0.0.0.0:8201"

# UI configuration
ui = true

# Logging
log_level = "Info"

# Default lease settings
default_lease_ttl = "768h"
max_lease_ttl = "8760h"

# Plugin directory
plugin_directory = "/vault/plugins"

# Entropy augmentation (recommended for production)
# entropy "seal" {
#   mode = "augmentation"
# }

# Auto-unseal configuration (for production)
# seal "awskms" {
#   region     = "us-east-1"
#   kms_key_id = "12345678-1234-1234-1234-123456789012"
# }

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}