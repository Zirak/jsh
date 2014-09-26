(function () {
var jsh = window.jsh = {};

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

    console.warn('handleMessage', messageObject);

    var ignore = ['Runtime.enable', 'Console.enable', 'Runtime.isRunRequired'];
    if (ignore.indexOf(method) > -1) {
        return false;
    }

    messageObject.action = 'bridge';
    sendMessageToEvalFrame(messageObject);
};

// This is butt ugly. Find out when everything we need has been loaded.
var jshReady = {
	evalFrame : false,
	webinspector : false
};

jsh.maybeLoad = function () {
	if (!jshReady.evalFrame || !jshReady.webinspector) {
		return;
	}

	// Welcome, stranger!
	if (!localStorage.introduced) {
        localStorage.introduced = true;
        jsh.introduce();
    }

	// Load up the commands (if there are any)
	var commands = document.getElementById('jsh-commands').textContent;

    if (commands) {
        jsh.loadFromText(commands);
    }
};

// Eval frame! What we do with it is laid out in detail in public/evalFrame.html

jsh.evalFrame = document.createElement('iframe');
jsh.evalFrame.src = 'evalFrame.html';
jsh.evalFrame.hidden = true;
jsh.evalFrame.sandbox = 'allow-scripts';
document.body.appendChild(jsh.evalFrame);
jsh.evalWindow = jsh.evalFrame.contentWindow;

var frameSecret = (function () {
    var whyDoINeedThis = new Uint32Array(10);
    crypto.getRandomValues(whyDoINeedThis);

    var fuckayou = [].slice.call(whyDoINeedThis);
    return fuckayou.map(String.fromCharCode).join('');
})();

jsh.evalFrame.onload = function () {
    jsh.evalWindow.postMessage({
        action : 'secret',
        secret : '',
        newSecret : frameSecret
    }, '*');

	jshReady.evalFrame = true;
	jsh.maybeLoad();
};

function sendMessageToEvalFrame (data) {
    data.secret = frameSecret;
    jsh.evalWindow.postMessage(data, '*');
}

window.addEventListener('message', function messageListener (e) {
    var data = e.data;

    if (e.source !== jsh.evalWindow || data.secret !== frameSecret) {
        console.warn(e);
        return;
    }

    InspectorBackend._connection.dispatch(data);
});

window.addEventListener('DOMContentLoaded', function () {
    // yes, this is horrible. I will not apologise.
    setTimeout(function () {
        jshReady.webinspector = true;
		jsh.maybeLoad();
    }, 50);
	// ;-;
});

// at the end because blobs of text.
jsh.introduce = function () {
    var header = (function () {/** @preserve
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
    */
        console.lulz = 4; delete console.lulz;
    }).toString().split('\n').slice(1, -2).join('\n');

    WebInspector.console.log(header);
};

/*
                           _____ _            _____
                          |_   _| |          |  __ \
                            | | | |__   ___  | |  \/ __ _ _ __ ___   ___
                            | | | '_ \ / _ \ | | __ / _` | '_ ` _ \ / _ \
                            | | | | | |  __/ | |_\ \ (_| | | | | | |  __/
                            \_/ |_| |_|\___|  \____/\__,_|_| |_| |_|\___|

*/
})();
