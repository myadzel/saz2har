const fs = require("fs");
const path = require("path");
const util = require("util");
const events = require("events");
const crypto = require("crypto");

const extract = require('extract-zip');
const rimraf = require("rimraf");

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

SazParser.prototype._parse = function () {
    const sazDirectory = path.resolve(crypto.createHash("md5").update(this.sourceFilename).digest("hex"));

    extract(this.sourceFilename, { dir: sazDirectory })
      .then(() => {
        let fileCount = 0;

        //read only raw directory
        const dataDirectory = path.resolve(sazDirectory, "raw");

        const cleanup = () => {
            rimraf.sync(sazDirectory);
        };

        const checkForDone = () => {
            if (!fileCount) {
                cleanup();

                this._done();
            }
        };

        fs.readdir(dataDirectory, (err, list) => {
            if (err) {
                cleanup();

                throw err;
            }

            fileCount = list.length;

            list.forEach(file => {
                const filename = path.resolve(dataDirectory, file);

                fs.readFile(filename, "binary", (err, data) => {
                    if (err) {
                        throw err;
                    }

                    this._parseFile(file, utils.removeBOM(data));

                    fileCount--;

                    checkForDone();
                });
            });
        });
    })
    .catch(err => this.emit("error", err));
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