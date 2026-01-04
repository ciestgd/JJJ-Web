// import Papa from '../utils/papaparse.min.js';
// import dayjs from '../utils/dayjs.min.js';
// import * as XLSX from '../utils/xlsx.full.min.js';



const readFile = async (filePath) => {
    let result = await fetch(filePath).then((res) => res.text());
    return result;
};
const readXlsx = async (filePath) => {
    let result = await fetch(filePath).then((res) => res.arrayBuffer());
    return new Uint8Array(result);
};
const setXlsxData = (sheetData, name) => {
    let list = [];
    let headList = [];
    let unUseIndex = sheetData.findIndex((row) => row.length === 0);
    let headIndex = sheetData.findIndex((row) => row[0] === ' ');

    if (unUseIndex !== -1) {
        sheetData.splice(unUseIndex);
        unUseIndex = null; // Reset unUseIndex after modifying the array
    }
    if (headIndex !== -1) {
        sheetData.splice(0, headIndex + 1);
        headIndex = null; // Reset headIndex after modifying the array
    }
    if (name.includes('Information')) {
        sheetData.shift();
    }

    headList = sheetData.shift();

    list = sheetData.map((item) => {
        return headList.reduce((obj, key, index) => {
            let _item = item[index];
            obj[key] = _item instanceof Date ? dayjs(_item).format('YYYY-MM-DD') : _item;
            return obj;
        }, {});
    });

    return {
        headList,
        list,
    };
};
export const getXlsxOtions = async (filepath) => {
    let results = await readXlsx(filepath);
    return analysisXlsx(results)
};
export const getOptions = async (filepath, handleDataFn = null) => {
    let fileContent = await readFile(filepath);
    return await analysisCsv(fileContent, handleDataFn);
};
export const getTxtFile = async (filePath, handleDataFn = null) => {
    let fileContent = await readFile(filePath);
    return handleDataFn ? await handleDataFn(fileContent) : fileContent;
};
const handlePapaParse = (fileContent) => {
    return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
        });
    });
};
const getCsvHeadList = (data) => {
    if (data.length === 0) {
        return [];
    }
    let headList = data[0].filter((item) => item !== '');
    if (headList.length === 1) {
        data.shift();
        headList = getCsvHeadList(data);
    }
    headList = headList.map(item => item.trim());
    return headList;
};
export const analysisXlsx = async (fileContent, handleDataFn = null) => {
    let workbook = XLSX.read(fileContent, {
        type: 'array',
        cellDates: true,
        cellStyles: true,
        sheetStubs: true,
    });
    let sheetNames = workbook.SheetNames;
    const tableList = sheetNames.reduce((acc, sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        acc[sheetName] = setXlsxData(sheetData, sheetName);
        return acc;
    }, {});
    return {
        tableNames: sheetNames,
        data: tableList,
    };
}
export const analysisCsv = async (fileContent, handleDataFn = null) => {
    let data = await handlePapaParse(fileContent);
    if (handleDataFn) {
        data = await handleDataFn(data);
    }
    let headList = await getCsvHeadList(data);
    // data.shift();
    const list = data.map((row) => {
        return headList.reduce((obj, key, index) => {
            obj[key] = row[index];
            return obj;
        }, {});
    });

    list.shift();

    return {
        headList,
        list,
    };
};
const getFileData = async (filePath, handleDataFn = null) => {
    let returnData = {
        data: {},
        tableNames: [],
        type: '',
    };
    if (filePath.includes('.xlsx')) {
        let { tableNames, data } = await getXlsxOtions(filePath);
        returnData.tableNames = tableNames || [];
        returnData.data = data;
        returnData.type = 'xlsx';
    } else if (filePath.includes('.csv')) {
        let data = await getOptions(filePath, handleDataFn);
        returnData.data = data;
        returnData.type = 'csv';
    } else if (filePath.includes('.txt')) {
        let data = await getTxtFile(filePath, handleDataFn);
        returnData.data = data;
        returnData.type = 'txt';
    }
    return returnData;
};
export default getFileData;
