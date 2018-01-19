# saz2har

Convert SAZ file (from Fiddler) to HAR file.

## Install

```console
$ npm install saz2har
```

## API

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

## License

MIT