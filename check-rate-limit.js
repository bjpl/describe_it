// Check Unsplash API rate limit status
const https = require('https');

const accessKey = 'DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY';

console.log('Checking Unsplash API rate limit status...\n');

const options = {
  hostname: 'api.unsplash.com',
  path: '/me', // Simple endpoint to check rate limits
  method: 'GET',
  headers: {
    'Authorization': `Client-ID ${accessKey}`,
    'Accept-Version': 'v1'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  // Rate limit headers
  console.log('\n📊 Rate Limit Information:');
  console.log('----------------------------');
  
  const remaining = res.headers['x-ratelimit-remaining'];
  const limit = res.headers['x-ratelimit-limit'];
  const reset = res.headers['x-ratelimit-reset'];
  
  if (limit) {
    console.log(`Total Limit: ${limit} requests/hour`);
    console.log(`Remaining: ${remaining} requests`);
    
    if (reset) {
      const resetTime = new Date(parseInt(reset) * 1000);
      const now = new Date();
      const minutesUntilReset = Math.ceil((resetTime - now) / 1000 / 60);
      
      console.log(`Resets at: ${resetTime.toLocaleTimeString()}`);
      console.log(`Time until reset: ${minutesUntilReset} minutes`);
    }
    
    if (parseInt(remaining) === 0) {
      console.log('\n⚠️  WARNING: You have hit the rate limit!');
      console.log('You must wait until the reset time to make more requests.');
    } else if (parseInt(remaining) < 10) {
      console.log(`\n⚠️  WARNING: Only ${remaining} requests left!`);
    } else {
      console.log(`\n✅ You have ${remaining} requests available.`);
    }
  } else {
    console.log('Rate limit information not available in response headers.');
  }
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 401) {
      console.log('\n❌ ERROR: 401 Unauthorized');
      console.log('This usually means:');
      console.log('1. Rate limit exceeded (most likely)');
      console.log('2. Invalid API key');
      console.log('3. API key has been revoked');
      
      try {
        const error = JSON.parse(data);
        console.log('\nError details:', error);
      } catch (e) {
        console.log('Response:', data);
      }
    } else if (res.statusCode === 403) {
      console.log('\n❌ Rate limit exceeded!');
      console.log('You must wait for the rate limit to reset.');
    }
  });
});

req.on('error', (e) => {
  console.error(`Network error: ${e.message}`);
});

req.end();