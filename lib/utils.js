const utf8ArrayToString = (arr) => {
    const chars = [];

    const len = arr.length;

    let i = 0;

    let char;
    let char2;
    let char3;

    while (i < len) {
        char = arr[i++];

        switch (char >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                //0xxxxxxx
                chars.push(String.fromCharCode(char));
                break;
            case 12: case 13:
                //110x xxxx  10xx xxxx
                char2 = arr[i++];
                chars.push(String.fromCharCode(((char & 0x1F) << 6) | (char2 & 0x3F)));
            break;
            case 14:
                //1110 xxxx  10xx xxxx  10xx xxxx
                char2 = arr[i++];
                char3 = arr[i++];
                chars.push(String.fromCharCode(((char & 0x0F) << 12) | ((char2 & 0x3F) << 6) | ((char3 & 0x3F) << 0)));
                break;
        }
    }

    return chars.join("");
};

const sortArrayByKey = (arr, key) => {
    arr.sort((a, b) => {
        if (a[key] > b[key]) {
            return 1;
        } else if (a[key] < b[key]) {
            return -1;
        } else {
            return 0;
        }
    });
};

const stringify = (object) => {
    return JSON.stringify(object, true, "  ");
};

const uncapitalizeFirstLetter = (string) => {
    return string.charAt(0).toLowerCase() + string.slice(1);
};

module.exports = {
    utf8ArrayToString: utf8ArrayToString,
    sortArrayByKey: sortArrayByKey,
    stringify: stringify,
    uncapitalizeFirstLetter: uncapitalizeFirstLetter
};