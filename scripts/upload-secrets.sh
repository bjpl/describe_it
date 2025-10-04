#!/bin/bash

##############################################################################
# GitHub Secrets Upload Script
#
# Uploads secrets from a .env file to GitHub repository secrets
#
# Usage:
#   ./scripts/upload-secrets.sh [ENV_FILE]
#
# Arguments:
#   ENV_FILE    Path to .env file (default: .env.secrets.template)
##############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE=${1:-.env.secrets.template}

##############################################################################
# Validation
##############################################################################

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: File not found: $ENV_FILE${NC}"
    echo ""
    echo "Usage: $0 [ENV_FILE]"
    echo ""
    echo "Example:"
    echo "  $0 .env.secrets.template"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ Error: GitHub CLI (gh) not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  brew install gh               # macOS"
    echo "  sudo apt install gh           # Ubuntu/Debian"
    echo "  winget install GitHub.cli     # Windows"
    exit 1
fi

# Check gh authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Error: GitHub CLI not authenticated${NC}"
    echo ""
    echo "Authenticate with:"
    echo "  gh auth login"
    exit 1
fi

##############################################################################
# Main Upload
##############################################################################

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          GitHub Secrets Upload Script                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📂 Reading secrets from: $ENV_FILE${NC}"
echo ""

# Confirmation
read -p "Upload secrets to GitHub repository? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Upload cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📤 Uploading secrets...${NC}"
echo ""

# Counters
UPLOADED=0
SKIPPED=0
FAILED=0

# Read and upload each secret
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.*$ ]] || [[ $key =~ ^[[:space:]]*$ ]]; then
        continue
    fi

    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # Remove quotes if present
    value=$(echo "$value" | sed 's/^["'"'"']\(.*\)["'"'"']$/\1/')

    # Skip if value is empty
    if [ -z "$value" ]; then
        echo -e "${YELLOW}⚠️  Skipping (empty): $key${NC}"
        ((SKIPPED++))
        continue
    fi

    # Upload secret
    if echo "$value" | gh secret set "$key" 2>/dev/null; then
        echo -e "${GREEN}✅ Uploaded: $key${NC}"
        ((UPLOADED++))
    else
        echo -e "${RED}❌ Failed: $key${NC}"
        ((FAILED++))
    fi

done < "$ENV_FILE"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    UPLOAD SUMMARY                          ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC} ${GREEN}Uploaded:${NC} $UPLOADED secrets                                   ${BLUE}║${NC}"
echo -e "${BLUE}║${NC} ${YELLOW}Skipped:${NC}  $SKIPPED secrets (empty values)                   ${BLUE}║${NC}"
echo -e "${BLUE}║${NC} ${RED}Failed:${NC}   $FAILED secrets                                    ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify upload
echo -e "${BLUE}🔍 Verifying uploaded secrets...${NC}"
echo ""

gh secret list

echo ""

if [ $SKIPPED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: $SKIPPED secrets were skipped (empty values)${NC}"
    echo "   Fill in missing values in $ENV_FILE and re-run this script"
    echo ""
fi

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ ERROR: $FAILED secrets failed to upload${NC}"
    echo "   Check error messages above and try again"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Secret upload complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Test configuration: gh workflow run verify-secrets.yml"
echo "  2. Watch test results: gh run watch"
echo "  3. Delete $ENV_FILE for security"
echo ""
