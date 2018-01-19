var utf8ArrayToString = function (arr) {
    var chars = [],
        i = 0,
        len = arr.length,
        char,
        char2,
        char3;

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

var sortArrayByKey = function (arr, key) {
    arr.sort(function (a, b) {
        if (a[key] > b[key]) {
            return 1;
        } else if (a[key] < b[key]) {
            return -1;
        } else {
            return 0;
        }
    });
};

var stringify = function (object) {
    return JSON.stringify(object, true, "  ");
};


var uncapitalizeFirstLetter = function (string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
};

module.exports = {
    utf8ArrayToString: utf8ArrayToString,
    sortArrayByKey: sortArrayByKey,
    stringify: stringify,
    uncapitalizeFirstLetter: uncapitalizeFirstLetter
};