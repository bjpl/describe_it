// Test Unsplash API key
const https = require('https');

const apiKey = 'DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY';

const options = {
  hostname: 'api.unsplash.com',
  path: '/search/photos?query=test&page=1&per_page=1',
  method: 'GET',
  headers: {
    'Authorization': `Client-ID ${apiKey}`,
    'Accept-Version': 'v1'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('SUCCESS! API Key is valid.');
      console.log('Total results:', json.total);
      if (json.results && json.results[0]) {
        console.log('First image ID:', json.results[0].id);
      }
    } else {
      console.log('ERROR:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();