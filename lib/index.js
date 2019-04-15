const Converter = require("./converter");

module.exports = {
    convert: (...args) => {
        const converter = new Converter();

        const params = {
            source: {
                name: "source",
                type: "string",
                value: ""
            },
            destination: {
                name: "destination",
                type: "string",
                value: ""
            },
            options: {
                name: "options",
                type: "object",
                value: {}
            },
            callback: {
                name: "callback",
                type: "function",
                value: () => {}
            }
        };

        const testAndApplyArgs = (args, types) => {
            let passed = false;

            const typesKeys = Object.keys(types);

            if (args.length === typesKeys.length) {
                passed = args.every((arg, index) => {
                    return typeof arg === types[typesKeys[index]].type;
                });
            }

            if (passed) {
                typesKeys.forEach((key, index) => {
                    params[key].value = args[index];
                });

                return true;
            }

            return false;
        };

        const testTypes = (types) => {
            return testAndApplyArgs(args, types);
        };

        const proceed = () => {
            const { source, destination, options, callback } = params;

            converter.on("convert", (data) => {
                callback.value(null, data);
            });

            converter.on("error", (err) => {
                callback.value(err);
            });

            converter.setOptions(options.value);

            converter.convert(source.value, destination.value);
        };

        const { source, destination, options, callback } = params;

        const argsTests = [
            { source, destination, options, callback },
            { source, destination, options },
            { source, destination, callback },
            { source, options, callback },
            { source, destination },
            { source, options },
            { source, callback },
        ];

        const testPassed = argsTests.some(testTypes);

        if (testPassed) {
            proceed();
        }
    }
};