var util = require("util");
var events = require("events");
var querystring = require("querystring");

var moment = require("moment");
var pako = require("pako");
var xmlParser = require("pixl-xml");
var harValidator = require("har-validator/lib");

var parseCookie = require("../lib/cookie").parse;
var httpParser = require("../lib/http-parser");
var utils = require("../lib/utils");
var pkg = require("../package");

util.inherits(HarBuilder, events.EventEmitter);

function HarBuilder() {
    this.HAR_VERSION = "1.2";

    this.FIDDLER_SESSION_TIMERS = [
        "ClientConnected",
        "ClientBeginRequest",
        "GotRequestHeaders",
        "ClientDoneRequest",
        "ServerConnected",
        "FiddlerBeginRequest",
        "ServerGotRequest",
        "ServerBeginResponse",
        "GotResponseHeaders",
        "ServerDoneResponse",
        "ClientBeginResponse",
        "ClientDoneResponse"
    ];

    this.ENTRY_SORT_KEY = "startedDateTime";

    this.DEFAULT_CHARSET = "utf-8";

    this.END_OF_HTTP_HEADER = "\r\n\r\n";

    this.har = {
        log: {
            version: this.HAR_VERSION,
            creator: {
                name: pkg.name,
                version: pkg.version
            },
            pages: [],
            entries: []
        }
    };
}

HarBuilder.getHeaders = function (headers, name) {
    name = name.toLowerCase();

    var matchedHeaders = headers.filter(function (header) {
        return header.name.toLowerCase() == name;
    });

    return matchedHeaders;
};

HarBuilder.prototype.build = function (data) {
    this._parseQueries(data);

    this._validate();
};

HarBuilder.prototype._parseQueries = function (queries) {
    queries.forEach(this._parseQuery.bind(this));
};

HarBuilder.prototype._validate = function () {
    harValidator(this.har, function (err) {
        if (err) {
            this.emit("error", "invalid har");
        } else {
            this._done();
        }
    }.bind(this));
};

HarBuilder.prototype._done = function () {
    this.emit("build", this.har);
};

HarBuilder.prototype._parseQuery = function (query) {
    var that = this;

    var getHeaders = HarBuilder.getHeaders;

    query.request = httpParser.parseRequest(query.raw.request);
    query.response = httpParser.parseResponse(query.raw.response);

    query.metadata = xmlParser.parse(new Buffer(query.raw.metadata, "binary"));

    //skip fiddler error
    if (query.response.status.code == 502 || query.response.status.code == 401) {
        return;
    }

    var getResponseHeaders = function (name) {
        return getHeaders(query.response.headers, name);
    };

    var getResponseHeader = function (name) {
        var result = getHeaders(query.response.headers, name);

        return result.length ? result[0] : null;
    };

    var getResponseHeaderValue = function (name, result) {
        result = typeof result != "undefined" ? result : "";

        var header = getResponseHeader(name);

        return header ? header.value : result;
    };

    var getRequestHeader = function (name) {
        var result = getHeaders(query.request.headers, name);

        return result.length ? result[0] : null;
    };

    var getRequestHeaderValue = function (name, result) {
        result = typeof result != "undefined" ? result : "";

        var header = getRequestHeader(name);

        return header ? header.value : result;
    };

    var responseContentType = getResponseHeaderValue("Content-Type");

    var needToConvertToBase64 = !!/(image|font)/.test(getResponseHeaderValue("Content-Type"));
    var isCompressedBody = !!/(gzip|deflate)/.test(getResponseHeaderValue("Content-Encoding"));

    var requestBody = new Buffer(query.request.body, "binary");
    var responseBody = new Buffer(query.response.body, "binary");

    var requestBodySize = requestBody.length;

    var responseBodySize = responseBody.length;
    var responseBodyUncompressedSize = responseBodySize;

    if (isCompressedBody) {
        try {
            responseBody = utils.utf8ArrayToString(pako.inflate(responseBody));

            responseBodyUncompressedSize = responseBody.length;
        } catch (err) {
            that.emit("error", "decompression error");
        }
    }

    var responseCharset = this.DEFAULT_CHARSET;

    if (responseContentType && responseContentType.indexOf("charset=") != -1) {
        var responseCharsetMatches = responseContentType.match("charset=([-_a-zA-Z0-9]+)");

        if (responseCharsetMatches) {
            responseCharset = responseCharsetMatches[1];
        }
    }

    var requestHeadersSize = (query.raw.request.split(this.END_OF_HTTP_HEADER)[0] + this.END_OF_HTTP_HEADER).length;
    var responseHeadersSize = (query.raw.response.split(this.END_OF_HTTP_HEADER)[0] + this.END_OF_HTTP_HEADER).length;

    var entry = {
        startedDateTime: "",
        time: -1,
        request: {
            method: query.request.method,
            url: encodeURI(decodeURI(query.request.url)),
            httpVersion: query.request.protocol,
            cookies: [],
            headers: [],
            queryString: [],
            headersSize: requestHeadersSize,
            bodySize: requestBodySize
        },
        response: {
            status: query.response.status.code,
            statusText: query.response.status.message,
            httpVersion: query.response.protocol,
            headers: [],
            cookies: [],
            content: {
                mimeType: getResponseHeaderValue("Content-Type"),
                text: responseBody.toString("binary"),
                size: responseBodyUncompressedSize,
                compression: responseBodyUncompressedSize - responseBodySize
            },
            redirectURL: "",
            headersSize: responseHeadersSize,
            bodySize: responseBodySize
        },
        cache: {},
        timings: {
            dns: -1,
            blocked: -1,
            connect: -1,
            ssl: -1,
            send: -1,
            wait: -1,
            receive: -1
        }
    };

    var timing = {};

    that.FIDDLER_SESSION_TIMERS.forEach(function (name) {
        timing[utils.uncapitalizeFirstLetter(name)] = moment(query.metadata.SessionTimers[name]);
    });

    entry.timings.send = timing.clientDoneRequest.diff(timing.clientBeginRequest) + 1;
    entry.timings.wait = timing.clientBeginResponse.diff(timing.clientDoneRequest) + 1;
    entry.timings.receive = timing.clientDoneResponse.diff(timing.clientBeginResponse) + 1;

    entry.startedDateTime = timing.clientBeginRequest.toISOString();

    entry.time = entry.timings.send + entry.timings.wait + entry.timings.receive;

    if (needToConvertToBase64) {
        entry.response.content.text = responseBody.toString("base64");

        entry.response.content.encoding = "base64";
    } else {
        entry.response.content.text = responseBody.toString(responseCharset);

        //entry.response.content.encoding = responseCharset;
    }

    //handle put/post
    if (query.request.method == "POST" || query.request.method == "PUT") {
        var requestBodyCopy = requestBody.toString(responseCharset);

        var requestBodyParams = [];

        var mimeType = getRequestHeaderValue("Content-Type");

        if (mimeType == "application/x-www-form-urlencoded") {
            var requestBodyAsObject = querystring.parse(requestBodyCopy);

            if (requestBodyAsObject[requestBodyCopy] != "") {
                for (var key in requestBodyAsObject) {
                    requestBodyParams.push({
                        name: decodeURIComponent(key),
                        value: decodeURIComponent(requestBodyAsObject[key])
                    });
                }
            }
        }

        entry.request.postData = {
            mimeType: mimeType,
            text: requestBodyCopy,
            params: requestBodyParams
        };
    }

    //parse request cookie
    var requestCookiesAsHeader = getRequestHeaderValue("Cookie");

    if (requestCookiesAsHeader) {
        entry.request.cookies = parseCookie(requestCookiesAsHeader);
    }

    //parse response cookie
    var responseCookiesAsHeaders = getResponseHeaders("Set-Cookie");

    if (responseCookiesAsHeaders.length) {
        responseCookiesAsHeaders.forEach(function (cookie) {
            entry.response.cookies.push(parseCookie(cookie.value)[0]);
        });
    }

    entry.request.headers = query.request.headers;
    entry.response.headers = query.response.headers;

    this.har.log.entries.push(entry);

    utils.sortArrayByKey(this.har.log.entries, this.ENTRY_SORT_KEY);
};

module.exports = HarBuilder;