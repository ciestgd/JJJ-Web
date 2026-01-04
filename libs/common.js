export const sumArray = (arr) => {
    // 检查输入是否为数组
    if (!Array.isArray(arr)) {
        throw new Error('参数必须是一个数组');
    }

    // 使用 reduce 方法累加数组元素
    return arr.reduce((total, current) => {
        // 确保元素是数字，非数字元素会被当作 0 处理
        const num = typeof current === 'number' ? current : 0;
        return total + num;
    }, 0); // 初始值为 0
};

export const debounce = (fn, delay = 100) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

const getMinMax = (data) => {
    // 提取所有数值，过滤非数字
    const values = data.map((item) => item.value).filter((value) => typeof value === 'number' && !isNaN(value));

    if (values.length === 0) {
        throw new Error('数据中没有有效的数值');
    }

    return {
        min: Math.min(...values),
        max: Math.max(...values),
    };
};
export const getCenter = (data) => {
    let pointList = [];
    data.forEach((item) => {
        pointList.push(turf.point(item));
    });
    var features = turf.featureCollection(pointList);
    var center = turf.center(features);
    return center.geometry.coordinates;
}
export const getColorScheme = (schemeName) => {
    const schemes = {
        default: ['#313695', '#4575b4', '#74add1', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
        jet: ['#000080', '#0000ff', '#0080ff', '#00ffff', '#80ff80', '#ffff00', '#ff8000', '#ff0000', '#800000'],
        viridis: ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
        plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
        hot: ['#000000', '#800000', '#ff0000', '#ff8000', '#ffff00', '#ffffff'],
        cool: ['#00ffff', '#80ff80', '#8080ff', '#8000ff', '#ff00ff'],
        rainbow: ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff'],
    };
    return schemes[schemeName] || schemes['jet'];
}
export const roundTo = (num, type = 'round', precision = 1) => {
    if (typeof num !== 'number') {
        return num;
    }
    let isNegative = num < 0;
    if (isNegative) {
        num = -num;
    }
    let numStr = num.toString();
    const [integerPart, decimalPart] = numStr.split('.');
    // 去除整数部分的负号
    const cleanedInteger = integerPart.replace('-', '');
    const index = cleanedInteger.length;
    let step = Math.pow(10, index - precision);
    let value = type == 'ceil' ? Math.ceil(num / step) * step : Math.floor(num / step) * step;
    if (isNegative) {
        value = -value;
    }
    return value;
};
export const generateRoundedIntervals = (data, step = 9) => {
    // 1. 获取全局最大最小值
    let { min: originalMin, max: originalMax } = getMinMax(data);

    let isNegative = false;
    if (originalMin < 0 && originalMax < 0) {
        isNegative = true;
        let temp = originalMax;
        originalMax = -originalMin;
        originalMin = -temp;
    }


    // 3. 计算目标最大值（向上取整到能被step整除的最大unit倍数）
    let min = originalMin < 0 ? roundTo(originalMin, 'ceil', 2) : roundTo(originalMin, 'floor', 2);
    let max = roundTo(originalMax, 'ceil', 2);
    // 让 (max-min) 能被 step 整除
    const totalRange = max - min;
    let stepSize = roundTo(totalRange / step, 'ceil', 2);
    max = min + stepSize * step;

    // 4. 生成区间
    const intervals = [];
    for (let i = 0; i < step; i++) {
        let intervalMin = Math.round((min + i * stepSize) * 100) / 100;
        let intervalMax = Math.round((min + (i + 1) * stepSize) * 100) / 100;
        intervals.push({ min: intervalMin, max: intervalMax });
    }
    if (isNegative) {
        intervals.forEach(interval => {
            let temp = interval.min;
            interval.min = -interval.max;
            interval.max = -temp;
        });
    }
    return intervals;
};

export function getWgs84BoundsFromIOAPI(ioapiData) {
    try {
        const {
            NCOLS,
            NROWS,
            XORIG,
            YORIG,
            XCELL,
            YCELL,
            P_ALP,
            P_BET,
            P_GAM,
            YCENT,
        } = ioapiData;
        // 校验必要参数
        const requiredParams = [
            NCOLS,
            NROWS,
            XORIG,
            YORIG,
            XCELL,
            YCELL,
            P_ALP,
            P_BET,
            P_GAM,
            YCENT,
        ];
        if (
            requiredParams.some(
                (param) => param === undefined || param === null
            )
        ) {
            throw new Error("IOAPI 数据缺少必要的投影或范围参数");
        }
        if (NCOLS <= 0 || NROWS <= 0 || XCELL <= 0 || YCELL <= 0) {
            throw new Error(
                "NCOLS/NROWS/XCELL/YCELL 必须为正数（网格大小无效）"
            );
        }

        const xMin = XORIG;
        const xMax = XORIG + NCOLS * XCELL;
        const yMax = YORIG + NROWS * YCELL;
        const yMin = YORIG;

        const lccProjDef = `+proj=lcc +lat_1=${P_ALP} +lat_2=${P_BET} +lon_0=${P_GAM} +lat_0=${YCENT} +x_0=0 +y_0=0 +datum=WGS84  +units=m +no_defs`;
        lambertProjDef.value = lccProjDef;
        const projectToWGS84 = proj4(lccProjDef, "EPSG:4326");

        const corners = [
            [xMin, yMax], // 左上角
            [xMax, yMax], // 右上角
            [xMin, yMin], // 左下角
            [xMax, yMin], // 右下角
        ].map((coord) => projectToWGS84.forward(coord));

        return L.latLngBounds([
            [corners[0][1], corners[0][0]],
            [corners[3][1], corners[3][0]],
        ]);
    } catch (error) {
        return [];
    }
}

