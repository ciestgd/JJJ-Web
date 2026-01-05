// import axios from 'axios';
// import qs from '../utils/qs.js';

const VITE_CMAQ_API_BASE_URL = "http://10.100.30.5"
// const VITE_CMAQ_API_BASE_URL = 'http://localhost:8010'
// const VITE_CMAQ_API_BASE_URL = "http://10.8.0.91"
// const VITE_APP_API_TIMEOUT = 120000

const cmaqService = axios.create({
    baseURL: VITE_CMAQ_API_BASE_URL,
    timeout: 120000,
    paramsSerializer: {
        serialize: function (params) {
            return Qs.stringify(params, { arrayFormat: 'repeat' });
        },
    },
});


cmaqService.interceptors.request.use(
    async (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

cmaqService.interceptors.response.use(
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

window.cmaqService = cmaqService;

const fetch_meteorology_wind_data = async (params) => {
    try {
        const response = await cmaqService.get('api/meteorology/getWindData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching meteorology data:', error);
        throw error;
    }
};
const fetch_meteorology_data = async (params) => {
    try {
        const response = await cmaqService.get('api/meteorology/getData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching meteorology data:', error);
        throw error;
    }
};
const fetch_model_data = async (params) => {
    try {
        const response = await cmaqService.get('api/model/getData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching model data:', error);
        throw error;
    }
};
const fetch_model_attribute = async (params) => {
    try {
        const response = await cmaqService.get('api/model/getAttributeData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching model attribute:', error);
        throw error;
    }
};
const fetch_image_stream = async (params) => {
    try {
        const response = await cmaqService.get('api/images/getStream', { params, responseType: 'blob' });
        return response;
    }
    catch (error) {
        console.error('Error fetching image stream:', error);
        throw error;
    }
};
const fetch_image_data = async (params) => {
    try {
        const response = await cmaqService.get('api/images/getData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching image data:', error);
        throw error;
    }
};
// /model/getCityStationAqi
const fetch_model_getCityStationAqi = async (data) => {
    try {
        const response = await cmaqService.post('api/model/getCityStationAqi', data);
        return response;
    }
    catch (error) {
        console.error('Error fetching model grid station data:', error);
        throw error;
    }
};
const fetch_meteorology_attribute = async (params) => {
    try {
        const response = await cmaqService.get('api/meteorology/getAttributeData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching meteorology attribute:', error);
        throw error;
    }
};
const fetch_meteorology_images = async (params) => {
    try {
        const response = await cmaqService.get('api/meteorology/getWindImageList', { params });
        return response;
    } catch (error) {
        console.error('Error fetching meteorology attribute:', error);
        throw error;
    }
};
const fetch_meteorology_image_stream = async (params) => {
    try {
        const response = await cmaqService.get('api/meteorology/getWindImageStream', { params, responseType: 'blob' });
        return response;
    } catch (error) {
        console.error('Error fetching meteorology attribute:', error);
        throw error;
    }
};
const fetch_model_last_update_time = async () => {
    try {
        const response = await cmaqService.get('api/model/getLatestDataDate');
        return response;
    } catch (error) {
        console.error('Error fetching model last update time:', error);
        throw error;
    }
};
const fetch_meteorology_last_update_time = async () => {
    try {
        const response = await cmaqService.get('api/meteorology/getLatestDataDate');
        return response;
    } catch (error) {
        console.error('Error fetching meteorology last update time:', error);
        throw error;
    }
};
const fetch_image_last_update_time = async () => {
    try {
        const response = await cmaqService.get('api/images/getLatestDataDate');
        return response;
    } catch (error) {
        console.error('Error fetching image last update time:', error);
        throw error;
    }
};

const fetch_ctm_model_data = async (params) => {
    try {
        const response = await cmaqService.get('api/ctmModel/getData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching model data:', error);
        throw error;
    }
};
const fetch_ctm_model_attribute = async (params) => {
    try {
        const response = await cmaqService.get('api/ctmModel/getAttributeData', { params });
        return response;
    } catch (error) {
        console.error('Error fetching model attribute:', error);
        throw error;
    }
};