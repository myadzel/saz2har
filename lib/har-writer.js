var fs = require("fs");
var util = require("util");
var events = require("events");

var utils = require("./../lib/utils");

util.inherits(HarWriter, events.EventEmitter);

function HarWriter(filename) {
    this.filename = filename;
}

HarWriter.prototype.write = function (data) {
   this._write(data);
};

HarWriter.prototype._write = function (data) {
    data = utils.stringify(data);

    fs.writeFile(this.filename, data, function (err) {
        if (err) {
            this.emit("error", err);
        } else {
            this.emit("write", this.filename);
        }
    }.bind(this));
};

module.exports = HarWriter;