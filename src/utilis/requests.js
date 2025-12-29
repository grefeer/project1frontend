import axios from 'axios';

const service = axios.create({
    baseURL: '/api/v1', // 配合 Vite 代理使用
    timeout: 5000
});

service.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
}, error => Promise.reject(error));

service.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.clear();
            window.location.href = '/'; // 路由跳转
        }
        return Promise.reject(error);
    }
);

export default service;