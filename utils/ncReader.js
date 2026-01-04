// 导入 netcdfjs 库
import { NetCDFReader } from "https://cdn.jsdelivr.net/npm/netcdfjs@3.0.0/+esm";

const arrayBufferCache = new Map();

export async function getNcReader(url) {
  let arrayBuffer = arrayBufferCache.get(url);
  if (!arrayBuffer) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    arrayBuffer = await response.arrayBuffer();
    arrayBufferCache.set(url, arrayBuffer);
  }
  return {
    reader: new NetCDFReader(arrayBuffer),
    arrayBuffer,
  };
}

function reshapeData(flatArray, dimensions) {
  if (!dimensions.length) {
    return flatArray[0];
  }
  const strides = [];
  let stride = 1;
  for (let i = dimensions.length - 1; i >= 0; i--) {
    strides[i] = stride;
    stride *= dimensions[i];
  }

  const build = (depth, offset) => {
    if (depth === dimensions.length - 1) {
      return flatArray.slice(offset, offset + dimensions[depth]);
    }
    const result = [];
    const step = strides[depth];
    for (let i = 0; i < dimensions[depth]; i++) {
      result.push(build(depth + 1, offset + i * step));
    }
    return result;
  };

  return build(0, 0);
}

function sliceDimension(data, dimensionIndex, sliceIndex) {
  if (!Array.isArray(data) || data.length === 0) {
    return data;
  }
  const safeIndex = Math.min(Math.max(sliceIndex, 0), data.length - 1);
  if (dimensionIndex === 0) {
    return data[safeIndex];
  }
  return data.map((item) => sliceDimension(item, dimensionIndex - 1, sliceIndex));
}

function findDimensionIndex(dimensions, keywords) {
  return dimensions.findIndex((name) => {
    const lower = name.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword));
  });
}

/**
 * 读取 NetCDF 文件中指定变量的指定时间步和层数的数据
 * @param {NetCDFReader} reader - 通过 getNcReader 获取的 NetCDFReader 实例
 * @param {string} varName - 要读取的变量名
 * @param {number} timeIndex - 时间步索引（从 0 开始）
 * @param {number} levelIndex - 层数索引（从 0 开始，如果没有层数维度则传 0）
 * @returns {Promise<any>} - 返回指定变量的数据切片
 */
export async function readNcData(reader, varName, timeIndex = 0, levelIndex = 0) {
  try {
    const variable = reader.variables.find((item) => item.name === varName);
    if (!variable) {
      throw new Error(`变量 ${varName} 不存在于 nc 文件中`);
    }

    const rawData = reader.getDataVariable(varName);
    const flatArray = ArrayBuffer.isView(rawData) ? Array.from(rawData) : rawData;
    const dimensionNames = variable.dimensions || [];
    /* const dimensionSizes = dimensionNames
      .map((name) => reader.dimensions.find((dim) => dim.name === name)?.size)
      .filter((size) => typeof size === "number" && size > 0); */

    if (!dimensionNames.length) {
      return Array.isArray(flatArray) ? flatArray[0] : flatArray;
    }

    let data = rawData;//);
    //console.log("重塑后数据:", data);
    //let remainingDims = [...dimensionNames];

    const timeDimIndex = 1;// findDimensionIndex(remainingDims, ["time", "tstep", "t_hour"]);
    if (timeDimIndex >= 0) {
      data = sliceDimension(data, timeDimIndex, timeIndex);
      //console.log("重塑后数据1:", data);
      //remainingDims.splice(timeDimIndex, 1);
    }

    const layerDimIndex =2;// findDimensionIndex(remainingDims, ["lay", "layer", "lev", "level", "height", "z"]);
    if (layerDimIndex >= 0) {
      data = sliceDimension(data, layerDimIndex, levelIndex);
      //console.log("重塑后数据2:", data);
      //remainingDims.splice(layerDimIndex, 1);
    }

    return data;
  } catch (error) {
    console.error("读取 nc 文件出错:", error);
    throw error;
  }
}

/**
 * 按前缀筛选变量名
 * @param {string} url - nc 文件的 URL 地址
 * @param {string} prefix - 变量名前缀
 * @returns {Promise<string[]>}
 */
export async function listVariablesByPrefix(url, prefix = "") {
  const { reader } = await getNcReader(url);
  return reader.variables
    .map((item) => item.name)
    .filter((name) => (prefix ? name.startsWith(prefix) : true));
}