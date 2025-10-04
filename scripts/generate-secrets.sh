#!/bin/bash

##############################################################################
# GitHub Secrets Generation Script
#
# This script generates all required security keys for the CI/CD pipeline
# and creates a template file with all secrets that need to be configured.
#
# Usage:
#   ./scripts/generate-secrets.sh [OPTIONS]
#
# Options:
#   --output FILE    Output file for secrets (default: .env.secrets.template)
#   --github-upload  Upload secrets directly to GitHub (requires gh CLI)
#   --help          Show this help message
##############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default output file
OUTPUT_FILE=".env.secrets.template"
GITHUB_UPLOAD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --github-upload)
            GITHUB_UPLOAD=true
            shift
            ;;
        --help)
            grep "^#" "$0" | cut -c 3-
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

##############################################################################
# Functions
##############################################################################

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          GitHub Secrets Generation Script               ║${NC}"
    echo -e "${BLUE}║                                                          ║${NC}"
    echo -e "${BLUE}║  Generates security keys for CI/CD pipeline             ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_dependencies() {
    local deps_ok=true

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not installed (required for key generation)${NC}"
        deps_ok=false
    fi

    # Check gh CLI if uploading
    if [ "$GITHUB_UPLOAD" = true ] && ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) not installed (required for --github-upload)${NC}"
        deps_ok=false
    fi

    if [ "$deps_ok" = false ]; then
        exit 1
    fi
}

generate_key() {
    local bytes=$1
    node -e "console.log(require('crypto').randomBytes($bytes).toString('hex'))"
}

##############################################################################
# Main Script
##############################################################################

main() {
    print_header

    # Check dependencies
    check_dependencies

    echo -e "${BLUE}🔐 Generating security keys...${NC}\n"

    # Generate keys
    API_SECRET_KEY=$(generate_key 32)
    JWT_SECRET=$(generate_key 32)
    SESSION_SECRET=$(generate_key 16)

    echo -e "${GREEN}✅ Security keys generated${NC}\n"

    # Display generated keys
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║              GENERATED SECURITY KEYS                       ║${NC}"
    echo -e "${YELLOW}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${YELLOW}║${NC} ${BLUE}API_SECRET_KEY${NC}                                          ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC} $API_SECRET_KEY ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}                                                            ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC} ${BLUE}JWT_SECRET${NC}                                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC} $JWT_SECRET ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}                                                            ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC} ${BLUE}SESSION_SECRET${NC}                                          ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC} $SESSION_SECRET                 ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Create template file
    echo -e "${BLUE}📝 Creating secrets template file: $OUTPUT_FILE${NC}\n"

    cat > "$OUTPUT_FILE" << EOF
# ==================================
# GITHUB SECRETS CONFIGURATION
# ==================================
# Generated: $(date)
#
# ⚠️  SECURITY WARNING:
# - This file contains sensitive keys
# - DO NOT commit to version control
# - Add to .gitignore immediately
# - Delete after uploading to GitHub
#
# ==================================

# ============================================
# CRITICAL SECRETS (REQUIRED)
# ============================================

# ------------------------------------------
# Generated Security Keys
# ------------------------------------------
API_SECRET_KEY=$API_SECRET_KEY
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# ------------------------------------------
# Vercel (Get from: https://vercel.com/account/tokens)
# ------------------------------------------
VERCEL_TOKEN=

# ------------------------------------------
# Supabase (Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api)
# ------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ============================================
# IMPORTANT SECRETS (RECOMMENDED)
# ============================================

# ------------------------------------------
# OpenAI (Get from: https://platform.openai.com/api-keys)
# ------------------------------------------
OPENAI_API_KEY=

# ============================================
# OPTIONAL SECRETS (ENHANCED FEATURES)
# ============================================

# ------------------------------------------
# Unsplash (Get from: https://unsplash.com/oauth/applications)
# ------------------------------------------
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=

# ------------------------------------------
# Codecov (Get from: https://codecov.io)
# ------------------------------------------
CODECOV_TOKEN=

# ------------------------------------------
# Lighthouse CI (Get from: https://github.com/settings/tokens)
# ------------------------------------------
LHCI_GITHUB_APP_TOKEN=

# ------------------------------------------
# Sentry (Get from: https://sentry.io)
# ------------------------------------------
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# ==================================
# USAGE INSTRUCTIONS
# ==================================
#
# Manual Upload:
# 1. Fill in values from service dashboards
# 2. Upload to GitHub:
#    gh secret set SECRET_NAME --body "value"
#
# Batch Upload:
# 1. Fill in all values
# 2. Run: ./scripts/upload-secrets.sh $OUTPUT_FILE
#
# Verification:
# gh secret list
#
# ==================================
EOF

    echo -e "${GREEN}✅ Template file created: $OUTPUT_FILE${NC}\n"

    # Upload to GitHub if requested
    if [ "$GITHUB_UPLOAD" = true ]; then
        echo -e "${BLUE}📤 Uploading generated secrets to GitHub...${NC}\n"

        echo "$API_SECRET_KEY" | gh secret set API_SECRET_KEY
        echo -e "${GREEN}✅ Uploaded: API_SECRET_KEY${NC}"

        echo "$JWT_SECRET" | gh secret set JWT_SECRET
        echo -e "${GREEN}✅ Uploaded: JWT_SECRET${NC}"

        echo "$SESSION_SECRET" | gh secret set SESSION_SECRET
        echo -e "${GREEN}✅ Uploaded: SESSION_SECRET${NC}"

        echo ""
        echo -e "${YELLOW}⚠️  Manual secrets still need to be configured:${NC}"
        echo "   - VERCEL_TOKEN"
        echo "   - NEXT_PUBLIC_SUPABASE_URL"
        echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo "   - OPENAI_API_KEY"
        echo ""
        echo "See docs/devops/CICD_SETUP_GUIDE.md for instructions"
    fi

    # Print next steps
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    NEXT STEPS                              ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} 1. Add $OUTPUT_FILE to .gitignore"
    echo -e "${BLUE}║${NC} 2. Fill in manual values from service dashboards"
    echo -e "${BLUE}║${NC} 3. Upload to GitHub:"
    echo -e "${BLUE}║${NC}    ${GREEN}./scripts/upload-secrets.sh $OUTPUT_FILE${NC}"
    echo -e "${BLUE}║${NC} 4. Verify secrets:"
    echo -e "${BLUE}║${NC}    ${GREEN}gh secret list${NC}"
    echo -e "${BLUE}║${NC} 5. Test configuration:"
    echo -e "${BLUE}║${NC}    ${GREEN}gh workflow run verify-secrets.yml${NC}"
    echo -e "${BLUE}║${NC} 6. Delete $OUTPUT_FILE after upload"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Security reminder
    echo -e "${RED}⚠️  SECURITY REMINDER:${NC}"
    echo -e "   - These keys provide full access to your application"
    echo -e "   - Never commit $OUTPUT_FILE to version control"
    echo -e "   - Delete $OUTPUT_FILE after uploading secrets"
    echo -e "   - Rotate keys every 90 days"
    echo ""
}

# Run main function
main
