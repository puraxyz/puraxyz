// Simple test to check OpenAI usage endpoint
async function testOpenAIUsage() {
  try {
    console.log('Testing OpenAI usage endpoint...');
    
    const response = await fetch('http://localhost:3001/api/openai/usage', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Error testing usage endpoint:', error);
  }
}

testOpenAIUsage();