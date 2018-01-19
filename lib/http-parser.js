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

    var bodySeparatorIndex = this.request.indexOf(this.BODY_SEPARATOR);

    var headers = this.request.substr(0, bodySeparatorIndex).split(this.LINE_SEPARATOR);
    var body = this.request.substr(bodySeparatorIndex + this.BODY_SEPARATOR.length, this.request.length);

    var requestHeaders = [];
    var requestBody = body;
    var requestUrl = "";
    var requestMethod = "GET";
    var requestProtocol = "HTTP/1.1";

    headers.forEach(function (header, i) {
        if (i === 0) {
            var firstLinePairs = header.match(/^(.+)\s(.+)\s(.+)$/);

            requestMethod = firstLinePairs[1].toUpperCase();
            requestUrl = firstLinePairs[2];
            requestProtocol = firstLinePairs[3];

            return true;
        }

        if (!/:\s/.test(header)) {
            return true;
        }

        var headerSeparatorIndex = header.indexOf(this.HEADER_SEPARATOR);

        var headerName = header.substr(0, headerSeparatorIndex);
        var headerValue = header.substr(headerSeparatorIndex + this.HEADER_SEPARATOR.length, header.length).trim();

        requestHeaders.push({
            name: headerName,
            value: headerValue
        });
    }.bind(this));

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

    var bodySeparatorIndex = this.response.indexOf(this.BODY_SEPARATOR);

    var headers = this.response.substr(0, bodySeparatorIndex).split(this.LINE_SEPARATOR);
    var body = this.response.substr(bodySeparatorIndex + this.BODY_SEPARATOR.length, this.response.length);

    var responseHeaders = [];
    var responseBody = body;
    var responseProtocol = "HTTP/1.1";
    var responseStatus = {
        code: 200,
        status: "OK"
    };

    headers.forEach(function (header, i) {
        if (i === 0) {
            //https://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html
            //The first line of a Response message is the Status-Line, consisting of the protocol version followed by a numeric status code and its associated textual phrase, with each element separated by SP characters.
            var firstLinePairs = header.match(/^(.+)\s(\d+)\s(.+)$/);

            responseProtocol = firstLinePairs[1];

            responseStatus = {
                code: parseInt(firstLinePairs[2], 10),
                message: firstLinePairs[3]
            };

            return true;
        }

        if (!/:\s/.test(header)) {
            return true;
        }

        var headerSeparatorIndex = header.indexOf(this.HEADER_SEPARATOR);

        var headerName = header.substr(0, headerSeparatorIndex);
        var headerValue = header.substr(headerSeparatorIndex + this.HEADER_SEPARATOR.length, header.length).trim();

        responseHeaders.push({
            name: headerName,
            value: headerValue
        });
    }.bind(this));

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

var httpParserObject = new HttpParser();

HttpParser.parseRequest = function (response) {
    return httpParserObject.parseRequest(response);
};

HttpParser.parseResponse = function (response) {
    return httpParserObject.parseResponse(response);
};

module.exports = {
    parseRequest: HttpParser.parseRequest,
    parseResponse: HttpParser.parseResponse
};