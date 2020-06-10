const fs = require("fs");
const util = require("util");
const events = require("events");

const utils = require("./../lib/utils");

util.inherits(HarWriter, events.EventEmitter);

function HarWriter(filename) {
    this.filename = filename;
}

HarWriter.prototype.write = function (data) {
   this._write(data);
};

HarWriter.prototype._write = function (data) {
    data = utils.stringify(data);

    fs.writeFile(this.filename, data, (err) => {
        if (err) {
            this.emit("error", err);
        } else {
            this.emit("write", this.filename);
        }
    });
};

module.exports = HarWriter;
