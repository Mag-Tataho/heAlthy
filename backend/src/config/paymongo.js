const axios = require('axios');
require('dotenv').config();

const paymongo = axios.create({
  baseURL: 'https://api.paymongo.com/v1',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

paymongo.interceptors.request.use((config) => {
  const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!paymongoSecretKey) {
    throw new Error('PAYMONGO_SECRET_KEY is required');
  }

  const authorizationHeader = `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString('base64')}`;

  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: authorizationHeader,
    },
  };
});

module.exports = paymongo;