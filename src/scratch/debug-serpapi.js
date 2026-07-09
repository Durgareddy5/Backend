const axios = require('axios');
const environment = require('../config/environment');

async function test() {
  const apiKey = environment.serpApi?.key;
  console.log('Using API Key:', apiKey);
  
  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_scholar_author',
        author_id: 'dqw4w9WgXcQ',
        api_key: apiKey
      }
    });
    console.log('Status:', res.status);
    console.log('Keys of data:', Object.keys(res.data));
    console.log('Data summary:', JSON.stringify(res.data).substring(0, 500));
  } catch (err) {
    console.error('Error occurred:', err.message);
    if (err.response) {
      console.log('Error Status:', err.response.status);
      console.log('Error Data:', err.response.data);
    }
  }
}

test();
