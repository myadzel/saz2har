# saz2har

Converts SAZ file (from Fiddler) to HAR file (for Chrome).

## Install

```console
$ npm install saz2har
```

## API

### convert(input, [output], [options])

* `input` - path to the input .saz file
* `output` - path to the output .har file
* `options` - object with conversion options
  * `validate` - enables validation of the the HAR output (default: `true`)

```js
var saz2har = require("saz2har");

saz2har.convert("tmp/log.saz", function (err, data) {
    if (err) {
        console.error("Error: ", err);
        return;
    }
    console.log(data);
});
```

## Tool

```
$ saz2har --help

Usage: saz2har [options] input.saz [output.har]

Options:
  --help         Show help                                     [boolean]
  --version      Show version                                  [boolean]
  --no-validate  Validate the output HAR file (default: true)  [boolean]

Examples:
  saz2har foo.saz bar.har --no-validate
```

## License

MIT