// map-component.js
import chinaGeoJson from "./china.js";
import chinaCityGeoJson from "./china_city.js";

// 定义可更新的图例类
const UpdatableLegend = L.Control.extend({
  options: {
    position: "topright",
    legendData: null,
  },
  //在此初始化
  initialize: function (options) {
    L.Util.extend(this.options, options);
  },
  onAdd: function (map) {
    // 创建图例容器并保存引用
    this.container = L.DomUtil.create("div", "custom-legend");
    L.DomEvent.disableClickPropagation(this.container); // 防止干扰地图交互
    // 初始渲染
    // 初始图例数据
    const initialData = this.options.legendData || {
      title: "图例",
      items: [],
    };
    this.update(initialData);
    return this.container;
  },

  // 2. 核心：图例更新方法
  update: function (data) {
    // 生成图例HTML
    let html = "";
    if (data.title) {
      html += `<div class="map-legend-title">${data.title}</div>`;
    }
    if (data.unit) {
      html += `<div class="map-legend-item">单位：${data.unit}</div>`;
    }
    // 循环生成图例项
    data.items.forEach((item) => {
      html += `
                        <div class="map-legend-item">
                            <div class="legend-symbol symbol-${item.type}" style="background-color: ${item.color};"></div>
                            <span>${item.label}</span>
                        </div>
                    `;
    });
    // 更新容器内容（重绘）
    this.container.innerHTML = html;
  },
  _onCloseControl: function () {
    this._map.options.Legend = false;
    this.remove(this._map);
  },
});
export class MapComponent {
  // 构造函数：接收容器ID和配置参数
  constructor(containerRef, options = {}) {
    // 默认配置
    this.defaults = {
      isLambert: false,
      title: null,
      isCity: false,
      lambertProjDef:
        "+proj=lcc +lat_1=25 +lat_2=40 +lat_0=34 +lon_0=110 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
    };
    // 合并配置
    this.config = { ...this.defaults, ...options };
    this.containerRef = containerRef;
    this.map = null;
    this.baseMapLayer = null;

    this.featureGroupLayer = null;
    this.canvasImgLayer = null;
    this.mapColorList = [];
    this.legendControl = null;
    this.cellSize = 20;
    this.rows = 0;
    this.cols = 0;

    this.base64List = [];

    this.baseData = [];
    this.bounds = [];
    // 绑定事件回调（供外部监听）
    this.events = {
      mapLoaded: [],
      layerChanged: [],
    };
    this.crs = null;
    this.unit = "";
    // 初始化地图
    this.initMap();
  }

  // 初始化地图
  initMap() {
    if (!this.containerRef) {
      console.error("地图容器不存在");
      return;
    }
    try {
      proj4.defs("LCC", this.config.lambertProjDef);

      // 配置投影
      if (this.config.isLambert) {
        this.crs = new L.Proj.CRS("LCC", this.config.lambertProjDef, {
          // resolutions: [8192, 4096, 2048, 1024, 512, 256, 128],
          resolutions: [
            32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32,
          ],
        });

        this.map = L.map(this.containerRef, {
          crs: this.crs,
          zoom: 3,
          zoomControl: false,
          attributionControl: false,
        });
      } else {
        this.map = L.map(this.containerRef, {
          center: [39.9042, 116.4074],
          zoom: 4,
          zoomControl: false,
          attributionControl: false,
        });
      }
      let geoJsonData = this.config.isCity ? chinaCityGeoJson : chinaGeoJson;
      // 添加底图
      this.baseMapLayer = L.geoJson(geoJsonData, {
        style: () => ({
          fillColor: "rgba(0, 0, 0, 0)",
          color: "#fff",
          weight: 1,
        }),
      }).addTo(this.map);
      this.map.fitBounds(this.baseMapLayer.getBounds());
      this.featureGroupLayer = L.featureGroup().addTo(this.map);
      // 绑定地图点击事件，用于将点击的经纬度映射到栅格索引并触发回调
      this._boundOnMapClick = this._onMapClick.bind(this);
      this.map.on("click", this._boundOnMapClick);
      // 触发地图加载完成事件
      this.triggerEvent("mapLoaded", this.map);
    } catch (error) {
      console.error("地图初始化失败:", error);
    }
  }

  // 初始化图例控件
  initLegend() {
    let legends = this.mapColorList.map((item) => {
      let label = "";
      if (item.label) {
        label = item.label;
      } else {
        // label = `${item.min} - ${item.max}`;
        if (item.min != null && item.max != null) {
          label = `${item.min} - ${item.max}`;
        } else if (item.min != null) {
          label = `≥ ${item.min}`;
        } else if (item.max != null) {
          label = `≤ ${item.max}`;
        }
      }
      return {
        label: label,
        type: "square",
        color: item.color,
      };
    });
    if (!this.legendControl) {
      this.legendControl = new UpdatableLegend({
        position: "bottomright",
        legendData: {
          title: this.config.title,
          unit: this.unit,
          items: legends,
        },
      }).addTo(this.map);
    }

    this.legendControl.update({
      title: this.config.title,
      unit: this.unit,
      items: legends,
    });
  }

  async createCanvasImage(groupData, size = 20) {
    const _this = this;
    if (!Array.isArray(groupData) || groupData.length === 0) {
      console.error("groupData必须是非空数组");
      return null;
    }
    const firstRow = groupData[0];
    if (!Array.isArray(firstRow) || firstRow.length === 0) {
      console.error("groupData的第一行必须是 non空数组");
      return null;
    }

    // 2. 网格参数计算
    const rows = groupData.length; // 行数（垂直方向，对应地理纬度方向）
    this.rows = rows;
    const cols = firstRow.length; // 列数（水平方向，对应地理经度方向）
    this.cols = cols;
    const width = cols * size; // Canvas宽度 = 列数 × 单元大小
    const height = rows * size; // Canvas高度 = 行数 × 单元大小

    // 3. 创建Canvas并获取上下文
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("浏览器不支持Canvas上下文");
      return null;
    }
    // 4. 绘制网格（核心：反转Y轴解决南北颠倒）
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const currentRow = groupData[rowIndex];
      // 跳过无效行（避免数组越界）
      if (!Array.isArray(currentRow)) continue;

      for (let colIndex = 0; colIndex < cols; colIndex++) {
        // 容错：跳过当前行列的无效数据
        const cellData = currentRow[colIndex];
        if (!cellData) continue;

        // 计算当前网格在Canvas中的位置
        const xPos = colIndex * size; // 水平位置：列索引 × 单元大小（左→右，对应经度东→西）

        // 关键修正：反转Y轴（解决南北颠倒）
        // 地理上：rowIndex越大 → 纬度越高（越靠北）
        // Canvas上：yPos越小 → 越靠上
        const yPos = (rows - 1 - rowIndex) * size; // 垂直位置：反转行索引，北→上，南→下

        // 获取颜色（容错处理）
        const cellValue = cellData.value;
        const fillColor = _this.getColor?.(cellValue) || "rgba(0, 0, 0, 0.3)";
        // 绘制网格单元（带边框区分）
        ctx.fillStyle = fillColor;
        ctx.fillRect(xPos, yPos, size, size); // 填充单元格


      }
    }

    // 5. 转换为图片并返回（优化内存处理）
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Canvas转换为Blob失败");
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        // 返回时携带网格参数，方便后续地图叠加计算
        resolve({
          url,
          width,
          height,
          rows,
          cols,
          size,
        });
      }, "image/png");
    });


    // // 5. 将 canvas 导出为 base64 dataURL（避免生成临时 Blob 与 ObjectURL）
    // try {
    //   const dataUrl = canvas.toDataURL('image/png');
    //   // console.log("dataUrl----", dataUrl);
    //   this.base64List.push(dataUrl);
    //   console.log("this.base64List----", this.base64List);
    //   return {
    //     // 兼容原来使用 url 字段（原为 ObjectURL），现在返回 data URL
    //     url: dataUrl,
    //     width,
    //     height,
    //     rows,
    //     cols,
    //     size,
    //   };
    // } catch (err) {
    //   console.error('Canvas 转 dataURL 失败', err);

    // }

  }

  async drawCanvasGrid(imgUrl) {
    const _this = this;
    let imageResult = {};
    if (imgUrl) {
      imageResult.url = imgUrl;
    }
    else {
      // 3. 生成匹配比例的图片
      imageResult = await this.createCanvasImage(
        this.baseData,
        this.cellSize
      );
      if (!imageResult || !imageResult.url) {
        console.error("生成图片失败");
        return;
      }
    }

    let layers = this.featureGroupLayer.getLayers();

    // 5. 添加新图片图层
    this.canvasImgLayer = L.imageOverlay(imageResult.url, this.bounds, {
      opacity: 0,
      attribution: "GeoJSON Image Layer",
      interactive: true,
    });
    // 6. 新图层加载完成后：渐显新图层 + 清理旧图层（替代固定延时）
    this.canvasImgLayer.once("load", () => {
      // 新图层渐显（视觉过渡更流畅）
      _this.canvasImgLayer.setOpacity(0.8);
      // 清理旧图层 + 彻底释放资源
      layers.forEach((oldLayer) => {
        // 1. 从容器中移除旧图层
        this.featureGroupLayer.removeLayer(oldLayer);
        // 2. 释放 ObjectURL 资源（根治内存泄漏）
        if (oldLayer._url) {
          URL.revokeObjectURL(oldLayer._url);
          oldLayer._url = null; // 避免重复释放
        }

        // 3. 主动销毁图层实例（Leaflet 部分版本需手动清理事件）
        oldLayer.off(); // 移除图层所有事件监听
        oldLayer = null; // 解除引用，便于GC回收
      });
      // 触发图层更新事件
      _this.triggerEvent("layerChanged", _this.canvasImgLayer);
    });
    // 将 image URL 附加到图层实例，便于后续资源回收
    this.canvasImgLayer._url = imageResult.url;
    this.canvasImgLayer.addTo(this.featureGroupLayer);
  }
  clearCanvasLayer() {
    if (this.canvasImgLayer) {
      this.featureGroupLayer.removeLayer(this.canvasImgLayer);
      if (this.canvasImgLayer._url) {
        URL.revokeObjectURL(this.canvasImgLayer._url); // 释放URL内存
      }
      this.canvasImgLayer = null;
    }
  }

  getImageOverlayPixelSize(map, imageOverlay) {
    // 1. 获取图片的地理边界 (LatLngBounds)
    const bounds = imageOverlay.getBounds();

    // 2. 获取西北角 (NorthWest) 和东南角 (SouthEast) 的经纬度
    const northWest = bounds.getNorthWest();
    const southEast = bounds.getSouthEast();

    // 3. 将地理坐标投影到 LayerPoint 像素坐标系
    // LayerPoint 是相对于地图容器左上角的像素坐标
    const nwPixel = map.latLngToLayerPoint(northWest);
    const sePixel = map.latLngToLayerPoint(southEast);

    // 4. 计算像素尺寸
    // 宽度 = SE 角的 X 坐标 - NW 角的 X 坐标
    const widthPixels = Math.abs(sePixel.x - nwPixel.x);

    // 高度 = SE 角的 Y 坐标 - NW 角的 Y 坐标 (注意 Y 轴在 Leaflet 中向下为正)
    const heightPixels = Math.abs(sePixel.y - nwPixel.y);

    return {
      width: widthPixels,
      height: heightPixels,
    };
  }
  getGridIndicesByPixel(
    map,
    layerPoint,
    gridOriginLayerPoint,
    cellPixelWidth,
    cellPixelHeight
  ) {
    // 1. 计算点击点相对于网格原点的像素偏移量 (Delta Pixel)
    // 这一步将点击点从地图坐标系转换到网格坐标系
    const offsetX = layerPoint.x - gridOriginLayerPoint.x;
    const offsetY = layerPoint.y - gridOriginLayerPoint.y;

    // 2. 检查点击是否在网格范围内
    // 如果偏移量是负数，表示点击在网格左边或上边
    if (offsetX < 0 || offsetY < 0) {
      // console.warn("点击位置在网格数据范围之外 (左/上侧)");
      // 可以返回 -1 或抛出错误
    }

    // 3. 计算最终的网格索引（向下取整）
    // Index = (相对偏移量) / (单元像素尺寸)
    const columnIndex = Math.floor(offsetX / cellPixelWidth);
    const rowIndex = Math.floor(offsetY / cellPixelHeight);

    return {
      col: columnIndex,
      row: rowIndex,
    };
  }

  // 地图点击事件：计算栅格位置并触发 canvasClick 事件
  _onMapClick(e) {
    try {
      if (!this.baseData || !this.bounds) return;
      const { width, height } = this.getImageOverlayPixelSize(
        this.map,
        this.canvasImgLayer
      );
      const indices = this.getGridIndicesByPixel(
        this.map,
        e.layerPoint,
        this.map.latLngToLayerPoint(this.bounds.getNorthWest()),
        width / this.cols,
        height / this.rows
      );
      if (!indices) return; // 点击在图像外
      const row = this.rows - indices.row - 1;
      const col = indices.col;

      const cellRow = this.baseData[row];
      const cell = cellRow && cellRow[col];
      const value = cell && (cell.value !== undefined ? cell.value : null);
      // 触发外部回调，传入行列、值和原始经纬度
      this.triggerEvent("canvasClick", { latlng: e.latlng, row, col, value });
    } catch (err) {
      console.error("处理地图点击失败", err);
    }
  }
  getColor(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "#000"; // 缺失值颜色
    }
    const numericValue = Number(value);
    const list = Array.isArray(this.mapColorList) ? this.mapColorList : [];
    if (list.length === 0) return "#000";

    // 支持开放边界：
    // - min == null => (-Infinity, max]
    // - max == null => [min, +Infinity)
    // - min/max 都为 null => 全覆盖
    for (let i = 0; i < list.length; i++) {
      const range = list[i] || {};
      const lower = range.min == null ? -Infinity : Number(range.min);
      const upper = range.max == null ? Infinity : Number(range.max);
      if (Number.isNaN(lower) || Number.isNaN(upper)) continue;

      if (numericValue >= lower && numericValue <= upper) {
        return range.color;
      }
    }

    // 如果色带存在“空档”，做一个稳定兜底：
    // - 值偏大：取 lower(=min) 最大的那一档
    // - 值偏小：取 upper(=max) 最小的那一档
    let maxLower = -Infinity;
    let maxLowerColor = null;
    let minUpper = Infinity;
    let minUpperColor = null;

    for (let i = 0; i < list.length; i++) {
      const range = list[i] || {};
      const lower = range.min == null ? -Infinity : Number(range.min);
      const upper = range.max == null ? Infinity : Number(range.max);
      if (!Number.isNaN(lower) && lower > maxLower) {
        maxLower = lower;
        maxLowerColor = range.color;
      }
      if (!Number.isNaN(upper) && upper < minUpper) {
        minUpper = upper;
        minUpperColor = range.color;
      }
    }

    if (numericValue > maxLower && maxLowerColor) return maxLowerColor;
    if (numericValue < minUpper && minUpperColor) return minUpperColor;

    return "#000"; // 未命中且无法兜底
  }
  getMap() {
    return this.map;
  }

  async initCanvasDraw(data, colorList, size = 20, mapBounds = [], isShowLegend = true, unit) {
    try {
      this.bounds = mapBounds;
      this.mapColorList = colorList || [];
      this.baseData = data || [];
      this.cellSize = size || 20;
      this.unit = unit || "";
      if (!data.length) {
        this.clearCanvasLayer();
        this.legendControl && this.legendControl.remove();
        return;
      }
      // 初始化图例 -- 仅初始化一次，后续更新只需调用 update 方法
      if (isShowLegend) {
        this.initLegend();
      }

      await this.drawCanvasGrid();
    } catch (error) {
      console.error("resetMap 执行失败：", error);
      this.clearCanvasLayer();
    }
  }

  // 根据图片路径画图
  async initCanvasDrawByImgUrl(imgUrl, colorList, size = 20, mapBounds = [], isShowLegend = true, unit) {
    try {
      this.bounds = mapBounds;
      this.mapColorList = colorList || [];
      this.cellSize = size || 20;
      if (!imgUrl) {
        this.clearCanvasLayer();
        this.legendControl && this.legendControl.remove();
        return;
      }
      this.unit = unit || "";
      // 初始化图例 -- 仅初始化一次，后续更新只需调用 update 方法
      if (isShowLegend) {
        this.initLegend();
      }

      await this.drawCanvasGrid(imgUrl);
    } catch (error) {
      console.error("resetMap 执行失败：", error);
      this.clearCanvasLayer();
    }
  }

  // 事件监听：供外部注册回调
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(callback);
  }

  // 触发事件
  triggerEvent(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].forEach((callback) => callback(...args));
    }
  }

  // 销毁地图
  destroy() {
    if (this.map) {
      // 取消绑定的事件（防止内存泄漏）
      if (this._boundOnMapClick) {
        this.map.off("click", this._boundOnMapClick);
        this._boundOnMapClick = null;
      }
      this.map.remove();
      this.map = null;
    }
  }
}
