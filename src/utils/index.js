import * as is from './is';

export function objToQuery(obj) {
    let queryStr = '?';
    for (let i = 0; i < Object.keys(obj).length; i += 1) {
        if (is.isArray(obj[Object.keys(obj)[i]])) {
            for (let j = 0; j < obj[Object.keys(obj)[i]].length; j += 1) {
                // eslint-disable-next-line
                queryStr += `${Object.keys(obj)[i]}[]=${obj[Object.keys(obj)[i]]}${(i === Object.keys(obj).length - 1 && j === obj[Object.keys(obj)[i]].length - 1) ? '' : '&'}`;
            }
        } else {
            queryStr += `${Object.keys(obj)[i]}=${obj[Object.keys(obj)[i]]}${(i === Object.keys(obj).length - 1) ? '' : '&'}`;
        }
    }
    return queryStr;
}

export function generateRandomString(size) {
    const charArr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
        'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
        'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ];
    let result = '';
    for (var i = 0; i < size; i++) {
        result += charArr[Math.floor(Math.random() * charArr.length)];
    }
    return result;
}
