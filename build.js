#!/usr/local/bin/node
/*global require*/

'use strict';

var Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),

    uglify = require('uglify-js'),
    concatCSS = require('./concatCSS'),
    CleanCSS = require('clean-css');

// Helper crap, ignore if you want and move down.
// Ignore them. Just like my 3rd wife.
function matchAll (str, re) {
    var ret = [], match;

    while (match = re.exec(str)) {
        ret.push(match);
    }

    return ret;
}

// It all started one June morning. I woke up and found her packing. I asked
//what's wrong, are we going on a trip, she finally agreed to the Tibetan
//vacation?

var colours = {
    default : '\u001b[0m',
    red     : '\u001b[0;31m',
    green   : '\u001b[0;32m',
    yellow  : '\u001b[0;33m',
    blue    : '\u001b[0;34m',
    purple  : '\u001b[0;35m',
    cyan    : '\u001b[0;36m'
};

// She said nothing. Closed the suitcase and left. Both the house, and me,
//speechless.

function colourise (str, colour) {
    return colour + str + colours.default;
}
console.colour = function (str /*, ...args, colour */) {
    var args = [].slice.call(arguments, 1),
        colour = args.pop();

    args.unshift(colourise(str, colour));

    return console.log.apply(console, args);
};

// I tried calling her, but she wouldn't answer. Her mom and friends didn't
//co-operate either.
// You can stop ignoring now.

var indexPath = 'templates/jession.jinja';
console.colour('Reading %s', indexPath, colours.yellow);

fs.readFileAsync(indexPath, {encoding : 'utf8'}).then(replaceScripts).catch(fuckingError);

function replaceScripts (indexFile) {
    return Promise.all([
        writeIndexFile(indexFile),
        writeEveryFuckingJavascript(indexFile),
        writeEveryFuckingCSS(indexFile)
    ]);
}

function writeIndexFile (indexFile) {
    // lulz
    var minIndexFile = indexFile
            // remove all stylesheets
            .replace(/[ \t]*<link.*rel="stylesheet".*\/>\s*?[\r\n]{0,2}/g, '')
            // remove all scripts
            .replace(/\s*<script.+<\/script>\s*[\r\n]{0,2}/g, '')
            // add the master stylesheet right before the end of the head
            .replace(/<\/head>/, '\n    <link href="public/css/everything.min.css" rel="stylesheet" />\n$&')
            // add the master script right at the beginning of the body
            .replace(/<body.+>/, '$&\n    <script src="public/js/everything.min.js"></script>');

    var minFilePath = (function () {
        var fileParts = indexPath.split('.');
        fileParts.splice(1, 0, 'min');
        return fileParts.join('.');
    })();

    console.colour('-> Writing %s', minFilePath, colours.yellow);

    return fs.writeFileAsync(minFilePath, minIndexFile).then(function () {
        console.colour('--> Wrote index crap.', colours.yellow);
    });
}

// What a bitch.

function writeEveryFuckingJavascript (indexFile) {
    // This function is fucking horrible, mostly coming from the disrepency
    //between file paths and the server's routing.
    // Fuck me.
    var matchScriptSources = /src="([^"]+)"/g,
        minFilePath = 'public/js/everything.min.js',

        mapFilePath = minFilePath + '.map',
        // I hate myself
        mapFileUrl = mapFilePath.split('/').slice(2).join('/');

    var scripts = matchAll(indexFile, matchScriptSources).map(function (match) {
        // meh
        return match[1];
    });

    console.colour('-> Found %s scripts', scripts.length, colours.cyan);

    console.colour('-> Minifying...', colours.cyan);

    var result = uglify.minify(scripts, {
        outSourceMap : mapFileUrl,
        output : {
            // keep @preserve comments.
            comments : function(node, comment) {
                var text = comment.value;
                var type = comment.type;
                if (type === "comment2") {
                    return /@preserve/i.test(text);
                }
            }
        }
    });

    console.colour('-> Done minifying.', colours.cyan);

    console.colour('-> Writing %s.', minFilePath, colours.cyan);
    var minPromise = fs.writeFile(minFilePath, result.code, function (err) {
        if (err) {
            fuckingError(err);
            return;
        }

        console.colour('--> Wrote crap.', colours.cyan);
        // so far, "cyan" as been misspelled as "nyan" 6 times.
    });

    // for some reason, the source map has double the public/js
    // Fun!
    var sourceMap = JSON.parse(result.map);
    sourceMap.sources = sourceMap.sources.map(function (source) {
        return source.replace('public/js/', '');
    });
    result.map = JSON.stringify(sourceMap);

    console.colour('-> Writing %s', mapFilePath, colours.cyan);
    var mapPromise = fs.writeFileAsync(mapFilePath, result.map).then(function () {
        console.colour('--> Wrote map.', colours.cyan);
    });

    return Promise.all([minPromise, mapPromise]);
}

function writeEveryFuckingCSS (indexFile) {
    var matchStyleSources = /<link href="(.+)" rel="stylesheet" \/>/g,
        minFilePath = 'public/css/everything.min.css';

    var stylesheets = matchAll(indexFile, matchStyleSources).map(function (match) {
        return '@import url("' + match[1] + '");';
    });

    console.colour('-> Found %d stylesheets', stylesheets.length, colours.purple);
    console.colour('-> Concatenating...', colours.purple);

    return concatCSS.processString(stylesheets.join('')).then(function (style) {
        console.colour('--> Minifying...', colours.purple);

        return new CleanCSS({
            noRebase : true
        }).minify(style);
    }).then(function (result) {
        console.colour('--> Done minifying css.', colours.purple);

        return fs.writeFileAsync(minFilePath, result);
    }).then(function () {
        console.colour('---> Wrote css crap.', colours.purple);
        return Promise.resolve();
    });
}

function fuckingError(err) {
    // console.colour('Well fuck: %s\n%s', err.toString(), err.stack, colours.red);
    console.error(err);
}

// Never marry a fish.
