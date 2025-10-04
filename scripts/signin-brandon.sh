#!/bin/bash

# Sign in test for brandon.lambert87@gmail.com
echo "Testing sign in for brandon.lambert87@gmail.com"
echo "=================================="
echo ""
echo "Please enter your password:"
read -s password
echo ""

# Try local first
echo "Testing local environment..."
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"brandon.lambert87@gmail.com\",\"password\":\"$password\"}" \
  2>/dev/null | python -m json.tool

echo ""
echo "Testing production environment..."
curl -X POST https://describe-it-lovat.vercel.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"brandon.lambert87@gmail.com\",\"password\":\"$password\"}" \
  2>/dev/null | python -m json.tool