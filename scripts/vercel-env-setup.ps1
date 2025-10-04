# Vercel Environment Variables Setup Script for Windows PowerShell
# This script adds all production environment variables to your Vercel project

Write-Host "🚀 Setting up Vercel Environment Variables" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# Production environment variables
$envVars = @{
    # Security Keys (REQUIRED)
    "API_SECRET_KEY" = "5a9a81096e87d52e4b2d7f00887fd2a6bf5b18962f527c3c86997b7cd20acdd9"
    "JWT_SECRET" = "172a24c9cc11ae30403c18cd74e283fbcfdf1612b261c9ac9b8377f6ba25c83f"
    "SESSION_SECRET" = "209db0f5fbb94c33d9fff005463adc4e"
    
    # CORS Configuration
    "ALLOWED_ORIGINS" = "https://describe-it-lovat.vercel.app,https://describe-*.vercel.app"
    
    # API Keys (Add your actual keys here)
    "OPENAI_API_KEY" = "your-openai-key-here"
    "UNSPLASH_ACCESS_KEY" = "your-unsplash-key-here"
    "GOOGLE_BOOKS_API_KEY" = "your-google-books-key-here"
    
    # Security Settings
    "DEBUG_ENDPOINT_ENABLED" = "false"
    "RATE_LIMIT_REQUESTS" = "50"
    "RATE_LIMIT_WINDOW_MS" = "15000"
    
    # Public Environment Variables (visible in browser)
    "NEXT_PUBLIC_APP_URL" = "https://describe-it-lovat.vercel.app"
    "NEXT_PUBLIC_APP_NAME" = "Describe It"
    "NEXT_PUBLIC_APP_VERSION" = "1.0.0"
    "NEXT_PUBLIC_ENABLE_ANALYTICS" = "true"
    "NEXT_PUBLIC_ENABLE_ERROR_REPORTING" = "true"
}

Write-Host "`n📝 Adding environment variables to Vercel..." -ForegroundColor Yellow

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    
    # Skip if it's a placeholder value
    if ($value -like "*your-*-here*") {
        Write-Host "⚠️  Skipping $key (placeholder value)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "   Adding $key..." -NoNewline
    
    # Add to production environment
    vercel env add $key production 2>$null << $value
    
    # Also add to preview environment for branch deployments
    vercel env add $key preview 2>$null << $value
    
    Write-Host " ✅" -ForegroundColor Green
}

Write-Host "`n✨ Environment variables setup complete!" -ForegroundColor Green
Write-Host "`n📌 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Add your API keys (OpenAI, Unsplash, Google Books)" -ForegroundColor White
Write-Host "   2. Trigger a redeployment: vercel --prod" -ForegroundColor White
Write-Host "   3. Visit: https://describe-it-lovat.vercel.app" -ForegroundColor White