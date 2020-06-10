const util = require("util");
const events = require("events");
const querystring = require("querystring");

const moment = require("moment");
const pako = require("pako");
const xmlParser = require("pixl-xml");
const validate = require("har-validator");

const parseCookie = require("../lib/cookie").parse;
const httpParser = require("../lib/http-parser");
const utils = require("../lib/utils");
const pkg = require("../package");

util.inherits(HarBuilder, events.EventEmitter);

function patchBuffer() {
    const toString = Buffer.prototype.toString;

    Buffer.prototype.toString = function (charset) {
        //iso-8859-1 is alias for latin-1
        if (charset === "iso-8859-1") {
            charset = "latin1";
        }

        const args = arguments;
        args[0] = charset;

        return toString.apply(this, args);
    };
}

patchBuffer();

function HarBuilder(options) {
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

    this.options = Object.assign({ validate: true }, options);

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

    const matchedHeaders = headers.filter((header) => {
        return header.name.toLowerCase() === name;
    });

    return matchedHeaders;
};

HarBuilder.decodeChunks = function (data) {
    // https://en.wikipedia.org/wiki/Chunked_transfer_encoding#Encoded_data

    const chunks = [];
    const delimeter = "\r\n";

    let index = 0;
    let process = true;

    while (process) {
        const start = data.substr(index).indexOf(delimeter);

        const chunkSizeHex = data.substr(index, start);
        // hexadecimal format for chunk length
        const chunkSize = parseInt(chunkSizeHex, 16);

        if (chunkSize) {
            const chunk = data.substr(index + delimeter.length + chunkSizeHex.length, chunkSize);

            chunks.push(chunk);

            index += chunkSizeHex.length + chunkSize + chunkSizeHex.length;
        } else {
            process = false;
        }
    }

    return chunks.join("");
};

HarBuilder.prototype.build = function (data) {
    this._parseQueries(data);
    if (this.options.validate) {
        this._validate();
    } else {
        this._done();
    }
};

HarBuilder.prototype._parseQueries = function (queries) {
    queries.forEach(this._parseQuery.bind(this));
};

HarBuilder.prototype._validate = function () {
    validate.header(this.har)
        .then(() => this._done())
        .catch(err => this.emit("error", err));
};

HarBuilder.prototype._done = function () {
    this.emit("build", this.har);
};

HarBuilder.prototype._parseQuery = function (query) {
    const that = this;

    const getHeaders = HarBuilder.getHeaders;

    query.request = httpParser.parseRequest(query.raw.request);
    query.response = httpParser.parseResponse(query.raw.response);

    query.metadata = xmlParser.parse(Buffer.from(query.raw.metadata, "binary"));

    //skip fiddler error
    if (query.response.status.code === 502 || query.response.status.code === 401) {
        return;
    }

    const getResponseHeaders = function (name) {
        return getHeaders(query.response.headers, name);
    };

    const getResponseHeader = function (name) {
        const result = getHeaders(query.response.headers, name);

        return result.length ? result[0] : null;
    };

    const getResponseHeaderValue = function (name, result) {
        result = typeof result != "undefined" ? result : "";

        const header = getResponseHeader(name);

        return header ? header.value : result;
    };

    const getRequestHeader = function (name) {
        const result = getHeaders(query.request.headers, name);

        return result.length ? result[0] : null;
    };

    const getRequestHeaderValue = function (name, result) {
        result = typeof result != "undefined" ? result : "";

        const header = getRequestHeader(name);

        return header ? header.value : result;
    };

    const responseContentType = getResponseHeaderValue("Content-Type");

    const needToConvertToBase64 = !!/(image|font)/.test(getResponseHeaderValue("Content-Type"));
    const isCompressedBody = !!/(gzip|deflate)/.test(getResponseHeaderValue("Content-Encoding"));

    const isChunkedBody = !!/(chunked)/.test(getResponseHeaderValue("Transfer-Encoding"));

    const requestBody = Buffer.from(query.request.body, "binary");
    let responseBody = Buffer.from(query.response.body, "binary");

    if (isChunkedBody) {
        const data = HarBuilder.decodeChunks(query.response.body);

        responseBody = Buffer.from(data, "binary");
    }

    const requestBodySize = requestBody.length;
    const responseBodySize = responseBody.length;

    let responseBodyUncompressedSize = responseBodySize;

    if (isCompressedBody) {
        try {
            responseBody = utils.utf8ArrayToString(pako.inflate(responseBody));
            responseBodyUncompressedSize = responseBody.length;
        } catch (err) {
            that.emit("error", err);
        }
    }

    let responseCharset = this.DEFAULT_CHARSET;

    if (responseContentType && responseContentType.indexOf("charset=") !== -1) {
        const responseCharsetMatches = responseContentType.match("charset=([-_a-zA-Z0-9]+)");

        if (responseCharsetMatches) {
            responseCharset = responseCharsetMatches[1];
        }
    }

    const requestHeadersSize = (query.raw.request.split(this.END_OF_HTTP_HEADER)[0] + this.END_OF_HTTP_HEADER).length;
    const responseHeadersSize = (query.raw.response.split(this.END_OF_HTTP_HEADER)[0] + this.END_OF_HTTP_HEADER).length;

    const entry = {
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

    const timing = {};

    that.FIDDLER_SESSION_TIMERS.forEach((name) => {
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
    if (query.request.method === "POST" || query.request.method === "PUT") {
        const requestBodyCopy = requestBody.toString(responseCharset);

        const requestBodyParams = [];

        const mimeType = getRequestHeaderValue("Content-Type");

        if (mimeType === "application/x-www-form-urlencoded") {
            const requestBodyAsObject = querystring.parse(requestBodyCopy);

            if (requestBodyAsObject[requestBodyCopy] != "") {
                for (let key in requestBodyAsObject) {
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
    const requestCookiesAsHeader = getRequestHeaderValue("Cookie");

    if (requestCookiesAsHeader) {
        entry.request.cookies = parseCookie(requestCookiesAsHeader);
    }

    //parse response cookie
    const responseCookiesAsHeaders = getResponseHeaders("Set-Cookie");

    if (responseCookiesAsHeaders.length) {
        responseCookiesAsHeaders.forEach((cookie) => {
            entry.response.cookies.push(parseCookie(cookie.value)[0]);
        });
    }

    entry.request.headers = query.request.headers;
    entry.response.headers = query.response.headers;

    this.har.log.entries.push(entry);

    utils.sortArrayByKey(this.har.log.entries, this.ENTRY_SORT_KEY);
};

module.exports = HarBuilder;