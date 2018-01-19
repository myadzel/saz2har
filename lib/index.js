var Converter = require("./converter");

module.exports = {
    convert: function () {
        var converter = new Converter();

        var args = arguments;

        var filename = "";

        var options = {};

        var callback = function () {};

        if (args[0] && typeof args[0] == "string") {
            filename = args[0];
        }

        if (args[1] && typeof args[1] == "object" && args[2]) {
            options = args[1];
        }

        if (args[1] && !args[2] && typeof args[1] == "function") {
            callback = args[1];
        }

        if (args[2] && typeof args[2] == "function") {
            callback = args[2];
        }

        converter.on("convert", function (data) {
            callback(null, data);
        });

        converter.on("error", function (err) {
            callback(err);
        });

        converter.setOptions(options);

        converter.convert(filename);
    }
};