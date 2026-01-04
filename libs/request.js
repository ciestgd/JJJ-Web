// import axios from 'axios';
// import qs from '../utils/qs.js';

// const VITE_RSM_API_BASE_URL = 'https://cloud.abacas-dss.com/api'
const VITE_RSM_API_BASE_URL = '/abacas_api/api/'
const VITE_APP_API_TIMEOUT = 120000

const service = axios.create({
    baseURL: VITE_RSM_API_BASE_URL,
    timeout: VITE_APP_API_TIMEOUT,
    paramsSerializer: {
        serialize: function (params) {
            return Qs.stringify(params, { arrayFormat: 'repeat' });
        },
    },
});


service.interceptors.request.use(
    async (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

service.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (!error.response) {
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

window.service = service;
