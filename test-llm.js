const axios = require('axios');

async function testLLM() {
  try {
    const response = await axios.post('http://localhost:8080/llm/suggestions', {
      fieldType: 'title',
      context: {
        category: 'Dental Care',
        tags: ['oral health', 'prevention']
      },
      currentValue: ''
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // Using dummy token for testing
      }
    });

    console.log('LLM Response:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

testLLM();
