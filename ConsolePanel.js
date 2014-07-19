WebInspector.ConsoleViewMessage = function (target, consoleMessage, linkifier) {
    this._message = consoleMessage;
    this._linkifier = linkifier;
    this._target = target;
    this._repeatCount = 1;
    this._dataGrids = [];
    this._dataGridParents = new Map();
    this._customFormatters = {
        "object": this._formatParameterAsObject,
        "array": this._formatParameterAsArray,
        "node": this._formatParameterAsNode,
        "string": this._formatParameterAsString
    };
}
WebInspector.ConsoleViewMessage.prototype = {
    wasShown: function () {
        for (var i = 0; this._dataGrids && i < this._dataGrids.length; ++i) {
            var dataGrid = this._dataGrids[i];
            var parentElement = this._dataGridParents.get(dataGrid) || null;
            dataGrid.show(parentElement);
            dataGrid.updateWidths();
        }
    },
    willHide: function () {
        for (var i = 0; this._dataGrids && i < this._dataGrids.length; ++i) {
            var dataGrid = this._dataGrids[i];
            this._dataGridParents.put(dataGrid, dataGrid.element.parentElement);
            dataGrid.detach();
        }
    },
    consoleMessage: function () {
        return this._message;
    },
    _formatMessage: function () {
        this._formattedMessage = document.createElement("span");
        this._formattedMessage.className = "console-message-text source-code";

        function linkifyRequest(title) {
            return WebInspector.Linkifier.linkifyUsingRevealer((this.request), title, this.url);
        }
        var consoleMessage = this._message;
        if (!this._messageElement) {
            if (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.ConsoleAPI) {
                switch (consoleMessage.type) {
                case WebInspector.ConsoleMessage.MessageType.Trace:
                    this._messageElement = this._format(consoleMessage.parameters || ["console.trace()"]);
                    break;
                case WebInspector.ConsoleMessage.MessageType.Clear:
                    this._messageElement = document.createTextNode(WebInspector.UIString("Console was cleared"));
                    this._formattedMessage.classList.add("console-info");
                    break;
                case WebInspector.ConsoleMessage.MessageType.Assert:
                    var args = [WebInspector.UIString("Assertion failed:")];
                    if (consoleMessage.parameters)
                        args = args.concat(consoleMessage.parameters);
                    this._messageElement = this._format(args);
                    break;
                case WebInspector.ConsoleMessage.MessageType.Dir:
                    var obj = consoleMessage.parameters ? consoleMessage.parameters[0] : undefined;
                    var args = ["%O", obj];
                    this._messageElement = this._format(args);
                    break;
                case WebInspector.ConsoleMessage.MessageType.Profile:
                case WebInspector.ConsoleMessage.MessageType.ProfileEnd:
                    this._messageElement = this._format([consoleMessage.messageText]);
                    break;
                default:
                    var args = consoleMessage.parameters || [consoleMessage.messageText];
                    this._messageElement = this._format(args);
                }
            } else if (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.Network) {
                if (consoleMessage.request) {
                    consoleMessage.stackTrace = consoleMessage.request.initiator.stackTrace;
                    if (consoleMessage.request.initiator && consoleMessage.request.initiator.url) {
                        consoleMessage.url = consoleMessage.request.initiator.url;
                        consoleMessage.line = consoleMessage.request.initiator.lineNumber;
                    }
                    this._messageElement = document.createElement("span");
                    if (consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Error) {
                        this._messageElement.appendChild(document.createTextNode(consoleMessage.request.requestMethod + " "));
                        this._messageElement.appendChild(WebInspector.Linkifier.linkifyUsingRevealer(consoleMessage.request, consoleMessage.request.url, consoleMessage.request.url));
                        if (consoleMessage.request.failed)
                            this._messageElement.appendChild(document.createTextNode(" " + consoleMessage.request.localizedFailDescription));
                        else
                            this._messageElement.appendChild(document.createTextNode(" " + consoleMessage.request.statusCode + " (" + consoleMessage.request.statusText + ")"));
                    } else {
                        var fragment = WebInspector.linkifyStringAsFragmentWithCustomLinkifier(consoleMessage.messageText, linkifyRequest.bind(consoleMessage));
                        this._messageElement.appendChild(fragment);
                    }
                } else {
                    var url = consoleMessage.url;
                    if (url) {
                        var isExternal = !WebInspector.resourceForURL(url) && !WebInspector.workspace.uiSourceCodeForURL(url);
                        this._anchorElement = WebInspector.linkifyURLAsNode(url, url, "console-message-url", isExternal);
                    }
                    this._messageElement = this._format([consoleMessage.messageText]);
                }
            } else {
                var args = consoleMessage.parameters || [consoleMessage.messageText];
                this._messageElement = this._format(args);
            }
        }
        if (consoleMessage.source !== WebInspector.ConsoleMessage.MessageSource.Network || consoleMessage.request) {
            var callFrame = this._callFrameAnchorFromStackTrace(consoleMessage.stackTrace);
            if (callFrame)
                this._anchorElement = this._linkifyCallFrame(callFrame);
            else if (consoleMessage.url && consoleMessage.url !== "undefined")
                this._anchorElement = this._linkifyLocation(consoleMessage.url, consoleMessage.line, consoleMessage.column);
        }
        this._formattedMessage.appendChild(this._messageElement);
        if (this._anchorElement) {
            this._formattedMessage.appendChild(document.createTextNode(" "));
            this._formattedMessage.appendChild(this._anchorElement);
        }
        var dumpStackTrace = !!consoleMessage.stackTrace && consoleMessage.stackTrace.length && (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.Network || consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Error || consoleMessage.type === WebInspector.ConsoleMessage.MessageType.Trace);
        if (dumpStackTrace) {
            var ol = document.createElement("ol");
            ol.className = "outline-disclosure";
            var treeOutline = new TreeOutline(ol);
            var content = this._formattedMessage;
            var root = new TreeElement(content, null, true);
            content.treeElementForTest = root;
            treeOutline.appendChild(root);
            if (consoleMessage.type === WebInspector.ConsoleMessage.MessageType.Trace)
                root.expand();
            this._populateStackTraceTreeElement(root);
            this._formattedMessage = ol;
        }
    },
    _formattedMessageText: function () {
        this.formattedMessage();
        return this._messageElement.textContent;
    },
    formattedMessage: function () {
        if (!this._formattedMessage)
            this._formatMessage();
        return this._formattedMessage;
    },
    _linkifyLocation: function (url, lineNumber, columnNumber) {
        console.assert(this._linkifier);
        if (!this._linkifier)
            return null;
        lineNumber = lineNumber ? lineNumber - 1 : 0;
        columnNumber = columnNumber ? columnNumber - 1 : 0;
        if (this._message.source === WebInspector.ConsoleMessage.MessageSource.CSS) {
            var headerIds = WebInspector.cssModel.styleSheetIdsForURL(url);
            var cssLocation = new WebInspector.CSSLocation(url, lineNumber, columnNumber);
            return this._linkifier.linkifyCSSLocation(headerIds[0] || null, cssLocation, "console-message-url");
        }
        return this._linkifier.linkifyLocation(url, lineNumber, columnNumber, "console-message-url");
    },
    _linkifyCallFrame: function (callFrame) {
        console.assert(this._linkifier);
        if (!this._linkifier)
            return null;
        var lineNumber = callFrame.lineNumber ? callFrame.lineNumber - 1 : 0;
        var columnNumber = callFrame.columnNumber ? callFrame.columnNumber - 1 : 0;
        var rawLocation = new WebInspector.DebuggerModel.Location(callFrame.scriptId, lineNumber, columnNumber);
        return this._linkifier.linkifyRawLocation(rawLocation, "console-message-url");
    },
    _callFrameAnchorFromStackTrace: function (stackTrace) {
        if (!stackTrace || !stackTrace.length)
            return null;
        var callFrame = stackTrace[0].scriptId ? stackTrace[0] : null;
        if (!WebInspector.experimentsSettings.frameworksDebuggingSupport.isEnabled())
            return callFrame;
        if (!WebInspector.settings.skipStackFramesSwitch.get())
            return callFrame;
        var regex = WebInspector.settings.skipStackFramesPattern.asRegExp();
        if (!regex)
            return callFrame;
        for (var i = 0; i < stackTrace.length; ++i) {
            var script = this._target.debuggerModel.scriptForId(stackTrace[i].scriptId);
            if (!script || !regex.test(script.sourceURL))
                return stackTrace[i].scriptId ? stackTrace[i] : null;
        }
        return callFrame;
    },
    isErrorOrWarning: function () {
        return (this._message.level === WebInspector.ConsoleMessage.MessageLevel.Warning || this._message.level === WebInspector.ConsoleMessage.MessageLevel.Error);
    },
    _format: function (parameters) {
        var formattedResult = document.createElement("span");
        if (!parameters.length)
            return formattedResult;
        for (var i = 0; i < parameters.length; ++i) {
            if (parameters[i] instanceof WebInspector.RemoteObject)
                continue;
            if (typeof parameters[i] === "object")
                parameters[i] = WebInspector.RemoteObject.fromPayload(parameters[i], this._target);
            else
                parameters[i] = WebInspector.RemoteObject.fromPrimitiveValue(parameters[i], this._target);
        }
        var shouldFormatMessage = WebInspector.RemoteObject.type(parameters[0]) === "string" && this._message.type !== WebInspector.ConsoleMessage.MessageType.Result;
        if (shouldFormatMessage) {
            var result = this._formatWithSubstitutionString(parameters[0].description, parameters.slice(1), formattedResult);
            parameters = result.unusedSubstitutions;
            if (parameters.length)
                formattedResult.appendChild(document.createTextNode(" "));
        }
        if (this._message.type === WebInspector.ConsoleMessage.MessageType.Table) {
            formattedResult.appendChild(this._formatParameterAsTable(parameters));
            return formattedResult;
        }
        for (var i = 0; i < parameters.length; ++i) {
            if (shouldFormatMessage && parameters[i].type === "string")
                formattedResult.appendChild(WebInspector.linkifyStringAsFragment(parameters[i].description));
            else
                formattedResult.appendChild(this._formatParameter(parameters[i], false, true));
            if (i < parameters.length - 1)
                formattedResult.appendChild(document.createTextNode(" "));
        }
        return formattedResult;
    },
    _formatParameter: function (output, forceObjectFormat, includePreview) {
        var type;
        if (forceObjectFormat)
            type = "object";
        else if (output instanceof WebInspector.RemoteObject)
            type = output.subtype || output.type;
        else
            type = typeof output;
        var formatter = this._customFormatters[type];
        if (!formatter) {
            formatter = this._formatParameterAsValue;
            output = output.description;
        }
        var span = document.createElement("span");
        span.className = "console-formatted-" + type + " source-code";
        formatter.call(this, output, span, includePreview);
        return span;
    },
    _formatParameterAsValue: function (val, elem) {
        elem.appendChild(document.createTextNode(val));
    },
    _formatParameterAsObject: function (obj, elem, includePreview) {
        this._formatParameterAsArrayOrObject(obj, obj.description || "", elem, includePreview);
    },
    _formatParameterAsArrayOrObject: function (obj, description, elem, includePreview) {
        var titleElement = document.createElement("span");
        if (description)
            titleElement.createTextChild(description);
        if (includePreview && obj.preview) {
            titleElement.classList.add("console-object-preview");
            var lossless = this._appendObjectPreview(obj, description, titleElement);
            if (lossless) {
                elem.appendChild(titleElement);
                return;
            }
        }
        var section = new WebInspector.ObjectPropertiesSection(obj, titleElement);
        section.enableContextMenu();
        elem.appendChild(section.element);
        var note = section.titleElement.createChild("span", "object-info-state-note");
        note.title = WebInspector.UIString("Object state below is captured upon first expansion");
    },
    _appendObjectPreview: function (obj, description, titleElement) {
        var preview = obj.preview;
        var isArray = obj.subtype === "array";
        if (description)
            titleElement.createTextChild(" ");
        titleElement.createTextChild(isArray ? "[" : "{");
        for (var i = 0; i < preview.properties.length; ++i) {
            if (i > 0)
                titleElement.createTextChild(", ");
            var property = preview.properties[i];
            var name = property.name;
            if (!isArray || name != i) {
                if (/^\s|\s$|^$|\n/.test(name))
                    name = "\"" + name.replace(/\n/g, "\u21B5") + "\"";
                titleElement.createChild("span", "name").textContent = name;
                titleElement.createTextChild(": ");
            }
            titleElement.appendChild(this._renderPropertyPreviewOrAccessor(obj, [property]));
        }
        if (preview.overflow)
            titleElement.createChild("span").textContent = "\u2026";
        titleElement.createTextChild(isArray ? "]" : "}");
        return preview.lossless;
    },
    _renderPropertyPreviewOrAccessor: function (object, propertyPath) {
        var property = propertyPath.peekLast();
        if (property.type === "accessor")
            return this._formatAsAccessorProperty(object, propertyPath.select("name"), false);
        return this._renderPropertyPreview(property.type, (property.subtype), property.value);
    },
    _renderPropertyPreview: function (type, subtype, description) {
        var span = document.createElement("span");
        span.className = "console-formatted-" + type;
        if (type === "function") {
            span.textContent = "function";
            return span;
        }
        if (type === "object" && subtype === "regexp") {
            span.classList.add("console-formatted-string");
            span.textContent = description;
            return span;
        }
        if (type === "object" && subtype === "node" && description) {
            span.classList.add("console-formatted-preview-node");
            WebInspector.DOMPresentationUtils.createSpansForNodeTitle(span, description);
            return span;
        }
        if (type === "string") {
            span.textContent = "\"" + description.replace(/\n/g, "\u21B5") + "\"";
            return span;
        }
        span.textContent = description;
        return span;
    },
    _formatParameterAsNode: function (object, elem) {
        function printNode(nodeId) {
            if (!nodeId) {
                this._formatParameterAsObject(object, elem, false);
                return;
            }
            var node = WebInspector.domModel.nodeForId(nodeId);
            var renderer = WebInspector.moduleManager.instance(WebInspector.Renderer, node);
            if (renderer)
                elem.appendChild(renderer.render(node));
            else
                console.error("No renderer for node found");
        }
        object.pushNodeToFrontend(printNode.bind(this));
    },
    useArrayPreviewInFormatter: function (array) {
        return this._message.type !== WebInspector.ConsoleMessage.MessageType.DirXML && !!array.preview;
    },
    _formatParameterAsArray: function (array, elem) {
        if (this.useArrayPreviewInFormatter(array)) {
            this._formatParameterAsArrayOrObject(array, "", elem, true);
            return;
        }
        const maxFlatArrayLength = 100;
        if (this._message.isOutdated || array.arrayLength() > maxFlatArrayLength)
            this._formatParameterAsObject(array, elem, false);
        else
            array.getOwnProperties(this._printArray.bind(this, array, elem));
    },
    _formatParameterAsTable: function (parameters) {
        var element = document.createElement("span");
        var table = parameters[0];
        if (!table || !table.preview)
            return element;
        var columnNames = [];
        var preview = table.preview;
        var rows = [];
        for (var i = 0; i < preview.properties.length; ++i) {
            var rowProperty = preview.properties[i];
            var rowPreview = rowProperty.valuePreview;
            if (!rowPreview)
                continue;
            var rowValue = {};
            const maxColumnsToRender = 20;
            for (var j = 0; j < rowPreview.properties.length; ++j) {
                var cellProperty = rowPreview.properties[j];
                var columnRendered = columnNames.indexOf(cellProperty.name) != -1;
                if (!columnRendered) {
                    if (columnNames.length === maxColumnsToRender)
                        continue;
                    columnRendered = true;
                    columnNames.push(cellProperty.name);
                }
                if (columnRendered) {
                    var cellElement = this._renderPropertyPreviewOrAccessor(table, [rowProperty, cellProperty]);
                    cellElement.classList.add("nowrap-below");
                    rowValue[cellProperty.name] = cellElement;
                }
            }
            rows.push([rowProperty.name, rowValue]);
        }
        var flatValues = [];
        for (var i = 0; i < rows.length; ++i) {
            var rowName = rows[i][0];
            var rowValue = rows[i][1];
            flatValues.push(rowName);
            for (var j = 0; j < columnNames.length; ++j)
                flatValues.push(rowValue[columnNames[j]]);
        }
        if (!flatValues.length)
            return element;
        columnNames.unshift(WebInspector.UIString("(index)"));
        var dataGrid = WebInspector.DataGrid.createSortableDataGrid(columnNames, flatValues);
        dataGrid.renderInline();
        this._dataGrids.push(dataGrid);
        this._dataGridParents.put(dataGrid, element);
        return element;
    },
    _formatParameterAsString: function (output, elem) {
        var span = document.createElement("span");
        span.className = "console-formatted-string source-code";
        span.appendChild(WebInspector.linkifyStringAsFragment(output.description));
        elem.classList.remove("console-formatted-string");
        elem.appendChild(document.createTextNode("\""));
        elem.appendChild(span);
        elem.appendChild(document.createTextNode("\""));
    },
    _printArray: function (array, elem, properties) {
        if (!properties)
            return;
        var elements = [];
        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];
            var name = property.name;
            if (isNaN(name))
                continue;
            if (property.getter)
                elements[name] = this._formatAsAccessorProperty(array, [name], true);
            else if (property.value)
                elements[name] = this._formatAsArrayEntry(property.value);
        }
        elem.appendChild(document.createTextNode("["));
        var lastNonEmptyIndex = -1;

        function appendUndefined(elem, index) {
            if (index - lastNonEmptyIndex <= 1)
                return;
            var span = elem.createChild("span", "console-formatted-undefined");
            span.textContent = WebInspector.UIString("undefined × %d", index - lastNonEmptyIndex - 1);
        }
        var length = array.arrayLength();
        for (var i = 0; i < length; ++i) {
            var element = elements[i];
            if (!element)
                continue;
            if (i - lastNonEmptyIndex > 1) {
                appendUndefined(elem, i);
                elem.appendChild(document.createTextNode(", "));
            }
            elem.appendChild(element);
            lastNonEmptyIndex = i;
            if (i < length - 1)
                elem.appendChild(document.createTextNode(", "));
        }
        appendUndefined(elem, length);
        elem.appendChild(document.createTextNode("]"));
    },
    _formatAsArrayEntry: function (output) {
        return this._formatParameter(output, output.subtype === "array", false);
    },
    _formatAsAccessorProperty: function (object, propertyPath, isArrayEntry) {
        var rootElement = WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(object, propertyPath, onInvokeGetterClick.bind(this));

        function onInvokeGetterClick(result, wasThrown) {
            if (!result)
                return;
            rootElement.removeChildren();
            if (wasThrown) {
                var element = rootElement.createChild("span", "error-message");
                element.textContent = WebInspector.UIString("<exception>");
                element.title = result.description;
            } else if (isArrayEntry) {
                rootElement.appendChild(this._formatAsArrayEntry(result));
            } else {
                const maxLength = 100;
                var type = result.type;
                var subtype = result.subtype;
                var description = "";
                if (type !== "function" && result.description) {
                    if (type === "string" || subtype === "regexp")
                        description = result.description.trimMiddle(maxLength);
                    else
                        description = result.description.trimEnd(maxLength);
                }
                rootElement.appendChild(this._renderPropertyPreview(type, subtype, description));
            }
        }
        return rootElement;
    },
    _formatWithSubstitutionString: function (format, parameters, formattedResult) {
        var formatters = {};

        function parameterFormatter(force, obj) {
            return this._formatParameter(obj, force, false);
        }

        function stringFormatter(obj) {
            return obj.description;
        }

        function floatFormatter(obj) {
            if (typeof obj.value !== "number")
                return "NaN";
            return obj.value;
        }

        function integerFormatter(obj) {
            if (typeof obj.value !== "number")
                return "NaN";
            return Math.floor(obj.value);
        }

        function bypassFormatter(obj) {
            return (obj instanceof Node) ? obj : "";
        }
        var currentStyle = null;

        function styleFormatter(obj) {
            currentStyle = {};
            var buffer = document.createElement("span");
            buffer.setAttribute("style", obj.description);
            for (var i = 0; i < buffer.style.length; i++) {
                var property = buffer.style[i];
                if (isWhitelistedProperty(property))
                    currentStyle[property] = buffer.style[property];
            }
        }

        function isWhitelistedProperty(property) {
            var prefixes = ["background", "border", "color", "font", "line", "margin", "padding", "text", "-webkit-background", "-webkit-border", "-webkit-font", "-webkit-margin", "-webkit-padding", "-webkit-text"];
            for (var i = 0; i < prefixes.length; i++) {
                if (property.startsWith(prefixes[i]))
                    return true;
            }
            return false;
        }
        formatters.o = parameterFormatter.bind(this, false);
        formatters.s = stringFormatter;
        formatters.f = floatFormatter;
        formatters.i = integerFormatter;
        formatters.d = integerFormatter;
        formatters.c = styleFormatter;
        formatters.O = parameterFormatter.bind(this, true);
        formatters._ = bypassFormatter;

        function append(a, b) {
            if (b instanceof Node)
                a.appendChild(b);
            else if (typeof b !== "undefined") {
                var toAppend = WebInspector.linkifyStringAsFragment(String(b));
                if (currentStyle) {
                    var wrapper = document.createElement('span');
                    for (var key in currentStyle)
                        wrapper.style[key] = currentStyle[key];
                    wrapper.appendChild(toAppend);
                    toAppend = wrapper;
                }
                a.appendChild(toAppend);
            }
            return a;
        }
        return String.format(format, parameters, formatters, formattedResult, append);
    },
    clearHighlight: function () {
        if (!this._formattedMessage)
            return;
        var highlightedMessage = this._formattedMessage;
        delete this._formattedMessage;
        delete this._anchorElement;
        delete this._messageElement;
        this._formatMessage();
        this._element.replaceChild(this._formattedMessage, highlightedMessage);
    },
    highlightSearchResults: function (regexObject) {
        if (!this._formattedMessage)
            return;
        this._highlightSearchResultsInElement(regexObject, this._messageElement);
        if (this._anchorElement)
            this._highlightSearchResultsInElement(regexObject, this._anchorElement);
        this._element.scrollIntoViewIfNeeded();
    },
    _highlightSearchResultsInElement: function (regexObject, element) {
        regexObject.lastIndex = 0;
        var text = element.textContent;
        var match = regexObject.exec(text);
        var matchRanges = [];
        while (match) {
            matchRanges.push(new WebInspector.SourceRange(match.index, match[0].length));
            match = regexObject.exec(text);
        }
        WebInspector.highlightSearchResults(element, matchRanges);
    },
    matchesRegex: function (regexObject) {
        regexObject.lastIndex = 0;
        return regexObject.test(this._formattedMessageText()) || (!!this._anchorElement && regexObject.test(this._anchorElement.textContent));
    },
    updateTimestamp: function (show) {
        if (!this._element)
            return;
        if (show && !this.timestampElement) {
            this.timestampElement = this._element.createChild("span", "console-timestamp");
            this.timestampElement.textContent = (new Date(this._message.timestamp)).toConsoleTime();
            var afterRepeatCountChild = this.repeatCountElement && this.repeatCountElement.nextSibling;
            this._element.insertBefore(this.timestampElement, afterRepeatCountChild || this._element.firstChild);
            return;
        }
        if (!show && this.timestampElement) {
            this.timestampElement.remove();
            delete this.timestampElement;
        }
    },
    toMessageElement: function () {
        if (this._element)
            return this._element;
        var element = document.createElement("div");
        element.message = this;
        element.className = "console-message";
        this._element = element;
        switch (this._message.level) {
        case WebInspector.ConsoleMessage.MessageLevel.Log:
            element.classList.add("console-log-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Debug:
            element.classList.add("console-debug-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Warning:
            element.classList.add("console-warning-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Error:
            element.classList.add("console-error-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Info:
            element.classList.add("console-info-level");
            break;
        }
        if (this._message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || this._message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
            element.classList.add("console-group-title");
        element.appendChild(this.formattedMessage());
        if (this._repeatCount > 1)
            this._showRepeatCountElement();
        this.updateTimestamp(WebInspector.settings.consoleTimestampsEnabled.get());
        return element;
    },
    _populateStackTraceTreeElement: function (parentTreeElement) {
        for (var i = 0; i < this._message.stackTrace.length; i++) {
            var frame = this._message.stackTrace[i];
            var content = document.createElementWithClass("div", "stacktrace-entry");
            var messageTextElement = document.createElement("span");
            messageTextElement.className = "console-message-text source-code";
            var functionName = frame.functionName || WebInspector.UIString("(anonymous function)");
            messageTextElement.appendChild(document.createTextNode(functionName));
            content.appendChild(messageTextElement);
            if (frame.scriptId) {
                content.appendChild(document.createTextNode(" "));
                var urlElement = this._linkifyCallFrame(frame);
                if (!urlElement)
                    continue;
                content.appendChild(urlElement);
            }
            var treeElement = new TreeElement(content);
            parentTreeElement.appendChild(treeElement);
        }
    },
    incrementRepeatCount: function () {
        this._repeatCount++;
        this._showRepeatCountElement();
    },
    _showRepeatCountElement: function () {
        if (!this._element)
            return;
        if (!this.repeatCountElement) {
            this.repeatCountElement = document.createElement("span");
            this.repeatCountElement.className = "bubble";
            this._element.insertBefore(this.repeatCountElement, this._element.firstChild);
            this._element.classList.add("repeated-message");
        }
        this.repeatCountElement.textContent = this._repeatCount;
    },
    toString: function () {
        var sourceString;
        switch (this._message.source) {
        case WebInspector.ConsoleMessage.MessageSource.XML:
            sourceString = "XML";
            break;
        case WebInspector.ConsoleMessage.MessageSource.JS:
            sourceString = "JavaScript";
            break;
        case WebInspector.ConsoleMessage.MessageSource.Network:
            sourceString = "Network";
            break;
        case WebInspector.ConsoleMessage.MessageSource.ConsoleAPI:
            sourceString = "ConsoleAPI";
            break;
        case WebInspector.ConsoleMessage.MessageSource.Storage:
            sourceString = "Storage";
            break;
        case WebInspector.ConsoleMessage.MessageSource.AppCache:
            sourceString = "AppCache";
            break;
        case WebInspector.ConsoleMessage.MessageSource.Rendering:
            sourceString = "Rendering";
            break;
        case WebInspector.ConsoleMessage.MessageSource.CSS:
            sourceString = "CSS";
            break;
        case WebInspector.ConsoleMessage.MessageSource.Security:
            sourceString = "Security";
            break;
        case WebInspector.ConsoleMessage.MessageSource.Other:
            sourceString = "Other";
            break;
        }
        var typeString;
        switch (this._message.type) {
        case WebInspector.ConsoleMessage.MessageType.Log:
            typeString = "Log";
            break;
        case WebInspector.ConsoleMessage.MessageType.Dir:
            typeString = "Dir";
            break;
        case WebInspector.ConsoleMessage.MessageType.DirXML:
            typeString = "Dir XML";
            break;
        case WebInspector.ConsoleMessage.MessageType.Trace:
            typeString = "Trace";
            break;
        case WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed:
        case WebInspector.ConsoleMessage.MessageType.StartGroup:
            typeString = "Start Group";
            break;
        case WebInspector.ConsoleMessage.MessageType.EndGroup:
            typeString = "End Group";
            break;
        case WebInspector.ConsoleMessage.MessageType.Assert:
            typeString = "Assert";
            break;
        case WebInspector.ConsoleMessage.MessageType.Result:
            typeString = "Result";
            break;
        case WebInspector.ConsoleMessage.MessageType.Profile:
        case WebInspector.ConsoleMessage.MessageType.ProfileEnd:
            typeString = "Profiling";
            break;
        }
        var levelString;
        switch (this._message.level) {
        case WebInspector.ConsoleMessage.MessageLevel.Log:
            levelString = "Log";
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Warning:
            levelString = "Warning";
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Debug:
            levelString = "Debug";
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Error:
            levelString = "Error";
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Info:
            levelString = "Info";
            break;
        }
        return sourceString + " " + typeString + " " + levelString + ": " + this.formattedMessage().textContent + "\n" + this._message.url + " line " + this._message.line;
    },
    get text() {
        return this._message.messageText;
    }
};
WebInspector.ConsoleView = function (hideContextSelector) {
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("filter.css");
    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.element);
    this._contentsElement = this._searchableView.element;
    this._contentsElement.classList.add("console-view");
    this._visibleViewMessages = [];
    this._urlToMessageCount = {};
    this._clearConsoleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear console log."), "clear-status-bar-item");
    this._clearConsoleButton.addEventListener("click", this._requestClearMessages, this);
    this._executionContextSelector = new WebInspector.StatusBarComboBox(this._executionContextChanged.bind(this), "console-context");
    this._topLevelOptionByContextListId = {};
    this._subOptionsByContextListId = {};
    this._filter = new WebInspector.ConsoleViewFilter(this);
    this._filter.addEventListener(WebInspector.ConsoleViewFilter.Events.FilterChanged, this._updateMessageList.bind(this));
    if (hideContextSelector)
        this._executionContextSelector.element.classList.add("hidden");
    this._filterBar = new WebInspector.FilterBar();
    var statusBarElement = this._contentsElement.createChild("div", "console-status-bar");
    statusBarElement.appendChild(this._clearConsoleButton.element);
    statusBarElement.appendChild(this._filterBar.filterButton().element);
    statusBarElement.appendChild(this._executionContextSelector.element);
    this._filtersContainer = this._contentsElement.createChild("div", "console-filters-header hidden");
    this._filtersContainer.appendChild(this._filterBar.filtersElement());
    this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled, this._onFiltersToggled, this);
    this._filterBar.setName("consoleView");
    this._filter.addFilters(this._filterBar);
    this.messagesElement = document.createElement("div");
    this.messagesElement.id = "console-messages";
    this.messagesElement.className = "monospace";
    this.messagesElement.addEventListener("click", this._messagesClicked.bind(this), true);
    this._contentsElement.appendChild(this.messagesElement);
    this._scrolledToBottom = true;
    this.promptElement = document.createElement("div");
    this.promptElement.id = "console-prompt";
    this.promptElement.className = "source-code";
    this.promptElement.spellcheck = false;
    this.messagesElement.appendChild(this.promptElement);
    this.messagesElement.appendChild(document.createElement("br"));
    this.topGroup = new WebInspector.ConsoleGroup(null);
    this.messagesElement.insertBefore(this.topGroup.element, this.promptElement);
    this.currentGroup = this.topGroup;
    this._registerShortcuts();
    this.registerRequiredCSS("textPrompt.css");
    this.messagesElement.addEventListener("contextmenu", this._handleContextMenuEvent.bind(this), false);
    WebInspector.settings.monitoringXHREnabled.addChangeListener(this._monitoringXHREnabledSettingChanged.bind(this));
    this._linkifier = new WebInspector.Linkifier();
    this._messageToViewMessage = new Map();
    this._consoleMessages = [];
    this.prompt = new WebInspector.TextPromptWithHistory(this._completionsForTextPrompt.bind(this));
    this.prompt.setSuggestBoxEnabled("generic-suggest");
    this.prompt.renderAsBlock();
    this.prompt.attach(this.promptElement);
    this.prompt.proxyElement.addEventListener("keydown", this._promptKeyDown.bind(this), false);
    this.prompt.setHistoryData(WebInspector.settings.consoleHistory.get());
    this._filterStatusMessageElement = document.createElement("div");
    this._filterStatusMessageElement.classList.add("console-message");
    this._filterStatusTextElement = this._filterStatusMessageElement.createChild("span", "console-info");
    this._filterStatusMessageElement.createTextChild(" ");
    var resetFiltersLink = this._filterStatusMessageElement.createChild("span", "console-info node-link");
    resetFiltersLink.textContent = WebInspector.UIString("Show all messages.");
    resetFiltersLink.addEventListener("click", this._filter.reset.bind(this._filter), true);
    this.messagesElement.insertBefore(this._filterStatusMessageElement, this.topGroup.element);
    this._updateFilterStatus();
    WebInspector.targetManager.targets().forEach(this._targetAdded, this);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.TargetAdded, this._onTargetAdded, this);
    WebInspector.settings.consoleTimestampsEnabled.addChangeListener(this._consoleTimestampsSettingChanged, this);
}
WebInspector.ConsoleView.prototype = {
    _onTargetAdded: function (event) {
        this._targetAdded((event.data));
    },
    _targetAdded: function (target) {
        target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded.bind(this, target), this);
        target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
        target.consoleModel.addEventListener(WebInspector.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
        target.consoleModel.messages.forEach(this._consoleMessageAdded.bind(this, target));

        function loadContextList(contextList) {
            this._addExecutionContextList(target, contextList);
            this._contextListChanged(target, contextList);
        }
        target.runtimeModel.contextLists().forEach(loadContextList, this);
        target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextListAdded, this._executionContextListAdded.bind(this, target));
        target.runtimeModel.addEventListener(WebInspector.RuntimeModel.Events.ExecutionContextListRemoved, this._executionContextListRemoved, this);
    },
    _consoleTimestampsSettingChanged: function (event) {
        var enabled = (event.data);
        this._messageToViewMessage.values().forEach(function (viewMessage) {
            viewMessage.updateTimestamp(enabled);
        })
    },
    defaultFocusedElement: function () {
        return this.promptElement
    },
    _onFiltersToggled: function (event) {
        var toggled = (event.data);
        this._filtersContainer.classList.toggle("hidden", !toggled);
    },
    _executionContextListAdded: function (target, event) {
        var contextList = (event.data);
        this._addExecutionContextList(target, contextList);
    },
    _addExecutionContextList: function (target, contextList) {
        var maxLength = 50;
        var topLevelOption = this._executionContextSelector.createOption(contextList.displayName().trimMiddle(maxLength), contextList.url());
        topLevelOption._executionContext = null;
        topLevelOption._target = target;
        this._topLevelOptionByContextListId[contextList.id()] = topLevelOption;
        this._subOptionsByContextListId[contextList.id()] = [];
        contextList.addEventListener(WebInspector.ExecutionContextList.EventTypes.Reset, this._contextListReset, this);
        contextList.addEventListener(WebInspector.ExecutionContextList.EventTypes.ContextAdded, this._contextListChanged.bind(this, target, contextList));
    },
    _executionContextListRemoved: function (event) {
        var contextList = (event.data);
        this._removeSubOptions(contextList.id());
        var topLevelOption = this._topLevelOptionByContextListId[contextList.id()];
        this._executionContextSelector.removeOption(topLevelOption);
        delete this._topLevelOptionByContextListId[contextList.id()];
        delete this._subOptionsByContextListId[contextList.id()];
        this._executionContextChanged();
    },
    _removeSubOptions: function (contextListId) {
        var selectedOptionRemoved = false;
        var subOptions = this._subOptionsByContextListId[contextListId];
        for (var i = 0; i < subOptions.length; ++i) {
            selectedOptionRemoved |= this._executionContextSelector.selectedOption() === subOptions[i];
            this._executionContextSelector.removeOption(subOptions[i]);
        }
        this._subOptionsByContextListId[contextListId] = [];
        return selectedOptionRemoved;
    },
    _executionContextChanged: function () {
        var runtimeModel = this._currentTarget().runtimeModel;
        var runtimeContext = runtimeModel.currentExecutionContext();
        if (this._currentExecutionContext() !== runtimeContext)
            runtimeModel.setCurrentExecutionContext(this._currentExecutionContext());
        this.prompt.clearAutoComplete(true);
    },
    _currentExecutionContext: function () {
        var option = this._executionContextSelector.selectedOption();
        return option ? option._executionContext : null;
    },
    _currentTarget: function () {
        var option = this._executionContextSelector.selectedOption();
        return option ? option._target : WebInspector.targetManager.mainTarget();
    },
    _completionsForTextPrompt: function (proxyElement, wordRange, force, completionsReadyCallback) {
        this._currentTarget().runtimeModel.completionsForTextPrompt(proxyElement, wordRange, force, completionsReadyCallback);
    },
    _contextListReset: function (event) {
        var contextList = (event.data);
        var option = this._topLevelOptionByContextListId[contextList.id()];
        var maxLength = 50;
        option.text = contextList.displayName().trimMiddle(maxLength);
        option.title = contextList.url();
        var selectedRemoved = this._removeSubOptions(contextList.id());
        if (selectedRemoved) {
            this._executionContextSelector.select(option);
            this._executionContextChanged();
        }
    },
    _contextListChanged: function (target, contextList) {
        var currentExecutionContext = this._currentExecutionContext();
        var shouldSelectOption = this._removeSubOptions(contextList.id());
        var topLevelOption = this._topLevelOptionByContextListId[contextList.id()];
        var nextTopLevelOption = topLevelOption.nextSibling;
        var subOptions = this._subOptionsByContextListId[contextList.id()];
        var executionContexts = contextList.executionContexts();
        for (var i = 0; i < executionContexts.length; ++i) {
            if (executionContexts[i].isMainWorldContext) {
                topLevelOption._executionContext = executionContexts[i];
                continue;
            }
            var subOption = document.createElement("option");
            subOption.text = "\u00a0\u00a0\u00a0\u00a0" + executionContexts[i].name;
            subOption._executionContext = executionContexts[i];
            subOption._target = target;
            this._executionContextSelector.selectElement().insertBefore(subOption, nextTopLevelOption);
            subOptions.push(subOption);
            if (shouldSelectOption && executionContexts[i] === currentExecutionContext) {
                this._executionContextSelector.select(subOption);
                shouldSelectOption = false;
            }
        }
        if (shouldSelectOption)
            this._executionContextSelector.select(topLevelOption);
        this._executionContextChanged();
    },
    willHide: function () {
        this.prompt.hideSuggestBox();
        this.prompt.clearAutoComplete(true);
    },
    wasShown: function () {
        if (!this.prompt.isCaretInsidePrompt())
            this.prompt.moveCaretToEndOfPrompt();
    },
    focus: function () {
        if (this.promptElement === WebInspector.currentFocusElement())
            return;
        WebInspector.setCurrentFocusElement(this.promptElement);
        this.prompt.moveCaretToEndOfPrompt();
    },
    storeScrollPositions: function () {
        WebInspector.View.prototype.storeScrollPositions.call(this);
        this._scrolledToBottom = this.messagesElement.isScrolledToBottom();
    },
    restoreScrollPositions: function () {
        if (this._scrolledToBottom)
            this._immediatelyScrollIntoView();
        else
            WebInspector.View.prototype.restoreScrollPositions.call(this);
    },
    onResize: function () {
        this.prompt.hideSuggestBox();
        this.restoreScrollPositions();
    },
    _isScrollIntoViewScheduled: function () {
        return !!this._scrollIntoViewTimer;
    },
    _scheduleScrollIntoView: function () {
        if (this._scrollIntoViewTimer)
            return;

        function scrollIntoView() {
            delete this._scrollIntoViewTimer;
            this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
        }
        this._scrollIntoViewTimer = setTimeout(scrollIntoView.bind(this), 20);
    },
    _immediatelyScrollIntoView: function () {
        this.promptElement.scrollIntoView(true);
        this._cancelScheduledScrollIntoView();
    },
    _cancelScheduledScrollIntoView: function () {
        if (!this._isScrollIntoViewScheduled())
            return;
        clearTimeout(this._scrollIntoViewTimer);
        delete this._scrollIntoViewTimer;
    },
    _updateFilterStatus: function (count) {
        count = (typeof count === "undefined") ? (this._consoleMessages.length - this._visibleViewMessages.length) : count;
        this._filterStatusTextElement.textContent = WebInspector.UIString(count == 1 ? "%d message is hidden by filters." : "%d messages are hidden by filters.", count);
        this._filterStatusMessageElement.style.display = count ? "" : "none";
    },
    _consoleMessageAdded: function (target, message) {
        if (this._urlToMessageCount[message.url])
            this._urlToMessageCount[message.url]++;
        else
            this._urlToMessageCount[message.url] = 1;
        var previousMessage = this._consoleMessages.peekLast();
        if (previousMessage && !message.isGroupMessage() && message.isEqual(previousMessage)) {
            previousMessage.timestamp = message.timestamp;
            this._messageToViewMessage.get(previousMessage).incrementRepeatCount();
            return;
        }
        this._consoleMessages.push(message);
        var viewMessage = this._createViewMessage(target, message);
        if (this._filter.shouldBeVisible(viewMessage))
            this._showConsoleMessage(viewMessage);
        else
            this._updateFilterStatus();
    },
    _onConsoleMessageAdded: function (target, event) {
        var message = (event.data);
        this._consoleMessageAdded(target, message);
    },
    _showConsoleMessage: function (viewMessage) {
        var message = viewMessage.consoleMessage();
        if (!this._isScrollIntoViewScheduled() && ((viewMessage instanceof WebInspector.ConsoleCommandResult) || this.messagesElement.isScrolledToBottom()))
            this._scheduleScrollIntoView();
        this._visibleViewMessages.push(viewMessage);
        if (message.type === WebInspector.ConsoleMessage.MessageType.EndGroup) {
            var parentGroup = this.currentGroup.parentGroup;
            if (parentGroup)
                this.currentGroup = parentGroup;
        } else {
            if (message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed) {
                var group = new WebInspector.ConsoleGroup(this.currentGroup);
                this.currentGroup.messagesElement.appendChild(group.element);
                this.currentGroup = group;
                viewMessage.group = group;
            }
            this.currentGroup.addMessage(viewMessage);
        }
        if (this._searchRegex && viewMessage.matchesRegex(this._searchRegex)) {
            this._searchResults.push(viewMessage);
            this._searchableView.updateSearchMatchesCount(this._searchResults.length);
        }
    },
    _createViewMessage: function (target, message) {
        var viewMessage = this._messageToViewMessage.get(message);
        if (viewMessage)
            return viewMessage;
        if (message.type === WebInspector.ConsoleMessage.MessageType.Command)
            viewMessage = new WebInspector.ConsoleCommand(target, message);
        else
            viewMessage = new WebInspector.ConsoleViewMessage(target, message, this._linkifier);
        this._messageToViewMessage.put(message, viewMessage);
        return viewMessage;
    },
    _consoleCleared: function () {
        this._scrolledToBottom = true;
        this._clearCurrentSearchResultHighlight();
        this._updateFilterStatus(0);
        for (var i = 0; i < this._visibleViewMessages.length; ++i)
            this._visibleViewMessages[i].willHide();
        this._visibleViewMessages = [];
        this._searchResults = [];
        this._messageToViewMessage.clear();
        this._consoleMessages = [];
        if (this._searchRegex)
            this._searchableView.updateSearchMatchesCount(0);
        this.currentGroup = this.topGroup;
        this.topGroup.messagesElement.removeChildren();
        this._linkifier.reset();
    },
    _handleContextMenuEvent: function (event) {
        if (event.target.enclosingNodeOrSelfWithNodeName("a"))
            return;
        var contextMenu = new WebInspector.ContextMenu(event);

        function monitoringXHRItemAction() {
            WebInspector.settings.monitoringXHREnabled.set(!WebInspector.settings.monitoringXHREnabled.get());
        }
        contextMenu.appendCheckboxItem(WebInspector.UIString("Log XMLHttpRequests"), monitoringXHRItemAction, WebInspector.settings.monitoringXHREnabled.get());

        function preserveLogItemAction() {
            WebInspector.settings.preserveConsoleLog.set(!WebInspector.settings.preserveConsoleLog.get());
        }
        contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Preserve log upon navigation" : "Preserve Log upon Navigation"), preserveLogItemAction, WebInspector.settings.preserveConsoleLog.get());
        var sourceElement = event.target.enclosingNodeOrSelfWithClass("console-message");
        var filterSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Filter"));
        if (sourceElement && sourceElement.message.url) {
            var menuTitle = WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Hide messages from %s" : "Hide Messages from %s", new WebInspector.ParsedURL(sourceElement.message.url).displayName);
            filterSubMenu.appendItem(menuTitle, this._filter.addMessageURLFilter.bind(this._filter, sourceElement.message.url));
        }
        filterSubMenu.appendSeparator();
        var unhideAll = filterSubMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Unhide all" : "Unhide All"), this._filter.removeMessageURLFilter.bind(this._filter));
        filterSubMenu.appendSeparator();
        var hasFilters = false;
        for (var url in this._filter.messageURLFilters) {
            filterSubMenu.appendCheckboxItem(String.sprintf("%s (%d)", new WebInspector.ParsedURL(url).displayName, this._urlToMessageCount[url]), this._filter.removeMessageURLFilter.bind(this._filter, url), true);
            hasFilters = true;
        }
        filterSubMenu.setEnabled(hasFilters || (sourceElement && sourceElement.message.url));
        unhideAll.setEnabled(hasFilters);
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear console" : "Clear Console"), this._requestClearMessages.bind(this));
        var request = (sourceElement && sourceElement.message) ? sourceElement.message.request : null;
        if (request && request.type === WebInspector.resourceTypes.XHR) {
            contextMenu.appendSeparator();
            contextMenu.appendItem(WebInspector.UIString("Replay XHR"), NetworkAgent.replayXHR.bind(null, request.requestId));
        }
        contextMenu.show();
    },
    _updateMessageList: function () {
        var group = this.topGroup;
        var visibleMessageIndex = 0;
        var newVisibleMessages = [];
        if (this._searchRegex)
            this._searchResults = [];
        var anchor = null;
        for (var i = 0; i < this._consoleMessages.length; ++i) {
            var sourceMessage = this._consoleMessages[i];
            var sourceViewMessage = this._messageToViewMessage.get(sourceMessage);
            var visibleViewMessage = this._visibleViewMessages[visibleMessageIndex];
            if (visibleViewMessage === sourceViewMessage) {
                if (this._filter.shouldBeVisible(sourceViewMessage)) {
                    newVisibleMessages.push(this._visibleViewMessages[visibleMessageIndex]);
                    if (this._searchRegex && sourceViewMessage.matchesRegex(this._searchRegex))
                        this._searchResults.push(sourceViewMessage);
                    if (sourceMessage.type === WebInspector.ConsoleMessage.MessageType.EndGroup) {
                        anchor = group.element;
                        group = group.parentGroup || group;
                    } else if (sourceMessage.type === WebInspector.ConsoleMessage.MessageType.StartGroup || sourceMessage.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed) {
                        group = sourceViewMessage.group;
                        anchor = group.messagesElement.firstChild;
                    } else
                        anchor = sourceViewMessage.toMessageElement();
                } else {
                    sourceViewMessage.willHide();
                    sourceViewMessage.toMessageElement().remove();
                }
                ++visibleMessageIndex;
            } else {
                if (this._filter.shouldBeVisible(sourceViewMessage)) {
                    if (this._searchRegex && sourceViewMessage.matchesRegex(this._searchRegex))
                        this._searchResults.push(sourceViewMessage);
                    group.addMessage(sourceViewMessage, anchor ? anchor.nextSibling : group.messagesElement.firstChild);
                    newVisibleMessages.push(sourceViewMessage);
                    anchor = sourceViewMessage.toMessageElement();
                }
            }
        }
        if (this._searchRegex)
            this._searchableView.updateSearchMatchesCount(this._searchResults.length);
        this._visibleViewMessages = newVisibleMessages;
        this._updateFilterStatus();
    },
    _monitoringXHREnabledSettingChanged: function (event) {
        ConsoleAgent.setMonitoringXHREnabled(event.data);
    },
    _messagesClicked: function () {
        if (!this.prompt.isCaretInsidePrompt() && window.getSelection().isCollapsed)
            this.prompt.moveCaretToEndOfPrompt();
    },
    _registerShortcuts: function () {
        this._shortcuts = {};
        var shortcut = WebInspector.KeyboardShortcut;
        var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
        var shortcutL = shortcut.makeDescriptor("l", WebInspector.KeyboardShortcut.Modifiers.Ctrl);
        this._shortcuts[shortcutL.key] = this._requestClearMessages.bind(this);
        var keys = [shortcutL];
        if (WebInspector.isMac()) {
            var shortcutK = shortcut.makeDescriptor("k", WebInspector.KeyboardShortcut.Modifiers.Meta);
            this._shortcuts[shortcutK.key] = this._requestClearMessages.bind(this);
            keys.unshift(shortcutK);
        }
        section.addAlternateKeys(keys, WebInspector.UIString("Clear console"));
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tab), WebInspector.UIString("Autocomplete common prefix"));
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Right), WebInspector.UIString("Accept suggestion"));
        keys = [shortcut.makeDescriptor(shortcut.Keys.Down), shortcut.makeDescriptor(shortcut.Keys.Up)];
        section.addRelatedKeys(keys, WebInspector.UIString("Next/previous line"));
        if (WebInspector.isMac()) {
            keys = [shortcut.makeDescriptor("N", shortcut.Modifiers.Alt), shortcut.makeDescriptor("P", shortcut.Modifiers.Alt)];
            section.addRelatedKeys(keys, WebInspector.UIString("Next/previous command"));
        }
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Enter), WebInspector.UIString("Execute command"));
    },
    _requestClearMessages: function () {
        WebInspector.console.requestClearMessages();
    },
    _promptKeyDown: function (event) {
        if (isEnterKey(event)) {
            this._enterKeyPressed(event);
            return;
        }
        var shortcut = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcut];
        if (handler) {
            handler();
            event.preventDefault();
        }
    },
    _enterKeyPressed: function (event) {
        if (event.altKey || event.ctrlKey || event.shiftKey)
            return;
        event.consume(true);
        this.prompt.clearAutoComplete(true);
        var str = this.prompt.text;
        if (!str.length)
            return;
        this._appendCommand(str, true);
    },
    _printResult: function (result, wasThrown, originatingCommand) {
        if (!result)
            return;
        var target = result.target();

        function addMessage(url, lineNumber, columnNumber) {
            var resultMessage = new WebInspector.ConsoleCommandResult((result), wasThrown, originatingCommand, this._linkifier, url, lineNumber, columnNumber);
            this._messageToViewMessage.put(resultMessage.consoleMessage(), resultMessage);
            target.consoleModel.addMessage(resultMessage.consoleMessage());
        }
        if (result.type !== "function") {
            addMessage.call(this);
            return;
        }
        target.debuggerAgent().getFunctionDetails(result.objectId, didGetDetails.bind(this));

        function didGetDetails(error, response) {
            if (error) {
                console.error(error);
                addMessage.call(this);
                return;
            }
            var url;
            var lineNumber;
            var columnNumber;
            var script = WebInspector.debuggerModel.scriptForId(response.location.scriptId);
            if (script && script.sourceURL) {
                url = script.sourceURL;
                lineNumber = response.location.lineNumber + 1;
                columnNumber = response.location.columnNumber + 1;
            }
            addMessage.call(this, url, lineNumber, columnNumber);
        }
    },
    _appendCommand: function (text, useCommandLineAPI) {
        this.prompt.text = "";
        this._currentTarget().consoleModel.evaluateCommand(text, useCommandLineAPI);
    },
    _commandEvaluated: function (event) {
        var data = (event.data);
        this.prompt.pushHistoryItem(data.text);
        WebInspector.settings.consoleHistory.set(this.prompt.historyData.slice(-30));
        this._printResult(data.result, data.wasThrown, (this._messageToViewMessage.get(data.commandMessage)));
    },
    elementsToRestoreScrollPositionsFor: function () {
        return [this.messagesElement];
    },
    searchCanceled: function () {
        this._clearCurrentSearchResultHighlight();
        delete this._searchResults;
        delete this._searchRegex;
    },
    performSearch: function (query, shouldJump) {
        this.searchCanceled();
        this._searchableView.updateSearchMatchesCount(0);
        this._searchRegex = createPlainTextSearchRegex(query, "gi");
        this._searchResults = [];
        for (var i = 0; i < this._visibleViewMessages.length; i++) {
            if (this._visibleViewMessages[i].matchesRegex(this._searchRegex))
                this._searchResults.push(this._visibleViewMessages[i]);
        }
        this._searchableView.updateSearchMatchesCount(this._searchResults.length);
        this._currentSearchResultIndex = -1;
        if (shouldJump && this._searchResults.length)
            this._jumpToSearchResult(0);
    },
    jumpToNextSearchResult: function () {
        if (!this._searchResults || !this._searchResults.length)
            return;
        this._jumpToSearchResult((this._currentSearchResultIndex + 1) % this._searchResults.length);
    },
    jumpToPreviousSearchResult: function () {
        if (!this._searchResults || !this._searchResults.length)
            return;
        var index = this._currentSearchResultIndex - 1;
        if (index === -1)
            index = this._searchResults.length - 1;
        this._jumpToSearchResult(index);
    },
    _clearCurrentSearchResultHighlight: function () {
        if (!this._searchResults)
            return;
        var highlightedViewMessage = this._searchResults[this._currentSearchResultIndex];
        if (highlightedViewMessage)
            highlightedViewMessage.clearHighlight();
        this._currentSearchResultIndex = -1;
    },
    _jumpToSearchResult: function (index) {
        this._clearCurrentSearchResultHighlight();
        this._currentSearchResultIndex = index;
        this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);
        this._searchResults[index].highlightSearchResults(this._searchRegex);
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.ConsoleViewFilter = function (view) {
    this._view = view;
    this._messageURLFilters = WebInspector.settings.messageURLFilters.get();
    this._filterChanged = this.dispatchEventToListeners.bind(this, WebInspector.ConsoleViewFilter.Events.FilterChanged);
};
WebInspector.ConsoleViewFilter.Events = {
    FilterChanged: "FilterChanged"
};
WebInspector.ConsoleViewFilter.prototype = {
    addFilters: function (filterBar) {
        this._textFilterUI = new WebInspector.TextFilterUI(true);
        this._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._textFilterChanged, this);
        filterBar.addFilter(this._textFilterUI);
        var levels = [{
            name: "error",
            label: WebInspector.UIString("Errors")
        }, {
            name: "warning",
            label: WebInspector.UIString("Warnings")
        }, {
            name: "info",
            label: WebInspector.UIString("Info")
        }, {
            name: "log",
            label: WebInspector.UIString("Logs")
        }, {
            name: "debug",
            label: WebInspector.UIString("Debug")
        }];
        this._levelFilterUI = new WebInspector.NamedBitSetFilterUI(levels, WebInspector.settings.messageLevelFilters);
        this._levelFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged, this);
        filterBar.addFilter(this._levelFilterUI);
    },
    _textFilterChanged: function (event) {
        this._filterRegex = this._textFilterUI.regex();
        this._filterChanged();
    },
    addMessageURLFilter: function (url) {
        this._messageURLFilters[url] = true;
        WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
        this._filterChanged();
    },
    removeMessageURLFilter: function (url) {
        if (!url)
            this._messageURLFilters = {};
        else
            delete this._messageURLFilters[url];
        WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
        this._filterChanged();
    },
    get messageURLFilters() {
        return this._messageURLFilters;
    },
    shouldBeVisible: function (viewMessage) {
        if (!viewMessage)
            return false;
        var message = viewMessage.consoleMessage();
        if ((message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed || message.type === WebInspector.ConsoleMessage.MessageType.EndGroup))
            return true;
        if (message.type === WebInspector.ConsoleMessage.MessageType.Result || message.type === WebInspector.ConsoleMessage.MessageType.Command)
            return true;
        if (message.url && this._messageURLFilters[message.url])
            return false;
        if (message.level && !this._levelFilterUI.accept(message.level))
            return false;
        if (this._filterRegex) {
            this._filterRegex.lastIndex = 0;
            if (!viewMessage.matchesRegex(this._filterRegex))
                return false;
        }
        return true;
    },
    reset: function () {
        this._messageURLFilters = {};
        WebInspector.settings.messageURLFilters.set(this._messageURLFilters);
        WebInspector.settings.messageLevelFilters.set({});
        this._filterChanged();
    },
    __proto__: WebInspector.Object.prototype
};
WebInspector.ConsoleCommand = function (target, message) {
    WebInspector.ConsoleViewMessage.call(this, target, message, null);
}
WebInspector.ConsoleCommand.prototype = {
    wasShown: function () {},
    willHide: function () {},
    clearHighlight: function () {
        var highlightedMessage = this._formattedCommand;
        delete this._formattedCommand;
        this._formatCommand();
        this._element.replaceChild(this._formattedCommand, highlightedMessage);
    },
    highlightSearchResults: function (regexObject) {
        regexObject.lastIndex = 0;
        var match = regexObject.exec(this.text);
        var matchRanges = [];
        while (match) {
            matchRanges.push(new WebInspector.SourceRange(match.index, match[0].length));
            match = regexObject.exec(this.text);
        }
        WebInspector.highlightSearchResults(this._formattedCommand, matchRanges);
        this._element.scrollIntoViewIfNeeded();
    },
    matchesRegex: function (regexObject) {
        regexObject.lastIndex = 0;
        return regexObject.test(this.text);
    },
    toMessageElement: function () {
        if (!this._element) {
            this._element = document.createElement("div");
            this._element.command = this;
            this._element.className = "console-user-command";
            this._formatCommand();
            this._element.appendChild(this._formattedCommand);
        }
        return this._element;
    },
    _formatCommand: function () {
        this._formattedCommand = document.createElement("span");
        this._formattedCommand.className = "console-message-text source-code";
        this._formattedCommand.textContent = this.text;
    },
    __proto__: WebInspector.ConsoleViewMessage.prototype
}
WebInspector.ConsoleCommandResult = function (result, wasThrown, originatingCommand, linkifier, url, lineNumber, columnNumber) {
    this.originatingCommand = originatingCommand;
    var level = wasThrown ? WebInspector.ConsoleMessage.MessageLevel.Error : WebInspector.ConsoleMessage.MessageLevel.Log;
    var message = new WebInspector.ConsoleMessage(WebInspector.ConsoleMessage.MessageSource.JS, level, "", WebInspector.ConsoleMessage.MessageType.Result, url, lineNumber, columnNumber, undefined, [result]);
    WebInspector.ConsoleViewMessage.call(this, result.target(), message, linkifier);
}
WebInspector.ConsoleCommandResult.prototype = {
    useArrayPreviewInFormatter: function (array) {
        return false;
    },
    toMessageElement: function () {
        var element = WebInspector.ConsoleViewMessage.prototype.toMessageElement.call(this);
        element.classList.add("console-user-command-result");
        return element;
    },
    __proto__: WebInspector.ConsoleViewMessage.prototype
}
WebInspector.ConsoleGroup = function (parentGroup) {
    this.parentGroup = parentGroup;
    var element = document.createElement("div");
    element.className = "console-group";
    element.group = this;
    this.element = element;
    if (parentGroup) {
        var bracketElement = document.createElement("div");
        bracketElement.className = "console-group-bracket";
        element.appendChild(bracketElement);
    }
    var messagesElement = document.createElement("div");
    messagesElement.className = "console-group-messages";
    element.appendChild(messagesElement);
    this.messagesElement = messagesElement;
}
WebInspector.ConsoleGroup.prototype = {
    addMessage: function (viewMessage, node) {
        var message = viewMessage.consoleMessage();
        var element = viewMessage.toMessageElement();
        if (message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed) {
            this.messagesElement.parentNode.insertBefore(element, this.messagesElement);
            element.addEventListener("click", this._titleClicked.bind(this), false);
            var groupElement = element.enclosingNodeOrSelfWithClass("console-group");
            if (groupElement && message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
                groupElement.classList.add("collapsed");
        } else {
            this.messagesElement.insertBefore(element, node || null);
            viewMessage.wasShown();
        }
        if (element.previousSibling && viewMessage.originatingCommand && element.previousSibling.command === viewMessage.originatingCommand)
            element.previousSibling.classList.add("console-adjacent-user-command-result");
    },
    _titleClicked: function (event) {
        var groupTitleElement = event.target.enclosingNodeOrSelfWithClass("console-group-title");
        if (groupTitleElement) {
            var groupElement = groupTitleElement.enclosingNodeOrSelfWithClass("console-group");
            if (groupElement && !groupElement.classList.toggle("collapsed")) {
                if (groupElement.group) {
                    groupElement.group.wasShown();
                }
            }
            groupTitleElement.scrollIntoViewIfNeeded(true);
        }
        event.consume(true);
    },
    wasShown: function () {
        if (this.element.classList.contains("collapsed"))
            return;
        var node = this.messagesElement.firstChild;
        while (node) {
            if (node.classList.contains("console-message") && node.message)
                node.message.wasShown();
            if (node.classList.contains("console-group") && node.group)
                node.group.wasShown();
            node = node.nextSibling;
        }
    }
}
WebInspector.ConsoleView.ShowConsoleActionDelegate = function () {}
WebInspector.ConsoleView.ShowConsoleActionDelegate.prototype = {
    handleAction: function () {
        WebInspector.console.show();
        return true;
    }
};
WebInspector.ConsolePanel = function () {
    WebInspector.Panel.call(this, "console");
    this._view = WebInspector.ConsolePanel._view();
}
WebInspector.ConsolePanel._view = function () {
    if (!WebInspector.ConsolePanel._consoleView)
        WebInspector.ConsolePanel._consoleView = new WebInspector.ConsoleView(!Capabilities.isMainFrontend);
    return WebInspector.ConsolePanel._consoleView;
}
WebInspector.ConsolePanel.prototype = {
    defaultFocusedElement: function () {
        return this._view.defaultFocusedElement();
    },
    wasShown: function () {
        WebInspector.Panel.prototype.wasShown.call(this);
        this._view.show(this.element);
    },
    willHide: function () {
        WebInspector.Panel.prototype.willHide.call(this);
        if (WebInspector.ConsolePanel.WrapperView._instance)
            WebInspector.ConsolePanel.WrapperView._instance._showViewInWrapper();
    },
    __proto__: WebInspector.Panel.prototype
}
WebInspector.ConsolePanel.WrapperView = function () {
    WebInspector.VBox.call(this);
    this.element.classList.add("console-view-wrapper");
    WebInspector.ConsolePanel.WrapperView._instance = this;
    this._view = WebInspector.ConsolePanel._view();
    this.wasShown();
}
WebInspector.ConsolePanel.WrapperView.prototype = {
    wasShown: function () {
        if (!WebInspector.inspectorView.currentPanel() || WebInspector.inspectorView.currentPanel().name !== "console")
            this._showViewInWrapper();
    },
    defaultFocusedElement: function () {
        return this._view.defaultFocusedElement();
    },
    focus: function () {
        this._view.focus();
    },
    _showViewInWrapper: function () {
        this._view.show(this.element);
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.ConsolePanel.ConsoleRevealer = function () {}
WebInspector.ConsolePanel.ConsoleRevealer.prototype = {
    reveal: function (object) {
        if (!(object instanceof WebInspector.ConsoleModel))
            return;
        var consoleView = WebInspector.ConsolePanel._view();
        if (consoleView.isShowing()) {
            consoleView.focus();
            return;
        }
        WebInspector.inspectorView.showViewInDrawer("console");
    }
}
