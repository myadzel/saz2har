function Cookie(headerValue) {
    this.cookies = [];
    this.attributes = {};

    this.COOKIE_ATTRIBUTES = ["path", "domain", "expires", "httpOnly", "secure"];
    this.COOKIE_BOOLEAN_ATTRIBUTES = this.COOKIE_ATTRIBUTES.slice(-2);
    this.VALUE_SEPARATOR = "; ";

    this.headerValue = headerValue || "";
}

Cookie.prototype.parse = function () {
    const parsedCookieValues = this.headerValue.split(this.VALUE_SEPARATOR);

    const attributes = this.COOKIE_ATTRIBUTES;
    const booleanAttributes = this.COOKIE_BOOLEAN_ATTRIBUTES;

    parsedCookieValues.forEach((parsedCookieValue, i) => {
        let idx = parsedCookieValue.indexOf("=");

        let key;
        let value;

        if (idx === 0) {
            key = parsedCookieValue;
        } else if (idx != -1) {
            key = parsedCookieValue.substr(0, idx);
            value = parsedCookieValue.substr(++idx, parsedCookieValue.length);
        } else {
            key = parsedCookieValue;
        }

        if (typeof value === "undefined") {
            value = "";
        }

        const matchedKey = attributes.filter((attribute) => {
            return attribute != key &&
                attribute.toLowerCase() === key.toLowerCase();
        })[0];

        let normalizedKey = key.toLowerCase();

        if (matchedKey) {
            normalizedKey = matchedKey;
        }

        //real cookie name - first or not in keywords
        if (i === 0 || attributes.indexOf(normalizedKey) === -1) {
            const cookie = {
                name: decodeURIComponent(key),
                value: decodeURIComponent(value)
            };

            this.cookies.push(cookie);
        } else {
            if (booleanAttributes.indexOf(normalizedKey) !== -1) {
                value = true;
            }

            this.attributes[normalizedKey] = value;
        }
    });

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

    this.cookies.forEach(this._appendAttributes.bind(this));
};

Cookie.prototype._appendAttributes = function (cookie) {
    for (let key in this.attributes) {
        cookie[key] = this.attributes[key];
    }
};

Cookie.parse = (headerValue) => {
    const cookie = new Cookie(headerValue);

    return cookie.parse();
};

module.exports = {
    parse: Cookie.parse
};
