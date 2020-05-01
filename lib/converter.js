const path = require("path");
const util = require("util");
const events = require("events");

const SazParser = require("./saz-parser");
const HarBuilder = require("./har-builder");
const HarWriter = require("./har-writer");
const utils = require("../lib/utils");

util.inherits(Converter, events.EventEmitter);

function Converter(options) {
    this.har = {};

    this.sourceFilename = "";
    this.destinationFilename = "";

    this.DEFAULT_OPTIONS = {
        write: false,
        validate: true
    };

    this.FILENAME_EXTENSION = {
        saz: "saz",
        har: "har"
    };

    this.options = Object.assign({}, this.DEFAULT_OPTIONS);

    this._setOptions(options);
}

Converter.prototype.convert = function (sourceFilename, destinationFilename) {
    if (destinationFilename) {
        this._setOptions({
            write: true
        });
    }

    this._setSources(sourceFilename, destinationFilename);

    const sazParser = new SazParser(this.sourceFilename);

    sazParser.on("error", (err) => {
        this.emit("error", err);
    });

    sazParser.on("parse", (data) => {
        const harBuilder = new HarBuilder({
            validate: this.options.validate
        });

        harBuilder.on("error", (err) => {
            this.emit("error", err);
        });

        harBuilder.on("build", (data) => {
            this.har = data;

            const done = (write) => {
                const result = {
                    data: utils.stringify(data),
                    source: this.sourceFilename
                };

                if (write) {
                    result.destination = this.destinationFilename;
                }

                this.emit("convert", result);
            };

            if (this.options.write) {
                const harWriter = new HarWriter(this.destinationFilename);

                harWriter.on("error", (err) => {
                    this.emit("error", err);
                });

                harWriter.on("write", () => {
                    done(true);
                });

                harWriter.write(data);
            } else {
                done();
            }
        });

        harBuilder.build(data);
    });

    sazParser.parse();
};

Converter.prototype.setOptions = function (options) {
    this._setOptions(options);
};

Converter.prototype._setOptions = function (options) {
    for (let key in options) {
        this._setOption(key, options[key]);
    }
};

Converter.prototype._setOption = function (key, value) {
    if (value !== undefined) {
        this.options[key] = value;
    }
};

Converter.prototype._setSources = function (sourceFilename, destinationFilename) {
    destinationFilename = destinationFilename ||
        sourceFilename.replace(new RegExp("(\.)" + this.FILENAME_EXTENSION.saz + "$", "i"), "$1" + this.FILENAME_EXTENSION.har);

    this.sourceFilename = path.resolve(sourceFilename);
    this.destinationFilename = path.resolve(destinationFilename);
};

module.exports = Converter;