// everything is terrible.
var Promise = require('bluebird'),
	pathlib = require('path'),
    fs = Promise.promisifyAll(require('fs'));

var chunkString = function (str, re) {
    var match,
        lastIndex = 0,
        ret = [];

    while (match = re.exec(str)) {
        if (match.index > lastIndex) {
            ret.push([str.slice(lastIndex, match.index)]);
        }

        lastIndex = match.index + match[0].length;
        ret.push(match);
    }

    if (lastIndex < str.length) {
        ret.push([str.slice(lastIndex)]);
    }

    return ret;
};

var processFile = exports.processFile = function (path) {
    return fs.readFileAsync(path).then(function (imported) {
		return processString(imported, pathlib.dirname(path));
	});
};

var processString = exports.processString = function (data, path) {
    // this is incomplete by design and lack of will to make it complete.
    var importRegex = /^@import\s+url\(\s*"(.+)"\s*\);$/gm;

    return Promise.map(chunkString(data, importRegex), function (part) {
		// part is either the match, or an array containing just a string.
		if (!part[1]) {
            return part[0];
        }

		var importPath = part[1],
			relativePath;

		if (path) {
			importPath = pathlib.resolve(path, importPath);
		}

        return processFile(importPath);
    }).reduce(function (ret, val) {
		return ret + val;
	}, '');
};
