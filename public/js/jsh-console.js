(function () {
/*
    TODO:
    * time, timeEnd (is it possible?)
    * count
*/

function wrapObjects (objs) {
    return [].map.call(objs, jsh.bridge.wrapObject, jsh.bridge);
}

// console object which'll be injected into the child window.
jsh.console = {};

['log', 'info', 'warn', 'error'].forEach(function (level) {
    jsh.console[level] = function () {
        var message = {
            level  : level,
            type   : level,

            parameters : wrapObjects(arguments),
            text : [].join.call(arguments, ' ')
        };

        window.top.jsh.sendConsoleMessage(message);
    };
});

jsh.console.debug = jsh.console.info = jsh.console.log;

jsh.console.assert = function (condition) {
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
        message.parameters = wrapObjects(args),
        message.text = String(args[0]);
    }

    window.top.jsh.sendConsoleMessage(message);
};

jsh.console.dir = function dir () {
    if (!arguments.length) {
        return;
    }

    var message = {
        level : 'log',
        type : 'dir',

        parameters : wrapObjects(arguments),
        text : String(arguments[0])
    };

    window.top.jsh.sendConsoleMessage(message);
};

jsh.console.table = function table (parameter) {
        var message = {
            level : 'log',
            type : 'table',
            parameters : [jsh.bridge.wrapObject({
                object : parameter,
                columnNames : null,
                isTable : true
            })],
            text : String([].map.call(arguments, String))
        };

        window.top.jsh.sendConsoleMessage(message);
};

// FIXME: there's a weird bug where console.trace calls are "taller" than other
//lines.
jsh.console.trace = function trace () {
    var message = {
        level : 'log',
        type : 'trace',
        text : ''
    };

    if (arguments.length) {
        message.parameters = wrapObjects(arguments);
        message.text = String(arguments[0]);
    }

    window.top.jsh.sendConsoleMessage(message);
};

// grouping

jsh.console.group = function group () {
    var message = {
        level : 'log',
        type : 'startGroup',
        text : ''
    };

    if (arguments.length) {
        message.parameters = wrapObjects(arguments);
    }

    window.top.jsh.sendConsoleMessage(message);
};

jsh.console.groupEnd = function groupEnd () {
    window.top.jsh.sendConsoleMessage({
        level : 'log',
        type : 'endGroup',
        text : ''
    });
};

jsh.console.groupCollapsed = function groupCollapsed () {
    var message = {
        level : 'log',
        type : 'startGroupCollapsed',
        text : ''
    };

    if (arguments.length) {
        message.parameters = wrapObjects(arguments);
    }

    window.top.jsh.sendConsoleMessage(message);
};

// TODO: what should this do? clear history? the user needs to be alerted if so.
// do we even want this?
jsh.console.clear = function clear () {
    window.top.InspectorBackend.connection().dispatch({
        method : 'Console.messagesCleared'
    });

    window.top.jsh.sendConsoleMessage({
        level : 'log',
        type : 'clear',
        text : ''
    });
};

jsh.sendConsoleMessage = function (consoleMessage) {
    if (!consoleMessage.source) {
        consoleMessage.source = 'console-api'
    }

    if (!consoleMessage.stackTrace) {
        var stackTrace = jsh.parseLogStackTrace((new Error()).stack);
        consoleMessage.line   = stackTrace[0].lineNumber;
        consoleMessage.column = stackTrace[0].columnNumber;
    }

    consoleMessage.stackTrace = stackTrace;
    consoleMessage.timestamp  = Date.now() / 1000;


    var message = {
        method : 'Console.messageAdded',
        params : { message : consoleMessage }
    };

    InspectorBackend.connection().dispatch(message);
};
})();
