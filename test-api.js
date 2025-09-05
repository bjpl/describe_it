// Test the API response format
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/descriptions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        style: 'narrativo'
      })
    });
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log('\nDescriptions received:');
      data.data.forEach((desc, index) => {
        console.log(`${index + 1}. Language: ${desc.language}, Style: ${desc.style}`);
        console.log(`   Content: ${desc.content.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();