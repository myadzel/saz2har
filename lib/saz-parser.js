var fs = require("fs");
var path = require("path");
var util = require("util");
var events = require("events");

var unzip = require("unzip");

var utils = require("./../lib/utils");

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

    var content = "";

    entry.on("data", function (chunk) {
        content += chunk.toString("binary");
    });

    entry.on("end", function () {
        this._parseFile(path.basename(entry.path), content);

        entry.autodrain();
    }.bind(this));
};

SazParser.prototype._parse = function () {
    var readStream = fs.createReadStream(this.sourceFilename);

    readStream.on("error", function (err) {
        this.emit("error", err.message);
    }.bind(this));

    var parser = readStream.pipe(unzip.Parse());

    parser.on("entry", function (entry) {
        this._readFile(entry);
    }.bind(this));

    parser.on("close", function (e) {
        this._done();
    }.bind(this));
};

SazParser.prototype._done = function () {
    for (var key in this.sazQueries) {
        this.parsedData.push(this.sazQueries[key]);
    }

    utils.sortArrayByKey(this.parsedData, "position");

    this.emit("parse", this.parsedData);
};

SazParser.prototype._parseFile = function (filename, content) {
    //saz archive has filenames like 01_c.txt, 01_m.xml, 01_s.txt, 01_w.txt
    var filenameMatches = filename.match(/(\d+)_(s|c|m|w)/);

    var type = "";

    if (filenameMatches) {
        var position = parseInt(filenameMatches[1], 10);
        var letter = filenameMatches[2];

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