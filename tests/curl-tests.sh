#!/bin/bash

# API Testing Script with cURL
# Tests the /api/images/search endpoint with various scenarios

BASE_URL="http://localhost:3000"
API_ENDPOINT="/api/images/search"
RESULTS_FILE="tests/curl-test-results.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory if it doesn't exist
mkdir -p tests

# Clear previous results
> "$RESULTS_FILE"

echo -e "${BLUE}🚀 Starting cURL API Tests${NC}"
echo "Base URL: $BASE_URL$API_ENDPOINT"
echo "Results will be saved to: $RESULTS_FILE"
echo "========================================="

# Function to log results
log_result() {
    echo "$1" | tee -a "$RESULTS_FILE"
}

# Function to test API endpoint
test_endpoint() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -e "\n${YELLOW}Testing: $test_name${NC}"
    log_result "=== $test_name ==="
    log_result "URL: $url"
    log_result "Expected Status: $expected_status"
    
    # Make request and capture response
    local start_time=$(date +%s.%N)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}\n%{size_download}\n" "$url" 2>/dev/null)
    local end_time=$(date +%s.%N)
    
    # Parse response
    local body=$(echo "$response" | head -n -3)
    local status_code=$(echo "$response" | tail -n 3 | head -n 1)
    local curl_time=$(echo "$response" | tail -n 2 | head -n 1)
    local response_size=$(echo "$response" | tail -n 1)
    
    # Calculate total time
    local total_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "N/A")
    
    log_result "Status Code: $status_code"
    log_result "Response Time: ${curl_time}s"
    log_result "Response Size: $response_size bytes"
    log_result "Total Time: ${total_time}s"
    
    # Check if status matches expected
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ Status Code: $status_code (Expected: $expected_status)${NC}"
        log_result "✅ Status Check: PASSED"
    else
        echo -e "${RED}❌ Status Code: $status_code (Expected: $expected_status)${NC}"
        log_result "❌ Status Check: FAILED"
    fi
    
    # Log response body (first 500 characters)
    log_result "Response Body (truncated):"
    echo "$body" | head -c 500 | tee -a "$RESULTS_FILE"
    log_result ""
    
    # Check for JSON structure in successful responses
    if [ "$status_code" = "200" ]; then
        # Check if response contains expected JSON fields
        if echo "$body" | grep -q '"images"' && echo "$body" | grep -q '"total"' && echo "$body" | grep -q '"currentPage"'; then
            echo -e "${GREEN}✅ Response Structure: Valid${NC}"
            log_result "✅ JSON Structure: VALID"
        else
            echo -e "${RED}❌ Response Structure: Invalid${NC}"
            log_result "❌ JSON Structure: INVALID"
        fi
    fi
    
    log_result "----------------------------------------"
}

# Test 1: Valid nature query
test_endpoint "Nature Query" "${BASE_URL}${API_ENDPOINT}?query=nature" "200"

# Test 2: Valid technology query
test_endpoint "Technology Query" "${BASE_URL}${API_ENDPOINT}?query=technology" "200"

# Test 3: Valid food query with pagination
test_endpoint "Food Query with Pagination" "${BASE_URL}${API_ENDPOINT}?query=food&page=2&per_page=10" "200"

# Test 4: Valid people query
test_endpoint "People Query" "${BASE_URL}${API_ENDPOINT}?query=people" "200"

# Test 5: Empty query (should return 400)
test_endpoint "Empty Query" "${BASE_URL}${API_ENDPOINT}?query=" "400"

# Test 6: Missing query parameter (should return 400)
test_endpoint "Missing Query Parameter" "${BASE_URL}${API_ENDPOINT}" "400"

# Test 7: Long query (should return 400)
long_query=$(printf 'a%.0s' {1..101})
test_endpoint "Long Query (101 chars)" "${BASE_URL}${API_ENDPOINT}?query=${long_query}" "400"

# Test 8: Pagination edge cases
test_endpoint "Large Page Number" "${BASE_URL}${API_ENDPOINT}?query=test&page=999&per_page=5" "200"

# Test 9: Maximum per_page
test_endpoint "Maximum per_page" "${BASE_URL}${API_ENDPOINT}?query=test&per_page=30" "200"

# Test 10: Invalid per_page (should return 400 or handle gracefully)
test_endpoint "Invalid per_page" "${BASE_URL}${API_ENDPOINT}?query=test&per_page=100" "400"

# Test 11: Optional parameters
test_endpoint "With Orientation Parameter" "${BASE_URL}${API_ENDPOINT}?query=landscape&orientation=landscape" "200"

# Test 12: Special characters in query
test_endpoint "Special Characters" "${BASE_URL}${API_ENDPOINT}?query=nature%20%26%20wildlife" "200"

# Test 13: Multiple concurrent requests (performance test)
echo -e "\n${YELLOW}Testing: Concurrent Requests Performance${NC}"
log_result "=== Concurrent Requests Performance ==="

concurrent_start=$(date +%s.%N)
for i in {1..5}; do
    curl -s "${BASE_URL}${API_ENDPOINT}?query=concurrent_test_$i" > /dev/null &
done
wait
concurrent_end=$(date +%s.%N)
concurrent_time=$(echo "$concurrent_end - $concurrent_start" | bc -l 2>/dev/null || echo "N/A")

echo -e "${GREEN}✅ 5 Concurrent Requests completed in ${concurrent_time}s${NC}"
log_result "✅ 5 Concurrent Requests: ${concurrent_time}s"

# Test 14: Cache headers test
echo -e "\n${YELLOW}Testing: Cache Headers${NC}"
log_result "=== Cache Headers Test ==="

cache_response=$(curl -s -I "${BASE_URL}${API_ENDPOINT}?query=cache_test" 2>/dev/null)
log_result "Cache Headers Response:"
log_result "$cache_response"

# Look for cache-related headers
if echo "$cache_response" | grep -i "cache-control"; then
    echo -e "${GREEN}✅ Cache-Control header found${NC}"
    log_result "✅ Cache-Control header: PRESENT"
else
    echo -e "${RED}❌ Cache-Control header missing${NC}"
    log_result "❌ Cache-Control header: MISSING"
fi

if echo "$cache_response" | grep -i "etag"; then
    echo -e "${GREEN}✅ ETag header found${NC}"
    log_result "✅ ETag header: PRESENT"
else
    echo -e "${YELLOW}⚠️ ETag header missing${NC}"
    log_result "⚠️ ETag header: MISSING"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "All tests completed. Check $RESULTS_FILE for detailed results."

# Count passed/failed tests from log
passed_count=$(grep -c "✅.*PASSED" "$RESULTS_FILE" 2>/dev/null || echo "0")
failed_count=$(grep -c "❌.*FAILED" "$RESULTS_FILE" 2>/dev/null || echo "0")

log_result ""
log_result "=== FINAL SUMMARY ==="
log_result "Tests Passed: $passed_count"
log_result "Tests Failed: $failed_count"
log_result "Test Completion Time: $(date)"

echo -e "${GREEN}Tests Passed: $passed_count${NC}"
if [ "$failed_count" -gt 0 ]; then
    echo -e "${RED}Tests Failed: $failed_count${NC}"
else
    echo -e "${GREEN}All tests completed successfully!${NC}"
fi

echo -e "\n${BLUE}Detailed results saved to: $RESULTS_FILE${NC}"