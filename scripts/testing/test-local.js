const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/images/search?query=test&page=1',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Local API Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('✅ LOCAL API WORKS!');
      console.log(`Images returned: ${json.images?.length || 0}`);
      if (json.images?.[0]) {
        console.log(`First image ID: ${json.images[0].id}`);
      }
    } else {
      console.log('❌ Local API failed:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();