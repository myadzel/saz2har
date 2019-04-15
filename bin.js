#!/usr/bin/env node

const path = require("path");

const argv = require("yargs").argv;
const saz2har = require("./");

const sourceFile = argv.source || argv.s || argv._[0];
const destinationFile = argv.destination || argv.d || argv._[1];

const options = {
    write: true
};

const callback = (err, data) => {
    if (err) {
        console.error("Error: ", err);

        return;
    }

    const { source, destination } = data;

    console.log(`Successful conversion from ${source} to ${destination}`);
};

if (sourceFile && destinationFile) {
    saz2har.convert(path.resolve(sourceFile), path.resolve(destinationFile), options, callback);
} else if (sourceFile) {
   saz2har.convert(path.resolve(sourceFile), options, callback);
}