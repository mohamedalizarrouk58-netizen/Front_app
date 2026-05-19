import axios from 'axios';

async function testApiTokenEndpoint() {
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/token/', {
            username: 'testuser',
            password: 'testpassword'
        });
        console.log('API Response:', response.data);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

testApiTokenEndpoint();