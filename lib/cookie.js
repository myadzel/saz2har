function Cookie(headerValue) {
    this.cookies = [];
    this.attributes = {};

    this.COOKIE_ATTRIBUTES = ["path", "domain", "expires", "httpOnly", "secure"];
    this.COOKIE_BOOLEAN_ATTRIBUTES = this.COOKIE_ATTRIBUTES.slice(-2);
    this.VALUE_SEPARATOR = "; ";

    this.headerValue = headerValue || "";
}

Cookie.prototype.parse = function () {
    var parsedCookieValues = this.headerValue.split(this.VALUE_SEPARATOR);

    var attributes = this.COOKIE_ATTRIBUTES;
    var booleanAttributes = this.COOKIE_BOOLEAN_ATTRIBUTES;

    parsedCookieValues.forEach(function (parsedCookieValue, i) {
        var idx = parsedCookieValue.indexOf("=");

        var key, value;

        if (idx === 0) {
            key = parsedCookieValue;
        } else if (idx != -1) {
            key = parsedCookieValue.substr(0, idx);
            value = parsedCookieValue.substr(++idx, parsedCookieValue.length);
        } else {
            key = parsedCookieValue;
        }

        if (typeof value == "undefined") {
            value = "";
        }

        var matchedKey = attributes.filter(function (attribute) {
            return attribute != key &&
                attribute.toLowerCase() === key.toLowerCase();
        })[0];

        var normalizedKey = key.toLowerCase();

        if (matchedKey) {
            normalizedKey = matchedKey;
        }

        //real cookie name - first or not in keywords
        if (i === 0 || attributes.indexOf(normalizedKey) == -1) {
            var cookie = {
                name: decodeURIComponent(key),
                value: decodeURIComponent(value)
            };

            this.cookies.push(cookie);
        } else {
            if (booleanAttributes.indexOf(normalizedKey) != -1) {
                value = true;
            }

            this.attributes[normalizedKey] = value;
        }
    }.bind(this));

    this._appendAttributesToCookies();

    return this.cookies;
};

Cookie.prototype._hasCookieAttributes = function () {
    return Object.keys(this.attributes).length;
};

Cookie.prototype._appendAttributesToCookies = function () {
    if (!this._hasCookieAttributes()) {
        return true;
    }

    this.cookies.map(this._appendAttributes.bind(this));
};

Cookie.prototype._appendAttributes = function (cookie) {
    for (var key in this.attributes) {
        cookie[key] = this.attributes[key];
    }
};

Cookie.parse = function (headerValue) {
    var cookie = new Cookie(headerValue);

    return cookie.parse();
};

module.exports = {
    parse: Cookie.parse
};