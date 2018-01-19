var path = require("path");
var util = require("util");
var events = require("events");

var SazParser = require("./saz-parser");
var HarBuilder = require("./har-builder");
var HarWriter = require("./har-writer");
var utils = require("../lib/utils");

util.inherits(Converter, events.EventEmitter);

function Converter(options) {
    this.har = {};

    this.sourceFilename = "";
    this.destinationFilename = "";

    this.DEFAULT_OPTIONS = {
        writeOutputFile: false
    };

    this.FILENAME_EXTENSION = {
        saz: "saz",
        har: "har"
    };

    this.options = Object.assign({}, this.DEFAULT_OPTIONS);

    this._setOptions(options);
}

Converter.prototype.convert = function (sourceFilename, destinationFilename) {
    this._setSources(sourceFilename, destinationFilename);

    var sazParser = new SazParser(this.sourceFilename);

    sazParser.on("error", function (err) {
        this.emit("error", err);
    }.bind(this));

    sazParser.on("parse", function (data) {
        var harBuilder = new HarBuilder();

        harBuilder.on("error", function (err) {
            this.emit("error", err);
        }.bind(this));

        harBuilder.on("build", function (data) {
            this.har = data;

            var done = function () {
                this.emit("convert", utils.stringify(data));
            }.bind(this);

            if (this.options.writeOutputFile) {
                var harWriter = new HarWriter(this.destinationFilename);

                harWriter.on("error", function (err) {
                    this.emit("error", err);
                }.bind(this));

                harWriter.on("write", function () {
                    done();
                });

                harWriter.write(data);
            } else {
                done();
            }
        }.bind(this));

        harBuilder.build(data);
    }.bind(this));

    sazParser.parse();
};

Converter.prototype.setOptions = function (options) {
    this._setOptions(options);
};

Converter.prototype._setOptions = function (options) {
    for (var key in options) {
        this._setOption(key, options[key]);
    }
};

Converter.prototype._setOption = function (key, value) {
    this.options[key] = value;
};

Converter.prototype._setSources = function (sourceFilename, destinationFilename) {
    destinationFilename = destinationFilename ||
        sourceFilename.replace(new RegExp("(\.)" + this.FILENAME_EXTENSION.saz + "$", "i"), "$1" + this.FILENAME_EXTENSION.har);

    this.sourceFilename = path.resolve(sourceFilename);
    this.destinationFilename = path.resolve(destinationFilename);
};

module.exports = Converter;