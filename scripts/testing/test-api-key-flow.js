// Quick test to verify the API key flow
import fetch from 'node-fetch';

async function testApiKeyFlow() {
  console.log('Testing API key flow...');
  
  // Simulate the request body that the frontend is sending
  const testBody = {
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    style: 'narrativo',
    maxLength: 300,
    userApiKey: process.env.OPENAI_API_KEY || 'sk-proj-test-key-should-be-very-long-to-pass-validation-but-this-will-fail-anyway-because-its-fake-but-at-least-it-shows-the-key-is-being-passed'
  };
  
  try {
    console.log('Sending request with:', {
      hasUserApiKey: !!testBody.userApiKey,
      keyLength: testBody.userApiKey?.length,
      keyPrefix: testBody.userApiKey?.substring(0, 10) + '...'
    });
    
    const response = await fetch('http://localhost:3003/api/descriptions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBody)
    });
    
    const responseData = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    // Check if it's demo mode
    const isDemoMode = responseData.data?.some(desc => 
      desc.content.includes('[DEMO MODE]') || desc.content.includes('DEMO MODE')
    );
    
    console.log('Demo mode detected:', isDemoMode);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApiKeyFlow();