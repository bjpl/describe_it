#!/bin/bash
# ==============================================
# Docker Setup Script
# Describe It - Quick Setup Helper
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Generate security keys
generate_keys() {
    print_info "Generating security keys..."

    API_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

    print_success "Security keys generated"
}

# Setup development environment
setup_development() {
    print_header "Setting Up Development Environment"

    # Check for .env.local
    if [ ! -f .env.local ]; then
        print_warning ".env.local not found, copying from .env.example"
        cp .env.example .env.local
        print_success "Created .env.local"
    else
        print_success ".env.local already exists"
    fi

    # Start development environment
    print_info "Starting development environment..."
    docker-compose up -d

    print_success "Development environment is running"
    echo ""
    print_info "Access your application:"
    echo "  - Application: http://localhost:3000"
    echo "  - Redis: localhost:6379"
    echo ""
    print_info "View logs: docker-compose logs -f"
}

# Setup production environment
setup_production() {
    print_header "Setting Up Production Environment"

    # Check for .env.production
    if [ ! -f .env.production ]; then
        print_warning ".env.production not found, copying from .env.production.example"
        cp .env.production.example .env.production

        # Generate keys
        generate_keys

        # Update .env.production with generated keys
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/API_SECRET_KEY=.*/API_SECRET_KEY=$API_SECRET/" .env.production
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
            sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.production
            sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env.production
        else
            # Linux
            sed -i "s/API_SECRET_KEY=.*/API_SECRET_KEY=$API_SECRET/" .env.production
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
            sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.production
            sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env.production
        fi

        print_success "Created .env.production with generated keys"
        print_warning "Please update API keys and URLs in .env.production before deploying!"
    else
        print_success ".env.production already exists"
    fi

    # Build production image
    print_info "Building production Docker image..."
    docker-compose -f docker-compose.production.yml build

    print_success "Production image built successfully"
    echo ""
    print_warning "Before starting production:"
    echo "  1. Update .env.production with your API keys"
    echo "  2. Update NEXT_PUBLIC_APP_URL"
    echo "  3. Configure SSL certificates in config/ssl/"
    echo ""
    print_info "Start production: docker-compose -f docker-compose.production.yml up -d"
}

# Test Docker setup
test_setup() {
    print_header "Testing Docker Setup"

    print_info "Testing development build..."
    docker-compose build app
    print_success "Development build successful"

    print_info "Testing production build..."
    docker build -t describe-it:test .
    print_success "Production build successful"

    print_info "Cleaning up test images..."
    docker rmi describe-it:test

    print_success "All tests passed!"
}

# Show status
show_status() {
    print_header "Docker Status"

    echo ""
    print_info "Running containers:"
    docker ps --filter "name=describe-it" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    print_info "Docker images:"
    docker images --filter "reference=describe-it*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

    echo ""
    print_info "Docker volumes:"
    docker volume ls --filter "name=describe-it" --format "table {{.Name}}\t{{.Driver}}"
}

# Clean up
cleanup() {
    print_header "Cleaning Up Docker Resources"

    read -p "Are you sure you want to remove all Describe It containers and volumes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping and removing containers..."
        docker-compose down -v
        docker-compose -f docker-compose.production.yml down -v

        print_info "Removing images..."
        docker rmi $(docker images "describe-it*" -q) 2>/dev/null || true

        print_success "Cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

# Main menu
show_menu() {
    echo ""
    print_header "Describe It - Docker Setup"
    echo ""
    echo "1) Setup Development Environment"
    echo "2) Setup Production Environment"
    echo "3) Test Docker Setup"
    echo "4) Show Status"
    echo "5) Cleanup"
    echo "6) Exit"
    echo ""
}

# Main script
main() {
    # Check prerequisites
    check_docker
    check_docker_compose

    # If arguments provided, run directly
    if [ $# -gt 0 ]; then
        case "$1" in
            dev|development)
                setup_development
                ;;
            prod|production)
                setup_production
                ;;
            test)
                test_setup
                ;;
            status)
                show_status
                ;;
            clean|cleanup)
                cleanup
                ;;
            *)
                echo "Usage: $0 {dev|prod|test|status|cleanup}"
                exit 1
                ;;
        esac
        exit 0
    fi

    # Interactive menu
    while true; do
        show_menu
        read -p "Select an option: " choice
        case $choice in
            1) setup_development ;;
            2) setup_production ;;
            3) test_setup ;;
            4) show_status ;;
            5) cleanup ;;
            6) print_info "Goodbye!"; exit 0 ;;
            *) print_error "Invalid option" ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
