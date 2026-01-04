// import axios from 'axios';
// import qs from '../utils/qs.js';

// const VITE_RSM_API_BASE_URL = "https://next-gen-jjj.hycx-gd.cn/api/";// "/";
const VITE_RSM_API_BASE_URL = "/";
const VITE_APP_API_TIMEOUT = 120000;

const service = axios.create({
  baseURL: VITE_RSM_API_BASE_URL,
  timeout: VITE_APP_API_TIMEOUT,
  paramsSerializer: {
    serialize: function (params) {
      return Qs.stringify(params, { arrayFormat: "repeat" });
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

window.ue4_service = service;

const fetch_nc_file = async (
  pollutant_name,
  time_point,
  layer,
  row,
  col,
  ue4_command
) => {
  try {
    var nc_res = await service.post("api/nc_data/file", {
      pollutant_name: pollutant_name,
      time_point: time_point,
      layer: layer,
      row: row,
      col: col,
      ue4_command: ue4_command,
    });
    // console.log("fetch_nc_file:", nc_res);
    var file_paths = nc_res.file_path;
    if (!file_paths || file_paths.length === 0) {
      console.warn("No file paths returned from nc_data/file.");
    }
    return nc_res;
  } catch (err) {
    console.error("fetch_nc_file error:", err);
    return null;
  }
};

const fetch_nc_file_cn27 = async (
  pollutant_name,
  time_point,
  layer,
  row,
  col,
  ue4_command
) => {
  try {
    var nc_res = await service.post("api/nc_data_china/file", {
      pollutant_name: pollutant_name,
      time_point: time_point,
      layer: layer,
      row: row,
      col: col,
      ue4_command: ue4_command,
    });
    // console.log("fetch_nc_file:", nc_res);
    var file_paths = nc_res.file_path;
    if (!file_paths || file_paths.length === 0) {
      console.warn("No file paths returned from nc_data_china/file.");
    }
    return nc_res;
  } catch (err) {
    console.error("fetch_nc_file_cn27 error:", err);
    return null;
  }
};

const fetch_nc_data = async (pollutant_name, time_point, layer, row, col) => {
  try {
    var nc_res = await service.post("api/nc_data/list", {
      pollutant_name: pollutant_name,
      time_point: time_point,
      layer: layer,
      row: row,
      col: col,
    });
    // console.log("fetch_nc_data:", nc_res);
    return nc_res;
  } catch (err) {
    console.error("fetch_nc_data error:", err);
    return null;
  }
};

const fetch_nc_data_names = async (
  pollutant_names,
  time_point,
  layer,
  row,
  col
) => {
  try {
    var nc_res = await service.post("api/nc_data/list_names", {
      pollutant_names: pollutant_names,
      time_point: time_point,
      layer: layer,
      row: row,
      col: col,
    });
    // console.log("fetch_nc_data_names:", nc_res);
    return nc_res;
  } catch (err) {
    console.error("fetch_nc_data_names error:", err);
    return null;
  }
};

const fetch_nc_grid = async (params) => {
  try {
    var nc_res = await service.post("api/nc_grid/list", params);
    return nc_res;
  } catch (err) {
    console.error("fetch_nc_grid error:", err);
    return null;
  }
};

const fetch_suyuan_transfer_date = async (params) => {
  try {
    var nc_res = await service.post("api/suyuan_transfer_predict/date", params);
    return nc_res;
  } catch (err) {
    console.error("fetch_suyuan_transfer_date error:", err);
    return null;
  }
};

const fetch_suyuan_transfer_predict = async (params) => {
  try {
    var nc_res = await service.post("api/suyuan_transfer_predict/list", params);
    return nc_res;
  } catch (err) {
    console.error("fetch_suyuan_transfer_predict error:", err);
    return null;
  }
};


export const get_rsm_file_template = async () => {
  try {
    var res = await service.get('api/abacas_rsm/template_file');
    return res;
  } catch (err) {
    console.error("get_rsm_file_template error:", err);
    return null;
  }
};
export const upload_rsm_file = async (params) => {
  try {
    var res = await service.post('api/abacas_rsm/upload_file', params, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res;
  } catch (err) {
    console.error("upload_rsm_file error:", err);
    return null;
  }
};
export const get_rsm_file_list = async (file_type = 'RsmFile') => {
  try {
    var res = await service.get(`api/abacas_rsm/list?file_type=${file_type}`);
    return res;
  } catch (err) {
    console.error("get_rsm_file_list error:", err);
    return null;
  }
};
export const get_rsm_file_factor = async (id) => {
  try {
    var res = await service.get(`api/abacas_rsm/get_factor?id=${id}`);
    return res;
  } catch (err) {
    console.error("get_rsm_file_factor error:", err);
    return null;
  }
};
