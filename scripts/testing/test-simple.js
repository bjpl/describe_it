import fetch from 'node-fetch';

async function testSimpleRequest() {
  console.log('Testing simple request...');
  
  try {
    const response = await fetch('http://localhost:3003/api/descriptions/generate', {
      method: 'GET',
    });
    
    console.log('GET response status:', response.status);
    const data = await response.text();
    console.log('GET response:', data);
    
  } catch (error) {
    console.error('GET test failed:', error.message);
  }
}

testSimpleRequest();