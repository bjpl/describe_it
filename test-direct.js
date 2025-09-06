// Direct test with exact key from screenshot
const https = require('https');

// Using the exact Access Key from your screenshot
const accessKey = 'DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY';

console.log('Testing with Access Key from your Unsplash dashboard...');
console.log('Key starts with:', accessKey.substring(0, 15) + '...');
console.log('Key length:', accessKey.length, 'characters\n');

const options = {
  hostname: 'api.unsplash.com',
  path: '/photos/random?count=1',
  method: 'GET',
  headers: {
    'Authorization': `Client-ID ${accessKey}`,
    'Accept-Version': 'v1'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
  console.log('\nRate Limit Info:');
  console.log(`  Limit: ${res.headers['x-ratelimit-limit']}`);
  console.log(`  Remaining: ${res.headers['x-ratelimit-remaining']}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\n✅ SUCCESS! The API key is working!');
      const photos = JSON.parse(data);
      if (photos[0]) {
        console.log('\nRandom photo retrieved:');
        console.log('  ID:', photos[0].id);
        console.log('  URL:', photos[0].urls.small);
      }
    } else {
      console.log('\n❌ Failed with status:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 401) {
        console.log('\n🔍 Troubleshooting:');
        console.log('1. Check if the key was copied correctly');
        console.log('2. Verify the key in your Unsplash dashboard');
        console.log('3. Try regenerating the key if needed');
      }
    }
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.end();