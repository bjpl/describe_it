#!/bin/bash

# Production deployment script for describe_it
# This script handles the complete deployment process including validation,
# building, testing, and deploying to various environments

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-staging}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BUILD=${SKIP_BUILD:-false}
DRY_RUN=${DRY_RUN:-false}
VERBOSE=${VERBOSE:-false}

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Help function
show_help() {
    cat << EOF
Deployment Script for describe_it

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Target environment (development|staging|production) [default: staging]
    -s, --skip-tests        Skip running tests
    -b, --skip-build        Skip building application
    -d, --dry-run           Show what would be deployed without executing
    -v, --verbose           Enable verbose logging
    -h, --help              Show this help message

ENVIRONMENTS:
    development             Deploy to local/development environment
    staging                 Deploy to staging environment
    production              Deploy to production environment

EXAMPLES:
    $0 -e staging                    # Deploy to staging
    $0 -e production -v              # Deploy to production with verbose output
    $0 -e staging -s                 # Deploy to staging, skip tests
    $0 -d -e production              # Dry run for production deployment

ENVIRONMENT VARIABLES:
    DOCKER_REGISTRY         Container registry URL
    KUBECONFIG             Path to kubeconfig file
    AWS_PROFILE            AWS profile for cloud resources
    SKIP_CONFIRMATION      Skip deployment confirmation prompts
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -b|--skip-build)
                SKIP_BUILD=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1. Use -h for help."
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    log_info "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|staging|production)
            log_success "Environment validation passed"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    
    if [[ $ENVIRONMENT == "production" ]] || [[ $ENVIRONMENT == "staging" ]]; then
        command -v terraform >/dev/null 2>&1 || missing_tools+=("terraform")
        command -v aws >/dev/null 2>&1 || missing_tools+=("aws")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2)
    if [[ $(echo "$node_version" | cut -d'.' -f1) -lt 20 ]]; then
        log_error "Node.js version 20+ required, found: $node_version"
    fi
    
    log_success "Prerequisites check passed"
}

# Validate configuration
validate_config() {
    log_info "Validating configuration..."
    
    cd "$PROJECT_ROOT"
    
    # Validate environment configuration
    if [[ -f "scripts/validate-environment.js" ]]; then
        NODE_ENV=$ENVIRONMENT node scripts/validate-environment.js validate
        log_success "Environment configuration validation passed"
    else
        log_warning "Environment validation script not found"
    fi
    
    # Check required environment variables
    case $ENVIRONMENT in
        staging|production)
            if [[ -z "${OPENAI_API_KEY:-}" ]]; then
                log_error "OPENAI_API_KEY is required for $ENVIRONMENT"
            fi
            if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
                log_error "NEXT_PUBLIC_SUPABASE_URL is required for $ENVIRONMENT"
            fi
            ;;
    esac
}

# Run tests
run_tests() {
    if [[ $SKIP_TESTS == true ]]; then
        log_warning "Skipping tests"
        return 0
    fi
    
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # TypeScript check
    log_info "Running TypeScript check..."
    npm run typecheck
    
    # Linting
    log_info "Running linter..."
    npm run lint
    
    # Unit tests
    log_info "Running unit tests..."
    npm run test:run
    
    # Integration tests
    if [[ $ENVIRONMENT != "development" ]]; then
        log_info "Running integration tests..."
        npm run test:integration || log_warning "Integration tests failed (continuing)"
    fi
    
    log_success "Tests completed"
}

# Build application
build_application() {
    if [[ $SKIP_BUILD == true ]]; then
        log_warning "Skipping build"
        return 0
    fi
    
    log_info "Building application for $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export NODE_ENV=$ENVIRONMENT
    export NEXT_TELEMETRY_DISABLED=1
    
    # Build Next.js application
    log_info "Building Next.js application..."
    npm run build
    
    # Build Docker image
    local image_tag="describe_it:$ENVIRONMENT-$(git rev-parse --short HEAD)"
    
    log_info "Building Docker image: $image_tag"
    
    if [[ $ENVIRONMENT == "production" ]]; then
        docker build -f Dockerfile.production -t "$image_tag" .
    else
        docker build -f Dockerfile.dev -t "$image_tag" .
    fi
    
    # Tag for registry
    if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
        local registry_tag="$DOCKER_REGISTRY/$image_tag"
        docker tag "$image_tag" "$registry_tag"
        
        if [[ $DRY_RUN == false ]]; then
            log_info "Pushing to registry: $registry_tag"
            docker push "$registry_tag"
        fi
    fi
    
    log_success "Application built successfully"
}

# Deploy to development
deploy_development() {
    log_info "Deploying to development environment..."
    
    cd "$PROJECT_ROOT"
    
    if [[ $DRY_RUN == true ]]; then
        log_info "DRY RUN: Would start development services with Docker Compose"
        docker-compose -f docker-compose.dev.yml config
        return 0
    fi
    
    # Start development services
    docker-compose -f docker-compose.dev.yml up -d --build
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "Development deployment successful"
        log_info "Application available at: http://localhost:3000"
    else
        log_error "Health check failed"
    fi
}

# Deploy to staging/production
deploy_k8s() {
    local env=$1
    log_info "Deploying to $env environment..."
    
    cd "$PROJECT_ROOT"
    
    # Check kubectl context
    local current_context
    current_context=$(kubectl config current-context)
    log_info "Kubernetes context: $current_context"
    
    if [[ $env == "production" ]] && [[ $current_context != *"production"* ]]; then
        if [[ -z "${SKIP_CONFIRMATION:-}" ]]; then
            read -p "Deploy to production with context '$current_context'? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_error "Deployment cancelled"
            fi
        fi
    fi
    
    # Apply Kubernetes manifests
    local kustomize_path="k8s/overlays/$env"
    
    if [[ ! -d "$kustomize_path" ]]; then
        log_error "Kustomize overlay not found: $kustomize_path"
    fi
    
    if [[ $DRY_RUN == true ]]; then
        log_info "DRY RUN: Would apply Kubernetes manifests"
        kubectl kustomize "$kustomize_path"
        return 0
    fi
    
    # Apply manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -k "$kustomize_path"
    
    # Wait for rollout
    log_info "Waiting for deployment rollout..."
    kubectl rollout status deployment/describe-it-app -n describe-it --timeout=600s
    
    # Health check
    log_info "Performing health check..."
    local service_url
    if [[ $env == "production" ]]; then
        service_url="https://describe-it.com"
    else
        service_url="https://staging.describe-it.com"
    fi
    
    # Wait for service to be available
    for i in {1..30}; do
        if curl -f "$service_url/api/health" >/dev/null 2>&1; then
            log_success "$env deployment successful"
            log_info "Application available at: $service_url"
            return 0
        fi
        sleep 10
    done
    
    log_error "Health check failed after deployment"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    case $ENVIRONMENT in
        development)
            docker-compose -f docker-compose.dev.yml down
            ;;
        staging|production)
            kubectl rollout undo deployment/describe-it-app -n describe-it
            kubectl rollout status deployment/describe-it-app -n describe-it
            ;;
    esac
    
    log_success "Rollback completed"
}

# Main deployment function
deploy() {
    log_info "Starting deployment to $ENVIRONMENT environment"
    log_info "Dry run: $DRY_RUN"
    
    # Trap errors and rollback
    trap 'log_error "Deployment failed! Rolling back..."; rollback_deployment' ERR
    
    # Pre-deployment steps
    validate_environment
    check_prerequisites
    validate_config
    run_tests
    build_application
    
    # Environment-specific deployment
    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_k8s staging
            ;;
        production)
            deploy_k8s production
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            ;;
    esac
    
    # Post-deployment
    log_success "🚀 Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Commit: $(git rev-parse --short HEAD)"
    log_info "Time: $(date)"
    
    # Remove error trap
    trap - ERR
}

# Main execution
main() {
    parse_args "$@"
    deploy
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi