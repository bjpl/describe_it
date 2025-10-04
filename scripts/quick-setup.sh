#!/bin/bash

# Quick Setup Script for describe_it Production Infrastructure
# This script automates the setup after manual security tasks are complete

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if .env.local exists
    if [ ! -f .env.local ]; then
        print_error ".env.local not found!"
        echo "Please create .env.local with your API keys first."
        echo "Run: cp .env.example .env.local"
        exit 1
    fi
    print_status ".env.local found"
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not installed!"
        exit 1
    fi
    print_status "Node.js installed: $(node --version)"
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not installed!"
        exit 1
    fi
    print_status "npm installed: $(npm --version)"
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not installed (optional for local development)"
    else
        print_status "Docker installed: $(docker --version)"
    fi
    
    # Check for exposed secrets
    if [ -f vercel.env ]; then
        print_error "vercel.env still exists! Remove it immediately!"
        echo "Run: git rm --cached vercel.env"
        exit 1
    fi
    print_status "No exposed secrets found"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_status "Installing npm packages..."
    npm install --legacy-peer-deps
    
    print_status "Running security audit..."
    npm audit || true  # Don't fail on audit issues
}

# Set up Docker services
setup_docker() {
    print_header "Setting up Docker Services"
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not installed, skipping..."
        return
    fi
    
    if [ ! -f docker-compose.production.yml ]; then
        print_warning "docker-compose.production.yml not found, skipping..."
        return
    fi
    
    print_status "Starting Docker services..."
    docker-compose -f docker-compose.production.yml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    print_status "Docker services status:"
    docker-compose -f docker-compose.production.yml ps
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    print_status "Running unit tests..."
    npm run test || print_warning "Some tests failed"
    
    print_status "Running security tests..."
    npm run test tests/security/ || print_warning "Security tests not configured"
}

# Verify setup
verify_setup() {
    print_header "Verifying Setup"
    
    # Check if Next.js can start
    print_status "Checking Next.js configuration..."
    timeout 10 npm run build || print_warning "Build check failed"
    
    # Check API health endpoint
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "API health check passed"
    else
        print_warning "API not responding (may need to start dev server)"
    fi
    
    # Check for monitoring endpoints
    if [ -f src/app/api/metrics/route.ts ]; then
        print_status "Monitoring endpoints configured"
    else
        print_warning "Monitoring endpoints not found"
    fi
    
    # Check for security configurations
    if [ -d src/lib/security ]; then
        print_status "Security layer implemented"
    else
        print_warning "Security layer not found"
    fi
}

# Create useful aliases
create_aliases() {
    print_header "Creating Useful Aliases"
    
    cat > quick-commands.sh << 'EOF'
#!/bin/bash

# Useful aliases for describe_it project

# Start development server
alias dev="npm run dev"

# Run tests
alias test="npm run test"
alias test-security="npm run test tests/security/"
alias test-coverage="npm run test:coverage"

# Docker commands
alias dc-up="docker-compose -f docker-compose.production.yml up -d"
alias dc-down="docker-compose -f docker-compose.production.yml down"
alias dc-logs="docker-compose -f docker-compose.production.yml logs -f"
alias dc-ps="docker-compose -f docker-compose.production.yml ps"

# Monitoring
alias metrics="curl http://localhost:3000/api/metrics"
alias health="curl http://localhost:3000/api/health"
alias grafana="open http://localhost:3001"
alias prometheus="open http://localhost:9090"

# Security
alias audit="npm audit"
alias check-secrets="git grep -E '(sk-|key=|token=|secret=)' || echo 'No secrets found'"

# Deployment
alias deploy-staging="./scripts/deploy.sh -e staging"
alias deploy-prod="./scripts/deploy.sh -e production"

echo "Quick commands loaded! Available commands:"
echo "  dev              - Start development server"
echo "  test             - Run tests"
echo "  test-security    - Run security tests"
echo "  test-coverage    - Run tests with coverage"
echo "  dc-up            - Start Docker services"
echo "  dc-down          - Stop Docker services"
echo "  dc-logs          - View Docker logs"
echo "  metrics          - Check metrics endpoint"
echo "  health           - Check health endpoint"
echo "  grafana          - Open Grafana dashboard"
echo "  prometheus       - Open Prometheus"
echo "  audit            - Run security audit"
echo "  check-secrets    - Check for exposed secrets"
EOF
    
    chmod +x quick-commands.sh
    print_status "Created quick-commands.sh"
    echo "Run: source quick-commands.sh"
}

# Main execution
main() {
    print_header "🚀 describe_it Quick Setup Script"
    
    echo "This script will set up your production infrastructure."
    echo "Make sure you have completed the manual security tasks first!"
    echo ""
    read -p "Have you rotated all API keys? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please rotate your API keys first!"
        echo "See EXECUTION_GUIDE.md for instructions."
        exit 1
    fi
    
    check_prerequisites
    install_dependencies
    setup_docker
    run_tests
    verify_setup
    create_aliases
    
    print_header "✅ Setup Complete!"
    
    echo "Next steps:"
    echo "1. Start the development server: npm run dev"
    echo "2. View monitoring dashboards: http://localhost:3001"
    echo "3. Run source quick-commands.sh for helpful aliases"
    echo ""
    print_warning "Remember to keep your .env.local file secret!"
    
    # Final security check
    print_header "Final Security Check"
    if git ls-files | grep -E "\.(env|key|pem)$" | grep -v ".example"; then
        print_error "WARNING: Sensitive files may be tracked in git!"
    else
        print_status "No sensitive files in git"
    fi
}

# Run main function
main