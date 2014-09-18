var createConsole = function (bridge, realConsole, sendMessage) {
/*
    TODO:
    * time, timeEnd (is it possible?)
    * count
*/

var console = {};

['log', 'info', 'warn', 'error'].forEach(function (level) {
    console[level] = function () {
        var message = {
            level  : level,
            type   : level,

            parameters : wrapObjects(arguments),
            text : [].join.call(arguments, ' ')
        };

        sendConsoleMessage(message);
    };
});

console.debug = console.info = console.log;

console.assert = function (condition) {
    if (condition) {
        return;
    }

    // TODO add Array.from to utilities.js
    var args = [].slice.call(arguments, 1);

    var message = {
        level : 'error',
        type : 'assert'
    };

    if (args.length) {
        message.parameters = wrapObjects(args);
        message.text = String(args[0]);
    }

    sendConsoleMessage(message);
};

console.dir = function dir () {
    if (!arguments.length) {
        return;
    }

    var message = {
        level : 'log',
        type : 'dir',

        parameters : wrapObjects(arguments),
        text : String(arguments[0])
    };

    sendConsoleMessage(message);
};

console.table = function table (parameter) {
        var message = {
            level : 'log',
            type : 'table',
            parameters : [bridge.wrapObject({
                object : parameter,
                columnNames : null,
                isTable : true
            })],
            text : String([].map.call(arguments, String))
        };

        sendConsoleMessage(message);
};

// FIXME: there's a weird bug where console.trace calls are "taller" than other
//lines.
console.trace = function trace () {
    var message = {
        level : 'log',
        type : 'trace',
        text : ''
    };

    if (arguments.length) {
        message.parameters = wrapObjects(arguments);
        message.text = String(arguments[0]);
    }

    sendConsoleMessage(message);
};

// grouping

console.group = function group () {
    var message = {
        level : 'log',
        type : 'startGroup',
        text : ''
    };

    if (arguments.length) {
        message.parameters = wrapObjects(arguments);
    }

    sendConsoleMessage(message);
};

console.groupEnd = function groupEnd () {
    sendConsoleMessage({
        level : 'log',
        type : 'endGroup',
        text : ''
    });
};

console.groupCollapsed = function groupCollapsed () {
    var message = {
        level : 'log',
        type : 'startGroupCollapsed',
        text : ''
    };

    if (arguments.length) {
        message.parameters = wrapObjects(arguments);
    }

    sendConsoleMessage(message);
};

// TODO: what should this do? clear history? the user needs to be alerted if so.
// do we even want this?
console.clear = function clear () {
    window.top.InspectorBackend.connection().dispatch({
        method : 'Console.messagesCleared'
    });

    sendConsoleMessage({
        level : 'log',
        type : 'clear',
        text : ''
    });
};

function sendConsoleMessage (consoleMessage) {
    if (!consoleMessage.source) {
        consoleMessage.source = 'console-api';
    }

    if (!consoleMessage.stackTrace) {
        var stackTrace = parseLogStackTrace((new Error()).stack);
        consoleMessage.line   = stackTrace[0].lineNumber;
        consoleMessage.column = stackTrace[0].columnNumber;
        consoleMessage.stackTrace = stackTrace;
    }

    consoleMessage.timestamp  = Date.now() / 1000;


    var message = {
        method : 'Console.messageAdded',
        params : { message : consoleMessage }
    };

    sendMessage(message);
}

function wrapObjects (objs) {
    return [].map.call(objs, bridge.wrapObject, bridge);
}

// Takes a strung stack trace (err.stack) and makes sense out of it: Extracts
//function names, line and column numbers.
function parseLogStackTrace (stack) {
    /*
    The stack trace in Chrome looks something like:
    Error
        at Object.jsh.sendConsoleMessage (http://localhost:8080/js/jsh-console.js:158:22)
        at Object.jsh.console.(anonymous function) (http://localhost:8080/js/jsh-console.js:25:24)
        at eval (eval at <anonymous> (http://localhost:8080/js/jsh.js:263:40), <anonymous>:1:9)
        at eval (native)
        at Object.jsh.eval (http://localhost:8080/js/jsh.js:263:40)
        at Object.jsh.bridge.evaluate (http://localhost:8080/js/jsh.js:126:22)
        at Object.jsh.handleMessage (http://localhost:8080/js/jsh.js:73:32)
        at Object.actualSendMessage (http://localhost:8080/js/sdk/InspectorBackend.js:698:27)

    We want to do away with the first and last three lines.

    OTOH, in Firefox, they look like this:
    jsh.sendConsoleMessage@http://localhost:8080/js/jsh-console.js:158:9
    jsh.console[level]@http://localhost:8080/js/jsh-console.js:25:9
    @http://localhost:8080/js/jsh.js line 263 > eval:1:1
    jsh.eval@http://localhost:8080/js/jsh.js:263:5
    jsh.bridge.evaluate@http://localhost:8080/js/jsh.js:126:9
    jsh.handleMessage@http://localhost:8080/js/jsh.js:73:9
    actualSendMessage@http://localhost:8080/js/sdk/InspectorBackend.js:698:17

    Where we want to do away with the firt two and last three.
    */
    var stackLines = stack.split('\n'),
        parser;

    if (stackLines[0] === 'Error') {
        stackLines.shift();
        parser = chromeParseLine;
    }
    else {
        parser = firefoxParseLine;
    }

    return stackLines.filter(Boolean).map(parser);

    function chromeParseLine (line) {
        realConsole.log(line);
        // at obj.funcName (crap)
        // at obj.funcName.(anonymous function) (crap)
        var funcMatch = /^\s*at ([^\(]*(?:\(anonymous function\))?)/.exec(line) || ['', ''];

        // (crap:line:column)
        var positionMatch = /:(\d+):(\d+)\)\s*$/.exec(line) || ['', '', ''];

        return {
            functionName : funcMatch[1],
            lineNumber   : Number(positionMatch[1]),
            columnNumber : Number(positionMatch[2]),

            // protocol stuff.
            scriptId : 0,
            url : ''
        };
    }
    function firefoxParseLine (line) {
        realConsole.log(line);
        // jsh.handleMessage@http://localhost:8080/js/jsh.js:123231273:12312319
        // ^---------------^ ^-----------------------------^ ^-------^ ^------^
        //    (.+)          @   (.+)                        :  (\d+)  :  (\d+)
        var match = (/^(.+)?@(.+):(\d+):(\d+)$/).exec(line);
        var func, file, col;

        if (match) {
            func = match[1];
            file = match[2];
            line = match[3];
            col  = match[4];
        }
        else {
            // @http://localhost:8080/js/jsh.js line 263 > eval:1:1
            match = (/^@(.+) line (\d+) > eval:\d+:\d+$/).exec(line);

            if (!match) {
                realConsole.error('wat', line);
            }

            func = 'eval';
            file = match[1];
            line = match[2];
            col  = 0; // we receive no indication
        }

        return {
            functionName : func,
            lineNumber   : file,
            columnNumber : col,

            scriptId : 0,
            url : ''
        };
    }
}

return console;
};
