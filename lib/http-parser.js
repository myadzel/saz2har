const http = require("http");

function HttpParser() {
    this.request = "";
    this.response = "";

    this.parsedRequest = {};
    this.parsedResponse = {};

    this.BODY_SEPARATOR = "\r\n\r\n";
    this.LINE_SEPARATOR = "\r\n";
    this.HEADER_SEPARATOR = ":";
}

HttpParser.prototype.parseRequest = function (request) {
    this.request = request;

    const bodySeparatorIndex = this.request.indexOf(this.BODY_SEPARATOR);

    const headers = this.request.substr(0, bodySeparatorIndex).split(this.LINE_SEPARATOR);
    const body = this.request.substr(bodySeparatorIndex + this.BODY_SEPARATOR.length, this.request.length);

    const requestHeaders = [];
    const requestBody = body;
    let requestUrl = "";
    let requestMethod = "GET";
    let requestProtocol = "HTTP/1.1";

    headers.forEach((header, i) => {
        if (i === 0) {
            const firstLinePairs = header.match(/^(.+)\s(.+)\s(.+)$/);

            requestMethod = firstLinePairs[1].toUpperCase();
            requestUrl = firstLinePairs[2];
            requestProtocol = firstLinePairs[3];

            return true;
        }

        if (!/:\s/.test(header)) {
            return true;
        }

        const headerSeparatorIndex = header.indexOf(this.HEADER_SEPARATOR);

        const headerName = header.substr(0, headerSeparatorIndex);
        const headerValue = header.substr(headerSeparatorIndex + this.HEADER_SEPARATOR.length, header.length).trim();

        requestHeaders.push({
            name: headerName,
            value: headerValue
        });
    });

    this.parsedRequest = {
        headers: requestHeaders,
        method: requestMethod,
        url: requestUrl,
        body: requestBody,
        protocol: requestProtocol,
        query: []
    };

    return this.parsedRequest;
};

HttpParser.prototype.parseResponse = function (response) {
    this.response = response;

    const bodySeparatorIndex = this.response.indexOf(this.BODY_SEPARATOR);

    const headers = this.response.substr(0, bodySeparatorIndex).split(this.LINE_SEPARATOR);
    const body = this.response.substr(bodySeparatorIndex + this.BODY_SEPARATOR.length, this.response.length);

    const responseHeaders = [];
    const responseBody = body;
    let responseProtocol = "HTTP/1.1";
    let responseStatus = {
        code: 200,
        status: "OK"
    };

    headers.forEach((header, i) => {
        if (i === 0) {
            //https://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html
            //The first line of a Response message is the Status-Line, consisting of the protocol version followed by a numeric status code and its associated textual phrase, with each element separated by SP characters.
            const firstLinePairs = header.match(/^(.+)\s(\d+)(?:\s(.+))?$/);
            const code = parseInt(firstLinePairs[2], 10);

            responseProtocol = firstLinePairs[1];
            responseStatus = {
                code: code,
                message: firstLinePairs[3] || http.STATUS_CODES[code]
            };

            return true;
        }

        if (!/:\s/.test(header)) {
            return true;
        }

        const headerSeparatorIndex = header.indexOf(this.HEADER_SEPARATOR);

        const headerName = header.substr(0, headerSeparatorIndex);
        const headerValue = header.substr(headerSeparatorIndex + this.HEADER_SEPARATOR.length, header.length).trim();

        responseHeaders.push({
            name: headerName,
            value: headerValue
        });
    });

    this.parsedResponse = {
        protocol: responseProtocol,
        headers: responseHeaders,
        body: responseBody,
        status: {
            code: responseStatus.code,
            message: responseStatus.message
        }
    };

    return this.parsedResponse;
};

const httpParserObject = new HttpParser();

HttpParser.parseRequest = (response) => {
    return httpParserObject.parseRequest(response);
};

HttpParser.parseResponse = (response) => {
    return httpParserObject.parseResponse(response);
};

module.exports = {
    parseRequest: HttpParser.parseRequest,
    parseResponse: HttpParser.parseResponse
};