/*jshint debug*/
var jsh = {};

jsh.save = function () {
    var data = {
        commands : this.getCommandsText()
    };

    // TODO add some XHR abstraction
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'save');

    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'json';

    xhr.onload = function () {
        // yeah...
        console.log(xhr);

        history.replaceState(null, '', '/' + xhr.response.id);
        WebInspector.console.log('Saved. ID: ' + xhr.response.id);
    };

    xhr.send(JSON.stringify(data));
};

jsh.loadFromText = function (text) {
    if (!text) {
        console.warn('what do you want from me?');
        return;
    }

    var commands = JSON.parse(text);
    if (!Array.isArray(commands) || !commands.length) {
        return;
    }

    // we can't just add the commands one after the other, since running a
    //command is an async operation.
    // what we should do is wait for a command to be evaluated before moving on
    //to the next.
    // what really *should* be done (TODO) is only run a command once the one
    //before has been printed.
    var consoleModel = WebInspector.targetManager.targets()[0].consoleModel,
        commandEvaluated = WebInspector.ConsoleModel.Events.CommandEvaluated;

    consoleModel.addEventListener(commandEvaluated, addNextCommand);

    addNextCommand();

    function addNextCommand () {
        var cmd = commands.shift();
        console.warn(cmd);
        if (!cmd) {
            consoleModel.removeEventListener(commandEvaluated, addNextCommand);
            return;
        }

        WebInspector.ConsolePanel._view()._appendCommand(cmd, true);
    }
};

jsh.getCommandsText = function () {
    // Fuck me...
    var messages = WebInspector.ConsolePanel._view()._consoleMessages;

    return messages.filter(filterCommands).map(getCommandText);

    function filterCommands (msg) {
        return msg instanceof WebInspector.ConsoleCommand;
    }
    function getCommandText (cmd) {
        return cmd.text;
    }
};

jsh.handleMessage = function (messageObject) {
    var method = messageObject.method,
        params = messageObject.params;

    var ignore = ['Runtime.enable', 'Console.enable', 'Runtime.isRunRequired'];
    if (ignore.indexOf(method) > -1) {
        return false;
    }

    var func = method.split('.')[1];

    if (jsh.bridge.hasOwnProperty(func)) {
        console.info(messageObject);
        return jsh.bridge[func](params);
    }

    console.warn(messageObject);
    return false;
};

// when there's a body to speak of, create an empty iframe.
// We'll use its eval function so we can provide scoping without messing up
//with the console itself.
// Of course, you could trivially escape, but you'd need to try in order to do
//that, so it's Good Enough.
jsh.evalFrame = document.createElement('iframe');
jsh.evalFrame.hidden = true;

window.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(jsh.evalFrame);

    jsh.evalFrame.contentWindow.console = jsh.console;

    jsh.bridge.injectedScript =
        createInjectedScript(jsh.InjectedScriptHost, jsh.evalFrame.contentWindow, 1);

    // load up the commands (if there are any)
    // yes, this is horrible. I will not apologise.
    setTimeout(function () {
        if (!localStorage.introduced) {
            localStorage.introduced = true;
            jsh.introduce();
        }

        var commands = document.getElementById('jsh-commands').textContent;

        if (commands) {
            jsh.loadFromText(commands);
        }
    }, 100);
});

// The WebInspector has the InspectorFrontendHost, which is responsible for
//communicating with the native part of the browser (which in turn injects more
//javascript. this makes a lot of sense, I know)
// In case you haven't noticed, this is not native code. So here are a bunch of
//functions to communicate with the javascript that would've been injected.
// In other words: injectedScript indirections

jsh.bridge = {};

jsh.bridge.evaluate = function (params) {
    console.info(params);
    var ret, result;

    var expression      = params.expression,
        group           = params.objectGroup;

    try {
        result = jsh.eval(expression);

        params.object = result;

        ret = {
            result    : jsh.bridge.wrapObject(params),
            wasThrown : false,
            __proto__ : null
        };
    }
    catch (e) {
        console.error(this, e);
        ret = this.injectedScript._createThrownValue(e, group);
    }

    return ret;
};

/**
    Calls a function on an object (shocking?). Returns the function's return.
    Sometimes, I like to dress up like a strawberry.

    params = {
        functionDeclaration : function code to call
        objectId      : internal object id to call the function on
        arguments     : arguments to pass the function
        returnByValue : yeah...
    }
*/
jsh.bridge.callFunctionOn = function (params) {
    var objectId = params.objectId,
        func     = params.functionDeclaration,
        args     = params.arguments,
        byVal    = !!params.returnByValue;

    return this.injectedScript.callFunctionOn(objectId, func, args, byVal);
};

jsh.bridge.getProperties = function (params) {
    var id            = params.objectId,
        ownProps      = params.ownProperties,
        accessorsOnly = params.accessorPropertiesOnly;

    return {
        result : this.injectedScript.getProperties(id, ownProps, accessorsOnly),
        __proto__ : null
    };
};

jsh.bridge.releaseObjectGroup = function (params) {
    this.injectedScript.releaseObjectGroup(params.objectGroup);
    return { __proto__ : null };
};

/**
    Wraps an object so it'll be deemed worthy for the console.

    It's simple when the argument is simple...

    > wrapObject(4)
    {
        "type": "number",
        "value": 4,
        "description": "4"
    }

    ...but gets more complex as the arguments get complex...

    > wrapObject({})
    {
        "type": "object",
        "objectId": "{\"injectedScriptId\":1,\"id\":4}",
        "className": "Object",
        "description": "Object",
        "preview": {
            "lossless": false,
            "overflow": false,
            "properties": []
        }
    }

    The objectId above is what'll be used to reference the object in later
    times. Let's look at one with actual properties:

    {
        "type": "object",
        "objectId": "{\"injectedScriptId\":1,\"id\":5}",
        "className": "Object",
        "description": "Object",
        "preview": {
            "lossless": false,
            "overflow": false,
            "properties": [
                {
                    "name": "a",
                    "type": "number",
                    "value": "4"
                },
                {
                    "name": "b",
                    "type": "object",
                    "value": "Object"
                }
            ]
        }
    }

    Parameters:
        object: Object to wrap.
        group: ...I'm not sure. Default 'console'.
        returnByValue: If the value is an object, whether to return it as it is,
            or wrap it up and give it an objectId. Default false.
        generatePreview: Whether to attach the preview property. Default true.
        columnNames: column names. I dunno...just pass in `null` or something.
        isTable: Whether it should be formatted as a table.
*/
jsh.bridge.wrapObject = function (params) {
    if (params == null || !params.hasOwnProperty('object')) {
        params = {
            object : params
        };
    }

    var obj = params.object,
        group = 'group' in params ? params.group : 'console',
        retByVal = 'returnByValue' in params ? params.returnByValue : false,
        preview = 'generatePreview' in params ? params.generatePreview : true;
    // columnNames and isTable can be passed as undefined without worry.

    // why _wrapObject and not wrapObject? Because calling the former works, and
    //the latter has some weirdo logic.
    return this.injectedScript._wrapObject(
        obj, group, retByVal,
        preview, params.columnNames, params.isTable);
};

jsh.eval = function (code) {
    return jsh.evalFrame.contentWindow.eval(code);
};

// Takes a strung stack trace (err.stack) and makes sense out of it: Extracts
//function names, line and column numbers.
jsh.parseLogStackTrace = function (stack) {
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
        console.log(line);
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
        console.log(line);
        // jsh.handleMessage@http://localhost:8080/js/jsh.js:123231273:12312319
        // ^---------------^ ^-----------------------------^ ^-------^ ^------^
        //    (.+)          @   (.+)                        :  (\d+)  :  (\d+)
        var match = (/^(.+)?@(.+):(\d+):(\d+)$/).exec(line);
        var func, file, line, col;

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
                console.error('wat', line);
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
};

// InjectedScript depends on some native methods. This is their simulation.
jsh.InjectedScriptHost = {
    eval : jsh.eval,

    isHTMLAllCollection : function (suspect) {
        return suspect === document.all ||
            suspect === jsh.evalFrame.contentDocument.all;
    },

    type : function (obj) {
        /*
        V8InjectedScriptHost::typeMethodCustom (found in
        chromium/third_party/WebKit/Source/bindings/core/v8/custom/V8InjectedScriptHostCustom.cpp)
        does a bunch of value->IsType() calls (->isString, ->isArray etc), and
        then some V8Type::hasInstance (V8Mode::hasInstance, V8NodeList::hasInstance, ...)

        isArrayLike above got patched to capture the array ones.

        The best we can repliate that is a Object..toString call.
        */

        // [object Type]
        //         ^--^
        var exposedType = ({}).toString.call(obj).slice(8, -1);
        var verbatim = ['String', 'Array', 'Boolean', 'Number', 'Date', 'RegExp'];

        if (verbatim.indexOf(exposedType) > -1) {
            return exposedType.toLowerCase();
        }

        // The only thing left is checking for Node.
        // Since the object came from another frame, we can't use instanceof.
        //This is "good enough".
        if ('nodeType' in obj && 'ATTRIBUTE_NODE' in obj) {
            return 'node';
        }

        var arrayTypes = [
            'Int8Array', 'Int16Array', 'Int32Array',
            'Uint8Array', 'Uint16Array', 'Uint32Array',
            'Uint8ClampedArray',
            'Float32Array', 'Float64Array'
        ];
        // forgot anything?

        if (arrayTypes.indexOf(obj) > -1) {
            return isFinite(obj.length);
        }

        // fallback
        return 'object';
    },

    internalConstructorName : function (subject) {
        // The actual implementation does some...weird stuff.
        // Fuck that.

        var type = ({}).toString.call(subject).slice(8, -1);
        if (subject !== Object(subject)) {
            return type;
        }

        if (subject.constructor) {
            return subject.constructor.name;
        }
        return type;
    },

    suppressWarningsAndCall : function (obj, method) {
        // yeah, fuck actual implementation.
        var args = [].slice.call(arguments, 2);
        return method.apply(obj, args);
    }
};

// at the end because blobs of text.
jsh.introduce = function () {
    var header = (function () {/*
     _     _
    (_)   | |       Welcome to jsh, an embedded Chrome dev-tools console!
     _ ___| |__
    | / __| '_ \
    | \__ \ | | |   Play around with javascript, hit save (Ctrl+S), share with
    | |___/_| |_|   friends and strangers!
   _/ |
  |__/

        * Source code on https://github.com/Zirak/jsh.
        * Bug reports more than welcome: https://github.com/Zirak/jsh/issues
        * Hit me on twitter: @zirakertan

        Hit Ctrl+L to clear this message.
    */}).toString().split('\n').slice(1, -1).join('\n');

    var msgs = [
        header
    ];
    msgs.forEach(function (msg) { jsh.console.log(msg) });
};

/*
                           _____ _            _____
                          |_   _| |          |  __ \
                            | | | |__   ___  | |  \/ __ _ _ __ ___   ___
                            | | | '_ \ / _ \ | | __ / _` | '_ ` _ \ / _ \
                            | | | | | |  __/ | |_\ \ (_| | | | | | |  __/
                            \_/ |_| |_|\___|  \____/\__,_|_| |_| |_|\___|

*/
