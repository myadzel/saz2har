const fs = require("fs");
const path = require("path");
const util = require("util");
const events = require("events");

const unzip = require("unzip");

const utils = require("./../lib/utils");

util.inherits(SazParser, events.EventEmitter);

function SazParser(filename) {
    this.sourceFilename = filename;

    this.sazQueries = {};
    this.parsedData = [];
}

SazParser.prototype.parse = function () {
    this._parse();
};

SazParser.prototype._readFile = function (entry) {
    if (entry.path.indexOf("raw/") !== 0) {
        entry.autodrain();

        return true;
    }

    let content = "";

    entry.on("data", (chunk) => {
        content += chunk.toString("binary");
    });

    entry.on("end", () => {
        this._parseFile(path.basename(entry.path), content);

        entry.autodrain();
    });
};

SazParser.prototype._parse = function () {
    const readStream = fs.createReadStream(this.sourceFilename);

    readStream.on("error", (err) => {
        this.emit("error", err.message);
    });

    const parser = readStream.pipe(unzip.Parse());

    parser.on("entry", (entry) => {
        this._readFile(entry);
    });

    parser.on("close", (e) => {
        this._done();
    });
};

SazParser.prototype._done = function () {
    for (let key in this.sazQueries) {
        this.parsedData.push(this.sazQueries[key]);
    }

    utils.sortArrayByKey(this.parsedData, "position");

    this.emit("parse", this.parsedData);
};

SazParser.prototype._parseFile = function (filename, content) {
    //saz archive has filenames like 01_c.txt, 01_m.xml, 01_s.txt, 01_w.txt
    const filenameMatches = filename.match(/(\d+)_(s|c|m|w)/);

    let type = "";

    if (filenameMatches) {
        const position = parseInt(filenameMatches[1], 10);
        const letter = filenameMatches[2];

        this.sazQueries[position] = this.sazQueries[position] || {};

        this.sazQueries[position].position = position;
        this.sazQueries[position].raw = this.sazQueries[position].raw || {};

        switch (letter) {
            case "c":
                //contains the raw client request
                type = "request";
                break;
            case "s":
                //contains the raw server request
                type = "response";
                break;
            case "m":
                //contains metadata including session flags, socket reuse information, etc
                type = "metadata";
                break;
            case "w":
                type = "websocket";
                //(optional) contains WebSocket messages
                break;
        }

        this.sazQueries[position].raw[type] = content;
    }
};

module.exports = SazParser;