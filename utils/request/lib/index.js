'use strict';

const axios = require('axios');

const BASE_URL = process.env.CHEN_CLI_BASE_URL ?? 'http://chen.xiaofenqing.xyz:7001';

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
})

request.interceptors.response.use((res) => {
  return res.data;
}, (error) => {
  return Promise.reject(error);
})

module.exports = request;
