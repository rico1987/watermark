import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';

const service = axios.create({
    baseURL: config.watermarkApiBaseUrl,
    timeout: config.timeout,
});

// 添加请求拦截器
service.interceptors.request.use((config) => {
    let apiToken = Cookies.get('apiToken');
    if (apiToken) {
        config.headers['Authorization'] = `Bearer ${apiToken}`;
    }
    return config;
}, error => Promise.reject(error));

// 添加响应拦截器
service.interceptors.response.use(response => response, error => Promise.reject(error.response.data));

export default service;
