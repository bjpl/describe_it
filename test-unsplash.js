// Test Unsplash API with your credentials
const https = require('https');

const accessKey = 'DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY';

console.log('Testing Unsplash API with Access Key:', accessKey.substring(0, 10) + '...');

const options = {
  hostname: 'api.unsplash.com',
  path: '/search/photos?query=nature&page=1&per_page=1',
  method: 'GET',
  headers: {
    'Authorization': `Client-ID ${accessKey}`,
    'Accept-Version': 'v1'
  }
};

const req = https.request(options, (res) => {
  console.log(`\nStatus Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('\n✅ SUCCESS! API Key is valid and working!');
      console.log('Total results found:', json.total);
      if (json.results && json.results[0]) {
        console.log('First image:');
        console.log('  - ID:', json.results[0].id);
        console.log('  - Description:', json.results[0].description || json.results[0].alt_description);
        console.log('  - URL:', json.results[0].urls.small);
      }
    } else if (res.statusCode === 401) {
      console.log('\n❌ ERROR: Unauthorized (401)');
      console.log('The API key is invalid or has been revoked.');
      console.log('Response:', data);
    } else {
      console.log('\n❌ ERROR:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Network error: ${e.message}`);
});

req.end();