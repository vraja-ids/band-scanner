import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://350.network.sadhu-sanga.appspot.com';

const logApiCall = (method, endpoint, request, response) => {
  console.log('----------------------------------------');
  console.log(`API Called: ${method.toUpperCase()} ${endpoint}`);
  console.log('Request:', JSON.stringify(request, null, 2));
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('----------------------------------------');
};

const get = async (endpoint, params = {}) => {
  try {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = `${BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    console.log('----------------------------------------');
    console.log(`API Called: GET ${endpoint}`);
    console.log('Request URL:', url);
    console.log('Request Params:', JSON.stringify(params, null, 2));
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('----------------------------------------');
    
    return data;
  } catch (error) {
    console.error(`Error in GET ${endpoint}:`, error);
    throw error;
  }
};

const post = async (endpoint, body = {}) => {
  try {
    const url = `${BASE_URL}/${endpoint}`;
    
    console.log('----------------------------------------');
    console.log(`API Called: POST ${endpoint}`);
    console.log('Request URL:', url);
    console.log('Request Body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('----------------------------------------');
    
    return data;
  } catch (error) {
    console.error(`Error in POST ${endpoint}:`, error);
    throw error;
  }
};

const put = async (endpoint, body = {}) => {
  try {
    const url = `${BASE_URL}/${endpoint}`;
    
    console.log('----------------------------------------');
    console.log(`API Called: PUT ${endpoint}`);
    console.log('Request URL:', url);
    console.log('Request Body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('----------------------------------------');
    
    return data;
  } catch (error) {
    console.error(`Error in PUT ${endpoint}:`, error);
    throw error;
  }
};

export const api = {
  get,
  post,
  put
}; 