#!/bin/bash

# ==============================================
# Supabase Database Migration Deployment Script
# Describe It - Spanish Learning Application
# ==============================================

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   Describe It Database Migration Deployer     ║"
echo "║   Spanish Learning Application                ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check for required environment variables
print_info "Checking environment variables..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    print_error "NEXT_PUBLIC_SUPABASE_URL is not set"
    echo "Please ensure your .env.local file contains the Supabase URL"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    print_error "SUPABASE_SERVICE_ROLE_KEY is not set"
    echo "Please ensure your .env.local file contains the Supabase service role key"
    exit 1
fi

print_success "Environment variables found"

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
print_info "Supabase Project: ${PROJECT_REF}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI not found. Installing globally..."
    npm install -g supabase
    print_success "Supabase CLI installed"
fi

# Function to run SQL file
run_migration() {
    local file=$1
    local name=$(basename "$file" .sql)

    print_info "Running migration: ${name}"

    # Use Supabase CLI to execute SQL
    if supabase db push --db-url "postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres" --file "$file"; then
        print_success "Migration ${name} completed"
        return 0
    else
        print_error "Migration ${name} failed"
        return 1
    fi
}

# Function to deploy using Supabase SQL editor (manual)
manual_deployment() {
    echo ""
    print_info "Manual Deployment Instructions:"
    echo ""
    echo "1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}"
    echo "2. Navigate to: SQL Editor"
    echo "3. Run the following migrations in order:"
    echo ""
    echo "   a) Copy contents of: supabase/migrations/001_initial_schema.sql"
    echo "   b) Copy contents of: supabase/migrations/002_seed_data.sql"
    echo "   c) Copy contents of: supabase/migrations/003_advanced_features.sql"
    echo "   d) Copy contents of: supabase/migrations/20251007000000_create_analytics_events.sql"
    echo ""
    echo "4. Click 'RUN' after pasting each migration"
    echo ""
}

# Ask user for deployment method
echo ""
print_info "Choose deployment method:"
echo "1. Automatic (using Supabase CLI) - Recommended"
echo "2. Manual (copy/paste to SQL editor)"
echo "3. Link to existing project and push migrations"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        print_info "Starting automatic deployment..."

        # Run migrations in order
        migrations=(
            "supabase/migrations/001_initial_schema.sql"
            "supabase/migrations/002_seed_data.sql"
            "supabase/migrations/003_advanced_features.sql"
            "supabase/migrations/20251007000000_create_analytics_events.sql"
        )

        for migration in "${migrations[@]}"; do
            if [ -f "$migration" ]; then
                if ! run_migration "$migration"; then
                    print_error "Deployment failed at: $(basename $migration)"
                    exit 1
                fi
            else
                print_warning "Migration file not found: $migration"
            fi
        done

        print_success "All migrations deployed successfully!"
        ;;

    2)
        manual_deployment
        ;;

    3)
        print_info "Linking to Supabase project..."

        # Initialize Supabase (if not already initialized)
        if [ ! -f "supabase/config.toml" ]; then
            print_info "Initializing Supabase..."
            supabase init
        fi

        # Link to remote project
        print_info "Linking to project: ${PROJECT_REF}"
        supabase link --project-ref "${PROJECT_REF}"

        # Push migrations
        print_info "Pushing migrations to Supabase..."
        supabase db push

        print_success "Migrations pushed successfully!"
        ;;

    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_success "Database deployment complete!"
echo ""
print_info "Next steps:"
echo "1. Test database connection: npm run db:test"
echo "2. Verify tables: npm run db:verify"
echo "3. Start the application: npm run dev"
echo ""
