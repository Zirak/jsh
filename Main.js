var allDescriptors = [
{
    name: "codemirror",
    extensions: [{
        type: "@WebInspector.InplaceEditor",
        className: "WebInspector.CodeMirrorUtils"
    }, {
        type: "@WebInspector.TokenizerFactory",
        className: "WebInspector.CodeMirrorUtils.TokenizerFactory"
    }, ],
    scripts: ["CodeMirrorTextEditor.js"]
}, {
    name: "console",
    extensions: [{
        type: "@WebInspector.Panel",
        name: "console",
        title: "Console",
        order: 20,
        className: "WebInspector.ConsolePanel"
    }, {
        type: "drawer-view",
        name: "console",
        title: "Console",
        order: "0",
        className: "WebInspector.ConsolePanel.WrapperView"
    }, {
        type: "@WebInspector.Revealer",
        contextTypes: ["WebInspector.ConsoleModel"],
        className: "WebInspector.ConsolePanel.ConsoleRevealer"
    }, {
        type: "@WebInspector.ActionDelegate",
        bindings: [{
            shortcut: "Ctrl+`"
        }],
        className: "WebInspector.ConsoleView.ShowConsoleActionDelegate"
    }],
    scripts: ["ConsolePanel.js"]
}, {
    name: "settings",
    extensions: [{
        type: "@WebInspector.ActionDelegate",
        bindings: [{
            shortcut: "F1 Shift+?"
        }],
        className: "WebInspector.SettingsController.SettingsScreenActionDelegate"
    }]
}, {
    name: "extensions",
    extensions: [{
        type: "@WebInspector.ExtensionServerAPI",
        className: "WebInspector.ExtensionServer"
    }],
    scripts: ["ExtensionServer.js"]
}, {
    name: "handler-registry",
    extensions: [{
        type: "@WebInspector.ContextMenu.Provider",
        contextTypes: ["WebInspector.UISourceCode", "WebInspector.Resource", "WebInspector.NetworkRequest", "Node"],
        className: "WebInspector.HandlerRegistry.ContextMenuProvider"
    }]
}];
window.WebInspector = {
    _queryParamsObject: {}
}
WebInspector.Events = {
    InspectorLoaded: "InspectorLoaded"
}
WebInspector.queryParam = function (name) {
    return WebInspector._queryParamsObject.hasOwnProperty(name) ? WebInspector._queryParamsObject[name] : null;
}
{
    (function parseQueryParameters() {
        var queryParams = window.location.search;
        if (!queryParams)
            return;
        var params = queryParams.substring(1).split("&");
        for (var i = 0; i < params.length; ++i) {
            var pair = params[i].split("=");
            WebInspector._queryParamsObject[pair[0]] = pair[1];
        }
        var settingsParam = WebInspector.queryParam("settings");
        if (settingsParam) {
            try {
                var settings = JSON.parse(window.decodeURI(settingsParam));
                for (var key in settings)
                    window.localStorage[key] = settings[key];
            } catch (e) {}
        }
    })();
}
WebInspector.Main = function () {
    var boundListener = windowLoaded.bind(this);

    function windowLoaded() {
        this._loaded();
        window.removeEventListener("DOMContentLoaded", boundListener, false);
    }
    window.addEventListener("DOMContentLoaded", boundListener, false);
}
WebInspector.Main.prototype = {
    _registerModules: function () {
        var configuration;
        if (!Capabilities.isMainFrontend) {
            configuration = [/*"main", "sources", "timeline", "profiles",*/ "console", "codemirror"];
        } else {
            configuration = [/*"main", "elements", "network", "sources", "timeline", "profiles", "resources", "audits",*/ "console", "codemirror", "extensions", "settings"];
            if (WebInspector.experimentsSettings.layersPanel.isEnabled())
                configuration.push("layers");
        }
        WebInspector.moduleManager.registerModules(configuration);
    },
    _createGlobalStatusBarItems: function () {
        if (WebInspector.inspectElementModeController)
            WebInspector.inspectorView.appendToLeftToolbar(WebInspector.inspectElementModeController.toggleSearchButton.element);
        WebInspector.inspectorView.appendToRightToolbar(WebInspector.settingsController.statusBarItem);
        if (WebInspector.dockController.element)
            WebInspector.inspectorView.appendToRightToolbar(WebInspector.dockController.element);
        if (this._screencastController)
            WebInspector.inspectorView.appendToRightToolbar(this._screencastController.statusBarItem());
    },
    _createRootView: function () {
        var rootView = new WebInspector.RootView();
        this._rootSplitView = new WebInspector.SplitView(false, true, WebInspector.dockController.canDock() ? "InspectorView.splitViewState" : "InspectorView.dummySplitViewState", 300, 300);
        this._rootSplitView.show(rootView.element);
        WebInspector.inspectorView.show(this._rootSplitView.sidebarElement());
        WebInspector.dockController.addEventListener(WebInspector.DockController.Events.DockSideChanged, this._updateRootSplitViewOnDockSideChange, this);
        this._updateRootSplitViewOnDockSideChange();
        rootView.attachToBody();
    },
    _updateRootSplitViewOnDockSideChange: function () {
        var dockSide = WebInspector.dockController.dockSide();
        if (dockSide === WebInspector.DockController.State.Undocked) {
            this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), false);
            this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), false);
            this._rootSplitView.hideMain();
            return;
        }
        this._rootSplitView.setVertical(dockSide === WebInspector.DockController.State.DockedToLeft || dockSide === WebInspector.DockController.State.DockedToRight);
        this._rootSplitView.setSecondIsSidebar(dockSide === WebInspector.DockController.State.DockedToRight || dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), true);
        this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), dockSide === WebInspector.DockController.State.DockedToBottom);
        this._rootSplitView.showBoth();
    },
    _calculateWorkerInspectorTitle: function () {
    },
    _loadCompletedForWorkers: function () {
        if (WebInspector.queryParam("workerPaused")) {
            DebuggerAgent.pause();
            RuntimeAgent.run(calculateTitle.bind(this));
        } else if (!Capabilities.isMainFrontend) {
            calculateTitle.call(this);
        }

        function calculateTitle() {
            this._calculateWorkerInspectorTitle();
        }
    },
    _resetErrorAndWarningCounts: function () {
        WebInspector.inspectorView.setErrorAndWarningCounts(0, 0);
    },
    _updateErrorAndWarningCounts: function () {
        var errors = WebInspector.console.errors;
        var warnings = WebInspector.console.warnings;
        WebInspector.inspectorView.setErrorAndWarningCounts(errors, warnings);
    },
    _debuggerPaused: function () {
        WebInspector.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
        WebInspector.inspectorView.showPanel("sources");
    },
    _loaded: function () {
        if (!InspectorFrontendHost.sendMessageToEmbedder) {
            var helpScreen = new WebInspector.HelpScreen(WebInspector.UIString("Incompatible Chrome version"));
            var p = helpScreen.contentElement.createChild("p", "help-section");
            p.textContent = WebInspector.UIString("Please upgrade to a newer Chrome version (you might need a Dev or Canary build).");
            helpScreen.showModal();
            return;
        }
        InspectorBackend.loadFromJSONIfNeeded("../protocol.json");
        WebInspector.dockController = new WebInspector.DockController(!!WebInspector.queryParam("can_dock"));
        var onConnectionReady = this._doLoadedDone.bind(this);
        var workerId = WebInspector.queryParam("dedicatedWorkerId");
        if (workerId) {
            new WebInspector.ExternalWorkerConnection(workerId, onConnectionReady);
            return;
        }
        var ws;
        if (WebInspector.queryParam("ws")) {
            ws = "ws://" + WebInspector.queryParam("ws");
        } else if (WebInspector.queryParam("page")) {
            var page = WebInspector.queryParam("page");
            var host = WebInspector.queryParam("host") || window.location.host;
            ws = "ws://" + host + "/devtools/page/" + page;
        }
        if (ws) {
            document.body.classList.add("remote");
            new InspectorBackendClass.WebSocketConnection(ws, onConnectionReady);
            return;
        }
        if (!InspectorFrontendHost.isStub) {
            new InspectorBackendClass.MainConnection(onConnectionReady);
            return;
        }
        InspectorFrontendAPI.dispatchQueryParameters(WebInspector.queryParam("dispatch"));
        new InspectorBackendClass.StubConnection(onConnectionReady);
    },
    _doLoadedDone: function (connection) {
        connection.addEventListener(InspectorBackendClass.Connection.Events.Disconnected, onDisconnected);

        function onDisconnected(event) {
            if (WebInspector._disconnectedScreenWithReasonWasShown)
                return;
            new WebInspector.RemoteDebuggingTerminatedScreen(event.data.reason).showModal();
        }
        InspectorBackend.setConnection(connection);
        WebInspector.installPortStyles();
        if (WebInspector.queryParam("toolbarColor") && WebInspector.queryParam("textColor"))
            WebInspector.setToolbarColors(WebInspector.queryParam("toolbarColor"), WebInspector.queryParam("textColor"));
        WebInspector.targetManager = new WebInspector.TargetManager();
        WebInspector.targetManager.createTarget(connection, this._doLoadedDoneWithCapabilities.bind(this));
    },
    _doLoadedDoneWithCapabilities: function (mainTarget) {
        new WebInspector.VersionController().updateVersion();
        WebInspector.shortcutsScreen = new WebInspector.ShortcutsScreen();
        this._registerShortcuts();
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));
        WebInspector.ShortcutsScreen.registerShortcuts();
        if (WebInspector.experimentsSettings.workersInMainWindow.isEnabled())
            new WebInspector.WorkerTargetManager(mainTarget, WebInspector.targetManager);
        WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._resetErrorAndWarningCounts, this);
        WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._updateErrorAndWarningCounts, this);
        WebInspector.isolatedFileSystemManager = new WebInspector.IsolatedFileSystemManager();
        WebInspector.isolatedFileSystemDispatcher = new WebInspector.IsolatedFileSystemDispatcher(WebInspector.isolatedFileSystemManager);
        if (Capabilities.isMainFrontend) {
            WebInspector.inspectElementModeController = new WebInspector.InspectElementModeController();
            WebInspector.workerFrontendManager = new WebInspector.WorkerFrontendManager();
        } else {
        }

        function onWorkerDisconnected() {
            var screen = new WebInspector.WorkerTerminatedScreen();
            var listener = hideScreen.bind(null, screen);
            mainTarget.debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, listener);

            function hideScreen(screen) {
                mainTarget.debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, listener);
                screen.hide();
            }
            screen.showModal();
        }
        WebInspector.settingsController = new WebInspector.SettingsController();
        var autoselectPanel = WebInspector.UIString("a panel chosen automatically");
        var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
        WebInspector.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
        WebInspector.openAnchorLocationRegistry.registerHandler(autoselectPanel, function () {
            return false;
        });
        WebInspector.Linkifier.setLinkHandler(new WebInspector.HandlerRegistry.LinkHandler());
        WebInspector.fileSystemWorkspaceProvider = new WebInspector.FileSystemWorkspaceProvider(WebInspector.isolatedFileSystemManager, WebInspector.workspace);
        WebInspector.networkWorkspaceProvider = new WebInspector.SimpleWorkspaceProvider(WebInspector.workspace, WebInspector.projectTypes.Network);
        new WebInspector.PresentationConsoleMessageHelper(WebInspector.workspace);
        WebInspector.settings.initializeBackendSettings();
        this._registerModules();
        WebInspector.KeyboardShortcut.registerActions();
        WebInspector.panels = {};
        WebInspector.inspectorView = new WebInspector.InspectorView();
        if (mainTarget.canScreencast)
            this._screencastController = new WebInspector.ScreencastController();
        else
            this._createRootView();
        this._createGlobalStatusBarItems();
        this._addMainEventListeners(document);

        function onResize() {
            if (WebInspector.settingsController)
                WebInspector.settingsController.resize();
        }
        window.addEventListener("resize", onResize, true);
        var errorWarningCount = document.getElementById("error-warning-count");

        function showConsole() {
            WebInspector.console.show();
        }
        errorWarningCount.addEventListener("click", showConsole, false);
        this._updateErrorAndWarningCounts();
        WebInspector.extensionServerProxy.setFrontendReady();

        function inspectorAgentEnableCallback() {
            WebInspector.inspectorView.showInitialPanel();
            if (WebInspector.overridesSupport.hasActiveOverrides())
                WebInspector.inspectorView.showViewInDrawer("emulation", true);
            WebInspector.settings.showMetricsRulers.addChangeListener(showRulersChanged);

            function showRulersChanged() {
                PageAgent.setShowViewportSizeOnResize(true, WebInspector.settings.showMetricsRulers.get());
            }
            showRulersChanged();
            if (this._screencastController)
                this._screencastController.initialize();
        }
        this._loadCompletedForWorkers();
        InspectorFrontendAPI.loadCompleted();
        WebInspector.notifications.dispatchEventToListeners(WebInspector.NotificationService.Events.InspectorLoaded);
    },
    _documentClick: function (event) {
        var anchor = event.target.enclosingNodeOrSelfWithNodeName("a");
        if (!anchor || !anchor.href || (anchor.target === "_blank"))
            return;
        event.consume(true);

        function followLink() {
            if (WebInspector.isBeingEdited(event.target))
                return;
            if (WebInspector.openAnchorLocationRegistry.dispatch({
                url: anchor.href,
                lineNumber: anchor.lineNumber
            }))
                return;
            var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(anchor.href);
            if (uiSourceCode) {
                WebInspector.Revealer.reveal(new WebInspector.UILocation(uiSourceCode, anchor.lineNumber || 0, anchor.columnNumber || 0));
                return;
            }
            var resource = WebInspector.resourceForURL(anchor.href);
            if (resource) {
                WebInspector.Revealer.reveal(resource);
                return;
            }
            var request = WebInspector.networkLog.requestForURL(anchor.href);
            if (request) {
                WebInspector.Revealer.reveal(request);
                return;
            }
            InspectorFrontendHost.openInNewTab(anchor.href);
        }
        if (WebInspector.followLinkTimeout)
            clearTimeout(WebInspector.followLinkTimeout);
        if (anchor.preventFollowOnDoubleClick) {
            if (event.detail === 1)
                WebInspector.followLinkTimeout = setTimeout(followLink, 333);
            return;
        }
        followLink();
    },
    _registerShortcuts: function () {
        var shortcut = WebInspector.KeyboardShortcut;
        var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("All Panels"));
        var keys = [shortcut.makeDescriptor("[", shortcut.Modifiers.CtrlOrMeta), shortcut.makeDescriptor("]", shortcut.Modifiers.CtrlOrMeta)];
        section.addRelatedKeys(keys, WebInspector.UIString("Go to the panel to the left/right"));
        keys = [shortcut.makeDescriptor("[", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Alt), shortcut.makeDescriptor("]", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Alt)];
        section.addRelatedKeys(keys, WebInspector.UIString("Go back/forward in panel history"));
        var toggleConsoleLabel = WebInspector.UIString("Show console");
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tilde, shortcut.Modifiers.Ctrl), toggleConsoleLabel);
        var doNotOpenDrawerOnEsc = WebInspector.experimentsSettings.doNotOpenDrawerOnEsc.isEnabled();
        var toggleDrawerLabel = doNotOpenDrawerOnEsc ? WebInspector.UIString("Hide drawer") : WebInspector.UIString("Toggle drawer");
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Esc), toggleDrawerLabel);
        section.addKey(shortcut.makeDescriptor("f", shortcut.Modifiers.CtrlOrMeta), WebInspector.UIString("Search"));
        var inspectElementModeShortcut = WebInspector.InspectElementModeController.createShortcut();
        section.addKey(inspectElementModeShortcut, WebInspector.UIString("Select node to inspect"));
        var openResourceShortcut = WebInspector.KeyboardShortcut.makeDescriptor("o", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta);
        section.addKey(openResourceShortcut, WebInspector.UIString("Go to source"));
        if (WebInspector.isMac()) {
            keys = [shortcut.makeDescriptor("g", shortcut.Modifiers.Meta), shortcut.makeDescriptor("g", shortcut.Modifiers.Meta | shortcut.Modifiers.Shift)];
            section.addRelatedKeys(keys, WebInspector.UIString("Find next/previous"));
        }
    },
    _handleZoomEvent: function (event) {
        switch (event.keyCode) {
        case 107:
        case 187:
            InspectorFrontendHost.zoomIn();
            return true;
        case 109:
        case 189:
            InspectorFrontendHost.zoomOut();
            return true;
        case 48:
        case 96:
            if (!event.shiftKey) {
                InspectorFrontendHost.resetZoom();
                return true;
            }
            break;
        }
        return false;
    },
    _postDocumentKeyDown: function (event) {
        if (event.handled)
            return;
        if (!WebInspector.Dialog.currentInstance() && WebInspector.inspectorView.currentPanel()) {
            WebInspector.inspectorView.currentPanel().handleShortcut(event);
            if (event.handled) {
                event.consume(true);
                return;
            }
        }
        if (!WebInspector.Dialog.currentInstance() && WebInspector.inspectElementModeController && WebInspector.inspectElementModeController.handleShortcut(event))
            return;
        var isValidZoomShortcut = WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.altKey && !InspectorFrontendHost.isStub;
        if (!WebInspector.Dialog.currentInstance() && isValidZoomShortcut && this._handleZoomEvent(event)) {
            event.consume(true);
            return;
        }
        WebInspector.KeyboardShortcut.handleShortcut(event);
    },
    _documentCanCopy: function (event) {
        if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel()["handleCopyEvent"])
            event.preventDefault();
    },
    _documentCopy: function (event) {
        if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel()["handleCopyEvent"])
            WebInspector.inspectorView.currentPanel()["handleCopyEvent"](event);
    },
    _contextMenuEventFired: function (event) {
        if (event.handled || event.target.classList.contains("popup-glasspane"))
            event.preventDefault();
    },
    _inspectNodeRequested: function (event) {
        this._updateFocusedNode(event.data);
    },
    _updateFocusedNode: function (nodeId) {
        var node = WebInspector.domModel.nodeForId(nodeId);
        console.assert(node);
        WebInspector.Revealer.reveal(node);
    },
    _addMainEventListeners: function (doc) {
        doc.addEventListener("keydown", this._postDocumentKeyDown.bind(this), false);
        doc.addEventListener("beforecopy", this._documentCanCopy.bind(this), true);
        doc.addEventListener("copy", this._documentCopy.bind(this), false);
        doc.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
        doc.addEventListener("click", this._documentClick.bind(this), false);
    },
    inspect: function (payload, hints) {
        var object = WebInspector.RemoteObject.fromPayload(payload);
        if (object.subtype === "node") {
            object.pushNodeToFrontend(callback);
            var elementsPanel = (WebInspector.inspectorView.panel("elements"));
            elementsPanel.omitDefaultSelection();
            WebInspector.inspectorView.setCurrentPanel(elementsPanel);
            return;
        }

        function callback(nodeId) {
            elementsPanel.stopOmittingDefaultSelection();
            WebInspector.Revealer.reveal(WebInspector.domModel.nodeForId(nodeId));
            if (!WebInspector.inspectorView.drawerVisible() && !WebInspector._notFirstInspectElement)
                InspectorFrontendHost.inspectElementCompleted();
            WebInspector._notFirstInspectElement = true;
            object.release();
        }
        if (object.type === "function") {
            DebuggerAgent.getFunctionDetails(object.objectId, didGetDetails);
            return;
        }

        function didGetDetails(error, response) {
            object.release();
            if (error) {
                console.error(error);
                return;
            }
            var uiLocation = WebInspector.debuggerModel.rawLocationToUILocation(response.location);
            if (!uiLocation)
                return;
            (WebInspector.inspectorView.panel("sources")).showUILocation(uiLocation, true);
        }
        if (hints.copyToClipboard)
            InspectorFrontendHost.copyText(object.value);
        object.release();
    },
    detached: function (reason) {
        WebInspector._disconnectedScreenWithReasonWasShown = true;
        new WebInspector.RemoteDebuggingTerminatedScreen(reason).showModal();
    },
    targetCrashed: function () {
        (new WebInspector.HelpScreenUntilReload(WebInspector.UIString("Inspected target crashed"), WebInspector.UIString("Inspected target has crashed. Once it reloads we will attach to it automatically."))).showModal();
    },
    evaluateForTestInFrontend: function (callId, script) {
        WebInspector.evaluateForTestInFrontend(callId, script);
    }
}
WebInspector.reload = function () {
    InspectorAgent.reset();
    window.location.reload();
}
new WebInspector.Main();
window.DEBUG = true;
WebInspector.__defineGetter__("inspectedPageURL", function () {
    return WebInspector.resourceTreeModel.inspectedPageURL();
});
WebInspector.panel = function (name) {
    return WebInspector.inspectorView.panel(name);
}
WebInspector.ModuleManager = function (descriptors) {
    this._modules = [];
    this._modulesMap = {};
    this._extensions = [];
    this._cachedTypeClasses = {};
    this._descriptorsMap = {};
    for (var i = 0; i < descriptors.length; ++i)
        this._descriptorsMap[descriptors[i]["name"]] = descriptors[i];
}
WebInspector.ModuleManager.prototype = {
    registerModules: function (configuration) {
        for (var i = 0; i < configuration.length; ++i)
            this.registerModule(configuration[i]);
    },
    registerModule: function (moduleName) {
        if (!this._descriptorsMap[moduleName])
            throw new Error("Module is not defined: " + moduleName + " " + new Error().stack);
        var module = new WebInspector.ModuleManager.Module(this, this._descriptorsMap[moduleName]);
        this._modules.push(module);
        this._modulesMap[moduleName] = module;
    },
    loadModule: function (moduleName) {
        this._modulesMap[moduleName]._load();
    },
    extensions: function (type, context) {
        function filter(extension) {
            if (extension._type !== type && extension._typeClass() !== type)
                return false;
            return !context || extension.isApplicable(context);
        }
        return this._extensions.filter(filter);
    },
    extension: function (type, context) {
        return this.extensions(type, context)[0] || null;
    },
    instances: function (type, context) {
        function instantiate(extension) {
            return extension.instance();
        }
        return this.extensions(type, context).filter(instantiate).map(instantiate);
    },
    instance: function (type, context) {
        var extension = this.extension(type, context);
        return extension ? extension.instance() : null;
    },
    orderComparator: function (type, nameProperty, orderProperty) {
        var extensions = this.extensions(type);
        var orderForName = {};
        for (var i = 0; i < extensions.length; ++i) {
            var descriptor = extensions[i].descriptor();
            orderForName[descriptor[nameProperty]] = descriptor[orderProperty];
        }

        function result(name1, name2) {
            if (name1 in orderForName && name2 in orderForName)
                return orderForName[name1] - orderForName[name2];
            if (name1 in orderForName)
                return -1;
            if (name2 in orderForName)
                return 1;
            return name1.compareTo(name2);
        }
        return result;
    },
    resolve: function (typeName) {
        if (!this._cachedTypeClasses[typeName]) {
            try {
                this._cachedTypeClasses[typeName] = (window.eval(typeName.substring(1)));
            } catch (e) {}
        }
        return this._cachedTypeClasses[typeName];
    }
}
WebInspector.ModuleManager.ModuleDescriptor = function () {
    this.name;
    this.extensions;
    this.scripts;
}
WebInspector.ModuleManager.ExtensionDescriptor = function () {
    this.type;
    this.className;
    this.contextTypes;
}
WebInspector.ModuleManager.Module = function (manager, descriptor) {
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    var extensions = (descriptor.extensions);
    for (var i = 0; extensions && i < extensions.length; ++i)
        this._manager._extensions.push(new WebInspector.ModuleManager.Extension(this, extensions[i]));
    this._loaded = false;
}
WebInspector.ModuleManager.Module.prototype = {
    name: function () {
        return this._name;
    },
    _load: function () {
        if (this._loaded)
            return;
        if (this._isLoading) {
            var oldStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 50;
            console.assert(false, "Module " + this._name + " is loaded from itself: " + new Error().stack);
            Error.stackTraceLimit = oldStackTraceLimit;
            return;
        }
        this._isLoading = true;
        var scripts = this._descriptor.scripts;
        for (var i = 0; scripts && i < scripts.length; ++i)
            loadScript(scripts[i]);
        this._isLoading = false;
        this._loaded = true;
    }
}
WebInspector.ModuleManager.Extension = function (module, descriptor) {
    this._module = module;
    this._descriptor = descriptor;
    this._type = descriptor.type;
    this._hasTypeClass = !!this._type.startsWith("@");
    this._className = descriptor.className || null;
}
WebInspector.ModuleManager.Extension.prototype = {
    descriptor: function () {
        return this._descriptor;
    },
    module: function () {
        return this._module;
    },
    _typeClass: function () {
        if (!this._hasTypeClass)
            return null;
        return this._module._manager.resolve(this._type);
    },
    isApplicable: function (context) {
        var contextTypes = (this._descriptor.contextTypes);
        if (!contextTypes)
            return true;
        for (var i = 0; i < contextTypes.length; ++i) {
            var contextType = (window.eval(contextTypes[i]));
            if (context instanceof contextType)
                return true;
        }
        return false;
    },
    instance: function () {
        if (!this._className)
            return null;
        if (!this._instance) {
            this._module._load();
            var constructorFunction = window.eval(this._className);
            if (!(constructorFunction instanceof Function))
                return null;
            this._instance = new constructorFunction();
        }
        return this._instance;
    }
}
WebInspector.Renderer = function () {}
WebInspector.Renderer.prototype = {
    render: function (object) {}
}
WebInspector.Revealer = function () {}
WebInspector.Revealer.reveal = function (revealable, lineNumber) {
    if (!revealable)
        return;
    var revealer = WebInspector.moduleManager.instance(WebInspector.Revealer, revealable);
    if (revealer)
        revealer.reveal(revealable, lineNumber);
}
WebInspector.Revealer.prototype = {
    reveal: function (object) {}
}
WebInspector.ActionDelegate = function () {}
WebInspector.ActionDelegate.prototype = {
    handleAction: function (event) {}
}
WebInspector.moduleManager = new WebInspector.ModuleManager(allDescriptors);
WebInspector.platform = function () {
    if (!WebInspector._platform)
        WebInspector._platform = InspectorFrontendHost.platform();
    return WebInspector._platform;
}
WebInspector.isMac = function () {
    if (typeof WebInspector._isMac === "undefined")
        WebInspector._isMac = WebInspector.platform() === "mac";
    return WebInspector._isMac;
}
WebInspector.isWin = function () {
    if (typeof WebInspector._isWin === "undefined")
        WebInspector._isWin = WebInspector.platform() === "windows";
    return WebInspector._isWin;
}
WebInspector.PlatformFlavor = {
    WindowsVista: "windows-vista",
    MacTiger: "mac-tiger",
    MacLeopard: "mac-leopard",
    MacSnowLeopard: "mac-snowleopard",
    MacLion: "mac-lion"
}
WebInspector.platformFlavor = function () {
    function detectFlavor() {
        const userAgent = navigator.userAgent;
        if (WebInspector.platform() === "windows") {
            var match = userAgent.match(/Windows NT (\d+)\.(?:\d+)/);
            if (match && match[1] >= 6)
                return WebInspector.PlatformFlavor.WindowsVista;
            return null;
        } else if (WebInspector.platform() === "mac") {
            var match = userAgent.match(/Mac OS X\s*(?:(\d+)_(\d+))?/);
            if (!match || match[1] != 10)
                return WebInspector.PlatformFlavor.MacSnowLeopard;
            switch (Number(match[2])) {
            case 4:
                return WebInspector.PlatformFlavor.MacTiger;
            case 5:
                return WebInspector.PlatformFlavor.MacLeopard;
            case 6:
                return WebInspector.PlatformFlavor.MacSnowLeopard;
            case 7:
                return WebInspector.PlatformFlavor.MacLion;
            case 8:
            case 9:
            default:
                return "";
            }
        }
    }
    if (!WebInspector._platformFlavor)
        WebInspector._platformFlavor = detectFlavor();
    return WebInspector._platformFlavor;
}
WebInspector.port = function () {
    if (!WebInspector._port)
        WebInspector._port = InspectorFrontendHost.port();
    return WebInspector._port;
}
WebInspector.fontFamily = function () {
    if (WebInspector._fontFamily)
        return WebInspector._fontFamily;
    switch (WebInspector.platform()) {
    case "linux":
        WebInspector._fontFamily = "Ubuntu, Arial, sans-serif";
        break;
    case "mac":
        WebInspector._fontFamily = "'Lucida Grande', sans-serif";
        break;
    case "windows":
        WebInspector._fontFamily = "'Segoe UI', Tahoma, sans-serif";
        break;
    }
    return WebInspector._fontFamily;
}
WebInspector.Geometry = {};
WebInspector.Geometry._Eps = 1e-5;
WebInspector.Geometry.Vector = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
}
WebInspector.Geometry.Vector.prototype = {
    length: function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },
    normalize: function () {
        var length = this.length();
        if (length <= WebInspector.Geometry._Eps)
            return;
        this.x /= length;
        this.y /= length;
        this.z /= length;
    }
}
WebInspector.Geometry.EulerAngles = function (alpha, beta, gamma) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
}
WebInspector.Geometry.EulerAngles.fromRotationMatrix = function (rotationMatrix) {
    var beta = Math.atan2(rotationMatrix.m23, rotationMatrix.m33);
    var gamma = Math.atan2(-rotationMatrix.m13, Math.sqrt(rotationMatrix.m11 * rotationMatrix.m11 + rotationMatrix.m12 * rotationMatrix.m12));
    var alpha = Math.atan2(rotationMatrix.m12, rotationMatrix.m11);
    return new WebInspector.Geometry.EulerAngles(WebInspector.Geometry.radToDeg(alpha), WebInspector.Geometry.radToDeg(beta), WebInspector.Geometry.radToDeg(gamma));
}
WebInspector.Geometry.scalarProduct = function (u, v) {
    return u.x * v.x + u.y * v.y + u.z * v.z;
}
WebInspector.Geometry.crossProduct = function (u, v) {
    var x = u.y * v.z - u.z * v.y;
    var y = u.z * v.x - u.x * v.z;
    var z = u.x * v.y - u.y * v.x;
    return new WebInspector.Geometry.Vector(x, y, z);
}
WebInspector.Geometry.calculateAngle = function (u, v) {
    var uLength = u.length();
    var vLength = v.length();
    if (uLength <= WebInspector.Geometry._Eps || vLength <= WebInspector.Geometry._Eps)
        return 0;
    var cos = WebInspector.Geometry.scalarProduct(u, v) / uLength / vLength;
    if (Math.abs(cos) > 1)
        return 0;
    return WebInspector.Geometry.radToDeg(Math.acos(cos));
}
WebInspector.Geometry.radToDeg = function (rad) {
    return rad * 180 / Math.PI;
}
WebInspector.UIString = function (string, vararg) {
    return String.vsprintf(string, Array.prototype.slice.call(arguments, 1));
}
WebInspector.Object = function () {}
WebInspector.Object.prototype = {
    addEventListener: function (eventType, listener, thisObject) {
        if (!listener)
            console.assert(false);
        if (!this._listeners)
            this._listeners = {};
        if (!this._listeners[eventType])
            this._listeners[eventType] = [];
        this._listeners[eventType].push({
            thisObject: thisObject,
            listener: listener
        });
    },
    removeEventListener: function (eventType, listener, thisObject) {
        console.assert(listener);
        if (!this._listeners || !this._listeners[eventType])
            return;
        var listeners = this._listeners[eventType];
        for (var i = 0; i < listeners.length; ++i) {
            if (listener && listeners[i].listener === listener && listeners[i].thisObject === thisObject)
                listeners.splice(i, 1);
            else if (!listener && thisObject && listeners[i].thisObject === thisObject)
                listeners.splice(i, 1);
        }
        if (!listeners.length)
            delete this._listeners[eventType];
    },
    removeAllListeners: function () {
        delete this._listeners;
    },
    hasEventListeners: function (eventType) {
        if (!this._listeners || !this._listeners[eventType])
            return false;
        return true;
    },
    dispatchEventToListeners: function (eventType, eventData) {
        if (!this._listeners || !this._listeners[eventType])
            return false;
        var event = new WebInspector.Event(this, eventType, eventData);
        var listeners = this._listeners[eventType].slice(0);
        for (var i = 0; i < listeners.length; ++i) {
            listeners[i].listener.call(listeners[i].thisObject, event);
            if (event._stoppedPropagation)
                break;
        }
        return event.defaultPrevented;
    }
}
WebInspector.Event = function (target, type, data) {
    this.target = target;
    this.type = type;
    this.data = data;
    this.defaultPrevented = false;
    this._stoppedPropagation = false;
}
WebInspector.Event.prototype = {
    stopPropagation: function () {
        this._stoppedPropagation = true;
    },
    preventDefault: function () {
        this.defaultPrevented = true;
    },
    consume: function (preventDefault) {
        this.stopPropagation();
        if (preventDefault)
            this.preventDefault();
    }
}
WebInspector.EventTarget = function () {}
WebInspector.EventTarget.prototype = {
    addEventListener: function (eventType, listener, thisObject) {},
    removeEventListener: function (eventType, listener, thisObject) {},
    removeAllListeners: function () {},
    hasEventListeners: function (eventType) {},
    dispatchEventToListeners: function (eventType, eventData) {},
}

function InspectorBackendClass() {
    this._connection = null;
    this._agentPrototypes = {};
    this._dispatcherPrototypes = {};
    this._initialized = false;
    this._enums = {};
    this._initProtocolAgentsConstructor();
}
InspectorBackendClass.prototype = {
    _initProtocolAgentsConstructor: function () {
        window.Protocol = {};
        window.Protocol.Agents = function (agentsMap) {
            this._agentsMap = agentsMap;
        };
    },
    _addAgentGetterMethodToProtocolAgentsPrototype: function (domain) {
        var upperCaseLength = 0;
        while (upperCaseLength < domain.length && domain[upperCaseLength].toLowerCase() !== domain[upperCaseLength])
        ++upperCaseLength;
        var methodName = domain.substr(0, upperCaseLength).toLowerCase() + domain.slice(upperCaseLength) + "Agent";

        function agentGetter() {
            return this._agentsMap[domain];
        }
        window.Protocol.Agents.prototype[methodName] = agentGetter;

        function registerDispatcher(dispatcher) {
            this.registerDispatcher(domain, dispatcher)
        }
        window.Protocol.Agents.prototype["register" + domain + "Dispatcher"] = registerDispatcher;
    },
    connection: function () {
        if (!this._connection)
            throw "Main connection was not initialized";
        return this._connection;
    },
    setConnection: function (connection) {
        this._connection = connection;
        this._connection.registerAgentsOn(window);
        for (var type in this._enums) {
            var domainAndMethod = type.split(".");
            window[domainAndMethod[0] + "Agent"][domainAndMethod[1]] = this._enums[type];
        }
    },
    _agentPrototype: function (domain) {
        if (!this._agentPrototypes[domain]) {
            this._agentPrototypes[domain] = new InspectorBackendClass.AgentPrototype(domain);
            this._addAgentGetterMethodToProtocolAgentsPrototype(domain);
        }
        return this._agentPrototypes[domain];
    },
    _dispatcherPrototype: function (domain) {
        if (!this._dispatcherPrototypes[domain])
            this._dispatcherPrototypes[domain] = new InspectorBackendClass.DispatcherPrototype();
        return this._dispatcherPrototypes[domain];
    },
    registerCommand: function (method, signature, replyArgs, hasErrorData) {
        var domainAndMethod = method.split(".");
        this._agentPrototype(domainAndMethod[0]).registerCommand(domainAndMethod[1], signature, replyArgs, hasErrorData);
        this._initialized = true;
    },
    registerEnum: function (type, values) {
        this._enums[type] = values;
        this._initialized = true;
    },
    registerEvent: function (eventName, params) {
        var domain = eventName.split(".")[0];
        this._dispatcherPrototype(domain).registerEvent(eventName, params);
        this._initialized = true;
    },
    registerDomainDispatcher: function (domain, dispatcher) {
        this._connection.registerDispatcher(domain, dispatcher);
    },
    loadFromJSONIfNeeded: function (jsonUrl) {
        if (this._initialized)
            return;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", jsonUrl, false);
        xhr.send(null);
        var schema = JSON.parse(xhr.responseText);
        var code = InspectorBackendClass._generateCommands(schema);
        eval(code);
    },
    wrapClientCallback: function (clientCallback, errorPrefix, constructor, defaultValue) {
        function callbackWrapper(error, value) {
            if (error) {
                console.error(errorPrefix + error);
                clientCallback(defaultValue);
                return;
            }
            if (constructor)
                clientCallback(new constructor(value));
            else
                clientCallback(value);
        }
        return callbackWrapper;
    }
}
InspectorBackendClass._generateCommands = function (schema) {
    var jsTypes = {
        integer: "number",
        array: "object"
    };
    var rawTypes = {};
    var result = [];
    var domains = schema["domains"] || [];
    for (var i = 0; i < domains.length; ++i) {
        var domain = domains[i];
        for (var j = 0; domain.types && j < domain.types.length; ++j) {
            var type = domain.types[j];
            rawTypes[domain.domain + "." + type.id] = jsTypes[type.type] || type.type;
        }
    }

    function toUpperCase(groupIndex, group0, group1) {
        return [group0, group1][groupIndex].toUpperCase();
    }

    function generateEnum(enumName, items) {
        var members = []
        for (var m = 0; m < items.length; ++m) {
            var value = items[m];
            var name = value.replace(/-(\w)/g, toUpperCase.bind(null, 1)).toTitleCase();
            name = name.replace(/HTML|XML|WML|API/ig, toUpperCase.bind(null, 0));
            members.push(name + ": \"" + value + "\"");
        }
        return "InspectorBackend.registerEnum(\"" + enumName + "\", {" + members.join(", ") + "});";
    }
    for (var i = 0; i < domains.length; ++i) {
        var domain = domains[i];
        var types = domain["types"] || [];
        for (var j = 0; j < types.length; ++j) {
            var type = types[j];
            if ((type["type"] === "string") && type["enum"])
                result.push(generateEnum(domain.domain + "." + type.id, type["enum"]));
            else if (type["type"] === "object") {
                var properties = type["properties"] || [];
                for (var k = 0; k < properties.length; ++k) {
                    var property = properties[k];
                    if ((property["type"] === "string") && property["enum"])
                        result.push(generateEnum(domain.domain + "." + type.id + property["name"].toTitleCase(), property["enum"]));
                }
            }
        }
        var commands = domain["commands"] || [];
        for (var j = 0; j < commands.length; ++j) {
            var command = commands[j];
            var parameters = command["parameters"];
            var paramsText = [];
            for (var k = 0; parameters && k < parameters.length; ++k) {
                var parameter = parameters[k];
                var type;
                if (parameter.type)
                    type = jsTypes[parameter.type] || parameter.type;
                else {
                    var ref = parameter["$ref"];
                    if (ref.indexOf(".") !== -1)
                        type = rawTypes[ref];
                    else
                        type = rawTypes[domain.domain + "." + ref];
                }
                var text = "{\"name\": \"" + parameter.name + "\", \"type\": \"" + type + "\", \"optional\": " + (parameter.optional ? "true" : "false") + "}";
                paramsText.push(text);
            }
            var returnsText = [];
            var returns = command["returns"] || [];
            for (var k = 0; k < returns.length; ++k) {
                var parameter = returns[k];
                returnsText.push("\"" + parameter.name + "\"");
            }
            var hasErrorData = String(Boolean(command.error));
            result.push("InspectorBackend.registerCommand(\"" + domain.domain + "." + command.name + "\", [" + paramsText.join(", ") + "], [" + returnsText.join(", ") + "], " + hasErrorData + ");");
        }
        for (var j = 0; domain.events && j < domain.events.length; ++j) {
            var event = domain.events[j];
            var paramsText = [];
            for (var k = 0; event.parameters && k < event.parameters.length; ++k) {
                var parameter = event.parameters[k];
                paramsText.push("\"" + parameter.name + "\"");
            }
            result.push("InspectorBackend.registerEvent(\"" + domain.domain + "." + event.name + "\", [" + paramsText.join(", ") + "]);");
        }
        result.push("InspectorBackend.register" + domain.domain + "Dispatcher = InspectorBackend.registerDomainDispatcher.bind(InspectorBackend, \"" + domain.domain + "\");");
    }
    return result.join("\n");
}
InspectorBackendClass.Connection = function () {
    this._lastMessageId = 1;
    this._pendingResponsesCount = 0;
    this._agents = {};
    this._dispatchers = {};
    this._callbacks = {};
    this._initialize(InspectorBackend._agentPrototypes, InspectorBackend._dispatcherPrototypes);
}
InspectorBackendClass.Connection.Events = {
    Disconnected: "Disconnected",
}
InspectorBackendClass.Connection.prototype = {
    _initialize: function (agentPrototypes, dispatcherPrototypes) {
        for (var domain in agentPrototypes) {
            this._agents[domain] = Object.create(agentPrototypes[domain]);
            this._agents[domain].setConnection(this);
        }
        console.trace();
        for (var domain in dispatcherPrototypes)
            this._dispatchers[domain] = Object.create(dispatcherPrototypes[domain])
    },
    registerAgentsOn: function (object) {
        for (var domain in this._agents)
            object[domain + "Agent"] = this._agents[domain];
    },
    nextMessageId: function () {
        return this._lastMessageId++;
    },
    agent: function (domain) {
        return this._agents[domain];
    },
    agentsMap: function () {
        return this._agents;
    },
    _wrapCallbackAndSendMessageObject: function (domain, method, params, callback) {
        var messageObject = {};
        messageObject.method = method;
        if (params)
            messageObject.params = params;
        var wrappedCallback = this._wrap(callback, domain, method);
        var messageId = this.nextMessageId();
        messageObject.id = messageId;
        if (InspectorBackendClass.Options.dumpInspectorProtocolMessages)
            console.log("frontend: " + JSON.stringify(messageObject));

        // this is what evaluating comes to. sending a message with some crap
        this.sendMessage(messageObject);
        ++this._pendingResponsesCount;
        this._callbacks[messageId] = wrappedCallback;
    },
    _wrap: function (callback, domain, method) {
        if (!callback)
            callback = function () {};
        callback.methodName = method;
        callback.domain = domain;
        if (InspectorBackendClass.Options.dumpInspectorTimeStats)
            callback.sendRequestTime = Date.now();
        return callback;
    },
    sendMessage: function (messageObject) {
        throw "Not implemented";
    },
    reportProtocolError: function (messageObject) {
        console.error("Protocol Error: the message with wrong id. Message =  " + JSON.stringify(messageObject));
    },

    // called for results and some intermediary stuff.
    dispatch: function (message) {
        if (InspectorBackendClass.Options.dumpInspectorProtocolMessages) {
            console.log("backend: " + ((typeof message === "string") ? message : JSON.stringify(message)));
            console.trace();
        }
        var messageObject = ((typeof message === "string") ? JSON.parse(message) : message);
        if ("id" in messageObject) {
            var callback = this._callbacks[messageObject.id];
            if (!callback) {
                this.reportProtocolError(messageObject);
                return;
            }
            var processingStartTime;
            if (InspectorBackendClass.Options.dumpInspectorTimeStats)
                processingStartTime = Date.now();
            this.agent(callback.domain).dispatchResponse(messageObject.id, messageObject, callback.methodName, callback);
            --this._pendingResponsesCount;
            delete this._callbacks[messageObject.id];
            if (InspectorBackendClass.Options.dumpInspectorTimeStats)
                console.log("time-stats: " + callback.methodName + " = " + (processingStartTime - callback.sendRequestTime) + " + " + (Date.now() - processingStartTime));
            if (this._scripts && !this._pendingResponsesCount)
                this.runAfterPendingDispatches();
            return;
        } else {
            var method = messageObject.method.split(".");
            var domainName = method[0];
            if (!(domainName in this._dispatchers)) {
                console.error("Protocol Error: the message " + messageObject.method + " is for non-existing domain '" + domainName + "'");
                return;
            }
            this._dispatchers[domainName].dispatch(method[1], messageObject);
        }
    },
    registerDispatcher: function (domain, dispatcher) {
        if (!this._dispatchers[domain])
            return;
        this._dispatchers[domain].setDomainDispatcher(dispatcher);
    },
    runAfterPendingDispatches: function (script) {
        if (!this._scripts)
            this._scripts = [];
        if (script)
            this._scripts.push(script);
        if (!this._pendingResponsesCount) {
            var scripts = this._scripts;
            this._scripts = []
            for (var id = 0; id < scripts.length; ++id)
                scripts[id].call(this);
        }
    },
    fireDisconnected: function (reason) {
        this.dispatchEventToListeners(InspectorBackendClass.Connection.Events.Disconnected, {
            reason: reason
        });
    },
    __proto__: WebInspector.Object.prototype
}
InspectorBackendClass.MainConnection = function (onConnectionReady) {
    InspectorBackendClass.Connection.call(this);
    onConnectionReady(this);
}
InspectorBackendClass.MainConnection.prototype = {
    sendMessage: function (messageObject) {
        console.info("MainConnection send message", messageObject);
        // FOUND YOU, YOU STINKIN sendMessage!!!!!!
        var message = JSON.stringify(messageObject);
        // FUCK YOU
        InspectorFrontendHost.sendMessageToBackend(message);
    },
    __proto__: InspectorBackendClass.Connection.prototype
}
InspectorBackendClass.WebSocketConnection = function (url, onConnectionReady) {
    InspectorBackendClass.Connection.call(this);
    this._socket = new WebSocket(url);
    this._socket.onmessage = this._onMessage.bind(this);
    this._socket.onerror = this._onError.bind(this);
    this._socket.onopen = onConnectionReady.bind(null, this);
    this._socket.onclose = this.fireDisconnected.bind(this, "websocket_closed");
}
InspectorBackendClass.WebSocketConnection.prototype = {
    _onMessage: function (message) {
        var data = (message.data)
        this.dispatch(data);
    },
    _onError: function (error) {
        console.error(error);
    },
    sendMessage: function (messageObject) {
        var message = JSON.stringify(messageObject);
        this._socket.send(message);
    },
    __proto__: InspectorBackendClass.Connection.prototype
}
InspectorBackendClass.StubConnection = function (onConnectionReady) {
    InspectorBackendClass.Connection.call(this);
    onConnectionReady(this);
}
InspectorBackendClass.StubConnection.prototype = {
    sendMessage: function (messageObject) {
        console.info('stub sendMessage', messageObject);
        var message = JSON.stringify(messageObject);
        setTimeout(this._echoResponse.bind(this, messageObject), 0);
    },
    _echoResponse: function (messageObject) {
        this.dispatch(messageObject)
    },
    __proto__: InspectorBackendClass.Connection.prototype
}
InspectorBackendClass.AgentPrototype = function (domain) {
    this._replyArgs = {};
    this._hasErrorData = {};
    this._domain = domain;
}
InspectorBackendClass.AgentPrototype.prototype = {
    setConnection: function (connection) {
        this._connection = connection;
    },
    registerCommand: function (methodName, signature, replyArgs, hasErrorData) {
        var domainAndMethod = this._domain + "." + methodName;

        function sendMessage(vararg) {
            var params = [domainAndMethod, signature].concat(Array.prototype.slice.call(arguments));
            InspectorBackendClass.AgentPrototype.prototype._sendMessageToBackend.apply(this, params);
        }
        this[methodName] = sendMessage;

        function invoke(vararg) {
            console.info('invoke', vararg, this);
            var params = [domainAndMethod].concat(Array.prototype.slice.call(arguments));
            InspectorBackendClass.AgentPrototype.prototype._invoke.apply(this, params);
        }
        this["invoke_" + methodName] = invoke;
        this._replyArgs[domainAndMethod] = replyArgs;
        if (hasErrorData)
            this._hasErrorData[domainAndMethod] = true;
    },
    _sendMessageToBackend: function (method, signature, vararg) {
        var args = Array.prototype.slice.call(arguments, 2);
        var callback = (args.length && typeof args[args.length - 1] === "function") ? args.pop() : null;
        var params = {};
        var hasParams = false;
        for (var i = 0; i < signature.length; ++i) {
            var param = signature[i];
            var paramName = param["name"];
            var typeName = param["type"];
            var optionalFlag = param["optional"];
            if (!args.length && !optionalFlag) {
                console.error("Protocol Error: Invalid number of arguments for method '" + method + "' call. It must have the following arguments '" + JSON.stringify(signature) + "'.");
                return;
            }
            var value = args.shift();
            if (optionalFlag && typeof value === "undefined") {
                continue;
            }
            if (typeof value !== typeName) {
                console.error("Protocol Error: Invalid type of argument '" + paramName + "' for method '" + method + "' call. It must be '" + typeName + "' but it is '" + typeof value + "'.");
                return;
            }
            params[paramName] = value;
            hasParams = true;
        }
        if (args.length === 1 && !callback && (typeof args[0] !== "undefined")) {
            console.error("Protocol Error: Optional callback argument for method '" + method + "' call must be a function but its type is '" + typeof args[0] + "'.");
            return;
        }
        this._connection._wrapCallbackAndSendMessageObject(this._domain, method, hasParams ? params : null, callback);
    },
    _invoke: function (method, args, callback) {
        this._connection._wrapCallbackAndSendMessageObject(this._domain, method, args, callback);
    },
    dispatchResponse: function (messageId, messageObject, methodName, callback) {
        if (messageObject.error && messageObject.error.code !== -32000)
            console.error("Request with id = " + messageObject.id + " failed. " + JSON.stringify(messageObject.error));
        var argumentsArray = [];
        argumentsArray[0] = messageObject.error ? messageObject.error.message : null;
        if (this._hasErrorData[methodName])
            argumentsArray[1] = messageObject.error ? messageObject.error.data : null;
        if (messageObject.result) {
            var paramNames = this._replyArgs[methodName] || [];
            for (var i = 0; i < paramNames.length; ++i)
                argumentsArray.push(messageObject.result[paramNames[i]]);
        }
        callback.apply(null, argumentsArray);
    }
}
InspectorBackendClass.DispatcherPrototype = function () {
    this._eventArgs = {};
    this._dispatcher = null;
}
InspectorBackendClass.DispatcherPrototype.prototype = {
    registerEvent: function (eventName, params) {
        this._eventArgs[eventName] = params
    },
    setDomainDispatcher: function (dispatcher) {
        this._dispatcher = dispatcher;
    },
    dispatch: function (functionName, messageObject) {
        if (!this._dispatcher)
            return;
        if (!(functionName in this._dispatcher)) {
            console.error("Protocol Error: Attempted to dispatch an unimplemented method '" + messageObject.method + "'");
            return;
        }
        if (!this._eventArgs[messageObject.method]) {
            console.error("Protocol Error: Attempted to dispatch an unspecified method '" + messageObject.method + "'");
            return;
        }
        var params = [];
        if (messageObject.params) {
            var paramNames = this._eventArgs[messageObject.method];
            for (var i = 0; i < paramNames.length; ++i)
                params.push(messageObject.params[paramNames[i]]);
        }
        var processingStartTime;
        if (InspectorBackendClass.Options.dumpInspectorTimeStats)
            processingStartTime = Date.now();
        this._dispatcher[functionName].apply(this._dispatcher, params);
        if (InspectorBackendClass.Options.dumpInspectorTimeStats)
            console.log("time-stats: " + messageObject.method + " = " + (Date.now() - processingStartTime));
    }
}
InspectorBackendClass.Options = {
    dumpInspectorTimeStats: false,
    dumpInspectorProtocolMessages: true
}
InspectorBackend = new InspectorBackendClass();

// I'm not sure what Page is responsible for, so leaving it in.
/*
InspectorBackend.registerPageDispatcher = InspectorBackend.registerDomainDispatcher.bind(InspectorBackend, "Page");
InspectorBackend.registerEnum("Page.ResourceType", {
    Document: "Document",
    Stylesheet: "Stylesheet",
    Image: "Image",
    Font: "Font",
    Script: "Script",
    XHR: "XHR",
    WebSocket: "WebSocket",
    Other: "Other"
});
InspectorBackend.registerEnum("Page.UsageItemId", {
    Filesystem: "filesystem",
    Database: "database",
    Appcache: "appcache",
    Indexeddatabase: "indexeddatabase"
});
InspectorBackend.registerEvent("Page.domContentEventFired", ["timestamp"]);
InspectorBackend.registerEvent("Page.loadEventFired", ["timestamp"]);
InspectorBackend.registerEvent("Page.frameAttached", ["frameId", "parentFrameId"]);
InspectorBackend.registerEvent("Page.frameNavigated", ["frame"]);
InspectorBackend.registerEvent("Page.frameDetached", ["frameId"]);
InspectorBackend.registerEvent("Page.frameStartedLoading", ["frameId"]);
InspectorBackend.registerEvent("Page.frameStoppedLoading", ["frameId"]);
InspectorBackend.registerEvent("Page.frameScheduledNavigation", ["frameId", "delay"]);
InspectorBackend.registerEvent("Page.frameClearedScheduledNavigation", ["frameId"]);
InspectorBackend.registerEvent("Page.frameResized", []);
InspectorBackend.registerEvent("Page.javascriptDialogOpening", ["message"]);
InspectorBackend.registerEvent("Page.javascriptDialogClosed", []);
InspectorBackend.registerEvent("Page.scriptsEnabled", ["isEnabled"]);
InspectorBackend.registerEvent("Page.screencastFrame", ["data", "metadata"]);
InspectorBackend.registerEvent("Page.screencastVisibilityChanged", ["visible"]);
InspectorBackend.registerCommand("Page.enable", [], [], false);
InspectorBackend.registerCommand("Page.disable", [], [], false);
InspectorBackend.registerCommand("Page.addScriptToEvaluateOnLoad", [{
    "name": "scriptSource",
    "type": "string",
    "optional": false
}], ["identifier"], false);
InspectorBackend.registerCommand("Page.removeScriptToEvaluateOnLoad", [{
    "name": "identifier",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.reload", [{
    "name": "ignoreCache",
    "type": "boolean",
    "optional": true
}, {
    "name": "scriptToEvaluateOnLoad",
    "type": "string",
    "optional": true
}, {
    "name": "scriptPreprocessor",
    "type": "string",
    "optional": true
}], [], false);
InspectorBackend.registerCommand("Page.navigate", [{
    "name": "url",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.getNavigationHistory", [], ["currentIndex", "entries"], false);
InspectorBackend.registerCommand("Page.navigateToHistoryEntry", [{
    "name": "entryId",
    "type": "number",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.getCookies", [], ["cookies"], false);
InspectorBackend.registerCommand("Page.deleteCookie", [{
    "name": "cookieName",
    "type": "string",
    "optional": false
}, {
    "name": "url",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.getResourceTree", [], ["frameTree"], false);
InspectorBackend.registerCommand("Page.getResourceContent", [{
    "name": "frameId",
    "type": "string",
    "optional": false
}, {
    "name": "url",
    "type": "string",
    "optional": false
}], ["content", "base64Encoded"], false);
InspectorBackend.registerCommand("Page.searchInResource", [{
    "name": "frameId",
    "type": "string",
    "optional": false
}, {
    "name": "url",
    "type": "string",
    "optional": false
}, {
    "name": "query",
    "type": "string",
    "optional": false
}, {
    "name": "caseSensitive",
    "type": "boolean",
    "optional": true
}, {
    "name": "isRegex",
    "type": "boolean",
    "optional": true
}], ["result"], false);
InspectorBackend.registerCommand("Page.setDocumentContent", [{
    "name": "frameId",
    "type": "string",
    "optional": false
}, {
    "name": "html",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setDeviceMetricsOverride", [{
    "name": "width",
    "type": "number",
    "optional": false
}, {
    "name": "height",
    "type": "number",
    "optional": false
}, {
    "name": "deviceScaleFactor",
    "type": "number",
    "optional": false
}, {
    "name": "emulateViewport",
    "type": "boolean",
    "optional": false
}, {
    "name": "fitWindow",
    "type": "boolean",
    "optional": false
}, {
    "name": "textAutosizing",
    "type": "boolean",
    "optional": true
}, {
    "name": "fontScaleFactor",
    "type": "number",
    "optional": true
}], [], false);
InspectorBackend.registerCommand("Page.setShowPaintRects", [{
    "name": "result",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setShowDebugBorders", [{
    "name": "show",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setShowFPSCounter", [{
    "name": "show",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setContinuousPaintingEnabled", [{
    "name": "enabled",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setShowScrollBottleneckRects", [{
    "name": "show",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.getScriptExecutionStatus", [], ["result"], false);
InspectorBackend.registerCommand("Page.setScriptExecutionDisabled", [{
    "name": "value",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setGeolocationOverride", [{
    "name": "latitude",
    "type": "number",
    "optional": true
}, {
    "name": "longitude",
    "type": "number",
    "optional": true
}, {
    "name": "accuracy",
    "type": "number",
    "optional": true
}], [], false);
InspectorBackend.registerCommand("Page.clearGeolocationOverride", [], [], false);
InspectorBackend.registerCommand("Page.setDeviceOrientationOverride", [{
    "name": "alpha",
    "type": "number",
    "optional": false
}, {
    "name": "beta",
    "type": "number",
    "optional": false
}, {
    "name": "gamma",
    "type": "number",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.clearDeviceOrientationOverride", [], [], false);
InspectorBackend.registerCommand("Page.setTouchEmulationEnabled", [{
    "name": "enabled",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.setEmulatedMedia", [{
    "name": "media",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Page.captureScreenshot", [], ["data"], false);
InspectorBackend.registerCommand("Page.canScreencast", [], ["result"], false);
InspectorBackend.registerCommand("Page.startScreencast", [{
    "name": "format",
    "type": "string",
    "optional": true
}, {
    "name": "quality",
    "type": "number",
    "optional": true
}, {
    "name": "maxWidth",
    "type": "number",
    "optional": true
}, {
    "name": "maxHeight",
    "type": "number",
    "optional": true
}], [], false);
InspectorBackend.registerCommand("Page.stopScreencast", [], [], false);
InspectorBackend.registerCommand("Page.handleJavaScriptDialog", [{
    "name": "accept",
    "type": "boolean",
    "optional": false
}, {
    "name": "promptText",
    "type": "string",
    "optional": true
}], [], false);
InspectorBackend.registerCommand("Page.setShowViewportSizeOnResize", [{
    "name": "show",
    "type": "boolean",
    "optional": false
}, {
    "name": "showGrid",
    "type": "boolean",
    "optional": true
}], [], false);
InspectorBackend.registerCommand("Page.queryUsageAndQuota", [{
    "name": "securityOrigin",
    "type": "string",
    "optional": false
}], ["quota", "usage"], false);
*/
InspectorBackend.registerRuntimeDispatcher = InspectorBackend.registerDomainDispatcher.bind(InspectorBackend, "Runtime");
InspectorBackend.registerEnum("Runtime.RemoteObjectType", {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean"
});
InspectorBackend.registerEnum("Runtime.RemoteObjectSubtype", {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date"
});
InspectorBackend.registerEnum("Runtime.PropertyPreviewType", {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Accessor: "accessor"
});
InspectorBackend.registerEnum("Runtime.PropertyPreviewSubtype", {
    Array: "array",
    Null: "null",
    Node: "node",
    Regexp: "regexp",
    Date: "date"
});
InspectorBackend.registerEnum("Runtime.CallArgumentType", {
    Object: "object",
    Function: "function",
    Undefined: "undefined",
    String: "string",
    Number: "number",
    Boolean: "boolean"
});
InspectorBackend.registerEvent("Runtime.executionContextCreated", ["context"]);
InspectorBackend.registerCommand("Runtime.evaluate", [{
    "name": "expression",
    "type": "string",
    "optional": false
}, {
    "name": "objectGroup",
    "type": "string",
    "optional": true
}, {
    "name": "includeCommandLineAPI",
    "type": "boolean",
    "optional": true
}, {
    "name": "doNotPauseOnExceptionsAndMuteConsole",
    "type": "boolean",
    "optional": true
}, {
    "name": "contextId",
    "type": "number",
    "optional": true
}, {
    "name": "returnByValue",
    "type": "boolean",
    "optional": true
}, {
    "name": "generatePreview",
    "type": "boolean",
    "optional": true
}], ["result", "wasThrown"], false);
InspectorBackend.registerCommand("Runtime.callFunctionOn", [{
    "name": "objectId",
    "type": "string",
    "optional": false
}, {
    "name": "functionDeclaration",
    "type": "string",
    "optional": false
}, {
    "name": "arguments",
    "type": "object",
    "optional": true
}, {
    "name": "doNotPauseOnExceptionsAndMuteConsole",
    "type": "boolean",
    "optional": true
}, {
    "name": "returnByValue",
    "type": "boolean",
    "optional": true
}, {
    "name": "generatePreview",
    "type": "boolean",
    "optional": true
}], ["result", "wasThrown"], false);
InspectorBackend.registerCommand("Runtime.getProperties", [{
    "name": "objectId",
    "type": "string",
    "optional": false
}, {
    "name": "ownProperties",
    "type": "boolean",
    "optional": true
}, {
    "name": "accessorPropertiesOnly",
    "type": "boolean",
    "optional": true
}], ["result", "internalProperties"], false);
InspectorBackend.registerCommand("Runtime.releaseObject", [{
    "name": "objectId",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Runtime.releaseObjectGroup", [{
    "name": "objectGroup",
    "type": "string",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Runtime.run", [], [], false);
InspectorBackend.registerCommand("Runtime.enable", [], [], false);
InspectorBackend.registerCommand("Runtime.disable", [], [], false);
InspectorBackend.registerConsoleDispatcher = InspectorBackend.registerDomainDispatcher.bind(InspectorBackend, "Console");
InspectorBackend.registerEnum("Console.ConsoleMessageSource", {
    XML: "xml",
    Javascript: "javascript",
    Network: "network",
    ConsoleAPI: "console-api",
    Storage: "storage",
    Appcache: "appcache",
    Rendering: "rendering",
    Css: "css",
    Security: "security",
    Other: "other",
    Deprecation: "deprecation"
});
InspectorBackend.registerEnum("Console.ConsoleMessageLevel", {
    Log: "log",
    Warning: "warning",
    Error: "error",
    Debug: "debug",
    Info: "info"
});
InspectorBackend.registerEnum("Console.ConsoleMessageType", {
    Log: "log",
    Dir: "dir",
    DirXML: "dirxml",
    Table: "table",
    Trace: "trace",
    Clear: "clear",
    StartGroup: "startGroup",
    StartGroupCollapsed: "startGroupCollapsed",
    EndGroup: "endGroup",
    Assert: "assert",
    Profile: "profile",
    ProfileEnd: "profileEnd"
});
InspectorBackend.registerEvent("Console.messageAdded", ["message"]);
InspectorBackend.registerEvent("Console.messageRepeatCountUpdated", ["count", "timestamp"]);
InspectorBackend.registerEvent("Console.messagesCleared", []);
InspectorBackend.registerCommand("Console.enable", [], [], false);
InspectorBackend.registerCommand("Console.disable", [], [], false);
InspectorBackend.registerCommand("Console.clearMessages", [], [], false);
InspectorBackend.registerCommand("Console.setMonitoringXHREnabled", [{
    "name": "enabled",
    "type": "boolean",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Console.addInspectedNode", [{
    "name": "nodeId",
    "type": "number",
    "optional": false
}], [], false);
InspectorBackend.registerCommand("Console.addInspectedHeapObject", [{
    "name": "heapObjectId",
    "type": "number",
    "optional": false
}], [], false);

var InspectorFrontendAPI = {
    _pendingCommands: [],
    showConsole: function () {
        InspectorFrontendAPI._runOnceLoaded(function () {
            WebInspector.inspectorView.showPanel("console");
        });
    },
    enterInspectElementMode: function () {
        InspectorFrontendAPI._runOnceLoaded(function () {
            WebInspector.inspectorView.showPanel("elements");
            if (WebInspector.inspectElementModeController)
                WebInspector.inspectElementModeController.toggleSearch();
        });
    },
    revealSourceLine: function (url, lineNumber, columnNumber) {
        InspectorFrontendAPI._runOnceLoaded(function () {
            var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(url);
            if (uiSourceCode) {
                WebInspector.Revealer.reveal(new WebInspector.UILocation(uiSourceCode, lineNumber, columnNumber));
                return;
            }

            function listener(event) {
                var uiSourceCode = (event.data);
                if (uiSourceCode.url === url) {
                    WebInspector.Revealer.reveal(new WebInspector.UILocation(uiSourceCode, lineNumber, columnNumber));
                    WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, listener);
                }
            }
            WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, listener);
        });
    },
    setToolbarColors: function (backgroundColor, color) {
        WebInspector.setToolbarColors(backgroundColor, color);
    },
    loadTimelineFromURL: function (url) {
        InspectorFrontendAPI._runOnceLoaded(function () {
            (WebInspector.inspectorView.showPanel("timeline")).loadFromURL(url);
        });
    },
    setUseSoftMenu: function (useSoftMenu) {
        WebInspector.ContextMenu.setUseSoftMenu(useSoftMenu);
    },
    dispatchMessage: function (messageObject) {
        InspectorBackend.connection().dispatch(messageObject);
    },
    contextMenuItemSelected: function (id) {
        WebInspector.contextMenuItemSelected(id);
    },
    contextMenuCleared: function () {
        WebInspector.contextMenuCleared();
    },
    fileSystemsLoaded: function (fileSystems) {
        WebInspector.isolatedFileSystemDispatcher.fileSystemsLoaded(fileSystems);
    },
    fileSystemRemoved: function (fileSystemPath) {
        WebInspector.isolatedFileSystemDispatcher.fileSystemRemoved(fileSystemPath);
    },
    fileSystemAdded: function (errorMessage, fileSystem) {
        WebInspector.isolatedFileSystemDispatcher.fileSystemAdded(errorMessage, fileSystem);
    },
    indexingTotalWorkCalculated: function (requestId, fileSystemPath, totalWork) {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.indexingTotalWorkCalculated(requestId, totalWork);
    },
    indexingWorked: function (requestId, fileSystemPath, worked) {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.indexingWorked(requestId, worked);
    },
    indexingDone: function (requestId, fileSystemPath) {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.indexingDone(requestId);
    },
    searchCompleted: function (requestId, fileSystemPath, files) {
        var projectDelegate = WebInspector.fileSystemWorkspaceProvider.delegate(fileSystemPath);
        projectDelegate.searchCompleted(requestId, files);
    },
    savedURL: function (url) {
        WebInspector.fileManager.savedURL(url);
    },
    canceledSaveURL: function (url) {
        WebInspector.fileManager.canceledSaveURL(url);
    },
    appendedToURL: function (url) {
        WebInspector.fileManager.appendedToURL(url);
    },
    embedderMessageAck: function (id, error) {
        InspectorFrontendHost.embedderMessageAck(id, error);
    },
    loadCompleted: function () {
        InspectorFrontendAPI._isLoaded = true;
        for (var i = 0; i < InspectorFrontendAPI._pendingCommands.length; ++i)
            InspectorFrontendAPI._pendingCommands[i]();
        InspectorFrontendAPI._pendingCommands = [];
        if (window.opener)
            window.opener.postMessage(["loadCompleted"], "*");
    },
    dispatchQueryParameters: function (dispatchParameter) {
        if (dispatchParameter)
            InspectorFrontendAPI._dispatch(JSON.parse(window.decodeURI(dispatchParameter)));
    },
    evaluateForTest: function (callId, script) {
        WebInspector.evaluateForTestInFrontend(callId, script);
    },
    dispatchMessageAsync: function (messageObject) {
        WebInspector.dispatch(messageObject);
    },
    _dispatch: function (signature) {
        InspectorFrontendAPI._runOnceLoaded(function () {
            var methodName = signature.shift();
            return InspectorFrontendAPI[methodName].apply(InspectorFrontendAPI, signature);
        });
    },
    _runOnceLoaded: function (command) {
        if (InspectorFrontendAPI._isLoaded) {
            command();
            return;
        }
        InspectorFrontendAPI._pendingCommands.push(command);
    }
}

function onMessageFromOpener(event) {
    if (event.source === window.opener)
        InspectorFrontendAPI._dispatch(event.data);
}
if (window.opener && window.dispatchStandaloneTestRunnerMessages)
    window.addEventListener("message", onMessageFromOpener, true);

///////////////////// zirak
WebInspector.StubManager = function () {
    this.$stub = true;
    WebInspector.Object.call(this);
};
WebInspector.StubManager.prototype = {
    __proto__: WebInspector.Object.prototype
};
////////////////////

WebInspector.Target = function (connection, callback) {
    Protocol.Agents.call(this, connection.agentsMap());
    this._connection = connection;
    this.isMainFrontend = false;
    this._loadedWithCapabilities.bind(this, callback)();
}
WebInspector.Target.prototype = {
    _initializeCapability: function (name, callback, error, result) {
        this[name] = result;
        if (!Capabilities[name])
            Capabilities[name] = result;
        if (callback)
            callback();
    },
    _loadedWithCapabilities: function (callback) {
        // zirak: this is where initial loading crap happen
        // we need to turn everything into a stub

        this.consoleModel = new WebInspector.ConsoleModel(this);
        if (!WebInspector.console)
            WebInspector.console = this.consoleModel;

        this.runtimeModel = new WebInspector.RuntimeModel(this);
        if (!WebInspector.runtimeModel)
            WebInspector.runtimeModel = this.runtimeModel;

        if (callback) {
            callback(this);
        }
    },
    registerDispatcher: function (domain, dispatcher) {
        this._connection.registerDispatcher(domain, dispatcher);
    },
    isWorkerTarget: function () {
        return !this.isMainFrontend;
    },
    __proto__: Protocol.Agents.prototype
}
WebInspector.TargetManager = function () {
    WebInspector.Object.call(this);
    this._targets = [];
}
WebInspector.TargetManager.Events = {
    TargetAdded: "TargetAdded",
}
WebInspector.TargetManager.prototype = {
    createTarget: function (connection, callback) {
        console.log('creating target');
        var target = new WebInspector.Target(connection, callbackWrapper.bind(this));

        function callbackWrapper(newTarget) {
            console.log('got meself a new target');
            if (callback)
                callback(newTarget);
            this._targets.push(newTarget);
            this.dispatchEventToListeners(WebInspector.TargetManager.Events.TargetAdded, newTarget);
        }
    },
    targets: function () {
        return this._targets;
    },
    mainTarget: function () {
        return this._targets[0];
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.targetManager;
WebInspector.NotificationService = function () {}
WebInspector.NotificationService.prototype = {
    __proto__: WebInspector.Object.prototype
}
WebInspector.NotificationService.Events = {
    InspectorLoaded: "InspectorLoaded",
    SelectedNodeChanged: "SelectedNodeChanged"
}
WebInspector.notifications = new WebInspector.NotificationService();
var Preferences = {
    maxInlineTextChildLength: 80,
    minSidebarWidth: 100,
    minSidebarHeight: 75,
    applicationTitle: "Developer Tools - %s"
}
var Capabilities = {
    isMainFrontend: false,
    canProfilePower: false,
}
WebInspector.Settings = function () {
    this._eventSupport = new WebInspector.Object();
    this._registry = ({});
    this.colorFormat = this.createSetting("colorFormat", "original");
    this.consoleHistory = this.createSetting("consoleHistory", []);
    this.domWordWrap = this.createSetting("domWordWrap", true);
    this.eventListenersFilter = this.createSetting("eventListenersFilter", "all");
    this.lastViewedScriptFile = this.createSetting("lastViewedScriptFile", "application");
    this.monitoringXHREnabled = this.createSetting("monitoringXHREnabled", false);
    this.preserveConsoleLog = this.createSetting("preserveConsoleLog", false);
    this.consoleTimestampsEnabled = this.createSetting("consoleTimestampsEnabled", false);
    this.resourcesLargeRows = this.createSetting("resourcesLargeRows", true);
    this.resourcesSortOptions = this.createSetting("resourcesSortOptions", {
        timeOption: "responseTime",
        sizeOption: "transferSize"
    });
    this.resourceViewTab = this.createSetting("resourceViewTab", "preview");
    this.showInheritedComputedStyleProperties = this.createSetting("showInheritedComputedStyleProperties", false);
    this.showUserAgentStyles = this.createSetting("showUserAgentStyles", true);
    this.watchExpressions = this.createSetting("watchExpressions", []);
    this.breakpoints = this.createSetting("breakpoints", []);
    this.eventListenerBreakpoints = this.createSetting("eventListenerBreakpoints", []);
    this.domBreakpoints = this.createSetting("domBreakpoints", []);
    this.xhrBreakpoints = this.createSetting("xhrBreakpoints", []);
    this.jsSourceMapsEnabled = this.createSetting("sourceMapsEnabled", true);
    this.cssSourceMapsEnabled = this.createSetting("cssSourceMapsEnabled", true);
    this.cacheDisabled = this.createSetting("cacheDisabled", false);
    this.overrideUserAgent = this.createSetting("overrideUserAgent", false);
    this.userAgent = this.createSetting("userAgent", "");
    this.overrideDeviceMetrics = this.createSetting("overrideDeviceMetrics", false);
    this.deviceMetrics = this.createSetting("deviceMetrics", "");
    this.deviceFitWindow = this.createSetting("deviceFitWindow", true);
    this.emulateViewport = this.createSetting("emulateViewport", false);
    this.emulateTouchEvents = this.createSetting("emulateTouchEvents", false);
    this.showUAShadowDOM = this.createSetting("showUAShadowDOM", false);
    this.savedURLs = this.createSetting("savedURLs", {});
    this.javaScriptDisabled = this.createSetting("javaScriptDisabled", false);
    this.overrideGeolocation = this.createSetting("overrideGeolocation", false);
    this.geolocationOverride = this.createSetting("geolocationOverride", "");
    this.overrideDeviceOrientation = this.createSetting("overrideDeviceOrientation", false);
    this.deviceOrientationOverride = this.createSetting("deviceOrientationOverride", "");
    this.showAdvancedHeapSnapshotProperties = this.createSetting("showAdvancedHeapSnapshotProperties", false);
    this.highResolutionCpuProfiling = this.createSetting("highResolutionCpuProfiling", false);
    this.searchInContentScripts = this.createSetting("searchInContentScripts", false);
    this.textEditorIndent = this.createSetting("textEditorIndent", "    ");
    this.textEditorAutoDetectIndent = this.createSetting("textEditorAutoIndentIndent", true);
    this.textEditorAutocompletion = this.createSetting("textEditorAutocompletion", true);
    this.textEditorBracketMatching = this.createSetting("textEditorBracketMatching", true);
    this.cssReloadEnabled = this.createSetting("cssReloadEnabled", false);
    this.timelineCaptureStacks = this.createSetting("timelineCaptureStacks", true);
    this.timelineLiveUpdate = this.createSetting("timelineLiveUpdate", true);
    this.showMetricsRulers = this.createSetting("showMetricsRulers", false);
    this.overrideCSSMedia = this.createSetting("overrideCSSMedia", false);
    this.emulatedCSSMedia = this.createSetting("emulatedCSSMedia", "print");
    this.workerInspectorWidth = this.createSetting("workerInspectorWidth", 600);
    this.workerInspectorHeight = this.createSetting("workerInspectorHeight", 600);
    this.messageURLFilters = this.createSetting("messageURLFilters", {});
    this.networkHideDataURL = this.createSetting("networkHideDataURL", false);
    this.networkResourceTypeFilters = this.createSetting("networkResourceTypeFilters", {});
    this.messageLevelFilters = this.createSetting("messageLevelFilters", {});
    this.splitVerticallyWhenDockedToRight = this.createSetting("splitVerticallyWhenDockedToRight", true);
    this.visiblePanels = this.createSetting("visiblePanels", {});
    this.shortcutPanelSwitch = this.createSetting("shortcutPanelSwitch", false);
    this.showWhitespacesInEditor = this.createSetting("showWhitespacesInEditor", false);
    this.skipStackFramesSwitch = this.createSetting("skipStackFramesSwitch", false);
    this.skipStackFramesPattern = this.createRegExpSetting("skipStackFramesPattern", "");
    this.pauseOnExceptionEnabled = this.createSetting("pauseOnExceptionEnabled", false);
    this.pauseOnCaughtException = this.createSetting("pauseOnCaughtException", false);
    this.enableAsyncStackTraces = this.createSetting("enableAsyncStackTraces", false);
}
WebInspector.Settings.prototype = {
    createSetting: function (key, defaultValue) {
        if (!this._registry[key])
            this._registry[key] = new WebInspector.Setting(key, defaultValue, this._eventSupport, window.localStorage);
        return this._registry[key];
    },
    createRegExpSetting: function (key, defaultValue, regexFlags) {
        if (!this._registry[key])
            this._registry[key] = new WebInspector.RegExpSetting(key, defaultValue, this._eventSupport, window.localStorage, regexFlags);
        return this._registry[key];
    },
    createBackendSetting: function (key, defaultValue, setterCallback) {
        if (!this._registry[key])
            this._registry[key] = new WebInspector.BackendSetting(key, defaultValue, this._eventSupport, window.localStorage, setterCallback);
        return this._registry[key];
    },
    initializeBackendSettings: function () {

    }
}
WebInspector.Setting = function (name, defaultValue, eventSupport, storage) {
    this._name = name;
    this._defaultValue = defaultValue;
    this._eventSupport = eventSupport;
    this._storage = storage;
}
WebInspector.Setting.prototype = {
    addChangeListener: function (listener, thisObject) {
        this._eventSupport.addEventListener(this._name, listener, thisObject);
    },
    removeChangeListener: function (listener, thisObject) {
        this._eventSupport.removeEventListener(this._name, listener, thisObject);
    },
    get name() {
        return this._name;
    },
    get: function () {
        if (typeof this._value !== "undefined")
            return this._value;
        this._value = this._defaultValue;
        if (this._storage && this._name in this._storage) {
            try {
                this._value = JSON.parse(this._storage[this._name]);
            } catch (e) {
                delete this._storage[this._name];
            }
        }
        return this._value;
    },
    set: function (value) {
        this._value = value;
        if (this._storage) {
            try {
                this._storage[this._name] = JSON.stringify(value);
            } catch (e) {
                console.error("Error saving setting with name:" + this._name);
            }
        }
        this._eventSupport.dispatchEventToListeners(this._name, value);
    }
}
WebInspector.RegExpSetting = function (name, defaultValue, eventSupport, storage, regexFlags) {
    WebInspector.Setting.call(this, name, defaultValue, eventSupport, storage);
    this._regexFlags = regexFlags;
}
WebInspector.RegExpSetting.prototype = {
    set: function (value) {
        delete this._regex;
        WebInspector.Setting.prototype.set.call(this, value);
    },
    asRegExp: function () {
        if (typeof this._regex !== "undefined")
            return this._regex;
        this._regex = null;
        try {
            this._regex = new RegExp(this.get(), this._regexFlags || "");
        } catch (e) {}
        return this._regex;
    },
    __proto__: WebInspector.Setting.prototype
}
WebInspector.BackendSetting = function (name, defaultValue, eventSupport, storage, setterCallback) {
    WebInspector.Setting.call(this, name, defaultValue, eventSupport, storage);
    this._setterCallback = setterCallback;
    var currentValue = this.get();
    if (currentValue !== defaultValue)
        this.set(currentValue);
}
WebInspector.BackendSetting.prototype = {
    set: function (value) {
        function callback(error) {
            if (error) {
                WebInspector.console.log("Error applying setting " + this._name + ": " + error);
                this._eventSupport.dispatchEventToListeners(this._name, this._value);
                return;
            }
            WebInspector.Setting.prototype.set.call(this, value);
        }
        this._setterCallback(value, callback.bind(this));
    },
    __proto__: WebInspector.Setting.prototype
}
WebInspector.ExperimentsSettings = function (experimentsEnabled) {
    this._experimentsEnabled = experimentsEnabled;
    this._setting = WebInspector.settings.createSetting("experiments", {});
    this._experiments = [];
    this._enabledForTest = {};
    this.fileSystemInspection = this._createExperiment("fileSystemInspection", "FileSystem inspection");
    this.canvasInspection = this._createExperiment("canvasInspection ", "Canvas inspection");
    this.frameworksDebuggingSupport = this._createExperiment("frameworksDebuggingSupport", "Enable frameworks debugging support");
    this.layersPanel = this._createExperiment("layersPanel", "Show Layers panel");
    this.doNotOpenDrawerOnEsc = this._createExperiment("doNotOpenDrawerWithEsc", "Do not open drawer on Esc");
    this.showEditorInDrawer = this._createExperiment("showEditorInDrawer", "Show editor in drawer");
    this.gpuTimeline = this._createExperiment("gpuTimeline", "Show GPU data on timeline");
    this.applyCustomStylesheet = this._createExperiment("applyCustomStylesheet", "Allow custom UI themes");
    this.workersInMainWindow = this._createExperiment("workersInMainWindow", "Show workers in main window");
    this.dockToLeft = this._createExperiment("dockToLeft", "Enable dock to left mode");
    this.allocationProfiler = this._createExperiment("allocationProfiler", "Enable JavaScript heap allocation profiler");
    this.timelineFlameChart = this._createExperiment("timelineFlameChart", "Enable FlameChart mode in Timeline");
    this.heapSnapshotStatistics = this._createExperiment("heapSnapshotStatistics", "Show memory breakdown statistics in heap snapshots");
    this.timelineNoLiveUpdate = this._createExperiment("timelineNoLiveUpdate", "Timeline w/o live update");
    this.powerProfiler = this._createExperiment("powerProfiler", "Enable power mode in Timeline");
    this._cleanUpSetting();
}
WebInspector.ExperimentsSettings.prototype = {
    get experiments() {
        return this._experiments.slice();
    }, get experimentsEnabled() {
        return this._experimentsEnabled;
    }, _createExperiment: function (experimentName, experimentTitle) {
        var experiment = new WebInspector.Experiment(this, experimentName, experimentTitle);
        this._experiments.push(experiment);
        return experiment;
    }, isEnabled: function (experimentName) {
        if (this._enabledForTest[experimentName])
            return true;
        if (!this.experimentsEnabled)
            return false;
        var experimentsSetting = this._setting.get();
        return experimentsSetting[experimentName];
    }, setEnabled: function (experimentName, enabled) {
        var experimentsSetting = this._setting.get();
        experimentsSetting[experimentName] = enabled;
        this._setting.set(experimentsSetting);
    }, _enableForTest: function (experimentName) {
        this._enabledForTest[experimentName] = true;
    }, _cleanUpSetting: function () {
        var experimentsSetting = this._setting.get();
        var cleanedUpExperimentSetting = {};
        for (var i = 0; i < this._experiments.length; ++i) {
            var experimentName = this._experiments[i].name;
            if (experimentsSetting[experimentName])
                cleanedUpExperimentSetting[experimentName] = true;
        }
        this._setting.set(cleanedUpExperimentSetting);
    }
}
WebInspector.Experiment = function (experimentsSettings, name, title) {
    this._name = name;
    this._title = title;
    this._experimentsSettings = experimentsSettings;
}
WebInspector.Experiment.prototype = {
    get name() {
        return this._name;
    }, get title() {
        return this._title;
    }, isEnabled: function () {
        return this._experimentsSettings.isEnabled(this._name);
    }, setEnabled: function (enabled) {
        this._experimentsSettings.setEnabled(this._name, enabled);
    }, enableForTest: function () {
        this._experimentsSettings._enableForTest(this._name);
    }
}
WebInspector.VersionController = function () {}
WebInspector.VersionController.currentVersion = 7;
WebInspector.VersionController.prototype = {
    updateVersion: function () {
        var versionSetting = WebInspector.settings.createSetting("inspectorVersion", 0);
        var currentVersion = WebInspector.VersionController.currentVersion;
        var oldVersion = versionSetting.get();
        var methodsToRun = this._methodsToRunToUpdateVersion(oldVersion, currentVersion);
        for (var i = 0; i < methodsToRun.length; ++i)
            this[methodsToRun[i]].call(this);
        versionSetting.set(currentVersion);
    },
    _methodsToRunToUpdateVersion: function (oldVersion, currentVersion) {
        var result = [];
        for (var i = oldVersion; i < currentVersion; ++i)
            result.push("_updateVersionFrom" + i + "To" + (i + 1));
        return result;
    },
    _updateVersionFrom0To1: function () {
        this._clearBreakpointsWhenTooMany(WebInspector.settings.breakpoints, 500000);
    },
    _updateVersionFrom1To2: function () {
        var versionSetting = WebInspector.settings.createSetting("previouslyViewedFiles", []);
        versionSetting.set([]);
    },
    _updateVersionFrom2To3: function () {
        var fileSystemMappingSetting = WebInspector.settings.createSetting("fileSystemMapping", {});
        fileSystemMappingSetting.set({});
        if (window.localStorage)
            delete window.localStorage["fileMappingEntries"];
    },
    _updateVersionFrom3To4: function () {
        var advancedMode = WebInspector.settings.createSetting("showHeaSnapshotObjectsHiddenProperties", false).get();
        WebInspector.settings.showAdvancedHeapSnapshotProperties.set(advancedMode);
    },
    _updateVersionFrom4To5: function () {
        if (!window.localStorage)
            return;
        var settingNames = {
            "FileSystemViewSidebarWidth": "fileSystemViewSplitViewState",
            "canvasProfileViewReplaySplitLocation": "canvasProfileViewReplaySplitViewState",
            "canvasProfileViewSplitLocation": "canvasProfileViewSplitViewState",
            "elementsSidebarWidth": "elementsPanelSplitViewState",
            "StylesPaneSplitRatio": "stylesPaneSplitViewState",
            "heapSnapshotRetainersViewSize": "heapSnapshotSplitViewState",
            "InspectorView.splitView": "InspectorView.splitViewState",
            "InspectorView.screencastSplitView": "InspectorView.screencastSplitViewState",
            "Inspector.drawerSplitView": "Inspector.drawerSplitViewState",
            "layerDetailsSplitView": "layerDetailsSplitViewState",
            "networkSidebarWidth": "networkPanelSplitViewState",
            "sourcesSidebarWidth": "sourcesPanelSplitViewState",
            "scriptsPanelNavigatorSidebarWidth": "sourcesPanelNavigatorSplitViewState",
            "sourcesPanelSplitSidebarRatio": "sourcesPanelDebuggerSidebarSplitViewState",
            "timeline-details": "timelinePanelDetailsSplitViewState",
            "timeline-split": "timelinePanelRecorsSplitViewState",
            "timeline-view": "timelinePanelTimelineStackSplitViewState",
            "auditsSidebarWidth": "auditsPanelSplitViewState",
            "layersSidebarWidth": "layersPanelSplitViewState",
            "profilesSidebarWidth": "profilesPanelSplitViewState",
            "resourcesSidebarWidth": "resourcesPanelSplitViewState"
        };
        for (var oldName in settingNames) {
            var newName = settingNames[oldName];
            var oldNameH = oldName + "H";
            var newValue = null;
            var oldSetting = WebInspector.settings.createSetting(oldName, undefined).get();
            if (oldSetting) {
                newValue = newValue || {};
                newValue.vertical = {};
                newValue.vertical.size = oldSetting;
                delete window.localStorage[oldName];
            }
            var oldSettingH = WebInspector.settings.createSetting(oldNameH, undefined).get();
            if (oldSettingH) {
                newValue = newValue || {};
                newValue.horizontal = {};
                newValue.horizontal.size = oldSettingH;
                delete window.localStorage[oldNameH];
            }
            var newSetting = WebInspector.settings.createSetting(newName, {});
            if (newValue)
                newSetting.set(newValue);
        }
    },
    _updateVersionFrom5To6: function () {
        if (!window.localStorage)
            return;
        var settingNames = {
            "debuggerSidebarHidden": "sourcesPanelSplitViewState",
            "navigatorHidden": "sourcesPanelNavigatorSplitViewState",
            "WebInspector.Drawer.showOnLoad": "Inspector.drawerSplitViewState"
        };
        for (var oldName in settingNames) {
            var newName = settingNames[oldName];
            var oldSetting = WebInspector.settings.createSetting(oldName, undefined).get();
            var invert = "WebInspector.Drawer.showOnLoad" === oldName;
            var hidden = !!oldSetting !== invert;
            delete window.localStorage[oldName];
            var showMode = hidden ? "OnlyMain" : "Both";
            var newSetting = WebInspector.settings.createSetting(newName, null);
            var newValue = newSetting.get() || {};
            newValue.vertical = newValue.vertical || {};
            newValue.vertical.showMode = showMode;
            newValue.horizontal = newValue.horizontal || {};
            newValue.horizontal.showMode = showMode;
            newSetting.set(newValue);
        }
    },
    _updateVersionFrom6To7: function () {
        if (!window.localStorage)
            return;
        var settingNames = {
            "sourcesPanelNavigatorSplitViewState": "sourcesPanelNavigatorSplitViewState",
            "elementsPanelSplitViewState": "elementsPanelSplitViewState",
            "canvasProfileViewReplaySplitViewState": "canvasProfileViewReplaySplitViewState",
            "editorInDrawerSplitViewState": "editorInDrawerSplitViewState",
            "stylesPaneSplitViewState": "stylesPaneSplitViewState",
            "sourcesPanelDebuggerSidebarSplitViewState": "sourcesPanelDebuggerSidebarSplitViewState"
        };
        for (var name in settingNames) {
            if (!(name in window.localStorage))
                continue;
            var setting = WebInspector.settings.createSetting(name, undefined);
            var value = setting.get();
            if (!value)
                continue;
            if (value.vertical && value.vertical.size && value.vertical.size < 1)
                value.vertical.size = 0;
            if (value.horizontal && value.horizontal.size && value.horizontal.size < 1)
                value.horizontal.size = 0;
            setting.set(value);
        }
    },
    _clearBreakpointsWhenTooMany: function (breakpointsSetting, maxBreakpointsCount) {
        if (breakpointsSetting.get().length > maxBreakpointsCount)
            breakpointsSetting.set([]);
    }
}
WebInspector.settings = new WebInspector.Settings();
WebInspector.experimentsSettings = new WebInspector.ExperimentsSettings(WebInspector.queryParam("experiments") !== null);
WebInspector.PauseOnExceptionStateSetting = function () {
    WebInspector.settings.pauseOnExceptionEnabled.addChangeListener(this._enabledChanged, this);
    WebInspector.settings.pauseOnCaughtException.addChangeListener(this._pauseOnCaughtChanged, this);
    this._name = "pauseOnExceptionStateString";
    this._eventSupport = new WebInspector.Object();
    this._value = this._calculateValue();
}
WebInspector.PauseOnExceptionStateSetting.prototype = {
    addChangeListener: function (listener, thisObject) {
        this._eventSupport.addEventListener(this._name, listener, thisObject);
    },
    removeChangeListener: function (listener, thisObject) {
        this._eventSupport.removeEventListener(this._name, listener, thisObject);
    },
    get: function () {
        return this._value;
    },
    _calculateValue: function () {
        if (!WebInspector.settings.pauseOnExceptionEnabled.get())
            return "none";
        return "all";
    },
    _enabledChanged: function (event) {
        this._fireChangedIfNeeded();
    },
    _pauseOnCaughtChanged: function (event) {
        this._fireChangedIfNeeded();
    },
    _fireChangedIfNeeded: function () {
        var newValue = this._calculateValue();
        if (newValue === this._value)
            return;
        this._value = newValue;
        this._eventSupport.dispatchEventToListeners(this._name, this._value);
    }
}
WebInspector.settings.pauseOnExceptionStateString = new WebInspector.PauseOnExceptionStateSetting();
WebInspector.SettingsUI = {}
WebInspector.SettingsUI.createCheckbox = function (name, getter, setter, omitParagraphElement, inputElement, tooltip) {
    var input = inputElement || document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = getter();

    function listener() {
        setter(input.checked);
    }
    input.addEventListener("change", listener, false);
    var label = document.createElement("label");
    label.appendChild(input);
    label.createTextChild(name);
    if (tooltip)
        label.title = tooltip;
    if (omitParagraphElement)
        return label;
    var p = document.createElement("p");
    p.appendChild(label);
    return p;
}
WebInspector.SettingsUI.createSettingCheckbox = function (name, setting, omitParagraphElement, inputElement, tooltip) {
    return WebInspector.SettingsUI.createCheckbox(name, setting.get.bind(setting), setting.set.bind(setting), omitParagraphElement, inputElement, tooltip);
}
WebInspector.SettingsUI.createSettingFieldset = function (setting) {
    var fieldset = document.createElement("fieldset");
    fieldset.disabled = !setting.get();
    setting.addChangeListener(settingChanged);
    return fieldset;

    function settingChanged() {
        fieldset.disabled = !setting.get();
    }
}
WebInspector.View = function () {
    this.element = document.createElement("div");
    this.element.className = "view";
    this.element.__view = this;
    this._visible = true;
    this._isRoot = false;
    this._isShowing = false;
    this._children = [];
    this._hideOnDetach = false;
    this._cssFiles = [];
    this._notificationDepth = 0;
}
WebInspector.View._cssFileToVisibleViewCount = {};
WebInspector.View._cssFileToStyleElement = {};
WebInspector.View._cssUnloadTimeout = 2000;
WebInspector.View._buildSourceURL = function (cssFile) {
    return "\n/*# sourceURL=" + WebInspector.ParsedURL.completeURL(window.location.href, cssFile) + " */";
}
WebInspector.View.createStyleElement = function (cssFile) {
    var styleElement;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", cssFile, false);
    xhr.send(null);
    styleElement = document.createElement("style");
    styleElement.type = "text/css";
    styleElement.textContent = xhr.responseText + WebInspector.View._buildSourceURL(cssFile);
    document.head.insertBefore(styleElement, document.head.firstChild);
    return styleElement;
}
WebInspector.View.prototype = {
    markAsRoot: function () {
        WebInspector.View._assert(!this.element.parentElement, "Attempt to mark as root attached node");
        this._isRoot = true;
    },
    makeLayoutBoundary: function () {
        this._isLayoutBoundary = true;
    },
    parentView: function () {
        return this._parentView;
    },
    isShowing: function () {
        return this._isShowing;
    },
    setHideOnDetach: function () {
        this._hideOnDetach = true;
    },
    _inNotification: function () {
        return !!this._notificationDepth || (this._parentView && this._parentView._inNotification());
    },
    _parentIsShowing: function () {
        if (this._isRoot)
            return true;
        return this._parentView && this._parentView.isShowing();
    },
    _callOnVisibleChildren: function (method) {
        var copy = this._children.slice();
        for (var i = 0; i < copy.length; ++i) {
            if (copy[i]._parentView === this && copy[i]._visible)
                method.call(copy[i]);
        }
    },
    _processWillShow: function () {
        this._loadCSSIfNeeded();
        this._callOnVisibleChildren(this._processWillShow);
        this._isShowing = true;
    },
    _processWasShown: function () {
        if (this._inNotification())
            return;
        this.restoreScrollPositions();
        this._notify(this.wasShown);
        this._notify(this.onResize);
        this._callOnVisibleChildren(this._processWasShown);
    },
    _processWillHide: function () {
        if (this._inNotification())
            return;
        this.storeScrollPositions();
        this._callOnVisibleChildren(this._processWillHide);
        this._notify(this.willHide);
        this._isShowing = false;
    },
    _processWasHidden: function () {
        this._disableCSSIfNeeded();
        this._callOnVisibleChildren(this._processWasHidden);
    },
    _processOnResize: function () {
        if (this._inNotification())
            return;
        if (!this.isShowing())
            return;
        this._notify(this.onResize);
        this._callOnVisibleChildren(this._processOnResize);
    },
    _processDiscardCachedSize: function () {
        if (this._isLayoutBoundary) {
            this.element.style.removeProperty("width");
            this.element.style.removeProperty("height");
        }
        this._callOnVisibleChildren(this._processDiscardCachedSize);
    },
    _cacheSize: function () {
        this._prepareCacheSize();
        this._applyCacheSize();
    },
    _prepareCacheSize: function () {
        if (this._isLayoutBoundary) {
            this._cachedOffsetWidth = this.element.offsetWidth;
            this._cachedOffsetHeight = this.element.offsetHeight;
        }
        this._callOnVisibleChildren(this._prepareCacheSize);
    },
    _applyCacheSize: function () {
        if (this._isLayoutBoundary) {
            this.element.style.setProperty("width", this._cachedOffsetWidth + "px");
            this.element.style.setProperty("height", this._cachedOffsetHeight + "px");
            delete this._cachedOffsetWidth;
            delete this._cachedOffsetHeight;
        }
        this._callOnVisibleChildren(this._applyCacheSize);
    },
    _notify: function (notification) {
        ++this._notificationDepth;
        try {
            notification.call(this);
        } finally {
            --this._notificationDepth;
        }
    },
    wasShown: function () {},
    willHide: function () {},
    onResize: function () {},
    onLayout: function () {},
    show: function (parentElement, insertBefore) {
        WebInspector.View._assert(parentElement, "Attempt to attach view with no parent element");
        if (this.element.parentElement !== parentElement) {
            if (this.element.parentElement)
                this.detach();
            var currentParent = parentElement;
            while (currentParent && !currentParent.__view)
                currentParent = currentParent.parentElement;
            if (currentParent) {
                this._parentView = currentParent.__view;
                this._parentView._children.push(this);
                this._isRoot = false;
            } else
                WebInspector.View._assert(this._isRoot, "Attempt to attach view to orphan node");
        } else if (this._visible) {
            return;
        }
        this._visible = true;
        if (this._parentIsShowing())
            this._processWillShow();
        this.element.classList.add("visible");
        if (this.element.parentElement !== parentElement) {
            WebInspector.View._incrementViewCounter(parentElement, this.element);
            if (insertBefore)
                WebInspector.View._originalInsertBefore.call(parentElement, this.element, insertBefore);
            else
                WebInspector.View._originalAppendChild.call(parentElement, this.element);
        }
        if (this._parentIsShowing()) {
            this._processWasShown();
            this._cacheSize();
        }
        if (this._parentView && this._hasNonZeroMinimumSize())
            this._parentView.invalidateMinimumSize();
    },
    detach: function (overrideHideOnDetach) {
        var parentElement = this.element.parentElement;
        if (!parentElement)
            return;
        if (this._parentIsShowing()) {
            this._processDiscardCachedSize();
            this._processWillHide();
        }
        if (this._hideOnDetach && !overrideHideOnDetach) {
            this.element.classList.remove("visible");
            this._visible = false;
            if (this._parentIsShowing())
                this._processWasHidden();
            if (this._parentView && this._hasNonZeroMinimumSize())
                this._parentView.invalidateMinimumSize();
            return;
        }
        WebInspector.View._decrementViewCounter(parentElement, this.element);
        WebInspector.View._originalRemoveChild.call(parentElement, this.element);
        this._visible = false;
        if (this._parentIsShowing())
            this._processWasHidden();
        if (this._parentView) {
            var childIndex = this._parentView._children.indexOf(this);
            WebInspector.View._assert(childIndex >= 0, "Attempt to remove non-child view");
            this._parentView._children.splice(childIndex, 1);
            var parent = this._parentView;
            this._parentView = null;
            if (this._hasNonZeroMinimumSize())
                parent.invalidateMinimumSize();
        } else
            WebInspector.View._assert(this._isRoot, "Removing non-root view from DOM");
    },
    detachChildViews: function () {
        var children = this._children.slice();
        for (var i = 0; i < children.length; ++i)
            children[i].detach();
    },
    elementsToRestoreScrollPositionsFor: function () {
        return [this.element];
    },
    storeScrollPositions: function () {
        var elements = this.elementsToRestoreScrollPositionsFor();
        for (var i = 0; i < elements.length; ++i) {
            var container = elements[i];
            container._scrollTop = container.scrollTop;
            container._scrollLeft = container.scrollLeft;
        }
    },
    restoreScrollPositions: function () {
        var elements = this.elementsToRestoreScrollPositionsFor();
        for (var i = 0; i < elements.length; ++i) {
            var container = elements[i];
            if (container._scrollTop)
                container.scrollTop = container._scrollTop;
            if (container._scrollLeft)
                container.scrollLeft = container._scrollLeft;
        }
    },
    doResize: function () {
        if (!this.isShowing())
            return;
        this._processDiscardCachedSize();
        if (!this._inNotification())
            this._callOnVisibleChildren(this._processOnResize);
        this._cacheSize();
    },
    doLayout: function () {
        if (!this.isShowing())
            return;
        this._notify(this.onLayout);
        this.doResize();
    },
    registerRequiredCSS: function (cssFile) {
        if (window.flattenImports)
            cssFile = cssFile.split("/").reverse()[0];
        this._cssFiles.push(cssFile);
    },
    _loadCSSIfNeeded: function () {
        for (var i = 0; i < this._cssFiles.length; ++i) {
            var cssFile = this._cssFiles[i];
            var viewsWithCSSFile = WebInspector.View._cssFileToVisibleViewCount[cssFile];
            WebInspector.View._cssFileToVisibleViewCount[cssFile] = (viewsWithCSSFile || 0) + 1;
            if (!viewsWithCSSFile)
                this._doLoadCSS(cssFile);
        }
    },
    _doLoadCSS: function (cssFile) {
        var styleElement = WebInspector.View._cssFileToStyleElement[cssFile];
        if (styleElement) {
            styleElement.disabled = false;
            return;
        }
        styleElement = WebInspector.View.createStyleElement(cssFile);
        WebInspector.View._cssFileToStyleElement[cssFile] = styleElement;
    },
    _disableCSSIfNeeded: function () {
        var scheduleUnload = !!WebInspector.View._cssUnloadTimer;
        for (var i = 0; i < this._cssFiles.length; ++i) {
            var cssFile = this._cssFiles[i];
            if (!--WebInspector.View._cssFileToVisibleViewCount[cssFile])
                scheduleUnload = true;
        }

        function doUnloadCSS() {
            delete WebInspector.View._cssUnloadTimer;
            for (cssFile in WebInspector.View._cssFileToVisibleViewCount) {
                if (WebInspector.View._cssFileToVisibleViewCount.hasOwnProperty(cssFile) && !WebInspector.View._cssFileToVisibleViewCount[cssFile])
                    WebInspector.View._cssFileToStyleElement[cssFile].disabled = true;
            }
        }
        if (scheduleUnload) {
            if (WebInspector.View._cssUnloadTimer)
                clearTimeout(WebInspector.View._cssUnloadTimer);
            WebInspector.View._cssUnloadTimer = setTimeout(doUnloadCSS, WebInspector.View._cssUnloadTimeout)
        }
    },
    printViewHierarchy: function () {
        var lines = [];
        this._collectViewHierarchy("", lines);
        console.log(lines.join("\n"));
    },
    _collectViewHierarchy: function (prefix, lines) {
        lines.push(prefix + "[" + this.element.className + "]" + (this._children.length ? " {" : ""));
        for (var i = 0; i < this._children.length; ++i)
            this._children[i]._collectViewHierarchy(prefix + "    ", lines);
        if (this._children.length)
            lines.push(prefix + "}");
    },
    defaultFocusedElement: function () {
        return this._defaultFocusedElement || this.element;
    },
    setDefaultFocusedElement: function (element) {
        this._defaultFocusedElement = element;
    },
    focus: function () {
        var element = this.defaultFocusedElement();
        if (!element || element.isAncestor(document.activeElement))
            return;
        WebInspector.setCurrentFocusElement(element);
    },
    measurePreferredSize: function () {
        this._loadCSSIfNeeded();
        WebInspector.View._originalAppendChild.call(document.body, this.element);
        this.element.positionAt(0, 0);
        var result = new Size(this.element.offsetWidth, this.element.offsetHeight);
        this.element.positionAt(undefined, undefined);
        WebInspector.View._originalRemoveChild.call(document.body, this.element);
        this._disableCSSIfNeeded();
        return result;
    },
    calculateMinimumSize: function () {
        return new Size(0, 0);
    },
    minimumSize: function () {
        if (typeof this._minimumSize !== "undefined")
            return this._minimumSize;
        if (typeof this._cachedMinimumSize === "undefined")
            this._cachedMinimumSize = this.calculateMinimumSize();
        return this._cachedMinimumSize;
    },
    setMinimumSize: function (width, height) {
        this._minimumSize = new Size(width, height);
        this.invalidateMinimumSize();
    },
    _hasNonZeroMinimumSize: function () {
        var size = this.minimumSize();
        return size.width || size.height;
    },
    invalidateMinimumSize: function () {
        var cached = this._cachedMinimumSize;
        delete this._cachedMinimumSize;
        var actual = this.minimumSize();
        if (!actual.isEqual(cached) && this._parentView)
            this._parentView.invalidateMinimumSize();
        else
            this.doLayout();
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.View._originalAppendChild = Element.prototype.appendChild;
WebInspector.View._originalInsertBefore = Element.prototype.insertBefore;
WebInspector.View._originalRemoveChild = Element.prototype.removeChild;
WebInspector.View._originalRemoveChildren = Element.prototype.removeChildren;
WebInspector.View._incrementViewCounter = function (parentElement, childElement) {
    var count = (childElement.__viewCounter || 0) + (childElement.__view ? 1 : 0);
    if (!count)
        return;
    while (parentElement) {
        parentElement.__viewCounter = (parentElement.__viewCounter || 0) + count;
        parentElement = parentElement.parentElement;
    }
}
WebInspector.View._decrementViewCounter = function (parentElement, childElement) {
    var count = (childElement.__viewCounter || 0) + (childElement.__view ? 1 : 0);
    if (!count)
        return;
    while (parentElement) {
        parentElement.__viewCounter -= count;
        parentElement = parentElement.parentElement;
    }
}
WebInspector.View._assert = function (condition, message) {
    if (!condition) {
        console.trace();
        throw new Error(message);
    }
}
WebInspector.VBox = function () {
    WebInspector.View.call(this);
    this.element.classList.add("vbox");
};
WebInspector.VBox.prototype = {
    calculateMinimumSize: function () {
        var width = 0;
        var height = 0;

        function updateForChild() {
            var size = this.minimumSize();
            width = Math.max(width, size.width);
            height += size.height;
        }
        this._callOnVisibleChildren(updateForChild);
        return new Size(width, height);
    },
    __proto__: WebInspector.View.prototype
};
WebInspector.HBox = function () {
    WebInspector.View.call(this);
    this.element.classList.add("hbox");
};
WebInspector.HBox.prototype = {
    calculateMinimumSize: function () {
        var width = 0;
        var height = 0;

        function updateForChild() {
            var size = this.minimumSize();
            width += size.width;
            height = Math.max(height, size.height);
        }
        this._callOnVisibleChildren(updateForChild);
        return new Size(width, height);
    },
    __proto__: WebInspector.View.prototype
};
WebInspector.VBoxWithResizeCallback = function (resizeCallback) {
    WebInspector.VBox.call(this);
    this._resizeCallback = resizeCallback;
}
WebInspector.VBoxWithResizeCallback.prototype = {
    onResize: function () {
        this._resizeCallback();
    },
    __proto__: WebInspector.VBox.prototype
}
Element.prototype.appendChild = function (child) {
    WebInspector.View._assert(!child.__view || child.parentElement === this, "Attempt to add view via regular DOM operation.");
    return WebInspector.View._originalAppendChild.call(this, child);
}
Element.prototype.insertBefore = function (child, anchor) {
    WebInspector.View._assert(!child.__view || child.parentElement === this, "Attempt to add view via regular DOM operation.");
    return WebInspector.View._originalInsertBefore.call(this, child, anchor);
}
Element.prototype.removeChild = function (child) {
    WebInspector.View._assert(!child.__viewCounter && !child.__view, "Attempt to remove element containing view via regular DOM operation");
    return WebInspector.View._originalRemoveChild.call(this, child);
}
Element.prototype.removeChildren = function () {
    WebInspector.View._assert(!this.__viewCounter, "Attempt to remove element containing view via regular DOM operation");
    WebInspector.View._originalRemoveChildren.call(this);
}
WebInspector.installDragHandle = function (element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor) {
    element.addEventListener("mousedown", WebInspector.elementDragStart.bind(WebInspector, elementDragStart, elementDrag, elementDragEnd, cursor), false);
    if (hoverCursor !== null)
        element.style.cursor = hoverCursor || cursor;
}
WebInspector.elementDragStart = function (elementDragStart, elementDrag, elementDragEnd, cursor, event) {
    if (event.button || (WebInspector.isMac() && event.ctrlKey))
        return;
    if (WebInspector._elementDraggingEventListener)
        return;
    if (elementDragStart && !elementDragStart((event)))
        return;
    if (WebInspector._elementDraggingGlassPane) {
        WebInspector._elementDraggingGlassPane.dispose();
        delete WebInspector._elementDraggingGlassPane;
    }
    var targetDocument = event.target.ownerDocument;
    WebInspector._elementDraggingEventListener = elementDrag;
    WebInspector._elementEndDraggingEventListener = elementDragEnd;
    WebInspector._mouseOutWhileDraggingTargetDocument = targetDocument;
    targetDocument.addEventListener("mousemove", WebInspector._elementDragMove, true);
    targetDocument.addEventListener("mouseup", WebInspector._elementDragEnd, true);
    targetDocument.addEventListener("mouseout", WebInspector._mouseOutWhileDragging, true);
    targetDocument.body.style.cursor = cursor;
    event.preventDefault();
}
WebInspector._mouseOutWhileDragging = function () {
    WebInspector._unregisterMouseOutWhileDragging();
    WebInspector._elementDraggingGlassPane = new WebInspector.GlassPane();
}
WebInspector._unregisterMouseOutWhileDragging = function () {
    if (!WebInspector._mouseOutWhileDraggingTargetDocument)
        return;
    WebInspector._mouseOutWhileDraggingTargetDocument.removeEventListener("mouseout", WebInspector._mouseOutWhileDragging, true);
    delete WebInspector._mouseOutWhileDraggingTargetDocument;
}
WebInspector._elementDragMove = function (event) {
    if (WebInspector._elementDraggingEventListener((event)))
        WebInspector._cancelDragEvents(event);
}
WebInspector._cancelDragEvents = function (event) {
    var targetDocument = event.target.ownerDocument;
    targetDocument.removeEventListener("mousemove", WebInspector._elementDragMove, true);
    targetDocument.removeEventListener("mouseup", WebInspector._elementDragEnd, true);
    WebInspector._unregisterMouseOutWhileDragging();
    targetDocument.body.style.removeProperty("cursor");
    if (WebInspector._elementDraggingGlassPane)
        WebInspector._elementDraggingGlassPane.dispose();
    delete WebInspector._elementDraggingGlassPane;
    delete WebInspector._elementDraggingEventListener;
    delete WebInspector._elementEndDraggingEventListener;
}
WebInspector._elementDragEnd = function (event) {
    var elementDragEnd = WebInspector._elementEndDraggingEventListener;
    WebInspector._cancelDragEvents((event));
    event.preventDefault();
    if (elementDragEnd)
        elementDragEnd((event));
}
WebInspector.GlassPane = function () {
    this.element = document.createElement("div");
    this.element.style.cssText = "position:absolute;top:0;bottom:0;left:0;right:0;background-color:transparent;z-index:1000;";
    this.element.id = "glass-pane";
    document.body.appendChild(this.element);
    WebInspector._glassPane = this;
}
WebInspector.GlassPane.prototype = {
    dispose: function () {
        delete WebInspector._glassPane;
        if (WebInspector.HelpScreen.isVisible())
            WebInspector.HelpScreen.focus();
        else
            WebInspector.inspectorView.focus();
        this.element.remove();
    }
}
WebInspector.isBeingEdited = function (element) {
    if (element.classList.contains("text-prompt") || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA")
        return true;
    if (!WebInspector.__editingCount)
        return false;
    while (element) {
        if (element.__editing)
            return true;
        element = element.parentElement;
    }
    return false;
}
WebInspector.markBeingEdited = function (element, value) {
    if (value) {
        if (element.__editing)
            return false;
        element.classList.add("being-edited");
        element.__editing = true;
        WebInspector.__editingCount = (WebInspector.__editingCount || 0) + 1;
    } else {
        if (!element.__editing)
            return false;
        element.classList.remove("being-edited");
        delete element.__editing;
        --WebInspector.__editingCount;
    }
    return true;
}
WebInspector.CSSNumberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;
WebInspector.StyleValueDelimiters = " \xA0\t\n\"':;,/()";
WebInspector._valueModificationDirection = function (event) {
    var direction = null;
    if (event.type === "mousewheel") {
        if (event.wheelDeltaY > 0)
            direction = "Up";
        else if (event.wheelDeltaY < 0)
            direction = "Down";
    } else {
        if (event.keyIdentifier === "Up" || event.keyIdentifier === "PageUp")
            direction = "Up";
        else if (event.keyIdentifier === "Down" || event.keyIdentifier === "PageDown")
            direction = "Down";
    }
    return direction;
}
WebInspector._modifiedHexValue = function (hexString, event) {
    var direction = WebInspector._valueModificationDirection(event);
    if (!direction)
        return hexString;
    var number = parseInt(hexString, 16);
    if (isNaN(number) || !isFinite(number))
        return hexString;
    var maxValue = Math.pow(16, hexString.length) - 1;
    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var delta;
    if (arrowKeyOrMouseWheelEvent)
        delta = (direction === "Up") ? 1 : -1;
    else
        delta = (event.keyIdentifier === "PageUp") ? 16 : -16;
    if (event.shiftKey)
        delta *= 16;
    var result = number + delta;
    if (result < 0)
        result = 0;
    else if (result > maxValue)
        return hexString;
    var resultString = result.toString(16).toUpperCase();
    for (var i = 0, lengthDelta = hexString.length - resultString.length; i < lengthDelta; ++i)
        resultString = "0" + resultString;
    return resultString;
}
WebInspector._modifiedFloatNumber = function (number, event) {
    var direction = WebInspector._valueModificationDirection(event);
    if (!direction)
        return number;
    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var changeAmount = 1;
    if (event.shiftKey && !arrowKeyOrMouseWheelEvent)
        changeAmount = 100;
    else if (event.shiftKey || !arrowKeyOrMouseWheelEvent)
        changeAmount = 10;
    else if (event.altKey)
        changeAmount = 0.1;
    if (direction === "Down")
        changeAmount *= -1;
    var result = Number((number + changeAmount).toFixed(6));
    if (!String(result).match(WebInspector.CSSNumberRegex))
        return null;
    return result;
}
WebInspector.handleElementValueModifications = function (event, element, finishHandler, suggestionHandler, customNumberHandler) {
    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var pageKeyPressed = (event.keyIdentifier === "PageUp" || event.keyIdentifier === "PageDown");
    if (!arrowKeyOrMouseWheelEvent && !pageKeyPressed)
        return false;
    var selection = window.getSelection();
    if (!selection.rangeCount)
        return false;
    var selectionRange = selection.getRangeAt(0);
    if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element))
        return false;
    var originalValue = element.textContent;
    var wordRange = selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, WebInspector.StyleValueDelimiters, element);
    var wordString = wordRange.toString();
    if (suggestionHandler && suggestionHandler(wordString))
        return false;
    var replacementString;
    var prefix, suffix, number;
    var matches;
    matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
    if (matches && matches.length) {
        prefix = matches[1];
        suffix = matches[3];
        number = WebInspector._modifiedHexValue(matches[2], event);
        if (customNumberHandler)
            number = customNumberHandler(number);
        replacementString = prefix + number + suffix;
    } else {
        matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
        if (matches && matches.length) {
            prefix = matches[1];
            suffix = matches[3];
            number = WebInspector._modifiedFloatNumber(parseFloat(matches[2]), event);
            if (number === null)
                return false;
            if (customNumberHandler)
                number = customNumberHandler(number);
            replacementString = prefix + number + suffix;
        }
    }
    if (replacementString) {
        var replacementTextNode = document.createTextNode(replacementString);
        wordRange.deleteContents();
        wordRange.insertNode(replacementTextNode);
        var finalSelectionRange = document.createRange();
        finalSelectionRange.setStart(replacementTextNode, 0);
        finalSelectionRange.setEnd(replacementTextNode, replacementString.length);
        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);
        event.handled = true;
        event.preventDefault();
        if (finishHandler)
            finishHandler(originalValue, replacementString);
        return true;
    }
    return false;
}
Number.preciseMillisToString = function (ms, precision) {
    precision = precision || 0;
    var format = "%." + precision + "f\u2009ms";
    return WebInspector.UIString(format, ms);
}
Number.millisToString = function (ms, higherResolution) {
    if (!isFinite(ms))
        return "-";
    if (ms === 0)
        return "0";
    if (higherResolution && ms < 1000)
        return WebInspector.UIString("%.3f\u2009ms", ms);
    else if (ms < 1000)
        return WebInspector.UIString("%.0f\u2009ms", ms);
    var seconds = ms / 1000;
    if (seconds < 60)
        return WebInspector.UIString("%.2f\u2009s", seconds);
    var minutes = seconds / 60;
    if (minutes < 60)
        return WebInspector.UIString("%.1f\u2009min", minutes);
    var hours = minutes / 60;
    if (hours < 24)
        return WebInspector.UIString("%.1f\u2009hrs", hours);
    var days = hours / 24;
    return WebInspector.UIString("%.1f\u2009days", days);
}
Number.secondsToString = function (seconds, higherResolution) {
    if (!isFinite(seconds))
        return "-";
    return Number.millisToString(seconds * 1000, higherResolution);
}
Number.bytesToString = function (bytes) {
    if (bytes < 1024)
        return WebInspector.UIString("%.0f\u2009B", bytes);
    var kilobytes = bytes / 1024;
    if (kilobytes < 100)
        return WebInspector.UIString("%.1f\u2009KB", kilobytes);
    if (kilobytes < 1024)
        return WebInspector.UIString("%.0f\u2009KB", kilobytes);
    var megabytes = kilobytes / 1024;
    if (megabytes < 100)
        return WebInspector.UIString("%.1f\u2009MB", megabytes);
    else
        return WebInspector.UIString("%.0f\u2009MB", megabytes);
}
Number.withThousandsSeparator = function (num) {
    var str = num + "";
    var re = /(\d+)(\d{3})/;
    while (str.match(re))
        str = str.replace(re, "$1\u2009$2");
    return str;
}
WebInspector.useLowerCaseMenuTitles = function () {
    return WebInspector.platform() === "windows";
}
WebInspector.formatLocalized = function (format, substitutions, formatters, initialValue, append) {
    return String.format(WebInspector.UIString(format), substitutions, formatters, initialValue, append);
}
WebInspector.openLinkExternallyLabel = function () {
    return WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Open link in new tab" : "Open Link in New Tab");
}
WebInspector.copyLinkAddressLabel = function () {
    return WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy link address" : "Copy Link Address");
}
WebInspector.installPortStyles = function () {
    var platform = WebInspector.platform();
    document.body.classList.add("platform-" + platform);
    var flavor = WebInspector.platformFlavor();
    if (flavor)
        document.body.classList.add("platform-" + flavor);
    var port = WebInspector.port();
    document.body.classList.add("port-" + port);
}
WebInspector._windowFocused = function (event) {
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.classList.remove("inactive");
}
WebInspector._windowBlurred = function (event) {
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.classList.add("inactive");
}
WebInspector.previousFocusElement = function () {
    return WebInspector._previousFocusElement;
}
WebInspector.currentFocusElement = function () {
    return WebInspector._currentFocusElement;
}
WebInspector._focusChanged = function (event) {
    WebInspector.setCurrentFocusElement(event.target);
}
WebInspector._documentBlurred = function (event) {
    if (!event.relatedTarget && document.activeElement === document.body)
        WebInspector.setCurrentFocusElement(null);
}
WebInspector._textInputTypes = ["text", "search", "tel", "url", "email", "password"].keySet();
WebInspector._isTextEditingElement = function (element) {
    if (element instanceof HTMLInputElement)
        return element.type in WebInspector._textInputTypes;
    if (element instanceof HTMLTextAreaElement)
        return true;
    return false;
}
WebInspector.setCurrentFocusElement = function (x) {
    if (WebInspector._glassPane && x && !WebInspector._glassPane.element.isAncestor(x))
        return;
    if (WebInspector._currentFocusElement !== x)
        WebInspector._previousFocusElement = WebInspector._currentFocusElement;
    WebInspector._currentFocusElement = x;
    if (WebInspector._currentFocusElement) {
        WebInspector._currentFocusElement.focus();
        var selection = window.getSelection();
        if (!WebInspector._isTextEditingElement(WebInspector._currentFocusElement) && selection.isCollapsed && !WebInspector._currentFocusElement.isInsertionCaretInside()) {
            var selectionRange = WebInspector._currentFocusElement.ownerDocument.createRange();
            selectionRange.setStart(WebInspector._currentFocusElement, 0);
            selectionRange.setEnd(WebInspector._currentFocusElement, 0);
            selection.removeAllRanges();
            selection.addRange(selectionRange);
        }
    } else if (WebInspector._previousFocusElement)
        WebInspector._previousFocusElement.blur();
}
WebInspector.restoreFocusFromElement = function (element) {
    if (element && element.isSelfOrAncestor(WebInspector.currentFocusElement()))
        WebInspector.setCurrentFocusElement(WebInspector.previousFocusElement());
}
WebInspector.setToolbarColors = function (backgroundColor, color) {
    if (!WebInspector._themeStyleElement) {
        WebInspector._themeStyleElement = document.createElement("style");
        document.head.appendChild(WebInspector._themeStyleElement);
    }
    var parsedColor = WebInspector.Color.parse(color);
    var shadowColor = parsedColor ? parsedColor.invert().setAlpha(0.33).toString(WebInspector.Color.Format.RGBA) : "white";
    var prefix = WebInspector.isMac() ? "body:not(.undocked)" : "";
    WebInspector._themeStyleElement.textContent = String.sprintf("%s .toolbar-background {\
                 background-image: none !important;\
                 background-color: %s !important;\
                 color: %s !important;\
             }", prefix, backgroundColor, color) +
        String.sprintf("%s .toolbar-background button.status-bar-item .glyph, %s .toolbar-background button.status-bar-item .long-click-glyph {\
                 background-color: %s;\
             }", prefix, prefix, color) +
        String.sprintf("%s .toolbar-background button.status-bar-item .glyph.shadow, %s .toolbar-background button.status-bar-item .long-click-glyph.shadow {\
                 background-color: %s;\
             }", prefix, prefix, shadowColor);
}
WebInspector.resetToolbarColors = function () {
    if (WebInspector._themeStyleElement)
        WebInspector._themeStyleElement.textContent = "";
}
WebInspector.highlightSearchResult = function (element, offset, length, domChanges) {
    var result = WebInspector.highlightSearchResults(element, [new WebInspector.SourceRange(offset, length)], domChanges);
    return result.length ? result[0] : null;
}
WebInspector.highlightSearchResults = function (element, resultRanges, changes) {
    return WebInspector.highlightRangesWithStyleClass(element, resultRanges, "highlighted-search-result", changes);
}
WebInspector.runCSSAnimationOnce = function (element, className) {
    function animationEndCallback() {
        element.classList.remove(className);
        element.removeEventListener("animationend", animationEndCallback, false);
    }
    if (element.classList.contains(className))
        element.classList.remove(className);
    element.addEventListener("animationend", animationEndCallback, false);
    element.classList.add(className);
}
WebInspector.highlightRangesWithStyleClass = function (element, resultRanges, styleClass, changes) {
    changes = changes || [];
    var highlightNodes = [];
    var lineText = element.textContent;
    var ownerDocument = element.ownerDocument;
    var textNodeSnapshot = ownerDocument.evaluate(".//text()", element, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var snapshotLength = textNodeSnapshot.snapshotLength;
    if (snapshotLength === 0)
        return highlightNodes;
    var nodeRanges = [];
    var rangeEndOffset = 0;
    for (var i = 0; i < snapshotLength; ++i) {
        var range = {};
        range.offset = rangeEndOffset;
        range.length = textNodeSnapshot.snapshotItem(i).textContent.length;
        rangeEndOffset = range.offset + range.length;
        nodeRanges.push(range);
    }
    var startIndex = 0;
    for (var i = 0; i < resultRanges.length; ++i) {
        var startOffset = resultRanges[i].offset;
        var endOffset = startOffset + resultRanges[i].length;
        while (startIndex < snapshotLength && nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset)
            startIndex++;
        var endIndex = startIndex;
        while (endIndex < snapshotLength && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset)
            endIndex++;
        if (endIndex === snapshotLength)
            break;
        var highlightNode = ownerDocument.createElement("span");
        highlightNode.className = styleClass;
        highlightNode.textContent = lineText.substring(startOffset, endOffset);
        var lastTextNode = textNodeSnapshot.snapshotItem(endIndex);
        var lastText = lastTextNode.textContent;
        lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
        changes.push({
            node: lastTextNode,
            type: "changed",
            oldText: lastText,
            newText: lastTextNode.textContent
        });
        if (startIndex === endIndex) {
            lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
            changes.push({
                node: highlightNode,
                type: "added",
                nextSibling: lastTextNode,
                parent: lastTextNode.parentElement
            });
            highlightNodes.push(highlightNode);
            var prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
            lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
            changes.push({
                node: prefixNode,
                type: "added",
                nextSibling: highlightNode,
                parent: lastTextNode.parentElement
            });
        } else {
            var firstTextNode = textNodeSnapshot.snapshotItem(startIndex);
            var firstText = firstTextNode.textContent;
            var anchorElement = firstTextNode.nextSibling;
            firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
            changes.push({
                node: highlightNode,
                type: "added",
                nextSibling: anchorElement,
                parent: firstTextNode.parentElement
            });
            highlightNodes.push(highlightNode);
            firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
            changes.push({
                node: firstTextNode,
                type: "changed",
                oldText: firstText,
                newText: firstTextNode.textContent
            });
            for (var j = startIndex + 1; j < endIndex; j++) {
                var textNode = textNodeSnapshot.snapshotItem(j);
                var text = textNode.textContent;
                textNode.textContent = "";
                changes.push({
                    node: textNode,
                    type: "changed",
                    oldText: text,
                    newText: textNode.textContent
                });
            }
        }
        startIndex = endIndex;
        nodeRanges[startIndex].offset = endOffset;
        nodeRanges[startIndex].length = lastTextNode.textContent.length;
    }
    return highlightNodes;
}
WebInspector.applyDomChanges = function (domChanges) {
    for (var i = 0, size = domChanges.length; i < size; ++i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.parent.insertBefore(entry.node, entry.nextSibling);
            break;
        case "changed":
            entry.node.textContent = entry.newText;
            break;
        }
    }
}
WebInspector.revertDomChanges = function (domChanges) {
    for (var i = domChanges.length - 1; i >= 0; --i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.node.remove();
            break;
        case "changed":
            entry.node.textContent = entry.oldText;
            break;
        }
    }
}
WebInspector._coalescingLevel = 0;
WebInspector.startBatchUpdate = function () {
    if (!WebInspector._coalescingLevel)
        WebInspector._postUpdateHandlers = new Map();
    WebInspector._coalescingLevel++;
}
WebInspector.endBatchUpdate = function () {
    if (--WebInspector._coalescingLevel)
        return;
    var handlers = WebInspector._postUpdateHandlers;
    delete WebInspector._postUpdateHandlers;
    window.requestAnimationFrame(function () {
        if (WebInspector._coalescingLevel)
            return;
        var keys = handlers.keys();
        for (var i = 0; i < keys.length; ++i) {
            var object = keys[i];
            var methods = handlers.get(object).keys();
            for (var j = 0; j < methods.length; ++j)
                methods[j].call(object);
        }
    });
}
WebInspector.invokeOnceAfterBatchUpdate = function (object, method) {
    if (!WebInspector._coalescingLevel) {
        window.requestAnimationFrame(function () {
            if (!WebInspector._coalescingLevel)
                method.call(object);
        });
        return;
    }
    var methods = WebInspector._postUpdateHandlers.get(object);
    if (!methods) {
        methods = new Map();
        WebInspector._postUpdateHandlers.put(object, methods);
    }
    methods.put(method);
};
(function () {
    function windowLoaded() {
        window.addEventListener("focus", WebInspector._windowFocused, false);
        window.addEventListener("blur", WebInspector._windowBlurred, false);
        document.addEventListener("focus", WebInspector._focusChanged, true);
        document.addEventListener("blur", WebInspector._documentBlurred, true);
        window.removeEventListener("DOMContentLoaded", windowLoaded, false);
    }
    window.addEventListener("DOMContentLoaded", windowLoaded, false);
})();
WebInspector.HelpScreen = function (title) {
    WebInspector.VBox.call(this);
    this.markAsRoot();
    this.registerRequiredCSS("helpScreen.css");
    this.element.classList.add("help-window-outer");
    this.element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this.element.tabIndex = 0;
    if (title) {
        var mainWindow = this.element.createChild("div", "help-window-main");
        var captionWindow = mainWindow.createChild("div", "help-window-caption");
        captionWindow.appendChild(this._createCloseButton());
        this.contentElement = mainWindow.createChild("div", "help-content");
        captionWindow.createChild("h1", "help-window-title").textContent = title;
    }
}
WebInspector.HelpScreen._visibleScreen = null;
WebInspector.HelpScreen.isVisible = function () {
    return !!WebInspector.HelpScreen._visibleScreen;
}
WebInspector.HelpScreen.focus = function () {
    WebInspector.HelpScreen._visibleScreen.element.focus();
}
WebInspector.HelpScreen.prototype = {
    _createCloseButton: function () {
        var closeButton = document.createElement("div");
        closeButton.className = "help-close-button close-button-gray";
        closeButton.addEventListener("click", this.hide.bind(this), false);
        return closeButton;
    },
    showModal: function () {
        var visibleHelpScreen = WebInspector.HelpScreen._visibleScreen;
        if (visibleHelpScreen === this)
            return;
        if (visibleHelpScreen)
            visibleHelpScreen.hide();
        WebInspector.HelpScreen._visibleScreen = this;
        this.show(WebInspector.inspectorView.element);
        this.focus();
    },
    hide: function () {
        if (!this.isShowing())
            return;
        WebInspector.HelpScreen._visibleScreen = null;
        WebInspector.restoreFocusFromElement(this.element);
        this.detach();
    },
    isClosingKey: function (keyCode) {
        return [WebInspector.KeyboardShortcut.Keys.Enter.code, WebInspector.KeyboardShortcut.Keys.Esc.code, WebInspector.KeyboardShortcut.Keys.Space.code, ].indexOf(keyCode) >= 0;
    },
    _onKeyDown: function (event) {
        if (this.isShowing() && this.isClosingKey(event.keyCode)) {
            this.hide();
            event.consume();
        }
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.RemoteDebuggingTerminatedScreen = function (reason) {
    WebInspector.HelpScreen.call(this, WebInspector.UIString("Detached from the target"));
    var p = this.contentElement.createChild("p");
    p.classList.add("help-section");
    p.createChild("span").textContent = WebInspector.UIString("Remote debugging has been terminated with reason: ");
    p.createChild("span", "error-message").textContent = reason;
    p.createChild("br");
    p.createChild("span").textContent = WebInspector.UIString("Please re-attach to the new target.");
}
WebInspector.RemoteDebuggingTerminatedScreen.prototype = {
    __proto__: WebInspector.HelpScreen.prototype
}
WebInspector.WorkerTerminatedScreen = function () {
    WebInspector.HelpScreen.call(this, WebInspector.UIString("Inspected worker terminated"));
    var p = this.contentElement.createChild("p");
    p.classList.add("help-section");
    p.textContent = WebInspector.UIString("Inspected worker has terminated. Once it restarts we will attach to it automatically.");
}
WebInspector.WorkerTerminatedScreen.prototype = {
    __proto__: WebInspector.HelpScreen.prototype
}
if (!window.InspectorFrontendHost) {
    WebInspector.InspectorFrontendHostStub = function () {
        this.isStub = false;
    }
    WebInspector.InspectorFrontendHostStub.prototype = {
        getSelectionBackgroundColor: function () {
            return "#6e86ff";
        },
        getSelectionForegroundColor: function () {
            return "#ffffff";
        },
        platform: function () {
            var match = navigator.userAgent.match(/Windows NT/);
            if (match)
                return "windows";
            match = navigator.userAgent.match(/Mac OS X/);
            if (match)
                return "mac";
            return "linux";
        },
        port: function () {
            return "unknown";
        },
        bringToFront: function () {
            this._windowVisible = true;
        },
        closeWindow: function () {
            this._windowVisible = false;
        },
        setIsDocked: function (isDocked) {},
        setContentsResizingStrategy: function (insets, minSize) {},
        inspectElementCompleted: function () {},
        moveWindowBy: function (x, y) {},
        setInjectedScriptForOrigin: function (origin, script) {},
        inspectedURLChanged: function (url) {
            document.title = WebInspector.UIString(Preferences.applicationTitle, url);
        },
        copyText: function (text) {
            WebInspector.console.log("Clipboard is not enabled in hosted mode. Please inspect using chrome://inspect", WebInspector.ConsoleMessage.MessageLevel.Error, true);
        },
        openInNewTab: function (url) {
            window.open(url, "_blank");
        },
        save: function (url, content, forceSaveAs) {
            WebInspector.console.log("Saving files is not enabled in hosted mode. Please inspect using chrome://inspect", WebInspector.ConsoleMessage.MessageLevel.Error, true);
            WebInspector.fileManager.canceledSaveURL(url);
        },
        append: function (url, content) {
            WebInspector.console.log("Saving files is not enabled in hosted mode. Please inspect using chrome://inspect", WebInspector.ConsoleMessage.MessageLevel.Error, true);
        },
        sendMessageToBackend: function (message) {
            var message = JSON.parse(message);

            console.info('sendMessageToBackend', message);
            // zirak: this is where we come in...
            var res;

            // not much we can do
            if (message.method === 'Console.enable') {
                return true;
            }
            // coathanger
            else if (message.method === 'Runtime.evaluate') {
                //good for now...but we need something better.
                var evaled = eval(message.params.expression);
                res = {
                    result : {
                        result : {
                            value : evaled,
                            type : typeof evaled,
                            description : String(evaled)
                        },
                        wasThrown : false
                    },
                    id : message.id
                };

                InspectorBackend._connection.dispatch(res);
            }
            else {
                console.warn(message);
            }
        },
        sendMessageToEmbedder: function (message) {
            console.info('sendMessageToEmbedder', message);
        },
        recordActionTaken: function (actionCode) {},
        recordPanelShown: function (panelCode) {},
        requestFileSystems: function () {},
        addFileSystem: function () {},
        removeFileSystem: function (fileSystemPath) {},
        isolatedFileSystem: function (fileSystemId, registeredName) {
            return null;
        },
        upgradeDraggedFileSystemPermissions: function (domFileSystem) {},
        indexPath: function (requestId, fileSystemPath) {},
        stopIndexing: function (requestId) {},
        searchInPath: function (requestId, fileSystemPath, query) {},
        setZoomFactor: function (zoom) {},
        zoomFactor: function () {
            return 1;
        },
        zoomIn: function () {},
        zoomOut: function () {},
        resetZoom: function () {},
        isUnderTest: function () {
            return false;
        }
    }
    InspectorFrontendHost = new WebInspector.InspectorFrontendHostStub();
}

WebInspector.Checkbox = function (label, className, tooltip) {
    this.element = document.createElement('label');
    this._inputElement = document.createElement('input');
    this._inputElement.type = "checkbox";
    this.element.className = className;
    this.element.appendChild(this._inputElement);
    this.element.appendChild(document.createTextNode(label));
    if (tooltip)
        this.element.title = tooltip;
}
WebInspector.Checkbox.prototype = {
    set checked(checked) {
        this._inputElement.checked = checked;
    }, get checked() {
        return this._inputElement.checked;
    }, addEventListener: function (listener) {
        function listenerWrapper(event) {
            if (listener)
                listener(event);
            event.consume();
            return true;
        }
        this._inputElement.addEventListener("click", listenerWrapper, false);
        this.element.addEventListener("click", listenerWrapper, false);
    }
}
WebInspector.ContextMenuItem = function (topLevelMenu, type, label, disabled, checked) {
    this._type = type;
    this._label = label;
    this._disabled = disabled;
    this._checked = checked;
    this._contextMenu = topLevelMenu;
    if (type === "item" || type === "checkbox")
        this._id = topLevelMenu.nextId();
}
WebInspector.ContextMenuItem.prototype = {
    id: function () {
        return this._id;
    },
    type: function () {
        return this._type;
    },
    isEnabled: function () {
        return !this._disabled;
    },
    setEnabled: function (enabled) {
        this._disabled = !enabled;
    },
    _buildDescriptor: function () {
        switch (this._type) {
        case "item":
            return {
                type: "item",
                id: this._id,
                label: this._label,
                enabled: !this._disabled
            };
        case "separator":
            return {
                type: "separator"
            };
        case "checkbox":
            return {
                type: "checkbox",
                id: this._id,
                label: this._label,
                checked: !!this._checked,
                enabled: !this._disabled
            };
        }
    }
}
WebInspector.ContextSubMenuItem = function (topLevelMenu, label, disabled) {
    WebInspector.ContextMenuItem.call(this, topLevelMenu, "subMenu", label, disabled);
    this._items = [];
}
WebInspector.ContextSubMenuItem.prototype = {
    appendItem: function (label, handler, disabled) {
        var item = new WebInspector.ContextMenuItem(this._contextMenu, "item", label, disabled);
        this._pushItem(item);
        this._contextMenu._setHandler(item.id(), handler);
        return item;
    },
    appendSubMenuItem: function (label, disabled) {
        var item = new WebInspector.ContextSubMenuItem(this._contextMenu, label, disabled);
        this._pushItem(item);
        return item;
    },
    appendCheckboxItem: function (label, handler, checked, disabled) {
        var item = new WebInspector.ContextMenuItem(this._contextMenu, "checkbox", label, disabled, checked);
        this._pushItem(item);
        this._contextMenu._setHandler(item.id(), handler);
        return item;
    },
    appendSeparator: function () {
        if (this._items.length)
            this._pendingSeparator = true;
    },
    _pushItem: function (item) {
        if (this._pendingSeparator) {
            this._items.push(new WebInspector.ContextMenuItem(this._contextMenu, "separator"));
            delete this._pendingSeparator;
        }
        this._items.push(item);
    },
    isEmpty: function () {
        return !this._items.length;
    },
    _buildDescriptor: function () {
        var result = {
            type: "subMenu",
            label: this._label,
            enabled: !this._disabled,
            subItems: []
        };
        for (var i = 0; i < this._items.length; ++i)
            result.subItems.push(this._items[i]._buildDescriptor());
        return result;
    },
    __proto__: WebInspector.ContextMenuItem.prototype
}
WebInspector.ContextMenu = function (event) {
    WebInspector.ContextSubMenuItem.call(this, this, "");
    this._event = event;
    this._handlers = {};
    this._id = 0;
}
WebInspector.ContextMenu.setUseSoftMenu = function (useSoftMenu) {
    WebInspector.ContextMenu._useSoftMenu = useSoftMenu;
}
WebInspector.ContextMenu.prototype = {
    nextId: function () {
        return this._id++;
    },
    show: function () {
        var menuObject = this._buildDescriptor();
        if (menuObject.length) {
            WebInspector._contextMenu = this;
            if (WebInspector.ContextMenu._useSoftMenu) {
                var softMenu = new WebInspector.SoftContextMenu(menuObject);
                softMenu.show(this._event);
            } else {
                InspectorFrontendHost.showContextMenu(this._event, menuObject);
            }
            this._event.consume();
        }
    },
    _setHandler: function (id, handler) {
        if (handler)
            this._handlers[id] = handler;
    },
    _buildDescriptor: function () {
        var result = [];
        for (var i = 0; i < this._items.length; ++i)
            result.push(this._items[i]._buildDescriptor());
        return result;
    },
    _itemSelected: function (id) {
        if (this._handlers[id])
            this._handlers[id].call(this);
    },
    appendApplicableItems: function (target) {
        WebInspector.moduleManager.extensions(WebInspector.ContextMenu.Provider, target).forEach(processProviders.bind(this));

        function processProviders(extension) {
            var provider = (extension.instance());
            this.appendSeparator();
            provider.appendApplicableItems(this._event, this, target);
            this.appendSeparator();
        }
    },
    __proto__: WebInspector.ContextSubMenuItem.prototype
}
WebInspector.ContextMenu.Provider = function () {}
WebInspector.ContextMenu.Provider.prototype = {
    appendApplicableItems: function (event, contextMenu, target) {}
}
WebInspector.contextMenuItemSelected = function (id) {
    if (WebInspector._contextMenu)
        WebInspector._contextMenu._itemSelected(id);
}
WebInspector.contextMenuCleared = function () {}
WebInspector.SoftContextMenu = function (items, parentMenu) {
    this._items = items;
    this._parentMenu = parentMenu;
}
WebInspector.SoftContextMenu.prototype = {
    show: function (event) {
        this._x = event.x;
        this._y = event.y;
        this._time = new Date().getTime();
        var absoluteX = event.pageX;
        var absoluteY = event.pageY;
        var targetElement = event.target;
        while (targetElement && window !== targetElement.ownerDocument.defaultView) {
            var frameElement = targetElement.ownerDocument.defaultView.frameElement;
            absoluteY += frameElement.totalOffsetTop();
            absoluteX += frameElement.totalOffsetLeft();
            targetElement = frameElement;
        }
        var targetRect;
        this._contextMenuElement = document.createElement("div");
        this._contextMenuElement.className = "soft-context-menu";
        this._contextMenuElement.tabIndex = 0;
        this._contextMenuElement.style.top = absoluteY + "px";
        this._contextMenuElement.style.left = absoluteX + "px";
        this._contextMenuElement.addEventListener("mouseup", consumeEvent, false);
        this._contextMenuElement.addEventListener("keydown", this._menuKeyDown.bind(this), false);
        for (var i = 0; i < this._items.length; ++i)
            this._contextMenuElement.appendChild(this._createMenuItem(this._items[i]));
        if (!this._parentMenu) {
            this._glassPaneElement = document.createElement("div");
            this._glassPaneElement.className = "soft-context-menu-glass-pane";
            this._glassPaneElement.tabIndex = 0;
            this._glassPaneElement.addEventListener("mouseup", this._glassPaneMouseUp.bind(this), false);
            this._glassPaneElement.appendChild(this._contextMenuElement);
            document.body.appendChild(this._glassPaneElement);
            this._focus();
        } else
            this._parentMenu._parentGlassPaneElement().appendChild(this._contextMenuElement);
        if (document.body.offsetWidth < this._contextMenuElement.offsetLeft + this._contextMenuElement.offsetWidth)
            this._contextMenuElement.style.left = (absoluteX - this._contextMenuElement.offsetWidth) + "px";
        if (document.body.offsetHeight < this._contextMenuElement.offsetTop + this._contextMenuElement.offsetHeight)
            this._contextMenuElement.style.top = (document.body.offsetHeight - this._contextMenuElement.offsetHeight) + "px";
        event.consume(true);
    },
    _parentGlassPaneElement: function () {
        if (this._glassPaneElement)
            return this._glassPaneElement;
        if (this._parentMenu)
            return this._parentMenu._parentGlassPaneElement();
        return null;
    },
    _createMenuItem: function (item) {
        if (item.type === "separator")
            return this._createSeparator();
        if (item.type === "subMenu")
            return this._createSubMenu(item);
        var menuItemElement = document.createElement("div");
        menuItemElement.className = "soft-context-menu-item";
        var checkMarkElement = document.createElement("span");
        checkMarkElement.textContent = "\u2713 ";
        checkMarkElement.className = "soft-context-menu-item-checkmark";
        if (!item.checked)
            checkMarkElement.style.opacity = "0";
        menuItemElement.appendChild(checkMarkElement);
        menuItemElement.appendChild(document.createTextNode(item.label));
        menuItemElement.addEventListener("mousedown", this._menuItemMouseDown.bind(this), false);
        menuItemElement.addEventListener("mouseup", this._menuItemMouseUp.bind(this), false);
        menuItemElement.addEventListener("mouseover", this._menuItemMouseOver.bind(this), false);
        menuItemElement.addEventListener("mouseout", this._menuItemMouseOut.bind(this), false);
        menuItemElement._actionId = item.id;
        return menuItemElement;
    },
    _createSubMenu: function (item) {
        var menuItemElement = document.createElement("div");
        menuItemElement.className = "soft-context-menu-item";
        menuItemElement._subItems = item.subItems;
        var checkMarkElement = document.createElement("span");
        checkMarkElement.textContent = "\u2713 ";
        checkMarkElement.className = "soft-context-menu-item-checkmark";
        checkMarkElement.style.opacity = "0";
        menuItemElement.appendChild(checkMarkElement);
        var subMenuArrowElement = document.createElement("span");
        subMenuArrowElement.textContent = "\u25B6";
        subMenuArrowElement.className = "soft-context-menu-item-submenu-arrow";
        menuItemElement.appendChild(document.createTextNode(item.label));
        menuItemElement.appendChild(subMenuArrowElement);
        menuItemElement.addEventListener("mousedown", this._menuItemMouseDown.bind(this), false);
        menuItemElement.addEventListener("mouseup", this._menuItemMouseUp.bind(this), false);
        menuItemElement.addEventListener("mouseover", this._menuItemMouseOver.bind(this), false);
        menuItemElement.addEventListener("mouseout", this._menuItemMouseOut.bind(this), false);
        return menuItemElement;
    },
    _createSeparator: function () {
        var separatorElement = document.createElement("div");
        separatorElement.className = "soft-context-menu-separator";
        separatorElement._isSeparator = true;
        separatorElement.addEventListener("mouseover", this._hideSubMenu.bind(this), false);
        separatorElement.createChild("div", "separator-line");
        return separatorElement;
    },
    _menuItemMouseDown: function (event) {
        event.consume(true);
    },
    _menuItemMouseUp: function (event) {
        this._triggerAction(event.target, event);
        event.consume();
    },
    _focus: function () {
        this._contextMenuElement.focus();
    },
    _triggerAction: function (menuItemElement, event) {
        if (!menuItemElement._subItems) {
            this._discardMenu(true, event);
            if (typeof menuItemElement._actionId !== "undefined") {
                WebInspector.contextMenuItemSelected(menuItemElement._actionId);
                delete menuItemElement._actionId;
            }
            return;
        }
        this._showSubMenu(menuItemElement, event);
        event.consume();
    },
    _showSubMenu: function (menuItemElement, event) {
        if (menuItemElement._subMenuTimer) {
            clearTimeout(menuItemElement._subMenuTimer);
            delete menuItemElement._subMenuTimer;
        }
        if (this._subMenu)
            return;
        this._subMenu = new WebInspector.SoftContextMenu(menuItemElement._subItems, this);
        this._subMenu.show(this._buildMouseEventForSubMenu(menuItemElement));
    },
    _buildMouseEventForSubMenu: function (subMenuItemElement) {
        var subMenuOffset = {
            x: subMenuItemElement.offsetWidth - 3,
            y: subMenuItemElement.offsetTop - 1
        };
        var targetX = this._x + subMenuOffset.x;
        var targetY = this._y + subMenuOffset.y;
        var targetPageX = parseInt(this._contextMenuElement.style.left, 10) + subMenuOffset.x;
        var targetPageY = parseInt(this._contextMenuElement.style.top, 10) + subMenuOffset.y;
        return {
            x: targetX,
            y: targetY,
            pageX: targetPageX,
            pageY: targetPageY,
            consume: function () {}
        };
    },
    _hideSubMenu: function () {
        if (!this._subMenu)
            return;
        this._subMenu._discardSubMenus();
        this._focus();
    },
    _menuItemMouseOver: function (event) {
        this._highlightMenuItem(event.target);
    },
    _menuItemMouseOut: function (event) {
        if (!this._subMenu || !event.relatedTarget) {
            this._highlightMenuItem(null);
            return;
        }
        var relatedTarget = event.relatedTarget;
        if (this._contextMenuElement.isSelfOrAncestor(relatedTarget) || relatedTarget.classList.contains("soft-context-menu-glass-pane"))
            this._highlightMenuItem(null);
    },
    _highlightMenuItem: function (menuItemElement) {
        if (this._highlightedMenuItemElement === menuItemElement)
            return;
        this._hideSubMenu();
        if (this._highlightedMenuItemElement) {
            this._highlightedMenuItemElement.classList.remove("soft-context-menu-item-mouse-over");
            if (this._highlightedMenuItemElement._subItems && this._highlightedMenuItemElement._subMenuTimer) {
                clearTimeout(this._highlightedMenuItemElement._subMenuTimer);
                delete this._highlightedMenuItemElement._subMenuTimer;
            }
        }
        this._highlightedMenuItemElement = menuItemElement;
        if (this._highlightedMenuItemElement) {
            this._highlightedMenuItemElement.classList.add("soft-context-menu-item-mouse-over");
            this._contextMenuElement.focus();
            if (this._highlightedMenuItemElement._subItems && !this._highlightedMenuItemElement._subMenuTimer)
                this._highlightedMenuItemElement._subMenuTimer = setTimeout(this._showSubMenu.bind(this, this._highlightedMenuItemElement, this._buildMouseEventForSubMenu(this._highlightedMenuItemElement)), 150);
        }
    },
    _highlightPrevious: function () {
        var menuItemElement = this._highlightedMenuItemElement ? this._highlightedMenuItemElement.previousSibling : this._contextMenuElement.lastChild;
        while (menuItemElement && menuItemElement._isSeparator)
            menuItemElement = menuItemElement.previousSibling;
        if (menuItemElement)
            this._highlightMenuItem(menuItemElement);
    },
    _highlightNext: function () {
        var menuItemElement = this._highlightedMenuItemElement ? this._highlightedMenuItemElement.nextSibling : this._contextMenuElement.firstChild;
        while (menuItemElement && menuItemElement._isSeparator)
            menuItemElement = menuItemElement.nextSibling;
        if (menuItemElement)
            this._highlightMenuItem(menuItemElement);
    },
    _menuKeyDown: function (event) {
        switch (event.keyIdentifier) {
        case "Up":
            this._highlightPrevious();
            break;
        case "Down":
            this._highlightNext();
            break;
        case "Left":
            if (this._parentMenu) {
                this._highlightMenuItem(null);
                this._parentMenu._focus();
            }
            break;
        case "Right":
            if (!this._highlightedMenuItemElement)
                break;
            if (this._highlightedMenuItemElement._subItems) {
                this._showSubMenu(this._highlightedMenuItemElement, this._buildMouseEventForSubMenu(this._highlightedMenuItemElement));
                this._subMenu._focus();
                this._subMenu._highlightNext();
            }
            break;
        case "U+001B":
            this._discardMenu(true, event);
            break;
        case "Enter":
            if (!isEnterKey(event))
                break;
        case "U+0020":
            if (this._highlightedMenuItemElement)
                this._triggerAction(this._highlightedMenuItemElement, event);
            break;
        }
        event.consume(true);
    },
    _glassPaneMouseUp: function (event) {
        if (event.x === this._x && event.y === this._y && new Date().getTime() - this._time < 300)
            return;
        this._discardMenu(true, event);
        event.consume();
    },
    _discardMenu: function (closeParentMenus, event) {
        if (this._subMenu && !closeParentMenus)
            return;
        if (this._glassPaneElement) {
            var glassPane = this._glassPaneElement;
            delete this._glassPaneElement;
            document.body.removeChild(glassPane);
            if (this._parentMenu) {
                delete this._parentMenu._subMenu;
                if (closeParentMenus)
                    this._parentMenu._discardMenu(closeParentMenus, event);
            }
            if (event)
                event.consume(true);
        } else if (this._parentMenu && this._contextMenuElement.parentElement) {
            this._discardSubMenus();
            if (closeParentMenus)
                this._parentMenu._discardMenu(closeParentMenus, event);
            if (event)
                event.consume(true);
        }
    },
    _discardSubMenus: function () {
        if (this._subMenu)
            this._subMenu._discardSubMenus();
        this._contextMenuElement.remove();
        if (this._parentMenu)
            delete this._parentMenu._subMenu;
    }
}
if (!InspectorFrontendHost.showContextMenu) {
    InspectorFrontendHost.showContextMenu = function (event, items) {
        new WebInspector.SoftContextMenu(items).show(event);
    }
}
WebInspector.KeyboardShortcut = function () {}
WebInspector.KeyboardShortcut.Modifiers = {
    None: 0,
    Shift: 1,
    Ctrl: 2,
    Alt: 4,
    Meta: 8,
    get CtrlOrMeta() {
        return WebInspector.isMac() ? this.Meta : this.Ctrl;
    }
};
WebInspector.KeyboardShortcut.Key;
WebInspector.KeyboardShortcut.Keys = {
    Backspace: {
        code: 8,
        name: "\u21a4"
    },
    Tab: {
        code: 9,
        name: {
            mac: "\u21e5",
            other: "Tab"
        }
    },
    Enter: {
        code: 13,
        name: {
            mac: "\u21a9",
            other: "Enter"
        }
    },
    Ctrl: {
        code: 17,
        name: "Ctrl"
    },
    Esc: {
        code: 27,
        name: {
            mac: "\u238b",
            other: "Esc"
        }
    },
    Space: {
        code: 32,
        name: "Space"
    },
    PageUp: {
        code: 33,
        name: {
            mac: "\u21de",
            other: "PageUp"
        }
    },
    PageDown: {
        code: 34,
        name: {
            mac: "\u21df",
            other: "PageDown"
        }
    },
    End: {
        code: 35,
        name: {
            mac: "\u2197",
            other: "End"
        }
    },
    Home: {
        code: 36,
        name: {
            mac: "\u2196",
            other: "Home"
        }
    },
    Left: {
        code: 37,
        name: "\u2190"
    },
    Up: {
        code: 38,
        name: "\u2191"
    },
    Right: {
        code: 39,
        name: "\u2192"
    },
    Down: {
        code: 40,
        name: "\u2193"
    },
    Delete: {
        code: 46,
        name: "Del"
    },
    Zero: {
        code: 48,
        name: "0"
    },
    H: {
        code: 72,
        name: "H"
    },
    Meta: {
        code: 91,
        name: "Meta"
    },
    F1: {
        code: 112,
        name: "F1"
    },
    F2: {
        code: 113,
        name: "F2"
    },
    F3: {
        code: 114,
        name: "F3"
    },
    F4: {
        code: 115,
        name: "F4"
    },
    F5: {
        code: 116,
        name: "F5"
    },
    F6: {
        code: 117,
        name: "F6"
    },
    F7: {
        code: 118,
        name: "F7"
    },
    F8: {
        code: 119,
        name: "F8"
    },
    F9: {
        code: 120,
        name: "F9"
    },
    F10: {
        code: 121,
        name: "F10"
    },
    F11: {
        code: 122,
        name: "F11"
    },
    F12: {
        code: 123,
        name: "F12"
    },
    Semicolon: {
        code: 186,
        name: ";"
    },
    Plus: {
        code: 187,
        name: "+"
    },
    Comma: {
        code: 188,
        name: ","
    },
    Minus: {
        code: 189,
        name: "-"
    },
    Period: {
        code: 190,
        name: "."
    },
    Slash: {
        code: 191,
        name: "/"
    },
    QuestionMark: {
        code: 191,
        name: "?"
    },
    Apostrophe: {
        code: 192,
        name: "`"
    },
    Tilde: {
        code: 192,
        name: "Tilde"
    },
    Backslash: {
        code: 220,
        name: "\\"
    },
    SingleQuote: {
        code: 222,
        name: "\'"
    },
    get CtrlOrMeta() {
        return WebInspector.isMac() ? this.Meta : this.Ctrl;
    },
};
WebInspector.KeyboardShortcut.KeyBindings = {};
(function () {
    for (var key in WebInspector.KeyboardShortcut.Keys) {
        var descriptor = WebInspector.KeyboardShortcut.Keys[key];
        if (typeof descriptor === "object" && descriptor["code"]) {
            var name = typeof descriptor["name"] === "string" ? descriptor["name"] : key;
            WebInspector.KeyboardShortcut.KeyBindings[name] = {
                code: descriptor["code"]
            };
        }
    }
})();
WebInspector.KeyboardShortcut.makeKey = function (keyCode, modifiers) {
    if (typeof keyCode === "string")
        keyCode = keyCode.charCodeAt(0) - (/^[a-z]/.test(keyCode) ? 32 : 0);
    modifiers = modifiers || WebInspector.KeyboardShortcut.Modifiers.None;
    return WebInspector.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyCode, modifiers);
}
WebInspector.KeyboardShortcut.makeKeyFromEvent = function (keyboardEvent) {
    var modifiers = WebInspector.KeyboardShortcut.Modifiers.None;
    if (keyboardEvent.shiftKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Shift;
    if (keyboardEvent.ctrlKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Ctrl;
    if (keyboardEvent.altKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Alt;
    if (keyboardEvent.metaKey)
        modifiers |= WebInspector.KeyboardShortcut.Modifiers.Meta;

    function keyCodeForEvent(keyboardEvent) {
        return keyboardEvent.keyCode || keyboardEvent["__keyCode"];
    }
    return WebInspector.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyCodeForEvent(keyboardEvent), modifiers);
}
WebInspector.KeyboardShortcut.eventHasCtrlOrMeta = function (event) {
    return WebInspector.isMac() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}
WebInspector.KeyboardShortcut.hasNoModifiers = function (event) {
    return !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;
}
WebInspector.KeyboardShortcut.Descriptor;
WebInspector.KeyboardShortcut.makeDescriptor = function (key, modifiers) {
    return {
        key: WebInspector.KeyboardShortcut.makeKey(typeof key === "string" ? key : key.code, modifiers),
        name: WebInspector.KeyboardShortcut.shortcutToString(key, modifiers)
    };
}
WebInspector.KeyboardShortcut.makeKeyFromBindingShortcut = function (shortcut) {
    var parts = shortcut.split(/\+(?!$)/);
    var modifiers = 0;
    for (var i = 0; i < parts.length; ++i) {
        if (typeof WebInspector.KeyboardShortcut.Modifiers[parts[i]] !== "undefined") {
            modifiers |= WebInspector.KeyboardShortcut.Modifiers[parts[i]];
            continue;
        }
        console.assert(i === parts.length - 1, "Modifiers-only shortcuts are not allowed (encountered <" + shortcut + ">)");
        var key = WebInspector.KeyboardShortcut.Keys[parts[i]] || WebInspector.KeyboardShortcut.KeyBindings[parts[i]];
        if (key && key.shiftKey)
            modifiers |= WebInspector.KeyboardShortcut.Modifiers.Shift;
        return WebInspector.KeyboardShortcut.makeKey(key ? key.code : parts[i].toLowerCase(), modifiers)
    }
    console.assert(false);
    return 0;
}
WebInspector.KeyboardShortcut.shortcutToString = function (key, modifiers) {
    return WebInspector.KeyboardShortcut._modifiersToString(modifiers) + WebInspector.KeyboardShortcut._keyName(key);
}
WebInspector.KeyboardShortcut._keyName = function (key) {
    if (typeof key === "string")
        return key.toUpperCase();
    if (typeof key.name === "string")
        return key.name;
    return key.name[WebInspector.platform()] || key.name.other || '';
}
WebInspector.KeyboardShortcut._makeKeyFromCodeAndModifiers = function (keyCode, modifiers) {
    return (keyCode & 255) | (modifiers << 8);
};
WebInspector.KeyboardShortcut._modifiersToString = function (modifiers) {
    const cmdKey = "\u2318";
    const optKey = "\u2325";
    const shiftKey = "\u21e7";
    const ctrlKey = "\u2303";
    var isMac = WebInspector.isMac();
    var res = "";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Ctrl)
        res += isMac ? ctrlKey : "Ctrl + ";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Alt)
        res += isMac ? optKey : "Alt + ";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Shift)
        res += isMac ? shiftKey : "Shift + ";
    if (modifiers & WebInspector.KeyboardShortcut.Modifiers.Meta)
        res += isMac ? cmdKey : "Win + ";
    return res;
};
WebInspector.KeyboardShortcut.handleShortcut = function (event) {
    var key = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
    var extensions = WebInspector.KeyboardShortcut._keysToActionExtensions[key];
    if (!extensions)
        return;

    function handler(extension) {
        var result = extension.instance().handleAction(event);
        if (result)
            event.consume(true);
        delete WebInspector.KeyboardShortcut._pendingActionTimer;
        return result;
    }
    for (var i = 0; i < extensions.length; ++i) {
        var ident = event.keyIdentifier;
        if (/^F\d+|Control|Shift|Alt|Meta|Win|U\+001B$/.test(ident) || event.ctrlKey || event.altKey || event.metaKey) {
            if (handler(extensions[i]))
                return;
        } else {
            WebInspector.KeyboardShortcut._pendingActionTimer = setTimeout(handler.bind(null, extensions[i]), 0);
            break;
        }
    }
}
WebInspector.KeyboardShortcut.SelectAll = WebInspector.KeyboardShortcut.makeKey("a", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta);
WebInspector.KeyboardShortcut._onKeyPress = function (event) {
    if (!WebInspector.KeyboardShortcut._pendingActionTimer)
        return;
    var target = event.target;
    if (WebInspector.isBeingEdited(event.target)) {
        clearTimeout(WebInspector.KeyboardShortcut._pendingActionTimer);
        delete WebInspector.KeyboardShortcut._pendingActionTimer;
    }
}
WebInspector.KeyboardShortcut.registerActions = function () {
    document.addEventListener("keypress", WebInspector.KeyboardShortcut._onKeyPress, true);
    WebInspector.KeyboardShortcut._keysToActionExtensions = {};
    var extensions = WebInspector.moduleManager.extensions(WebInspector.ActionDelegate);
    extensions.forEach(registerBindings);

    function registerBindings(extension) {
        var bindings = extension.descriptor().bindings;
        for (var i = 0; bindings && i < bindings.length; ++i) {
            if (!platformMatches(bindings[i].platform))
                continue;
            var shortcuts = bindings[i].shortcut.split(/\s+/);
            shortcuts.forEach(registerShortcut.bind(null, extension));
        }
    }

    function registerShortcut(extension, shortcut) {
        var key = WebInspector.KeyboardShortcut.makeKeyFromBindingShortcut(shortcut);
        if (!key)
            return;
        if (WebInspector.KeyboardShortcut._keysToActionExtensions[key])
            WebInspector.KeyboardShortcut._keysToActionExtensions[key].push(extension);
        else
            WebInspector.KeyboardShortcut._keysToActionExtensions[key] = [extension];
    }

    function platformMatches(platformsString) {
        if (!platformsString)
            return true;
        var platforms = platformsString.split(",");
        var isMatch = false;
        var currentPlatform = WebInspector.platform();
        for (var i = 0; !isMatch && i < platforms.length; ++i)
            isMatch = platforms[i] === currentPlatform;
        return isMatch;
    }
}
WebInspector.SuggestBoxDelegate = function () {}
WebInspector.SuggestBoxDelegate.prototype = {
    applySuggestion: function (suggestion, isIntermediateSuggestion) {},
    acceptSuggestion: function () {},
}
WebInspector.SuggestBox = function (suggestBoxDelegate, anchorElement, className, maxItemsHeight) {
    this._suggestBoxDelegate = suggestBoxDelegate;
    this._anchorElement = anchorElement;
    this._length = 0;
    this._selectedIndex = -1;
    this._selectedElement = null;
    this._maxItemsHeight = maxItemsHeight;
    this._bodyElement = anchorElement.ownerDocument.body;
    this._element = anchorElement.ownerDocument.createElement("div");
    this._element.className = "suggest-box " + (className || "");
    this._element.addEventListener("mousedown", this._onBoxMouseDown.bind(this), true);
    this.containerElement = this._element.createChild("div", "container");
    this.contentElement = this.containerElement.createChild("div", "content");
}
WebInspector.SuggestBox.prototype = {
    visible: function () {
        return !!this._element.parentElement;
    },
    setPosition: function (anchorBox) {
        this._updateBoxPosition(anchorBox);
    },
    _updateBoxPosition: function (anchorBox) {
        this._anchorBox = anchorBox;
        anchorBox = anchorBox || this._anchorElement.boxInWindow(window);
        var container = WebInspector.Dialog.modalHostView().element;
        anchorBox = anchorBox.relativeToElement(container);
        var totalWidth = container.offsetWidth;
        var totalHeight = container.offsetHeight;
        this.contentElement.style.display = "inline-block";
        document.body.appendChild(this.contentElement);
        this.contentElement.positionAt(0, 0);
        var contentWidth = this.contentElement.offsetWidth;
        var contentHeight = this.contentElement.offsetHeight;
        this.contentElement.style.display = "block";
        this.containerElement.appendChild(this.contentElement);
        const spacer = 6;
        const suggestBoxPaddingX = 21;
        const suggestBoxPaddingY = 2;
        var maxWidth = totalWidth - anchorBox.x - spacer;
        var width = Math.min(contentWidth, maxWidth - suggestBoxPaddingX) + suggestBoxPaddingX;
        var paddedWidth = contentWidth + suggestBoxPaddingX;
        var boxX = anchorBox.x;
        if (width < paddedWidth) {
            maxWidth = totalWidth - spacer;
            width = Math.min(contentWidth, maxWidth - suggestBoxPaddingX) + suggestBoxPaddingX;
            boxX = totalWidth - width;
        }
        var boxY;
        var aboveHeight = anchorBox.y;
        var underHeight = totalHeight - anchorBox.y - anchorBox.height;
        var maxHeight = this._maxItemsHeight ? contentHeight * this._maxItemsHeight / this._length : Math.max(underHeight, aboveHeight) - spacer;
        var height = Math.min(contentHeight, maxHeight - suggestBoxPaddingY) + suggestBoxPaddingY;
        if (underHeight >= aboveHeight) {
            boxY = anchorBox.y + anchorBox.height;
            this._element.classList.remove("above-anchor");
            this._element.classList.add("under-anchor");
        } else {
            boxY = anchorBox.y - height;
            this._element.classList.remove("under-anchor");
            this._element.classList.add("above-anchor");
        }
        this._element.positionAt(boxX, boxY, container);
        this._element.style.width = width + "px";
        this._element.style.height = height + "px";
    },
    _onBoxMouseDown: function (event) {
        event.preventDefault();
    },
    hide: function () {
        if (!this.visible())
            return;
        this._element.remove();
        delete this._selectedElement;
        this._selectedIndex = -1;
    },
    removeFromElement: function () {
        this.hide();
    },
    _applySuggestion: function (isIntermediateSuggestion) {
        if (!this.visible() || !this._selectedElement)
            return false;
        var suggestion = this._selectedElement.textContent;
        if (!suggestion)
            return false;
        this._suggestBoxDelegate.applySuggestion(suggestion, isIntermediateSuggestion);
        return true;
    },
    acceptSuggestion: function () {
        var result = this._applySuggestion();
        this.hide();
        if (!result)
            return false;
        this._suggestBoxDelegate.acceptSuggestion();
        return true;
    },
    _selectClosest: function (shift, isCircular) {
        if (!this._length)
            return false;
        if (this._selectedIndex === -1 && shift < 0)
            shift += 1;
        var index = this._selectedIndex + shift;
        if (isCircular)
            index = (this._length + index) % this._length;
        else
            index = Number.constrain(index, 0, this._length - 1);
        this._selectItem(index);
        this._applySuggestion(true);
        return true;
    },
    _onItemMouseDown: function (event) {
        this._selectedElement = event.currentTarget;
        this.acceptSuggestion();
        event.consume(true);
    },
    _createItemElement: function (prefix, text) {
        var element = document.createElement("div");
        element.className = "suggest-box-content-item source-code";
        element.tabIndex = -1;
        if (prefix && prefix.length && !text.indexOf(prefix)) {
            var prefixElement = element.createChild("span", "prefix");
            prefixElement.textContent = prefix;
            var suffixElement = element.createChild("span", "suffix");
            suffixElement.textContent = text.substring(prefix.length);
        } else {
            var suffixElement = element.createChild("span", "suffix");
            suffixElement.textContent = text;
        }
        element.addEventListener("mousedown", this._onItemMouseDown.bind(this), false);
        return element;
    },
    _updateItems: function (items, selectedIndex, userEnteredText) {
        this._length = items.length;
        this.contentElement.removeChildren();
        for (var i = 0; i < items.length; ++i) {
            var item = items[i];
            var currentItemElement = this._createItemElement(userEnteredText, item);
            this.contentElement.appendChild(currentItemElement);
        }
        this._selectedElement = null;
        if (typeof selectedIndex === "number")
            this._selectItem(selectedIndex);
    },
    _selectItem: function (index) {
        if (this._selectedElement)
            this._selectedElement.classList.remove("selected");
        this._selectedIndex = index;
        if (index < 0)
            return;
        this._selectedElement = this.contentElement.children[index];
        this._selectedElement.classList.add("selected");
        this._selectedElement.scrollIntoViewIfNeeded(false);
    },
    _canShowBox: function (completions, canShowForSingleItem, userEnteredText) {
        if (!completions || !completions.length)
            return false;
        if (completions.length > 1)
            return true;
        return canShowForSingleItem && completions[0] !== userEnteredText;
    },
    _rememberRowCountPerViewport: function () {
        if (!this.contentElement.firstChild)
            return;
        this._rowCountPerViewport = Math.floor(this.containerElement.offsetHeight / this.contentElement.firstChild.offsetHeight);
    },
    updateSuggestions: function (anchorBox, completions, selectedIndex, canShowForSingleItem, userEnteredText) {
        if (this._canShowBox(completions, canShowForSingleItem, userEnteredText)) {
            this._updateItems(completions, selectedIndex, userEnteredText);
            this._updateBoxPosition(anchorBox);
            if (!this.visible())
                this._bodyElement.appendChild(this._element);
            this._rememberRowCountPerViewport();
        } else
            this.hide();
    },
    keyPressed: function (event) {
        switch (event.keyIdentifier) {
        case "Up":
            return this.upKeyPressed();
        case "Down":
            return this.downKeyPressed();
        case "PageUp":
            return this.pageUpKeyPressed();
        case "PageDown":
            return this.pageDownKeyPressed();
        case "Enter":
            return this.enterKeyPressed();
        }
        return false;
    },
    upKeyPressed: function () {
        return this._selectClosest(-1, true);
    },
    downKeyPressed: function () {
        return this._selectClosest(1, true);
    },
    pageUpKeyPressed: function () {
        return this._selectClosest(-this._rowCountPerViewport, false);
    },
    pageDownKeyPressed: function () {
        return this._selectClosest(this._rowCountPerViewport, false);
    },
    enterKeyPressed: function () {
        var hasSelectedItem = !!this._selectedElement;
        this.acceptSuggestion();
        return hasSelectedItem;
    }
}
WebInspector.TextPrompt = function (completions, stopCharacters) {
    this._proxyElement;
    this._proxyElementDisplay = "inline-block";
    this._loadCompletions = completions;
    this._completionStopCharacters = stopCharacters || " =:[({;,!+-*/&|^<>.";
}
WebInspector.TextPrompt.Events = {
    ItemApplied: "text-prompt-item-applied",
    ItemAccepted: "text-prompt-item-accepted"
};
WebInspector.TextPrompt.prototype = {
    get proxyElement() {
        return this._proxyElement;
    }, setSuggestBoxEnabled: function (className) {
        this._suggestBoxClassName = className;
    }, renderAsBlock: function () {
        this._proxyElementDisplay = "block";
    }, attach: function (element) {
        return this._attachInternal(element);
    }, attachAndStartEditing: function (element, blurListener) {
        this._attachInternal(element);
        this._startEditing(blurListener);
        return this.proxyElement;
    }, _attachInternal: function (element) {
        if (this.proxyElement)
            throw "Cannot attach an attached TextPrompt";
        this._element = element;
        this._boundOnKeyDown = this.onKeyDown.bind(this);
        this._boundOnMouseWheel = this.onMouseWheel.bind(this);
        this._boundSelectStart = this._selectStart.bind(this);
        this._boundHideSuggestBox = this.hideSuggestBox.bind(this);
        this._proxyElement = element.ownerDocument.createElement("span");
        this._proxyElement.style.display = this._proxyElementDisplay;
        element.parentElement.insertBefore(this.proxyElement, element);
        this.proxyElement.appendChild(element);
        this._element.classList.add("text-prompt");
        this._element.addEventListener("keydown", this._boundOnKeyDown, false);
        this._element.addEventListener("mousewheel", this._boundOnMouseWheel, false);
        this._element.addEventListener("selectstart", this._boundSelectStart, false);
        this._element.addEventListener("blur", this._boundHideSuggestBox, false);
        if (typeof this._suggestBoxClassName === "string")
            this._suggestBox = new WebInspector.SuggestBox(this, this._element, this._suggestBoxClassName);
        return this.proxyElement;
    }, detach: function () {
        this._removeFromElement();
        this.proxyElement.parentElement.insertBefore(this._element, this.proxyElement);
        this.proxyElement.remove();
        delete this._proxyElement;
        this._element.classList.remove("text-prompt");
        this._element.removeEventListener("keydown", this._boundOnKeyDown, false);
        this._element.removeEventListener("mousewheel", this._boundOnMouseWheel, false);
        this._element.removeEventListener("selectstart", this._boundSelectStart, false);
        WebInspector.restoreFocusFromElement(this._element);
    }, get text() {
        return this._element.textContent;
    }, set text(x) {
        this._removeSuggestionAids();
        if (!x) {
            this._element.removeChildren();
            this._element.appendChild(document.createElement("br"));
        } else
            this._element.textContent = x;
        this.moveCaretToEndOfPrompt();
        this._element.scrollIntoView();
    }, _removeFromElement: function () {
        this.clearAutoComplete(true);
        this._element.removeEventListener("keydown", this._boundOnKeyDown, false);
        this._element.removeEventListener("selectstart", this._boundSelectStart, false);
        this._element.removeEventListener("blur", this._boundHideSuggestBox, false);
        if (this._isEditing)
            this._stopEditing();
        if (this._suggestBox)
            this._suggestBox.removeFromElement();
    }, _startEditing: function (blurListener) {
        this._isEditing = true;
        this._element.classList.add("editing");
        if (blurListener) {
            this._blurListener = blurListener;
            this._element.addEventListener("blur", this._blurListener, false);
        }
        this._oldTabIndex = this._element.tabIndex;
        if (this._element.tabIndex < 0)
            this._element.tabIndex = 0;
        WebInspector.setCurrentFocusElement(this._element);
        if (!this.text)
            this._updateAutoComplete();
    }, _stopEditing: function () {
        this._element.tabIndex = this._oldTabIndex;
        if (this._blurListener)
            this._element.removeEventListener("blur", this._blurListener, false);
        this._element.classList.remove("editing");
        delete this._isEditing;
    }, _removeSuggestionAids: function () {
        this.clearAutoComplete();
        this.hideSuggestBox();
    }, _selectStart: function () {
        if (this._selectionTimeout)
            clearTimeout(this._selectionTimeout);
        this._removeSuggestionAids();

        function moveBackIfOutside() {
            delete this._selectionTimeout;
            if (!this.isCaretInsidePrompt() && window.getSelection().isCollapsed) {
                this.moveCaretToEndOfPrompt();
                this.autoCompleteSoon();
            }
        }
        this._selectionTimeout = setTimeout(moveBackIfOutside.bind(this), 100);
    }, defaultKeyHandler: function (event, force) {
        this._updateAutoComplete(force);
        return false;
    }, _updateAutoComplete: function (force) {
        this.clearAutoComplete();
        this.autoCompleteSoon(force);
    }, onMouseWheel: function (event) {}, onKeyDown: function (event) {
        var handled = false;
        var invokeDefault = true;
        switch (event.keyIdentifier) {
        case "U+0009":
            handled = this.tabKeyPressed(event);
            break;
        case "Left":
        case "Home":
            this._removeSuggestionAids();
            invokeDefault = false;
            break;
        case "Right":
        case "End":
            if (this.isCaretAtEndOfPrompt())
                handled = this.acceptAutoComplete();
            else
                this._removeSuggestionAids();
            invokeDefault = false;
            break;
        case "U+001B":
            if (this.isSuggestBoxVisible()) {
                this._removeSuggestionAids();
                handled = true;
            }
            break;
        case "U+0020":
            if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                this.defaultKeyHandler(event, true);
                handled = true;
            }
            break;
        case "Alt":
        case "Meta":
        case "Shift":
        case "Control":
            invokeDefault = false;
            break;
        }
        if (!handled && this.isSuggestBoxVisible())
            handled = this._suggestBox.keyPressed(event);
        if (!handled && invokeDefault)
            handled = this.defaultKeyHandler(event);
        if (handled)
            event.consume(true);
        return handled;
    }, acceptAutoComplete: function () {
        var result = false;
        if (this.isSuggestBoxVisible())
            result = this._suggestBox.acceptSuggestion();
        if (!result)
            result = this._acceptSuggestionInternal();
        return result;
    }, clearAutoComplete: function (includeTimeout) {
        if (includeTimeout && this._completeTimeout) {
            clearTimeout(this._completeTimeout);
            delete this._completeTimeout;
        }
        delete this._waitingForCompletions;
        if (!this.autoCompleteElement)
            return;
        this.autoCompleteElement.remove();
        delete this.autoCompleteElement;
        if (!this._userEnteredRange || !this._userEnteredText)
            return;
        this._userEnteredRange.deleteContents();
        this._element.normalize();
        var userTextNode = document.createTextNode(this._userEnteredText);
        this._userEnteredRange.insertNode(userTextNode);
        var selectionRange = document.createRange();
        selectionRange.setStart(userTextNode, this._userEnteredText.length);
        selectionRange.setEnd(userTextNode, this._userEnteredText.length);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(selectionRange);
        delete this._userEnteredRange;
        delete this._userEnteredText;
    }, autoCompleteSoon: function (force) {
        var immediately = this.isSuggestBoxVisible() || force;
        if (!this._completeTimeout)
            this._completeTimeout = setTimeout(this.complete.bind(this, force), immediately ? 0 : 250);
    }, complete: function (force, reverse) {
        this.clearAutoComplete(true);
        var selection = window.getSelection();
        if (!selection.rangeCount)
            return;
        var selectionRange = selection.getRangeAt(0);
        var shouldExit;
        if (!force && !this.isCaretAtEndOfPrompt() && !this.isSuggestBoxVisible())
            shouldExit = true;
        else if (!selection.isCollapsed)
            shouldExit = true;
        else if (!force) {
            var wordSuffixRange = selectionRange.startContainer.rangeOfWord(selectionRange.endOffset, this._completionStopCharacters, this._element, "forward");
            if (wordSuffixRange.toString().length)
                shouldExit = true;
        }
        if (shouldExit) {
            this.hideSuggestBox();
            return;
        }
        var wordPrefixRange = selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, this._completionStopCharacters, this._element, "backward");
        this._waitingForCompletions = true;
        this._loadCompletions(this.proxyElement, wordPrefixRange, force, this._completionsReady.bind(this, selection, wordPrefixRange, !!reverse));
    }, disableDefaultSuggestionForEmptyInput: function () {
        this._disableDefaultSuggestionForEmptyInput = true;
    }, _boxForAnchorAtStart: function (selection, textRange) {
        var rangeCopy = selection.getRangeAt(0).cloneRange();
        var anchorElement = document.createElement("span");
        anchorElement.textContent = "\u200B";
        textRange.insertNode(anchorElement);
        var box = anchorElement.boxInWindow(window);
        anchorElement.remove();
        selection.removeAllRanges();
        selection.addRange(rangeCopy);
        return box;
    }, _buildCommonPrefix: function (completions, wordPrefixLength) {
        var commonPrefix = completions[0];
        for (var i = 0; i < completions.length; ++i) {
            var completion = completions[i];
            var lastIndex = Math.min(commonPrefix.length, completion.length);
            for (var j = wordPrefixLength; j < lastIndex; ++j) {
                if (commonPrefix[j] !== completion[j]) {
                    commonPrefix = commonPrefix.substr(0, j);
                    break;
                }
            }
        }
        return commonPrefix;
    }, _completionsReady: function (selection, originalWordPrefixRange, reverse, completions, selectedIndex) {
        if (!this._waitingForCompletions || !completions.length) {
            this.hideSuggestBox();
            return;
        }
        delete this._waitingForCompletions;
        var selectionRange = selection.getRangeAt(0);
        var fullWordRange = document.createRange();
        fullWordRange.setStart(originalWordPrefixRange.startContainer, originalWordPrefixRange.startOffset);
        fullWordRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);
        if (originalWordPrefixRange.toString() + selectionRange.toString() !== fullWordRange.toString())
            return;
        selectedIndex = (this._disableDefaultSuggestionForEmptyInput && !this.text) ? -1 : (selectedIndex || 0);
        this._userEnteredRange = fullWordRange;
        this._userEnteredText = fullWordRange.toString();
        if (this._suggestBox)
            this._suggestBox.updateSuggestions(this._boxForAnchorAtStart(selection, fullWordRange), completions, selectedIndex, !this.isCaretAtEndOfPrompt(), this._userEnteredText);
        if (selectedIndex === -1)
            return;
        var wordPrefixLength = originalWordPrefixRange.toString().length;
        this._commonPrefix = this._buildCommonPrefix(completions, wordPrefixLength);
        if (this.isCaretAtEndOfPrompt()) {
            this._userEnteredRange.deleteContents();
            this._element.normalize();
            var finalSelectionRange = document.createRange();
            var completionText = completions[selectedIndex];
            var prefixText = completionText.substring(0, wordPrefixLength);
            var suffixText = completionText.substring(wordPrefixLength);
            var prefixTextNode = document.createTextNode(prefixText);
            fullWordRange.insertNode(prefixTextNode);
            this.autoCompleteElement = document.createElement("span");
            this.autoCompleteElement.className = "auto-complete-text";
            this.autoCompleteElement.textContent = suffixText;
            prefixTextNode.parentNode.insertBefore(this.autoCompleteElement, prefixTextNode.nextSibling);
            finalSelectionRange.setStart(prefixTextNode, wordPrefixLength);
            finalSelectionRange.setEnd(prefixTextNode, wordPrefixLength);
            selection.removeAllRanges();
            selection.addRange(finalSelectionRange);
            this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemApplied);
        }
    }, _completeCommonPrefix: function () {
        if (!this.autoCompleteElement || !this._commonPrefix || !this._userEnteredText || !this._commonPrefix.startsWith(this._userEnteredText))
            return;
        if (!this.isSuggestBoxVisible()) {
            this.acceptAutoComplete();
            return;
        }
        this.autoCompleteElement.textContent = this._commonPrefix.substring(this._userEnteredText.length);
        this._acceptSuggestionInternal(true);
    }, applySuggestion: function (completionText, isIntermediateSuggestion) {
        this._applySuggestion(completionText, isIntermediateSuggestion);
    }, _applySuggestion: function (completionText, isIntermediateSuggestion, originalPrefixRange) {
        var wordPrefixLength;
        if (originalPrefixRange)
            wordPrefixLength = originalPrefixRange.toString().length;
        else
            wordPrefixLength = this._userEnteredText ? this._userEnteredText.length : 0;
        this._userEnteredRange.deleteContents();
        this._element.normalize();
        var finalSelectionRange = document.createRange();
        var completionTextNode = document.createTextNode(completionText);
        this._userEnteredRange.insertNode(completionTextNode);
        if (this.autoCompleteElement) {
            this.autoCompleteElement.remove();
            delete this.autoCompleteElement;
        }
        if (isIntermediateSuggestion)
            finalSelectionRange.setStart(completionTextNode, wordPrefixLength);
        else
            finalSelectionRange.setStart(completionTextNode, completionText.length);
        finalSelectionRange.setEnd(completionTextNode, completionText.length);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);
        if (isIntermediateSuggestion)
            this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemApplied, {
                itemText: completionText
            });
    }, acceptSuggestion: function () {
        this._acceptSuggestionInternal();
    }, _acceptSuggestionInternal: function (prefixAccepted) {
        if (this._isAcceptingSuggestion)
            return false;
        if (!this.autoCompleteElement || !this.autoCompleteElement.parentNode)
            return false;
        var text = this.autoCompleteElement.textContent;
        var textNode = document.createTextNode(text);
        this.autoCompleteElement.parentNode.replaceChild(textNode, this.autoCompleteElement);
        delete this.autoCompleteElement;
        var finalSelectionRange = document.createRange();
        finalSelectionRange.setStart(textNode, text.length);
        finalSelectionRange.setEnd(textNode, text.length);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);
        if (!prefixAccepted) {
            this.hideSuggestBox();
            this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemAccepted);
        } else
            this.autoCompleteSoon(true);
        return true;
    }, hideSuggestBox: function () {
        if (this.isSuggestBoxVisible())
            this._suggestBox.hide();
    }, isSuggestBoxVisible: function () {
        return this._suggestBox && this._suggestBox.visible();
    }, isCaretInsidePrompt: function () {
        return this._element.isInsertionCaretInside();
    }, isCaretAtEndOfPrompt: function () {
        var selection = window.getSelection();
        if (!selection.rangeCount || !selection.isCollapsed)
            return false;
        var selectionRange = selection.getRangeAt(0);
        var node = selectionRange.startContainer;
        if (!node.isSelfOrDescendant(this._element))
            return false;
        if (node.nodeType === Node.TEXT_NODE && selectionRange.startOffset < node.nodeValue.length)
            return false;
        var foundNextText = false;
        while (node) {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.length) {
                if (foundNextText && (!this.autoCompleteElement || !this.autoCompleteElement.isAncestor(node)))
                    return false;
                foundNextText = true;
            }
            node = node.traverseNextNode(this._element);
        }
        return true;
    }, isCaretOnFirstLine: function () {
        var selection = window.getSelection();
        var focusNode = selection.focusNode;
        if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE || focusNode.parentNode !== this._element)
            return true;
        if (focusNode.textContent.substring(0, selection.focusOffset).indexOf("\n") !== -1)
            return false;
        focusNode = focusNode.previousSibling;
        while (focusNode) {
            if (focusNode.nodeType !== Node.TEXT_NODE)
                return true;
            if (focusNode.textContent.indexOf("\n") !== -1)
                return false;
            focusNode = focusNode.previousSibling;
        }
        return true;
    }, isCaretOnLastLine: function () {
        var selection = window.getSelection();
        var focusNode = selection.focusNode;
        if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE || focusNode.parentNode !== this._element)
            return true;
        if (focusNode.textContent.substring(selection.focusOffset).indexOf("\n") !== -1)
            return false;
        focusNode = focusNode.nextSibling;
        while (focusNode) {
            if (focusNode.nodeType !== Node.TEXT_NODE)
                return true;
            if (focusNode.textContent.indexOf("\n") !== -1)
                return false;
            focusNode = focusNode.nextSibling;
        }
        return true;
    }, moveCaretToEndOfPrompt: function () {
        var selection = window.getSelection();
        var selectionRange = document.createRange();
        var offset = this._element.childNodes.length;
        selectionRange.setStart(this._element, offset);
        selectionRange.setEnd(this._element, offset);
        selection.removeAllRanges();
        selection.addRange(selectionRange);
    }, tabKeyPressed: function (event) {
        this._completeCommonPrefix();
        return true;
    }, __proto__: WebInspector.Object.prototype
}
WebInspector.TextPromptWithHistory = function (completions, stopCharacters) {
    WebInspector.TextPrompt.call(this, completions, stopCharacters);
    this._data = [];
    this._historyOffset = 1;
    this._coalesceHistoryDupes = true;
}
WebInspector.TextPromptWithHistory.prototype = {
    get historyData() {
        return this._data;
    }, setCoalesceHistoryDupes: function (x) {
        this._coalesceHistoryDupes = x;
    }, setHistoryData: function (data) {
        this._data = [].concat(data);
        this._historyOffset = 1;
    }, pushHistoryItem: function (text) {
        if (this._uncommittedIsTop) {
            this._data.pop();
            delete this._uncommittedIsTop;
        }
        this._historyOffset = 1;
        if (this._coalesceHistoryDupes && text === this._currentHistoryItem())
            return;
        this._data.push(text);
    }, _pushCurrentText: function () {
        if (this._uncommittedIsTop)
            this._data.pop();
        this._uncommittedIsTop = true;
        this.clearAutoComplete(true);
        this._data.push(this.text);
    }, _previous: function () {
        if (this._historyOffset > this._data.length)
            return undefined;
        if (this._historyOffset === 1)
            this._pushCurrentText();
        ++this._historyOffset;
        return this._currentHistoryItem();
    }, _next: function () {
        if (this._historyOffset === 1)
            return undefined;
        --this._historyOffset;
        return this._currentHistoryItem();
    }, _currentHistoryItem: function () {
        return this._data[this._data.length - this._historyOffset];
    }, defaultKeyHandler: function (event, force) {
        var newText;
        var isPrevious;
        switch (event.keyIdentifier) {
        case "Up":
            if (!this.isCaretOnFirstLine())
                break;
            newText = this._previous();
            isPrevious = true;
            break;
        case "Down":
            if (!this.isCaretOnLastLine())
                break;
            newText = this._next();
            break;
        case "U+0050":
            if (WebInspector.isMac() && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                newText = this._previous();
                isPrevious = true;
            }
            break;
        case "U+004E":
            if (WebInspector.isMac() && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey)
                newText = this._next();
            break;
        }
        if (newText !== undefined) {
            event.consume(true);
            this.text = newText;
            if (isPrevious) {
                var firstNewlineIndex = this.text.indexOf("\n");
                if (firstNewlineIndex === -1)
                    this.moveCaretToEndOfPrompt();
                else {
                    var selection = window.getSelection();
                    var selectionRange = document.createRange();
                    selectionRange.setStart(this._element.firstChild, firstNewlineIndex);
                    selectionRange.setEnd(this._element.firstChild, firstNewlineIndex);
                    selection.removeAllRanges();
                    selection.addRange(selectionRange);
                }
            }
            return true;
        }
        return WebInspector.TextPrompt.prototype.defaultKeyHandler.apply(this, arguments);
    }, __proto__: WebInspector.TextPrompt.prototype
}
WebInspector.Popover = function (popoverHelper) {
    WebInspector.View.call(this);
    this.markAsRoot();
    this.element.className = "popover custom-popup-vertical-scroll custom-popup-horizontal-scroll";
    this._popupArrowElement = document.createElement("div");
    this._popupArrowElement.className = "arrow";
    this.element.appendChild(this._popupArrowElement);
    this._contentDiv = document.createElement("div");
    this._contentDiv.className = "content";
    this.element.appendChild(this._contentDiv);
    this._popoverHelper = popoverHelper;
}
WebInspector.Popover.prototype = {
    show: function (element, anchor, preferredWidth, preferredHeight, arrowDirection) {
        this._innerShow(null, element, anchor, preferredWidth, preferredHeight, arrowDirection);
    },
    showView: function (view, anchor, preferredWidth, preferredHeight) {
        this._innerShow(view, view.element, anchor, preferredWidth, preferredHeight);
    },
    _innerShow: function (view, contentElement, anchor, preferredWidth, preferredHeight, arrowDirection) {
        if (this._disposed)
            return;
        this.contentElement = contentElement;
        if (WebInspector.Popover._popover)
            WebInspector.Popover._popover.detach();
        WebInspector.Popover._popover = this;
        var preferredSize = view ? view.measurePreferredSize() : this.contentElement.measurePreferredSize();
        preferredWidth = preferredWidth || preferredSize.width;
        preferredHeight = preferredHeight || preferredSize.height;
        WebInspector.View.prototype.show.call(this, document.body);
        if (view)
            view.show(this._contentDiv);
        else
            this._contentDiv.appendChild(this.contentElement);
        this._positionElement(anchor, preferredWidth, preferredHeight, arrowDirection);
        if (this._popoverHelper) {
            this._contentDiv.addEventListener("mousemove", this._popoverHelper._killHidePopoverTimer.bind(this._popoverHelper), true);
            this.element.addEventListener("mouseout", this._popoverHelper._popoverMouseOut.bind(this._popoverHelper), true);
        }
    },
    hide: function () {
        this.detach();
        delete WebInspector.Popover._popover;
    },
    get disposed() {
        return this._disposed;
    },
    dispose: function () {
        if (this.isShowing())
            this.hide();
        this._disposed = true;
    },
    setCanShrink: function (canShrink) {
        this._hasFixedHeight = !canShrink;
        this._contentDiv.classList.add("fixed-height");
    },
    _positionElement: function (anchorElement, preferredWidth, preferredHeight, arrowDirection) {
        const borderWidth = 25;
        const scrollerWidth = this._hasFixedHeight ? 0 : 11;
        const arrowHeight = 15;
        const arrowOffset = 10;
        const borderRadius = 10;
        preferredWidth = Math.max(preferredWidth, 50);
        const container = WebInspector.Dialog.modalHostView().element;
        const totalWidth = container.offsetWidth;
        const totalHeight = container.offsetHeight;
        var anchorBox = anchorElement instanceof AnchorBox ? anchorElement : anchorElement.boxInWindow(window);
        anchorBox = anchorBox.relativeToElement(container);
        var newElementPosition = {
            x: 0,
            y: 0,
            width: preferredWidth + scrollerWidth,
            height: preferredHeight
        };
        var verticalAlignment;
        var roomAbove = anchorBox.y;
        var roomBelow = totalHeight - anchorBox.y - anchorBox.height;
        if ((roomAbove > roomBelow) || (arrowDirection === WebInspector.Popover.Orientation.Bottom)) {
            if ((anchorBox.y > newElementPosition.height + arrowHeight + borderRadius) || (arrowDirection === WebInspector.Popover.Orientation.Bottom))
                newElementPosition.y = anchorBox.y - newElementPosition.height - arrowHeight;
            else {
                newElementPosition.y = borderRadius;
                newElementPosition.height = anchorBox.y - borderRadius * 2 - arrowHeight;
                if (this._hasFixedHeight && newElementPosition.height < preferredHeight) {
                    newElementPosition.y = borderRadius;
                    newElementPosition.height = preferredHeight;
                }
            }
            verticalAlignment = WebInspector.Popover.Orientation.Bottom;
        } else {
            newElementPosition.y = anchorBox.y + anchorBox.height + arrowHeight;
            if ((newElementPosition.y + newElementPosition.height + borderRadius >= totalHeight) && (arrowDirection !== WebInspector.Popover.Orientation.Top)) {
                newElementPosition.height = totalHeight - borderRadius - newElementPosition.y;
                if (this._hasFixedHeight && newElementPosition.height < preferredHeight) {
                    newElementPosition.y = totalHeight - preferredHeight - borderRadius;
                    newElementPosition.height = preferredHeight;
                }
            }
            verticalAlignment = WebInspector.Popover.Orientation.Top;
        }
        var horizontalAlignment;
        if (anchorBox.x + newElementPosition.width < totalWidth) {
            newElementPosition.x = Math.max(borderRadius, anchorBox.x - borderRadius - arrowOffset);
            horizontalAlignment = "left";
        } else if (newElementPosition.width + borderRadius * 2 < totalWidth) {
            newElementPosition.x = totalWidth - newElementPosition.width - borderRadius;
            horizontalAlignment = "right";
            var arrowRightPosition = Math.max(0, totalWidth - anchorBox.x - anchorBox.width - borderRadius - arrowOffset);
            arrowRightPosition += anchorBox.width / 2;
            arrowRightPosition = Math.min(arrowRightPosition, newElementPosition.width - borderRadius - arrowOffset);
            this._popupArrowElement.style.right = arrowRightPosition + "px";
        } else {
            newElementPosition.x = borderRadius;
            newElementPosition.width = totalWidth - borderRadius * 2;
            newElementPosition.height += scrollerWidth;
            horizontalAlignment = "left";
            if (verticalAlignment === WebInspector.Popover.Orientation.Bottom)
                newElementPosition.y -= scrollerWidth;
            this._popupArrowElement.style.left = Math.max(0, anchorBox.x - borderRadius * 2 - arrowOffset) + "px";
            this._popupArrowElement.style.left += anchorBox.width / 2;
        }
        this.element.className = "popover custom-popup-vertical-scroll custom-popup-horizontal-scroll " + verticalAlignment + "-" + horizontalAlignment + "-arrow";
        this.element.positionAt(newElementPosition.x - borderWidth, newElementPosition.y - borderWidth, container);
        this.element.style.width = newElementPosition.width + borderWidth * 2 + "px";
        this.element.style.height = newElementPosition.height + borderWidth * 2 + "px";
    },
    __proto__: WebInspector.View.prototype
}
WebInspector.PopoverHelper = function (panelElement, getAnchor, showPopover, onHide, disableOnClick) {
    this._panelElement = panelElement;
    this._getAnchor = getAnchor;
    this._showPopover = showPopover;
    this._onHide = onHide;
    this._disableOnClick = !!disableOnClick;
    panelElement.addEventListener("mousedown", this._mouseDown.bind(this), false);
    panelElement.addEventListener("mousemove", this._mouseMove.bind(this), false);
    panelElement.addEventListener("mouseout", this._mouseOut.bind(this), false);
    this.setTimeout(1000);
}
WebInspector.PopoverHelper.prototype = {
    setTimeout: function (timeout) {
        this._timeout = timeout;
    },
    _eventInHoverElement: function (event) {
        if (!this._hoverElement)
            return false;
        var box = this._hoverElement instanceof AnchorBox ? this._hoverElement : this._hoverElement.boxInWindow();
        return (box.x <= event.clientX && event.clientX <= box.x + box.width && box.y <= event.clientY && event.clientY <= box.y + box.height);
    },
    _mouseDown: function (event) {
        if (this._disableOnClick || !this._eventInHoverElement(event))
            this.hidePopover();
        else {
            this._killHidePopoverTimer();
            this._handleMouseAction(event, true);
        }
    },
    _mouseMove: function (event) {
        if (this._eventInHoverElement(event))
            return;
        this._startHidePopoverTimer();
        this._handleMouseAction(event, false);
    },
    _popoverMouseOut: function (event) {
        if (!this.isPopoverVisible())
            return;
        if (event.relatedTarget && !event.relatedTarget.isSelfOrDescendant(this._popover._contentDiv))
            this._startHidePopoverTimer();
    },
    _mouseOut: function (event) {
        if (!this.isPopoverVisible())
            return;
        if (!this._eventInHoverElement(event))
            this._startHidePopoverTimer();
    },
    _startHidePopoverTimer: function () {
        if (!this._popover || this._hidePopoverTimer)
            return;

        function doHide() {
            this._hidePopover();
            delete this._hidePopoverTimer;
        }
        this._hidePopoverTimer = setTimeout(doHide.bind(this), this._timeout / 2);
    },
    _handleMouseAction: function (event, isMouseDown) {
        this._resetHoverTimer();
        if (event.which && this._disableOnClick)
            return;
        this._hoverElement = this._getAnchor(event.target, event);
        if (!this._hoverElement)
            return;
        const toolTipDelay = isMouseDown ? 0 : (this._popup ? this._timeout * 0.6 : this._timeout);
        this._hoverTimer = setTimeout(this._mouseHover.bind(this, this._hoverElement), toolTipDelay);
    },
    _resetHoverTimer: function () {
        if (this._hoverTimer) {
            clearTimeout(this._hoverTimer);
            delete this._hoverTimer;
        }
    },
    isPopoverVisible: function () {
        return !!this._popover;
    },
    hidePopover: function () {
        this._resetHoverTimer();
        this._hidePopover();
    },
    _hidePopover: function () {
        if (!this._popover)
            return;
        if (this._onHide)
            this._onHide();
        this._popover.dispose();
        delete this._popover;
        this._hoverElement = null;
    },
    _mouseHover: function (element) {
        delete this._hoverTimer;
        this._hidePopover();
        this._popover = new WebInspector.Popover(this);
        this._showPopover(element, this._popover);
    },
    _killHidePopoverTimer: function () {
        if (this._hidePopoverTimer) {
            clearTimeout(this._hidePopoverTimer);
            delete this._hidePopoverTimer;
            this._resetHoverTimer();
        }
    }
}
WebInspector.Popover.Orientation = {
    Top: "top",
    Bottom: "bottom"
}
WebInspector.Placard = function (title, subtitle) {
    this.element = document.createElementWithClass("div", "placard");
    this.element.placard = this;
    this.subtitleElement = this.element.createChild("div", "subtitle");
    this.titleElement = this.element.createChild("div", "title");
    this.title = title;
    this.subtitle = subtitle;
    this.selected = false;
}
WebInspector.Placard.prototype = {
    get title() {
        return this._title;
    }, set title(x) {
        if (this._title === x)
            return;
        this._title = x;
        this.titleElement.textContent = x;
    }, get subtitle() {
        return this._subtitle;
    }, set subtitle(x) {
        if (this._subtitle === x)
            return;
        this._subtitle = x;
        this.subtitleElement.textContent = x;
    }, get selected() {
        return this._selected;
    }, set selected(x) {
        if (x)
            this.select();
        else
            this.deselect();
    }, select: function () {
        if (this._selected)
            return;
        this._selected = true;
        this.element.classList.add("selected");
    }, deselect: function () {
        if (!this._selected)
            return;
        this._selected = false;
        this.element.classList.remove("selected");
    }, toggleSelected: function () {
        this.selected = !this.selected;
    }, discard: function () {}
}
WebInspector.TabbedPane = function () {
    WebInspector.VBox.call(this);
    this.element.classList.add("tabbed-pane");
    this._headerElement = this.element.createChild("div", "tabbed-pane-header");
    this._headerContentsElement = this._headerElement.createChild("div", "tabbed-pane-header-contents");
    this._tabsElement = this._headerContentsElement.createChild("div", "tabbed-pane-header-tabs");
    this._contentElement = this.element.createChild("div", "tabbed-pane-content scroll-target");
    this._tabs = [];
    this._tabsHistory = [];
    this._tabsById = {};
    this._dropDownButton = this._createDropDownButton();
}
WebInspector.TabbedPane.EventTypes = {
    TabSelected: "TabSelected",
    TabClosed: "TabClosed"
}
WebInspector.TabbedPane.prototype = {
    get visibleView() {
        return this._currentTab ? this._currentTab.view : null;
    }, get selectedTabId() {
        return this._currentTab ? this._currentTab.id : null;
    }, set shrinkableTabs(shrinkableTabs) {
        this._shrinkableTabs = shrinkableTabs;
    }, set verticalTabLayout(verticalTabLayout) {
        this._verticalTabLayout = verticalTabLayout;
        this.invalidateMinimumSize();
    }, set closeableTabs(closeableTabs) {
        this._closeableTabs = closeableTabs;
    }, setRetainTabOrder: function (retainTabOrder, tabOrderComparator) {
        this._retainTabOrder = retainTabOrder;
        this._tabOrderComparator = tabOrderComparator;
    }, defaultFocusedElement: function () {
        return this.visibleView ? this.visibleView.defaultFocusedElement() : null;
    }, focus: function () {
        if (this.visibleView)
            this.visibleView.focus();
        else
            WebInspector.View.prototype.focus.call(this);
    }, headerElement: function () {
        return this._headerElement;
    }, isTabCloseable: function (id) {
        var tab = this._tabsById[id];
        return tab ? tab.isCloseable() : false;
    }, setTabDelegate: function (delegate) {
        var tabs = this._tabs.slice();
        for (var i = 0; i < tabs.length; ++i)
            tabs[i].setDelegate(delegate);
        this._delegate = delegate;
    }, appendTab: function (id, tabTitle, view, tabTooltip, userGesture, isCloseable) {
        isCloseable = typeof isCloseable === "boolean" ? isCloseable : this._closeableTabs;
        var tab = new WebInspector.TabbedPaneTab(this, id, tabTitle, isCloseable, view, tabTooltip);
        tab.setDelegate(this._delegate);
        this._tabsById[id] = tab;

        function comparator(tab1, tab2) {
            return this._tabOrderComparator(tab1.id, tab2.id);
        }
        if (this._retainTabOrder && this._tabOrderComparator)
            this._tabs.splice(insertionIndexForObjectInListSortedByFunction(tab, this._tabs, comparator.bind(this)), 0, tab);
        else
            this._tabs.push(tab);
        this._tabsHistory.push(tab);
        if (this._tabsHistory[0] === tab && this.isShowing())
            this.selectTab(tab.id, userGesture);
        this._updateTabElements();
    }, closeTab: function (id, userGesture) {
        this.closeTabs([id], userGesture);
    }, closeTabs: function (ids, userGesture) {
        for (var i = 0; i < ids.length; ++i)
            this._innerCloseTab(ids[i], userGesture);
        this._updateTabElements();
        if (this._tabsHistory.length)
            this.selectTab(this._tabsHistory[0].id, false);
    }, _innerCloseTab: function (id, userGesture) {
        if (!this._tabsById[id])
            return;
        if (userGesture && !this._tabsById[id]._closeable)
            return;
        if (this._currentTab && this._currentTab.id === id)
            this._hideCurrentTab();
        var tab = this._tabsById[id];
        delete this._tabsById[id];
        this._tabsHistory.splice(this._tabsHistory.indexOf(tab), 1);
        this._tabs.splice(this._tabs.indexOf(tab), 1);
        if (tab._shown)
            this._hideTabElement(tab);
        var eventData = {
            tabId: id,
            view: tab.view,
            isUserGesture: userGesture
        };
        this.dispatchEventToListeners(WebInspector.TabbedPane.EventTypes.TabClosed, eventData);
        return true;
    }, hasTab: function (tabId) {
        return !!this._tabsById[tabId];
    }, allTabs: function () {
        var result = [];
        var tabs = this._tabs.slice();
        for (var i = 0; i < tabs.length; ++i)
            result.push(tabs[i].id);
        return result;
    }, otherTabs: function (id) {
        var result = [];
        var tabs = this._tabs.slice();
        for (var i = 0; i < tabs.length; ++i) {
            if (tabs[i].id !== id)
                result.push(tabs[i].id);
        }
        return result;
    }, selectTab: function (id, userGesture) {
        var tab = this._tabsById[id];
        if (!tab)
            return;
        if (this._currentTab && this._currentTab.id === id)
            return;
        this._hideCurrentTab();
        this._showTab(tab);
        this._currentTab = tab;
        this._tabsHistory.splice(this._tabsHistory.indexOf(tab), 1);
        this._tabsHistory.splice(0, 0, tab);
        this._updateTabElements();
        var eventData = {
            tabId: id,
            view: tab.view,
            isUserGesture: userGesture
        };
        this.dispatchEventToListeners(WebInspector.TabbedPane.EventTypes.TabSelected, eventData);
    }, lastOpenedTabIds: function (tabsCount) {
        function tabToTabId(tab) {
            return tab.id;
        }
        return this._tabsHistory.slice(0, tabsCount).map(tabToTabId);
    }, setTabIcon: function (id, iconClass, iconTooltip) {
        var tab = this._tabsById[id];
        if (tab._setIconClass(iconClass, iconTooltip))
            this._updateTabElements();
    }, changeTabTitle: function (id, tabTitle) {
        var tab = this._tabsById[id];
        if (tab.title === tabTitle)
            return;
        tab.title = tabTitle;
        this._updateTabElements();
    }, changeTabView: function (id, view) {
        var tab = this._tabsById[id];
        if (this._currentTab && this._currentTab.id === tab.id) {
            if (tab.view !== view)
                this._hideTab(tab);
            tab.view = view;
            this._showTab(tab);
        } else
            tab.view = view;
    }, changeTabTooltip: function (id, tabTooltip) {
        var tab = this._tabsById[id];
        tab.tooltip = tabTooltip;
    }, onResize: function () {
        this._updateTabElements();
    }, headerResized: function () {
        this._updateTabElements();
    }, wasShown: function () {
        var effectiveTab = this._currentTab || this._tabsHistory[0];
        if (effectiveTab)
            this.selectTab(effectiveTab.id);
        this.invalidateMinimumSize();
    }, calculateMinimumSize: function () {
        var size = WebInspector.VBox.prototype.calculateMinimumSize.call(this);
        if (this._verticalTabLayout)
            size.width += this._headerElement.offsetWidth;
        else
            size.height += this._headerElement.offsetHeight;
        return size;
    }, _updateTabElements: function () {
        WebInspector.invokeOnceAfterBatchUpdate(this, this._innerUpdateTabElements);
    }, setPlaceholderText: function (text) {
        this._noTabsMessage = text;
    }, _innerUpdateTabElements: function () {
        if (!this.isShowing())
            return;
        if (!this._tabs.length) {
            this._contentElement.classList.add("has-no-tabs");
            if (this._noTabsMessage && !this._noTabsMessageElement) {
                this._noTabsMessageElement = this._contentElement.createChild("div", "tabbed-pane-placeholder fill");
                this._noTabsMessageElement.textContent = this._noTabsMessage;
            }
        } else {
            this._contentElement.classList.remove("has-no-tabs");
            if (this._noTabsMessageElement) {
                this._noTabsMessageElement.remove();
                delete this._noTabsMessageElement;
            }
        }
        if (!this._measuredDropDownButtonWidth)
            this._measureDropDownButton();
        this._updateWidths();
        this._updateTabsDropDown();
    }, _showTabElement: function (index, tab) {
        if (index >= this._tabsElement.children.length)
            this._tabsElement.appendChild(tab.tabElement);
        else
            this._tabsElement.insertBefore(tab.tabElement, this._tabsElement.children[index]);
        tab._shown = true;
    }, _hideTabElement: function (tab) {
        this._tabsElement.removeChild(tab.tabElement);
        tab._shown = false;
    }, _createDropDownButton: function () {
        var dropDownContainer = document.createElement("div");
        dropDownContainer.classList.add("tabbed-pane-header-tabs-drop-down-container");
        var dropDownButton = dropDownContainer.createChild("div", "tabbed-pane-header-tabs-drop-down");
        dropDownButton.appendChild(document.createTextNode("\u00bb"));
        this._dropDownMenu = new WebInspector.DropDownMenu();
        this._dropDownMenu.addEventListener(WebInspector.DropDownMenu.Events.ItemSelected, this._dropDownMenuItemSelected, this);
        dropDownButton.appendChild(this._dropDownMenu.element);
        return dropDownContainer;
    }, _dropDownMenuItemSelected: function (event) {
        var tabId = (event.data);
        this.selectTab(tabId, true);
    }, _totalWidth: function () {
        return this._headerContentsElement.getBoundingClientRect().width;
    }, _updateTabsDropDown: function () {
        var tabsToShowIndexes = this._tabsToShowIndexes(this._tabs, this._tabsHistory, this._totalWidth(), this._measuredDropDownButtonWidth);
        for (var i = 0; i < this._tabs.length; ++i) {
            if (this._tabs[i]._shown && tabsToShowIndexes.indexOf(i) === -1)
                this._hideTabElement(this._tabs[i]);
        }
        for (var i = 0; i < tabsToShowIndexes.length; ++i) {
            var tab = this._tabs[tabsToShowIndexes[i]];
            if (!tab._shown)
                this._showTabElement(i, tab);
        }
        this._populateDropDownFromIndex();
    }, _populateDropDownFromIndex: function () {
        if (this._dropDownButton.parentElement)
            this._headerContentsElement.removeChild(this._dropDownButton);
        this._dropDownMenu.clear();
        var tabsToShow = [];
        for (var i = 0; i < this._tabs.length; ++i) {
            if (!this._tabs[i]._shown)
                tabsToShow.push(this._tabs[i]);
            continue;
        }

        function compareFunction(tab1, tab2) {
            return tab1.title.localeCompare(tab2.title);
        }
        if (!this._retainTabOrder)
            tabsToShow.sort(compareFunction);
        var selectedId = null;
        for (var i = 0; i < tabsToShow.length; ++i) {
            var tab = tabsToShow[i];
            this._dropDownMenu.addItem(tab.id, tab.title);
            if (this._tabsHistory[0] === tab)
                selectedId = tab.id;
        }
        if (tabsToShow.length) {
            this._headerContentsElement.appendChild(this._dropDownButton);
            this._dropDownMenu.selectItem(selectedId);
        }
    }, _measureDropDownButton: function () {
        this._dropDownButton.classList.add("measuring");
        this._headerContentsElement.appendChild(this._dropDownButton);
        this._measuredDropDownButtonWidth = this._dropDownButton.getBoundingClientRect().width;
        this._headerContentsElement.removeChild(this._dropDownButton);
        this._dropDownButton.classList.remove("measuring");
    }, _updateWidths: function () {
        var measuredWidths = this._measureWidths();
        var maxWidth = this._shrinkableTabs ? this._calculateMaxWidth(measuredWidths.slice(), this._totalWidth()) : Number.MAX_VALUE;
        var i = 0;
        for (var tabId in this._tabs) {
            var tab = this._tabs[tabId];
            tab.setWidth(this._verticalTabLayout ? -1 : Math.min(maxWidth, measuredWidths[i++]));
        }
    }, _measureWidths: function () {
        this._tabsElement.style.setProperty("width", "2000px");
        var measuringTabElements = [];
        for (var tabId in this._tabs) {
            var tab = this._tabs[tabId];
            if (typeof tab._measuredWidth === "number")
                continue;
            var measuringTabElement = tab._createTabElement(true);
            measuringTabElement.__tab = tab;
            measuringTabElements.push(measuringTabElement);
            this._tabsElement.appendChild(measuringTabElement);
        }
        for (var i = 0; i < measuringTabElements.length; ++i)
            measuringTabElements[i].__tab._measuredWidth = measuringTabElements[i].getBoundingClientRect().width;
        for (var i = 0; i < measuringTabElements.length; ++i)
            measuringTabElements[i].remove();
        var measuredWidths = [];
        for (var tabId in this._tabs)
            measuredWidths.push(this._tabs[tabId]._measuredWidth);
        this._tabsElement.style.removeProperty("width");
        return measuredWidths;
    }, _calculateMaxWidth: function (measuredWidths, totalWidth) {
        if (!measuredWidths.length)
            return 0;
        measuredWidths.sort(function (x, y) {
            return x - y
        });
        var totalMeasuredWidth = 0;
        for (var i = 0; i < measuredWidths.length; ++i)
            totalMeasuredWidth += measuredWidths[i];
        if (totalWidth >= totalMeasuredWidth)
            return measuredWidths[measuredWidths.length - 1];
        var totalExtraWidth = 0;
        for (var i = measuredWidths.length - 1; i > 0; --i) {
            var extraWidth = measuredWidths[i] - measuredWidths[i - 1];
            totalExtraWidth += (measuredWidths.length - i) * extraWidth;
            if (totalWidth + totalExtraWidth >= totalMeasuredWidth)
                return measuredWidths[i - 1] + (totalWidth + totalExtraWidth - totalMeasuredWidth) / (measuredWidths.length - i);
        }
        return totalWidth / measuredWidths.length;
    }, _tabsToShowIndexes: function (tabsOrdered, tabsHistory, totalWidth, measuredDropDownButtonWidth) {
        var tabsToShowIndexes = [];
        var totalTabsWidth = 0;
        var tabCount = tabsOrdered.length;
        for (var i = 0; i < tabCount; ++i) {
            var tab = this._retainTabOrder ? tabsOrdered[i] : tabsHistory[i];
            totalTabsWidth += tab.width();
            var minimalRequiredWidth = totalTabsWidth;
            if (i !== tabCount - 1)
                minimalRequiredWidth += measuredDropDownButtonWidth;
            if (!this._verticalTabLayout && minimalRequiredWidth > totalWidth)
                break;
            tabsToShowIndexes.push(tabsOrdered.indexOf(tab));
        }
        tabsToShowIndexes.sort(function (x, y) {
            return x - y
        });
        return tabsToShowIndexes;
    }, _hideCurrentTab: function () {
        if (!this._currentTab)
            return;
        this._hideTab(this._currentTab);
        delete this._currentTab;
    }, _showTab: function (tab) {
        tab.tabElement.classList.add("selected");
        tab.view.show(this._contentElement);
    }, _hideTab: function (tab) {
        tab.tabElement.classList.remove("selected");
        tab.view.detach();
    }, elementsToRestoreScrollPositionsFor: function () {
        return [this._contentElement];
    }, _insertBefore: function (tab, index) {
        this._tabsElement.insertBefore(tab._tabElement, this._tabsElement.childNodes[index]);
        var oldIndex = this._tabs.indexOf(tab);
        this._tabs.splice(oldIndex, 1);
        if (oldIndex < index)
        --index;
        this._tabs.splice(index, 0, tab);
    }, __proto__: WebInspector.VBox.prototype
}
WebInspector.TabbedPaneTab = function (tabbedPane, id, title, closeable, view, tooltip) {
    this._closeable = closeable;
    this._tabbedPane = tabbedPane;
    this._id = id;
    this._title = title;
    this._tooltip = tooltip;
    this._view = view;
    this._shown = false;
    this._measuredWidth;
    this._tabElement;
}
WebInspector.TabbedPaneTab.prototype = {
    get id() {
        return this._id;
    }, get title() {
        return this._title;
    }, set title(title) {
        if (title === this._title)
            return;
        this._title = title;
        if (this._titleElement)
            this._titleElement.textContent = title;
        delete this._measuredWidth;
    }, iconClass: function () {
        return this._iconClass;
    }, isCloseable: function () {
        return this._closeable;
    }, _setIconClass: function (iconClass, iconTooltip) {
        if (iconClass === this._iconClass && iconTooltip === this._iconTooltip)
            return false;
        this._iconClass = iconClass;
        this._iconTooltip = iconTooltip;
        if (this._iconElement)
            this._iconElement.remove();
        if (this._iconClass && this._tabElement)
            this._iconElement = this._createIconElement(this._tabElement, this._titleElement);
        delete this._measuredWidth;
        return true;
    }, get view() {
        return this._view;
    }, set view(view) {
        this._view = view;
    }, get tooltip() {
        return this._tooltip;
    }, set tooltip(tooltip) {
        this._tooltip = tooltip;
        if (this._titleElement)
            this._titleElement.title = tooltip || "";
    }, get tabElement() {
        if (!this._tabElement)
            this._tabElement = this._createTabElement(false);
        return this._tabElement;
    }, width: function () {
        return this._width;
    }, setWidth: function (width) {
        this.tabElement.style.width = width === -1 ? "" : (width + "px");
        this._width = width;
    }, setDelegate: function (delegate) {
        this._delegate = delegate;
    }, _createIconElement: function (tabElement, titleElement) {
        var iconElement = document.createElement("span");
        iconElement.className = "tabbed-pane-header-tab-icon " + this._iconClass;
        if (this._iconTooltip)
            iconElement.title = this._iconTooltip;
        tabElement.insertBefore(iconElement, titleElement);
        return iconElement;
    }, _createTabElement: function (measuring) {
        var tabElement = document.createElement("div");
        tabElement.classList.add("tabbed-pane-header-tab");
        tabElement.id = "tab-" + this._id;
        tabElement.tabIndex = -1;
        tabElement.selectTabForTest = this._tabbedPane.selectTab.bind(this._tabbedPane, this.id, true);
        var titleElement = tabElement.createChild("span", "tabbed-pane-header-tab-title");
        titleElement.textContent = this.title;
        titleElement.title = this.tooltip || "";
        if (this._iconClass)
            this._createIconElement(tabElement, titleElement);
        if (!measuring)
            this._titleElement = titleElement;
        if (this._closeable)
            tabElement.createChild("div", "close-button-gray");
        if (measuring) {
            tabElement.classList.add("measuring");
        } else {
            tabElement.addEventListener("click", this._tabClicked.bind(this), false);
            tabElement.addEventListener("mousedown", this._tabMouseDown.bind(this), false);
            tabElement.addEventListener("mouseup", this._tabMouseUp.bind(this), false);
            if (this._closeable) {
                tabElement.addEventListener("contextmenu", this._tabContextMenu.bind(this), false);
                WebInspector.installDragHandle(tabElement, this._startTabDragging.bind(this), this._tabDragging.bind(this), this._endTabDragging.bind(this), "pointer");
            }
        }
        return tabElement;
    }, _tabClicked: function (event) {
        var middleButton = event.button === 1;
        var shouldClose = this._closeable && (middleButton || event.target.classList.contains("close-button-gray"));
        if (!shouldClose) {
            this._tabbedPane.focus();
            return;
        }
        this._closeTabs([this.id]);
        event.consume(true);
    }, _tabMouseDown: function (event) {
        if (event.target.classList.contains("close-button-gray") || event.button === 1)
            return;
        this._tabbedPane.selectTab(this.id, true);
    }, _tabMouseUp: function (event) {
        if (event.button === 1)
            event.consume(true);
    }, _closeTabs: function (ids) {
        if (this._delegate) {
            this._delegate.closeTabs(this._tabbedPane, ids);
            return;
        }
        this._tabbedPane.closeTabs(ids, true);
    }, _tabContextMenu: function (event) {
        function close() {
            this._closeTabs([this.id]);
        }

        function closeOthers() {
            this._closeTabs(this._tabbedPane.otherTabs(this.id));
        }

        function closeAll() {
            this._closeTabs(this._tabbedPane.allTabs());
        }
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString("Close"), close.bind(this));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Close others" : "Close Others"), closeOthers.bind(this));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Close all" : "Close All"), closeAll.bind(this));
        contextMenu.show();
    }, _startTabDragging: function (event) {
        if (event.target.classList.contains("close-button-gray"))
            return false;
        this._dragStartX = event.pageX;
        return true;
    }, _tabDragging: function (event) {
        var tabElements = this._tabbedPane._tabsElement.childNodes;
        for (var i = 0; i < tabElements.length; ++i) {
            var tabElement = tabElements[i];
            if (tabElement === this._tabElement)
                continue;
            var intersects = tabElement.offsetLeft + tabElement.clientWidth > this._tabElement.offsetLeft && this._tabElement.offsetLeft + this._tabElement.clientWidth > tabElement.offsetLeft;
            if (!intersects)
                continue;
            if (Math.abs(event.pageX - this._dragStartX) < tabElement.clientWidth / 2 + 5)
                break;
            if (event.pageX - this._dragStartX > 0) {
                tabElement = tabElement.nextSibling;
                ++i;
            }
            var oldOffsetLeft = this._tabElement.offsetLeft;
            this._tabbedPane._insertBefore(this, i);
            this._dragStartX += this._tabElement.offsetLeft - oldOffsetLeft;
            break;
        }
        if (!this._tabElement.previousSibling && event.pageX - this._dragStartX < 0) {
            this._tabElement.style.setProperty("left", "0px");
            return;
        }
        if (!this._tabElement.nextSibling && event.pageX - this._dragStartX > 0) {
            this._tabElement.style.setProperty("left", "0px");
            return;
        }
        this._tabElement.style.setProperty("position", "relative");
        this._tabElement.style.setProperty("left", (event.pageX - this._dragStartX) + "px");
    }, _endTabDragging: function (event) {
        this._tabElement.style.removeProperty("position");
        this._tabElement.style.removeProperty("left");
        delete this._dragStartX;
    }
}
WebInspector.TabbedPaneTabDelegate = function () {}
WebInspector.TabbedPaneTabDelegate.prototype = {
    closeTabs: function (tabbedPane, ids) {}
}
WebInspector.ExtensibleTabbedPaneController = function (tabbedPane, extensionPoint, viewCallback) {
    this._tabbedPane = tabbedPane;
    this._extensionPoint = extensionPoint;
    this._viewCallback = viewCallback;
    this._tabbedPane.setRetainTabOrder(true, WebInspector.moduleManager.orderComparator(extensionPoint, "name", "order"));
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    this._views = new StringMap();
    this._initialize();
}
WebInspector.ExtensibleTabbedPaneController.prototype = {
    _initialize: function () {
        this._extensions = {};
        var extensions = WebInspector.moduleManager.extensions(this._extensionPoint);
        for (var i = 0; i < extensions.length; ++i) {
            var descriptor = extensions[i].descriptor();
            var id = descriptor["name"];
            var title = WebInspector.UIString(descriptor["title"]);
            var settingName = descriptor["setting"];
            var setting = settingName ? (WebInspector.settings[settingName]) : null;
            this._extensions[id] = extensions[i];
            if (setting) {
                setting.addChangeListener(this._toggleSettingBasedView.bind(this, id, title, setting));
                if (setting.get())
                    this._tabbedPane.appendTab(id, title, new WebInspector.View());
            } else {
                this._tabbedPane.appendTab(id, title, new WebInspector.View());
            }
        }
    },
    _toggleSettingBasedView: function (id, title, setting) {
        this._tabbedPane.closeTab(id);
        if (setting.get())
            this._tabbedPane.appendTab(id, title, new WebInspector.View());
    },
    _tabSelected: function (event) {
        var tabId = this._tabbedPane.selectedTabId;
        var view = this._viewForId(tabId);
        if (view)
            this._tabbedPane.changeTabView(tabId, view);
    },
    _viewForId: function (id) {
        if (this._views.contains(id))
            return (this._views.get(id));
        var view = this._extensions[id] ? (this._extensions[id].instance()) : null;
        this._views.put(id, view);
        if (this._viewCallback && view)
            this._viewCallback(id, view);
        return view;
    }
}
WebInspector.ViewportControl = function (provider) {
    this.element = document.createElement("div");
    this.element.className = "fill";
    this.element.style.overflow = "auto";
    this._topGapElement = this.element.createChild("div");
    this._contentElement = this.element.createChild("div");
    this._bottomGapElement = this.element.createChild("div");
    this._provider = provider;
    this.element.addEventListener("scroll", this._onScroll.bind(this), false);
    this._firstVisibleIndex = 0;
    this._lastVisibleIndex = -1;
}
WebInspector.ViewportControl.Provider = function () {}
WebInspector.ViewportControl.Provider.prototype = {
    itemCount: function () {
        return 0;
    },
    itemElement: function (index) {
        return null;
    }
}
WebInspector.ViewportControl.prototype = {
    contentElement: function () {
        return this._contentElement;
    },
    refresh: function () {
        if (!this.element.clientHeight)
            return;
        this._contentElement.style.setProperty("height", "100000px");
        this._contentElement.removeChildren();
        var itemCount = this._provider.itemCount();
        if (!itemCount) {
            this._firstVisibleIndex = -1;
            this._lastVisibleIndex = -1;
            return;
        }
        if (!this._rowHeight) {
            var firstElement = this._provider.itemElement(0);
            this._rowHeight = firstElement.measurePreferredSize(this._contentElement).height;
        }
        var visibleFrom = this.element.scrollTop;
        var visibleTo = visibleFrom + this.element.clientHeight;
        this._firstVisibleIndex = Math.floor(visibleFrom / this._rowHeight);
        this._lastVisibleIndex = Math.min(Math.ceil(visibleTo / this._rowHeight), itemCount) - 1;
        this._topGapElement.style.height = (this._rowHeight * this._firstVisibleIndex) + "px";
        this._bottomGapElement.style.height = (this._rowHeight * (itemCount - this._lastVisibleIndex - 1)) + "px";
        for (var i = this._firstVisibleIndex; i <= this._lastVisibleIndex; ++i)
            this._contentElement.appendChild(this._provider.itemElement(i));
        this._contentElement.style.removeProperty("height");
    },
    _onScroll: function (event) {
        this.refresh();
    },
    rowsPerViewport: function () {
        return Math.floor(this.element.clientHeight / this._rowHeight);
    },
    firstVisibleIndex: function () {
        return this._firstVisibleIndex;
    },
    lastVisibleIndex: function () {
        return this._lastVisibleIndex;
    },
    renderedElementAt: function (index) {
        if (index < this._firstVisibleIndex)
            return null;
        if (index > this._lastVisibleIndex)
            return null;
        return this._contentElement.childNodes[index - this._firstVisibleIndex];
    },
    scrollItemIntoView: function (index, makeLast) {
        if (index > this._firstVisibleIndex && index < this._lastVisibleIndex)
            return;
        if (makeLast)
            this.element.scrollTop = this._rowHeight * (index + 1) - this.element.clientHeight;
        else
            this.element.scrollTop = this._rowHeight * index;
    }
}
WebInspector.Drawer = function (splitView) {
    WebInspector.VBox.call(this);
    this.element.id = "drawer-contents";
    this._splitView = splitView;
    splitView.hideDefaultResizer();
    this.show(splitView.sidebarElement());
    this._drawerEditorSplitView = new WebInspector.SplitView(true, true, "editorInDrawerSplitViewState", 0.5, 0.5);
    this._drawerEditorSplitView.hideSidebar();
    this._drawerEditorSplitView.addEventListener(WebInspector.SplitView.Events.ShowModeChanged, this._drawerEditorSplitViewShowModeChanged, this);
    this._drawerEditorShownSetting = WebInspector.settings.createSetting("drawerEditorShown", true);
    this._drawerEditorSplitView.show(this.element);
    this._toggleDrawerButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show drawer."), "console-status-bar-item");
    this._toggleDrawerButton.addEventListener("click", this.toggle, this);
    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.element.id = "drawer-tabbed-pane";
    this._tabbedPane.closeableTabs = false;
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    new WebInspector.ExtensibleTabbedPaneController(this._tabbedPane, "drawer-view");
    this._toggleDrawerEditorButton = this._drawerEditorSplitView.createShowHideSidebarButton("editor in drawer", "drawer-editor-show-hide-button");
    this._tabbedPane.element.appendChild(this._toggleDrawerEditorButton.element);
    if (!WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
        this.setDrawerEditorAvailable(false);
    splitView.installResizer(this._tabbedPane.headerElement());
    this._lastSelectedViewSetting = WebInspector.settings.createSetting("WebInspector.Drawer.lastSelectedView", "console");
    this._tabbedPane.show(this._drawerEditorSplitView.mainElement());
}
WebInspector.Drawer.prototype = {
    toggleButtonElement: function () {
        return this._toggleDrawerButton.element;
    },
    closeView: function (id) {
        this._tabbedPane.closeTab(id);
    },
    showView: function (id, immediate) {
        if (!this._tabbedPane.hasTab(id)) {
            this._innerShow(immediate);
            return;
        }
        this._innerShow(immediate);
        this._tabbedPane.selectTab(id, true);
        this._lastSelectedViewSetting.set(id);
    },
    showCloseableView: function (id, title, view) {
        if (!this._tabbedPane.hasTab(id)) {
            this._tabbedPane.appendTab(id, title, view, undefined, false, true);
        } else {
            this._tabbedPane.changeTabView(id, view);
            this._tabbedPane.changeTabTitle(id, title);
        }
        this._innerShow();
        this._tabbedPane.selectTab(id, true);
    },
    showDrawer: function () {
        this.showView(this._lastSelectedViewSetting.get());
    },
    wasShown: function () {
        this.showView(this._lastSelectedViewSetting.get());
        this._toggleDrawerButton.toggled = true;
        this._toggleDrawerButton.title = WebInspector.UIString("Hide drawer.");
        this._ensureDrawerEditorExistsIfNeeded();
    },
    willHide: function () {
        this._toggleDrawerButton.toggled = false;
        this._toggleDrawerButton.title = WebInspector.UIString("Show drawer.");
    },
    _innerShow: function (immediate) {
        if (this.isShowing())
            return;
        this._splitView.showBoth(!immediate);
        if (this._visibleView())
            this._visibleView().focus();
    },
    closeDrawer: function () {
        if (!this.isShowing())
            return;
        WebInspector.restoreFocusFromElement(this.element);
        this._splitView.hideSidebar(true);
    },
    _visibleView: function () {
        return this._tabbedPane.visibleView;
    },
    _tabSelected: function (event) {
        var tabId = this._tabbedPane.selectedTabId;
        if (event.data["isUserGesture"] && !this._tabbedPane.isTabCloseable(tabId))
            this._lastSelectedViewSetting.set(tabId);
    },
    toggle: function () {
        if (this._toggleDrawerButton.toggled)
            this.closeDrawer();
        else
            this.showDrawer();
    },
    visible: function () {
        return this._toggleDrawerButton.toggled;
    },
    selectedViewId: function () {
        return this._tabbedPane.selectedTabId;
    },
    _drawerEditorSplitViewShowModeChanged: function (event) {
        var mode = (event.data);
        var shown = mode === WebInspector.SplitView.ShowMode.Both;
        if (this._isHidingDrawerEditor)
            return;
        this._drawerEditorShownSetting.set(shown);
        if (!shown)
            return;
        this._ensureDrawerEditor();
        this._drawerEditor.view().show(this._drawerEditorSplitView.sidebarElement());
    },
    initialPanelShown: function () {
        this._initialPanelWasShown = true;
        this._ensureDrawerEditorExistsIfNeeded();
    },
    _ensureDrawerEditorExistsIfNeeded: function () {
        if (!this._initialPanelWasShown || !this.isShowing() || !this._drawerEditorShownSetting.get() || !WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
            return;
        this._ensureDrawerEditor();
    },
    _ensureDrawerEditor: function () {
        if (this._drawerEditor)
            return;
        this._drawerEditor = WebInspector.moduleManager.instance(WebInspector.DrawerEditor);
        this._drawerEditor.installedIntoDrawer();
    },
    setDrawerEditorAvailable: function (available) {
        if (!WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
            available = false;
        this._toggleDrawerEditorButton.element.classList.toggle("hidden", !available);
    },
    showDrawerEditor: function () {
        if (!WebInspector.experimentsSettings.showEditorInDrawer.isEnabled())
            return;
        this._splitView.showBoth();
        this._drawerEditorSplitView.showBoth();
    },
    hideDrawerEditor: function () {
        this._isHidingDrawerEditor = true;
        this._drawerEditorSplitView.hideSidebar();
        this._isHidingDrawerEditor = false;
    },
    isDrawerEditorShown: function () {
        return this._drawerEditorShownSetting.get();
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.Drawer.ViewFactory = function () {}
WebInspector.Drawer.ViewFactory.prototype = {
    createView: function () {}
}
WebInspector.Drawer.SingletonViewFactory = function (constructor) {
    this._constructor = constructor;
}
WebInspector.Drawer.SingletonViewFactory.prototype = {
    createView: function () {
        if (!this._instance)
            this._instance = (new this._constructor());
        return this._instance;
    }
}
WebInspector.DrawerEditor = function () {}
WebInspector.DrawerEditor.prototype = {
    view: function () {},
    installedIntoDrawer: function () {},
}
WebInspector.ConsoleModel = function (target) {
    this.messages = [];
    this.warnings = 0;
    this.errors = 0;
    this._target = target;
    this._consoleAgent = target.consoleAgent();
    target.registerConsoleDispatcher(new WebInspector.ConsoleDispatcher(this));
    this._enableAgent();
}
WebInspector.ConsoleModel.Events = {
    ConsoleCleared: "ConsoleCleared",
    MessageAdded: "MessageAdded",
    CommandEvaluated: "CommandEvaluated",
}
WebInspector.ConsoleModel.prototype = {
    _enableAgent: function () {
        if (WebInspector.settings.monitoringXHREnabled.get())
            this._consoleAgent.setMonitoringXHREnabled(true);
        this._enablingConsole = true;

        function callback() {
            delete this._enablingConsole;
        }
        this._consoleAgent.enable(callback.bind(this));
    },
    enablingConsole: function () {
        return !!this._enablingConsole;
    },
    addMessage: function (msg, isFromBackend) {
        if (isFromBackend && WebInspector.SourceMap.hasSourceMapRequestHeader(msg.request))
            return;
        msg.index = this.messages.length;
        this.messages.push(msg);
        this._incrementErrorWarningCount(msg);
        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.MessageAdded, msg);
    },
    evaluateCommand: function (text, useCommandLineAPI) {
        this.show();
        var commandMessage = new WebInspector.ConsoleMessage(WebInspector.ConsoleMessage.MessageSource.JS, null, text, WebInspector.ConsoleMessage.MessageType.Command);
        this.addMessage(commandMessage);

        function printResult(result, wasThrown, valueResult) {
            if (!result)
                return;
            this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.CommandEvaluated, {
                result: result,
                wasThrown: wasThrown,
                text: text,
                commandMessage: commandMessage
            });
        }
        this._target.runtimeModel.evaluate(text, "console", useCommandLineAPI, false, false, true, printResult.bind(this));
        WebInspector.userMetrics.ConsoleEvaluated.record();
    },
    show: function () {
        WebInspector.Revealer.reveal(this);
    },
    evaluate: function (expression) {
        this.evaluateCommand(expression, false);
    },
    log: function (messageText, messageLevel, showConsole) {
        var message = new WebInspector.ConsoleMessage(WebInspector.ConsoleMessage.MessageSource.Other, messageLevel || WebInspector.ConsoleMessage.MessageLevel.Debug, messageText);
        this.addMessage(message);
        if (showConsole)
            this.show();
    },
    showErrorMessage: function (error) {
        this.log(error, WebInspector.ConsoleMessage.MessageLevel.Error, true);
    },
    _incrementErrorWarningCount: function (msg) {
        switch (msg.level) {
        case WebInspector.ConsoleMessage.MessageLevel.Warning:
            this.warnings++;
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Error:
            this.errors++;
            break;
        }
    },
    requestClearMessages: function () {
        this._consoleAgent.clearMessages();
        this.clearMessages();
    },
    clearMessages: function () {
        this.dispatchEventToListeners(WebInspector.ConsoleModel.Events.ConsoleCleared);
        this.messages = [];
        this.errors = 0;
        this.warnings = 0;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.ConsoleMessage = function (source, level, messageText, type, url, line, column, requestId, parameters, stackTrace, timestamp, isOutdated) {
    this.source = source;
    this.level = level;
    this.messageText = messageText;
    this.type = type || WebInspector.ConsoleMessage.MessageType.Log;
    this.url = url || null;
    this.line = line || 0;
    this.column = column || 0;
    this.parameters = parameters;
    this.stackTrace = stackTrace;
    this.timestamp = timestamp || Date.now();
    this.isOutdated = isOutdated;
    this.request = requestId ? WebInspector.networkLog.requestForId(requestId) : null;
}
WebInspector.ConsoleMessage.prototype = {
    isGroupMessage: function () {
        return this.type === WebInspector.ConsoleMessage.MessageType.StartGroup || this.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed || this.type === WebInspector.ConsoleMessage.MessageType.EndGroup;
    },
    isErrorOrWarning: function () {
        return (this.level === WebInspector.ConsoleMessage.MessageLevel.Warning || this.level === WebInspector.ConsoleMessage.MessageLevel.Error);
    },
    clone: function () {
        return new WebInspector.ConsoleMessage(this.source, this.level, this.messageText, this.type, this.url, this.line, this.column, this.request ? this.request.requestId : undefined, this.parameters, this.stackTrace, this.timestamp, this.isOutdated);
    },
    isEqual: function (msg) {
        if (!msg || WebInspector.settings.consoleTimestampsEnabled.get())
            return false;
        if (this.stackTrace) {
            if (!msg.stackTrace || this.stackTrace.length !== msg.stackTrace.length)
                return false;
            for (var i = 0; i < msg.stackTrace.length; ++i) {
                if (this.stackTrace[i].url !== msg.stackTrace[i].url || this.stackTrace[i].functionName !== msg.stackTrace[i].functionName || this.stackTrace[i].lineNumber !== msg.stackTrace[i].lineNumber || this.stackTrace[i].columnNumber !== msg.stackTrace[i].columnNumber)
                    return false;
            }
        }
        if (this.parameters) {
            if (!msg.parameters || this.parameters.length !== msg.parameters.length)
                return false;
            for (var i = 0; i < msg.parameters.length; ++i) {
                if (this.parameters[i].type !== msg.parameters[i].type || msg.parameters[i].type === "object" || this.parameters[i].value !== msg.parameters[i].value)
                    return false;
            }
        }
        return (this.source === msg.source) && (this.type === msg.type) && (this.level === msg.level) && (this.line === msg.line) && (this.url === msg.url) && (this.messageText === msg.messageText) && (this.request === msg.request);
    }
}
WebInspector.ConsoleMessage.MessageSource = {
    XML: "xml",
    JS: "javascript",
    Network: "network",
    ConsoleAPI: "console-api",
    Storage: "storage",
    AppCache: "appcache",
    Rendering: "rendering",
    CSS: "css",
    Security: "security",
    Other: "other",
    Deprecation: "deprecation"
}
WebInspector.ConsoleMessage.MessageType = {
    Log: "log",
    Dir: "dir",
    DirXML: "dirxml",
    Table: "table",
    Trace: "trace",
    Clear: "clear",
    StartGroup: "startGroup",
    StartGroupCollapsed: "startGroupCollapsed",
    EndGroup: "endGroup",
    Assert: "assert",
    Result: "result",
    Profile: "profile",
    ProfileEnd: "profileEnd",
    Command: "command"
}
WebInspector.ConsoleMessage.MessageLevel = {
    Log: "log",
    Info: "info",
    Warning: "warning",
    Error: "error",
    Debug: "debug"
}
WebInspector.ConsoleDispatcher = function (console) {
    this._console = console;
}
WebInspector.ConsoleDispatcher.prototype = {
    messageAdded: function (payload) {
        var consoleMessage = new WebInspector.ConsoleMessage(payload.source, payload.level, payload.text, payload.type, payload.url, payload.line, payload.column, payload.networkRequestId, payload.parameters, payload.stackTrace, payload.timestamp * 1000, this._console._enablingConsole);
        this._console.addMessage(consoleMessage, true);
    },
    messageRepeatCountUpdated: function (count) {},
    messagesCleared: function () {
        if (!WebInspector.settings.preserveConsoleLog.get())
            this._console.clearMessages();
    }
}
WebInspector.console;
WebInspector.Panel = function (name) {
    WebInspector.VBox.call(this);
    WebInspector.panels[name] = this;
    this.element.classList.add("panel");
    this.element.classList.add(name);
    this._panelName = name;
    this._shortcuts = ({});
}
WebInspector.Panel.counterRightMargin = 25;
WebInspector.Panel.prototype = {
    get name() {
        return this._panelName;
    }, reset: function () {}, defaultFocusedElement: function () {
        return this.element;
    }, searchableView: function () {
        return null;
    }, replaceSelectionWith: function (text) {}, replaceAllWith: function (query, text) {}, get statusBarItems() {}, elementsToRestoreScrollPositionsFor: function () {
        return [];
    }, handleShortcut: function (event) {
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler(event)) {
            event.handled = true;
            return;
        }
        var searchableView = this.searchableView();
        if (!searchableView)
            return;

        function handleSearchShortcuts(shortcuts, handler) {
            for (var i = 0; i < shortcuts.length; ++i) {
                if (shortcuts[i].key !== shortcutKey)
                    continue;
                return handler.call(searchableView);
            }
            return false;
        }
        if (handleSearchShortcuts(WebInspector.SearchableView.findShortcuts(), searchableView.handleFindShortcut))
            event.handled = true;
        else if (handleSearchShortcuts(WebInspector.SearchableView.cancelSearchShortcuts(), searchableView.handleCancelSearchShortcut))
            event.handled = true;
    }, registerShortcuts: function (keys, handler) {
        for (var i = 0; i < keys.length; ++i)
            this._shortcuts[keys[i].key] = handler;
    }, __proto__: WebInspector.VBox.prototype
}
WebInspector.PanelWithSidebarTree = function (name, defaultWidth) {
    WebInspector.Panel.call(this, name);
    this._panelSplitView = new WebInspector.SplitView(true, false, this._panelName + "PanelSplitViewState", defaultWidth || 200);
    this._panelSplitView.show(this.element);
    var sidebarView = new WebInspector.VBox();
    sidebarView.setMinimumSize(Preferences.minSidebarWidth, 25);
    sidebarView.show(this._panelSplitView.sidebarElement());
    this._sidebarElement = sidebarView.element;
    this._sidebarElement.classList.add("sidebar");
    var sidebarTreeElement = this._sidebarElement.createChild("ol", "sidebar-tree");
    this.sidebarTree = new TreeOutline(sidebarTreeElement);
}
WebInspector.PanelWithSidebarTree.prototype = {
    sidebarElement: function () {
        return this._sidebarElement;
    },
    mainElement: function () {
        return this._panelSplitView.mainElement();
    },
    defaultFocusedElement: function () {
        return this.sidebarTree.element || this.element;
    },
    __proto__: WebInspector.Panel.prototype
}
WebInspector.PanelDescriptor = function () {}
WebInspector.PanelDescriptor.prototype = {
    name: function () {},
    title: function () {},
    panel: function () {}
}
WebInspector.ModuleManagerExtensionPanelDescriptor = function (extension) {
    this._name = extension.descriptor()["name"];
    this._title = WebInspector.UIString(extension.descriptor()["title"]);
    this._extension = extension;
}
WebInspector.ModuleManagerExtensionPanelDescriptor.prototype = {
    name: function () {
        return this._name;
    },
    title: function () {
        return this._title;
    },
    panel: function () {
        return (this._extension.instance());
    }
}
WebInspector.InspectorView = function () {
    WebInspector.VBox.call(this);
    WebInspector.Dialog.setModalHostView(this);
    this.setMinimumSize(180, 72);
    this._drawerSplitView = new WebInspector.SplitView(false, true, "Inspector.drawerSplitViewState", 200, 200);
    this._drawerSplitView.hideSidebar();
    this._drawerSplitView.enableShowModeSaving();
    this._drawerSplitView.show(this.element);
    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.setRetainTabOrder(true, WebInspector.moduleManager.orderComparator(WebInspector.Panel, "name", "order"));
    this._tabbedPane.show(this._drawerSplitView.mainElement());
    this._drawer = new WebInspector.Drawer(this._drawerSplitView);
    this._toolbarElement = document.createElement("div");
    this._toolbarElement.className = "toolbar toolbar-background";
    var headerElement = this._tabbedPane.headerElement();
    headerElement.parentElement.insertBefore(this._toolbarElement, headerElement);
    this._leftToolbarElement = this._toolbarElement.createChild("div", "toolbar-controls-left");
    this._toolbarElement.appendChild(headerElement);
    this._rightToolbarElement = this._toolbarElement.createChild("div", "toolbar-controls-right");
    this._errorWarningCountElement = this._rightToolbarElement.createChild("div", "hidden");
    this._errorWarningCountElement.id = "error-warning-count";
    this._closeButtonToolbarItem = document.createElementWithClass("div", "toolbar-close-button-item");
    var closeButtonElement = this._closeButtonToolbarItem.createChild("div", "close-button");
    closeButtonElement.addEventListener("click", InspectorFrontendHost.closeWindow.bind(InspectorFrontendHost), true);
    this._rightToolbarElement.appendChild(this._closeButtonToolbarItem);
    this.appendToRightToolbar(this._drawer.toggleButtonElement());
    this._history = [];
    this._historyIterator = -1;
    document.addEventListener("keydown", this._keyDown.bind(this), false);
    document.addEventListener("keypress", this._keyPress.bind(this), false);
    this._panelDescriptors = {};
    this._openBracketIdentifiers = ["U+005B", "U+00DB"].keySet();
    this._closeBracketIdentifiers = ["U+005D", "U+00DD"].keySet();
    this._lastActivePanelSetting = WebInspector.settings.createSetting("lastActivePanel", "elements");
    this._loadPanelDesciptors();
};
WebInspector.InspectorView.prototype = {
    _loadPanelDesciptors: function () {
        WebInspector.startBatchUpdate();
        WebInspector.moduleManager.extensions(WebInspector.Panel).forEach(processPanelExtensions.bind(this));

        function processPanelExtensions(extension) {
            this.addPanel(new WebInspector.ModuleManagerExtensionPanelDescriptor(extension));
        }
        WebInspector.endBatchUpdate();
    },
    appendToLeftToolbar: function (element) {
        this._leftToolbarElement.appendChild(element);
    },
    appendToRightToolbar: function (element) {
        this._rightToolbarElement.insertBefore(element, this._closeButtonToolbarItem);
    },
    addPanel: function (panelDescriptor) {
        var panelName = panelDescriptor.name();
        this._panelDescriptors[panelName] = panelDescriptor;
        this._tabbedPane.appendTab(panelName, panelDescriptor.title(), new WebInspector.View());
        if (this._lastActivePanelSetting.get() === panelName)
            this._tabbedPane.selectTab(panelName);
    },
    panel: function (panelName) {
        var panelDescriptor = this._panelDescriptors[panelName];
        var panelOrder = this._tabbedPane.allTabs();
        if (!panelDescriptor && panelOrder.length)
            panelDescriptor = this._panelDescriptors[panelOrder[0]];
        return panelDescriptor ? panelDescriptor.panel() : null;
    },
    showPanel: function (panelName) {
        var panel = this.panel(panelName);
        if (panel)
            this.setCurrentPanel(panel);
        return panel;
    },
    currentPanel: function () {
        return this._currentPanel;
    },
    showInitialPanel: function () {
        this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
        this._tabSelected();
        this._drawer.initialPanelShown();
    },
    showDrawerEditor: function () {
        this._drawer.showDrawerEditor();
    },
    isDrawerEditorShown: function () {
        return this._drawer.isDrawerEditorShown();
    },
    hideDrawerEditor: function () {
        this._drawer.hideDrawerEditor();
    },
    setDrawerEditorAvailable: function (available) {
        this._drawer.setDrawerEditorAvailable(available);
    },
    _tabSelected: function () {
        var panelName = this._tabbedPane.selectedTabId;
        var panel = this._panelDescriptors[this._tabbedPane.selectedTabId].panel();
        this._tabbedPane.changeTabView(panelName, panel);
        this._currentPanel = panel;
        this._lastActivePanelSetting.set(panel.name);
        this._pushToHistory(panel.name);
        WebInspector.userMetrics.panelShown(panel.name);
        panel.focus();
    },
    setCurrentPanel: function (x) {
        if (this._currentPanel === x)
            return;
        this._tabbedPane.changeTabView(x.name, x);
        this._tabbedPane.selectTab(x.name);
    },
    closeViewInDrawer: function (id) {
        this._drawer.closeView(id);
    },
    showCloseableViewInDrawer: function (id, title, view) {
        this._drawer.showCloseableView(id, title, view);
    },
    showDrawer: function () {
        this._drawer.showDrawer();
    },
    drawerVisible: function () {
        return this._drawer.isShowing();
    },
    showViewInDrawer: function (id, immediate) {
        this._drawer.showView(id, immediate);
    },
    selectedViewInDrawer: function () {
        return this._drawer.selectedViewId();
    },
    closeDrawer: function () {
        this._drawer.closeDrawer();
    },
    defaultFocusedElement: function () {
        return this._currentPanel ? this._currentPanel.defaultFocusedElement() : null;
    },
    _keyPress: function (event) {
        if (event.charCode < 32 && WebInspector.isWin())
            return;
        clearTimeout(this._keyDownTimer);
        delete this._keyDownTimer;
    },
    _keyDown: function (event) {
        if (!WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event))
            return;
        var keyboardEvent = (event);
        var panelShortcutEnabled = WebInspector.settings.shortcutPanelSwitch.get();
        if (panelShortcutEnabled && !event.shiftKey && !event.altKey) {
            var panelIndex = -1;
            if (event.keyCode > 0x30 && event.keyCode < 0x3A)
                panelIndex = event.keyCode - 0x31;
            else if (event.keyCode > 0x60 && event.keyCode < 0x6A && keyboardEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD)
                panelIndex = event.keyCode - 0x61;
            if (panelIndex !== -1) {
                var panelName = this._tabbedPane.allTabs()[panelIndex];
                if (panelName) {
                    if (!WebInspector.Dialog.currentInstance())
                        this.showPanel(panelName);
                    event.consume(true);
                }
                return;
            }
        }
        if (!WebInspector.isWin() || (!this._openBracketIdentifiers[event.keyIdentifier] && !this._closeBracketIdentifiers[event.keyIdentifier])) {
            this._keyDownInternal(event);
            return;
        }
        this._keyDownTimer = setTimeout(this._keyDownInternal.bind(this, event), 0);
    },
    _keyDownInternal: function (event) {
        var direction = 0;
        if (this._openBracketIdentifiers[event.keyIdentifier])
            direction = -1;
        if (this._closeBracketIdentifiers[event.keyIdentifier])
            direction = 1;
        if (!direction)
            return;
        if (!event.shiftKey && !event.altKey) {
            if (!WebInspector.Dialog.currentInstance())
                this._changePanelInDirection(direction);
            event.consume(true);
            return;
        }
        if (event.altKey && this._moveInHistory(direction))
            event.consume(true)
    },
    _changePanelInDirection: function (direction) {
        var panelOrder = this._tabbedPane.allTabs();
        var index = panelOrder.indexOf(this.currentPanel().name);
        index = (index + panelOrder.length + direction) % panelOrder.length;
        this.showPanel(panelOrder[index]);
    },
    _moveInHistory: function (move) {
        var newIndex = this._historyIterator + move;
        if (newIndex >= this._history.length || newIndex < 0)
            return false;
        this._inHistory = true;
        this._historyIterator = newIndex;
        if (!WebInspector.Dialog.currentInstance())
            this.setCurrentPanel(WebInspector.panels[this._history[this._historyIterator]]);
        delete this._inHistory;
        return true;
    },
    _pushToHistory: function (panelName) {
        if (this._inHistory)
            return;
        this._history.splice(this._historyIterator + 1, this._history.length - this._historyIterator - 1);
        if (!this._history.length || this._history[this._history.length - 1] !== panelName)
            this._history.push(panelName);
        this._historyIterator = this._history.length - 1;
    },
    onResize: function () {
        WebInspector.Dialog.modalHostRepositioned();
    },
    topResizerElement: function () {
        return this._tabbedPane.headerElement();
    },
    _createImagedCounterElementIfNeeded: function (count, id, styleName) {
        if (!count)
            return;
        var imageElement = this._errorWarningCountElement.createChild("div", styleName);
        var counterElement = this._errorWarningCountElement.createChild("span");
        counterElement.id = id;
        counterElement.textContent = count;
    },
    setErrorAndWarningCounts: function (errors, warnings) {
        if (this._errors === errors && this._warnings === warnings)
            return;
        this._errors = errors;
        this._warnings = warnings;
        this._errorWarningCountElement.classList.toggle("hidden", !errors && !warnings);
        this._errorWarningCountElement.removeChildren();
        this._createImagedCounterElementIfNeeded(errors, "error-count", "error-icon-small");
        this._createImagedCounterElementIfNeeded(warnings, "warning-count", "warning-icon-small");
        var errorString = errors ? WebInspector.UIString("%d error%s", errors, errors > 1 ? "s" : "") : "";
        var warningString = warnings ? WebInspector.UIString("%d warning%s", warnings, warnings > 1 ? "s" : "") : "";
        var commaString = errors && warnings ? ", " : "";
        this._errorWarningCountElement.title = errorString + commaString + warningString;
        this._tabbedPane.headerResized();
    },
    __proto__: WebInspector.VBox.prototype
};
WebInspector.inspectorView;
WebInspector.InspectorView.DrawerToggleActionDelegate = function () {}
WebInspector.InspectorView.DrawerToggleActionDelegate.prototype = {
    handleAction: function () {
        if (WebInspector.inspectorView.drawerVisible()) {
            WebInspector.inspectorView.closeDrawer();
            return true;
        }
        if (!WebInspector.experimentsSettings.doNotOpenDrawerOnEsc.isEnabled()) {
            WebInspector.inspectorView.showDrawer();
            return true;
        }
        return false;
    }
}
WebInspector.RootView = function () {
    WebInspector.VBox.call(this);
    this.markAsRoot();
    this.element.classList.add("root-view");
    this.element.setAttribute("spellcheck", false);
    window.addEventListener("resize", this.doResize.bind(this), true);
    this._onScrollBound = this._onScroll.bind(this);
};
WebInspector.RootView.prototype = {
    attachToBody: function () {
        this.doResize();
        this.show(document.body);
    },
    _onScroll: function () {
        if (document.body.scrollTop !== 0)
            document.body.scrollTop = 0;
        if (document.body.scrollLeft !== 0)
            document.body.scrollLeft = 0;
    },
    doResize: function () {
        var size = this.minimumSize();
        var right = Math.min(0, window.innerWidth - size.width);
        this.element.style.right = right + "px";
        var bottom = Math.min(0, window.innerHeight - size.height);
        this.element.style.bottom = bottom + "px";
        if (window.innerWidth < size.width || window.innerHeight < size.height)
            window.addEventListener("scroll", this._onScrollBound, false);
        else
            window.removeEventListener("scroll", this._onScrollBound, false);
        WebInspector.VBox.prototype.doResize.call(this);
        this._onScroll();
    },
    __proto__: WebInspector.VBox.prototype
};

WebInspector.ContentProvider = function () {}
WebInspector.ContentProvider.prototype = {
    contentURL: function () {},
    contentType: function () {},
    requestContent: function (callback) {},
    searchInContent: function (query, caseSensitive, isRegex, callback) {}
}
WebInspector.ContentProvider.SearchMatch = function (lineNumber, lineContent) {
    this.lineNumber = lineNumber;
    this.lineContent = lineContent;
}
WebInspector.ContentProvider.performSearchInContent = function (content, query, caseSensitive, isRegex) {
    var regex = createSearchRegex(query, caseSensitive, isRegex);
    var contentString = new String(content);
    var result = [];
    for (var i = 0; i < contentString.lineCount(); ++i) {
        var lineContent = contentString.lineAt(i);
        regex.lastIndex = 0;
        if (regex.exec(lineContent))
            result.push(new WebInspector.ContentProvider.SearchMatch(i, lineContent));
    }
    return result;
}
WebInspector.Resource = function (request, url, documentURL, frameId, loaderId, type, mimeType, isHidden) {
    this._request = request;
    this.url = url;
    this._documentURL = documentURL;
    this._frameId = frameId;
    this._loaderId = loaderId;
    this._type = type || WebInspector.resourceTypes.Other;
    this._mimeType = mimeType;
    this._isHidden = isHidden;
    this._content;
    this._contentEncoded;
    this._pendingContentCallbacks = [];
    if (this._request && !this._request.finished)
        this._request.addEventListener(WebInspector.NetworkRequest.Events.FinishedLoading, this._requestFinished, this);
}
WebInspector.Resource.Events = {
    MessageAdded: "message-added",
    MessagesCleared: "messages-cleared",
}
WebInspector.Resource.prototype = {
    get request() {
        return this._request;
    }, get url() {
        return this._url;
    }, set url(x) {
        this._url = x;
        this._parsedURL = new WebInspector.ParsedURL(x);
    }, get parsedURL() {
        return this._parsedURL;
    }, get documentURL() {
        return this._documentURL;
    }, get frameId() {
        return this._frameId;
    }, get loaderId() {
        return this._loaderId;
    }, get displayName() {
        return this._parsedURL.displayName;
    }, get type() {
        return this._request ? this._request.type : this._type;
    }, get mimeType() {
        return this._request ? this._request.mimeType : this._mimeType;
    }, get messages() {
        return this._messages || [];
    }, addMessage: function (msg) {
        if (!msg.isErrorOrWarning() || !msg.messageText)
            return;
        if (!this._messages)
            this._messages = [];
        this._messages.push(msg);
        this.dispatchEventToListeners(WebInspector.Resource.Events.MessageAdded, msg);
    }, get errors() {
        return this._errors || 0;
    }, set errors(x) {
        this._errors = x;
    }, get warnings() {
        return this._warnings || 0;
    }, set warnings(x) {
        this._warnings = x;
    }, clearErrorsAndWarnings: function () {
        this._messages = [];
        this._warnings = 0;
        this._errors = 0;
        this.dispatchEventToListeners(WebInspector.Resource.Events.MessagesCleared);
    }, get content() {
        return this._content;
    }, get contentEncoded() {
        return this._contentEncoded;
    }, contentURL: function () {
        return this._url;
    }, contentType: function () {
        return this.type;
    }, requestContent: function (callback) {
        if (typeof this._content !== "undefined") {
            callback(this._content);
            return;
        }
        this._pendingContentCallbacks.push(callback);
        if (!this._request || this._request.finished)
            this._innerRequestContent();
    }, canonicalMimeType: function () {
        return this.type.canonicalMimeType() || this.mimeType;
    }, searchInContent: function (query, caseSensitive, isRegex, callback) {
        function callbackWrapper(error, searchMatches) {
            callback(searchMatches || []);
        }
        if (this.type === WebInspector.resourceTypes.Document) {
            callback([]);
            return;
        }
        if (this.frameId)
            PageAgent.searchInResource(this.frameId, this.url, query, caseSensitive, isRegex, callbackWrapper);
        else
            callback([]);
    }, populateImageSource: function (image) {
        function onResourceContent(content) {
            var imageSrc = WebInspector.contentAsDataURL(this._content, this.mimeType, this._contentEncoded);
            if (imageSrc === null)
                imageSrc = this.url;
            image.src = imageSrc;
        }
        this.requestContent(onResourceContent.bind(this));
    }, _requestFinished: function () {
        this._request.removeEventListener(WebInspector.NetworkRequest.Events.FinishedLoading, this._requestFinished, this);
        if (this._pendingContentCallbacks.length)
            this._innerRequestContent();
    }, _innerRequestContent: function () {
        if (this._contentRequested)
            return;
        this._contentRequested = true;

        function contentLoaded(error, content, contentEncoded) {
            if (error || content === null) {
                replyWithContent.call(this, null, false);
                return;
            }
            replyWithContent.call(this, content, contentEncoded);
        }

        function replyWithContent(content, contentEncoded) {
            this._content = content;
            this._contentEncoded = contentEncoded;
            var callbacks = this._pendingContentCallbacks.slice();
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](this._content);
            this._pendingContentCallbacks.length = 0;
            delete this._contentRequested;
        }

        function resourceContentLoaded(error, content, contentEncoded) {
            contentLoaded.call(this, error, content, contentEncoded);
        }
        if (this.request) {
            this.request.requestContent(requestContentLoaded.bind(this));
            return;
        }

        function requestContentLoaded(content) {
            contentLoaded.call(this, null, content, this.request.contentEncoded);
        }
        PageAgent.getResourceContent(this.frameId, this.url, resourceContentLoaded.bind(this));
    }, isHidden: function () {
        return !!this._isHidden;
    }, __proto__: WebInspector.Object.prototype
}
WebInspector.NetworkRequest = function (requestId, url, documentURL, frameId, loaderId) {
    this._requestId = requestId;
    this.url = url;
    this._documentURL = documentURL;
    this._frameId = frameId;
    this._loaderId = loaderId;
    this._startTime = -1;
    this._endTime = -1;
    this.statusCode = 0;
    this.statusText = "";
    this.requestMethod = "";
    this.requestTime = 0;
    this._type = WebInspector.resourceTypes.Other;
    this._contentEncoded = false;
    this._pendingContentCallbacks = [];
    this._frames = [];
    this._responseHeaderValues = {};
    this._remoteAddress = "";
}
WebInspector.NetworkRequest.Events = {
    FinishedLoading: "FinishedLoading",
    TimingChanged: "TimingChanged",
    RemoteAddressChanged: "RemoteAddressChanged",
    RequestHeadersChanged: "RequestHeadersChanged",
    ResponseHeadersChanged: "ResponseHeadersChanged",
}
WebInspector.NetworkRequest.InitiatorType = {
    Other: "other",
    Parser: "parser",
    Redirect: "redirect",
    Script: "script"
}
WebInspector.NetworkRequest.NameValue;
WebInspector.NetworkRequest.prototype = {
    get requestId() {
        return this._requestId;
    }, set requestId(requestId) {
        this._requestId = requestId;
    }, get url() {
        return this._url;
    }, set url(x) {
        if (this._url === x)
            return;
        this._url = x;
        this._parsedURL = new WebInspector.ParsedURL(x);
        delete this._queryString;
        delete this._parsedQueryParameters;
        delete this._name;
        delete this._path;
    }, get documentURL() {
        return this._documentURL;
    }, get parsedURL() {
        return this._parsedURL;
    }, get frameId() {
        return this._frameId;
    }, get loaderId() {
        return this._loaderId;
    }, setRemoteAddress: function (ip, port) {
        this._remoteAddress = ip + ":" + port;
        this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.RemoteAddressChanged, this);
    }, remoteAddress: function () {
        return this._remoteAddress;
    }, get startTime() {
        return this._startTime || -1;
    }, set startTime(x) {
        this._startTime = x;
    }, get responseReceivedTime() {
        return this._responseReceivedTime || -1;
    }, set responseReceivedTime(x) {
        this._responseReceivedTime = x;
    }, get endTime() {
        return this._endTime || -1;
    }, set endTime(x) {
        if (this.timing && this.timing.requestTime) {
            this._endTime = Math.max(x, this.responseReceivedTime);
        } else {
            this._endTime = x;
            if (this._responseReceivedTime > x)
                this._responseReceivedTime = x;
        }
        this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.TimingChanged, this);
    }, get duration() {
        if (this._endTime === -1 || this._startTime === -1)
            return -1;
        return this._endTime - this._startTime;
    }, get latency() {
        if (this._responseReceivedTime === -1 || this._startTime === -1)
            return -1;
        return this._responseReceivedTime - this._startTime;
    }, get resourceSize() {
        return this._resourceSize || 0;
    }, set resourceSize(x) {
        this._resourceSize = x;
    }, get transferSize() {
        return this._transferSize || 0;
    }, increaseTransferSize: function (x) {
        this._transferSize = (this._transferSize || 0) + x;
    }, setTransferSize: function (x) {
        this._transferSize = x;
    }, get finished() {
        return this._finished;
    }, set finished(x) {
        if (this._finished === x)
            return;
        this._finished = x;
        if (x) {
            this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.FinishedLoading, this);
            if (this._pendingContentCallbacks.length)
                this._innerRequestContent();
        }
    }, get failed() {
        return this._failed;
    }, set failed(x) {
        this._failed = x;
    }, get canceled() {
        return this._canceled;
    }, set canceled(x) {
        this._canceled = x;
    }, get cached() {
        return !!this._cached && !this._transferSize;
    }, set cached(x) {
        this._cached = x;
        if (x)
            delete this._timing;
    }, get timing() {
        return this._timing;
    }, set timing(x) {
        if (x && !this._cached) {
            this._startTime = x.requestTime;
            this._responseReceivedTime = x.requestTime + x.receiveHeadersEnd / 1000.0;
            this._timing = x;
            this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.TimingChanged, this);
        }
    }, get mimeType() {
        return this._mimeType;
    }, set mimeType(x) {
        this._mimeType = x;
    }, get displayName() {
        return this._parsedURL.displayName;
    }, name: function () {
        if (this._name)
            return this._name;
        this._parseNameAndPathFromURL();
        return this._name;
    }, path: function () {
        if (this._path)
            return this._path;
        this._parseNameAndPathFromURL();
        return this._path;
    }, _parseNameAndPathFromURL: function () {
        if (this._parsedURL.isDataURL()) {
            this._name = this._parsedURL.dataURLDisplayName();
            this._path = "";
        } else if (this._parsedURL.isAboutBlank()) {
            this._name = this._parsedURL.url;
            this._path = "";
        } else {
            this._path = this._parsedURL.host + this._parsedURL.folderPathComponents;
            this._path = this._path.trimURL(WebInspector.resourceTreeModel.inspectedPageDomain());
            if (this._parsedURL.lastPathComponent || this._parsedURL.queryParams)
                this._name = this._parsedURL.lastPathComponent + (this._parsedURL.queryParams ? "?" + this._parsedURL.queryParams : "");
            else if (this._parsedURL.folderPathComponents) {
                this._name = this._parsedURL.folderPathComponents.substring(this._parsedURL.folderPathComponents.lastIndexOf("/") + 1) + "/";
                this._path = this._path.substring(0, this._path.lastIndexOf("/"));
            } else {
                this._name = this._parsedURL.host;
                this._path = "";
            }
        }
    }, get folder() {
        var path = this._parsedURL.path;
        var indexOfQuery = path.indexOf("?");
        if (indexOfQuery !== -1)
            path = path.substring(0, indexOfQuery);
        var lastSlashIndex = path.lastIndexOf("/");
        return lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex) : "";
    }, get type() {
        return this._type;
    }, set type(x) {
        this._type = x;
    }, get domain() {
        return this._parsedURL.host;
    }, get scheme() {
        return this._parsedURL.scheme;
    }, get redirectSource() {
        if (this.redirects && this.redirects.length > 0)
            return this.redirects[this.redirects.length - 1];
        return this._redirectSource;
    }, set redirectSource(x) {
        this._redirectSource = x;
        delete this._initiatorInfo;
    }, requestHeaders: function () {
        return this._requestHeaders || [];
    }, setRequestHeaders: function (headers) {
        this._requestHeaders = headers;
        delete this._requestCookies;
        this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.RequestHeadersChanged);
    }, requestHeadersText: function () {
        return this._requestHeadersText;
    }, setRequestHeadersText: function (text) {
        this._requestHeadersText = text;
        this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.RequestHeadersChanged);
    }, requestHeaderValue: function (headerName) {
        return this._headerValue(this.requestHeaders(), headerName);
    }, get requestCookies() {
        if (!this._requestCookies)
            this._requestCookies = WebInspector.CookieParser.parseCookie(this.requestHeaderValue("Cookie"));
        return this._requestCookies;
    }, get requestFormData() {
        return this._requestFormData;
    }, set requestFormData(x) {
        this._requestFormData = x;
        delete this._parsedFormParameters;
    }, requestHttpVersion: function () {
        var headersText = this.requestHeadersText();
        if (!headersText) {
            return this.requestHeaderValue(":version");
        }
        var firstLine = headersText.split(/\r\n/)[0];
        var match = firstLine.match(/(HTTP\/\d+\.\d+)$/);
        return match ? match[1] : undefined;
    }, get responseHeaders() {
        return this._responseHeaders || [];
    }, set responseHeaders(x) {
        this._responseHeaders = x;
        delete this._sortedResponseHeaders;
        delete this._responseCookies;
        this._responseHeaderValues = {};
        this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.ResponseHeadersChanged);
    }, get responseHeadersText() {
        return this._responseHeadersText;
    }, set responseHeadersText(x) {
        this._responseHeadersText = x;
        this.dispatchEventToListeners(WebInspector.NetworkRequest.Events.ResponseHeadersChanged);
    }, get sortedResponseHeaders() {
        if (this._sortedResponseHeaders !== undefined)
            return this._sortedResponseHeaders;
        this._sortedResponseHeaders = this.responseHeaders.slice();
        this._sortedResponseHeaders.sort(function (a, b) {
            return a.name.toLowerCase().compareTo(b.name.toLowerCase());
        });
        return this._sortedResponseHeaders;
    }, responseHeaderValue: function (headerName) {
        var value = this._responseHeaderValues[headerName];
        if (value === undefined) {
            value = this._headerValue(this.responseHeaders, headerName);
            this._responseHeaderValues[headerName] = (value !== undefined) ? value : null;
        }
        return (value !== null) ? value : undefined;
    }, get responseCookies() {
        if (!this._responseCookies)
            this._responseCookies = WebInspector.CookieParser.parseSetCookie(this.responseHeaderValue("Set-Cookie"));
        return this._responseCookies;
    }, queryString: function () {
        if (this._queryString !== undefined)
            return this._queryString;
        var queryString = null;
        var url = this.url;
        var questionMarkPosition = url.indexOf("?");
        if (questionMarkPosition !== -1) {
            queryString = url.substring(questionMarkPosition + 1);
            var hashSignPosition = queryString.indexOf("#");
            if (hashSignPosition !== -1)
                queryString = queryString.substring(0, hashSignPosition);
        }
        this._queryString = queryString;
        return this._queryString;
    }, get queryParameters() {
        if (this._parsedQueryParameters)
            return this._parsedQueryParameters;
        var queryString = this.queryString();
        if (!queryString)
            return null;
        this._parsedQueryParameters = this._parseParameters(queryString);
        return this._parsedQueryParameters;
    }, get formParameters() {
        if (this._parsedFormParameters)
            return this._parsedFormParameters;
        if (!this.requestFormData)
            return null;
        var requestContentType = this.requestContentType();
        if (!requestContentType || !requestContentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i))
            return null;
        this._parsedFormParameters = this._parseParameters(this.requestFormData);
        return this._parsedFormParameters;
    }, get responseHttpVersion() {
        var headersText = this._responseHeadersText;
        if (!headersText) {
            return this.responseHeaderValue(":version");
        }
        var match = headersText.match(/^(HTTP\/\d+\.\d+)/);
        return match ? match[1] : undefined;
    }, _parseParameters: function (queryString) {
        function parseNameValue(pair) {
            var splitPair = pair.split("=", 2);
            return {
                name: splitPair[0],
                value: splitPair[1] || ""
            };
        }
        return queryString.split("&").map(parseNameValue);
    }, _headerValue: function (headers, headerName) {
        headerName = headerName.toLowerCase();
        var values = [];
        for (var i = 0; i < headers.length; ++i) {
            if (headers[i].name.toLowerCase() === headerName)
                values.push(headers[i].value);
        }
        if (!values.length)
            return undefined;
        if (headerName === "set-cookie")
            return values.join("\n");
        return values.join(", ");
    }, get content() {
        return this._content;
    }, contentError: function () {
        return this._contentError;
    }, get contentEncoded() {
        return this._contentEncoded;
    }, contentURL: function () {
        return this._url;
    }, contentType: function () {
        return this._type;
    }, requestContent: function (callback) {
        if (this.type === WebInspector.resourceTypes.WebSocket) {
            callback(null);
            return;
        }
        if (typeof this._content !== "undefined") {
            callback(this.content || null);
            return;
        }
        this._pendingContentCallbacks.push(callback);
        if (this.finished)
            this._innerRequestContent();
    }, searchInContent: function (query, caseSensitive, isRegex, callback) {
        callback([]);
    }, isHttpFamily: function () {
        return !!this.url.match(/^https?:/i);
    }, requestContentType: function () {
        return this.requestHeaderValue("Content-Type");
    }, isPingRequest: function () {
        return "text/ping" === this.requestContentType();
    }, hasErrorStatusCode: function () {
        return this.statusCode >= 400;
    }, populateImageSource: function (image) {
        function onResourceContent(content) {
            var imageSrc = this.asDataURL();
            if (imageSrc === null)
                imageSrc = this.url;
            image.src = imageSrc;
        }
        this.requestContent(onResourceContent.bind(this));
    }, asDataURL: function () {
        return WebInspector.contentAsDataURL(this._content, this.mimeType, this._contentEncoded);
    }, _innerRequestContent: function () {
        if (this._contentRequested)
            return;
        this._contentRequested = true;

        function onResourceContent(error, content, contentEncoded) {
            this._content = error ? null : content;
            this._contentError = error;
            this._contentEncoded = contentEncoded;
            var callbacks = this._pendingContentCallbacks.slice();
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](this._content);
            this._pendingContentCallbacks.length = 0;
            delete this._contentRequested;
        }
        NetworkAgent.getResponseBody(this._requestId, onResourceContent.bind(this));
    }, initiatorInfo: function () {
        if (this._initiatorInfo)
            return this._initiatorInfo;
        var type = WebInspector.NetworkRequest.InitiatorType.Other;
        var url = "";
        var lineNumber = -Infinity;
        var columnNumber = -Infinity;
        if (this.redirectSource) {
            type = WebInspector.NetworkRequest.InitiatorType.Redirect;
            url = this.redirectSource.url;
        } else if (this.initiator) {
            if (this.initiator.type === NetworkAgent.InitiatorType.Parser) {
                type = WebInspector.NetworkRequest.InitiatorType.Parser;
                url = this.initiator.url;
                lineNumber = this.initiator.lineNumber;
            } else if (this.initiator.type === NetworkAgent.InitiatorType.Script) {
                var topFrame = this.initiator.stackTrace[0];
                if (topFrame.url) {
                    type = WebInspector.NetworkRequest.InitiatorType.Script;
                    url = topFrame.url;
                    lineNumber = topFrame.lineNumber;
                    columnNumber = topFrame.columnNumber;
                }
            }
        }
        this._initiatorInfo = {
            type: type,
            url: url,
            source: WebInspector.displayNameForURL(url),
            lineNumber: lineNumber,
            columnNumber: columnNumber
        };
        return this._initiatorInfo;
    }, frames: function () {
        return this._frames;
    }, frame: function (position) {
        return this._frames[position];
    }, addFrameError: function (errorMessage, time) {
        this._pushFrame({
            errorMessage: errorMessage,
            time: time
        });
    }, addFrame: function (response, time, sent) {
        response.time = time;
        if (sent)
            response.sent = sent;
        this._pushFrame(response);
    }, _pushFrame: function (frameOrError) {
        if (this._frames.length >= 100)
            this._frames.splice(0, 10);
        this._frames.push(frameOrError);
    }, __proto__: WebInspector.Object.prototype
}
WebInspector.UISourceCode = function (project, parentPath, name, originURL, url, contentType, isEditable) {
    this._project = project;
    this._parentPath = parentPath;
    this._name = name;
    this._originURL = originURL;
    this._url = url;
    this._contentType = contentType;
    this._isEditable = isEditable;
    this._requestContentCallbacks = [];
    this._consoleMessages = [];
    this.history = [];
    if (this.isEditable() && this._url)
        this._restoreRevisionHistory();
}
WebInspector.UISourceCode.Events = {
    WorkingCopyChanged: "WorkingCopyChanged",
    WorkingCopyCommitted: "WorkingCopyCommitted",
    TitleChanged: "TitleChanged",
    SavedStateUpdated: "SavedStateUpdated",
    ConsoleMessageAdded: "ConsoleMessageAdded",
    ConsoleMessageRemoved: "ConsoleMessageRemoved",
    ConsoleMessagesCleared: "ConsoleMessagesCleared",
    SourceMappingChanged: "SourceMappingChanged",
}
WebInspector.UISourceCode.prototype = {
    get url() {
        return this._url;
    }, name: function () {
        return this._name;
    }, parentPath: function () {
        return this._parentPath;
    }, path: function () {
        return this._parentPath ? this._parentPath + "/" + this._name : this._name;
    }, fullDisplayName: function () {
        return this._project.displayName() + "/" + (this._parentPath ? this._parentPath + "/" : "") + this.displayName(true);
    }, displayName: function (skipTrim) {
        var displayName = this.name() || WebInspector.UIString("(index)");
        return skipTrim ? displayName : displayName.trimEnd(100);
    }, uri: function () {
        var path = this.path();
        if (!this._project.id())
            return path;
        if (!path)
            return this._project.id();
        return this._project.id() + "/" + path;
    }, originURL: function () {
        return this._originURL;
    }, canRename: function () {
        return this._project.canRename();
    }, rename: function (newName, callback) {
        this._project.rename(this, newName, innerCallback.bind(this));

        function innerCallback(success, newName, newURL, newOriginURL, newContentType) {
            if (success)
                this._updateName((newName), (newURL), (newOriginURL), (newContentType));
            callback(success);
        }
    }, remove: function () {
        this._project.deleteFile(this.path());
    }, _updateName: function (name, url, originURL, contentType) {
        var oldURI = this.uri();
        this._name = name;
        if (url)
            this._url = url;
        if (originURL)
            this._originURL = originURL;
        if (contentType)
            this._contentType = contentType;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.TitleChanged, oldURI);
    }, contentURL: function () {
        return this.originURL();
    }, contentType: function () {
        return this._contentType;
    }, scriptFile: function () {
        return this._scriptFile;
    }, setScriptFile: function (scriptFile) {
        this._scriptFile = scriptFile;
    }, project: function () {
        return this._project;
    }, requestMetadata: function (callback) {
        this._project.requestMetadata(this, callback);
    }, requestContent: function (callback) {
        if (this._content || this._contentLoaded) {
            callback(this._content);
            return;
        }
        this._requestContentCallbacks.push(callback);
        if (this._requestContentCallbacks.length === 1)
            this._project.requestFileContent(this, this._fireContentAvailable.bind(this));
    }, checkContentUpdated: function (callback) {
        if (!this._project.canSetFileContent())
            return;
        if (this._checkingContent)
            return;
        this._checkingContent = true;
        this._project.requestFileContent(this, contentLoaded.bind(this));

        function contentLoaded(updatedContent) {
            if (updatedContent === null) {
                var workingCopy = this.workingCopy();
                this._commitContent("", false);
                this.setWorkingCopy(workingCopy);
                delete this._checkingContent;
                if (callback)
                    callback();
                return;
            }
            if (typeof this._lastAcceptedContent === "string" && this._lastAcceptedContent === updatedContent) {
                delete this._checkingContent;
                if (callback)
                    callback();
                return;
            }
            if (this._content === updatedContent) {
                delete this._lastAcceptedContent;
                delete this._checkingContent;
                if (callback)
                    callback();
                return;
            }
            if (!this.isDirty()) {
                this._commitContent(updatedContent, false);
                delete this._checkingContent;
                if (callback)
                    callback();
                return;
            }
            var shouldUpdate = window.confirm(WebInspector.UIString("This file was changed externally. Would you like to reload it?"));
            if (shouldUpdate)
                this._commitContent(updatedContent, false);
            else
                this._lastAcceptedContent = updatedContent;
            delete this._checkingContent;
            if (callback)
                callback();
        }
    }, requestOriginalContent: function (callback) {
        this._project.requestFileContent(this, callback);
    }, _commitContent: function (content, shouldSetContentInProject) {
        delete this._lastAcceptedContent;
        this._content = content;
        this._contentLoaded = true;
        var lastRevision = this.history.length ? this.history[this.history.length - 1] : null;
        if (!lastRevision || lastRevision._content !== this._content) {
            var revision = new WebInspector.Revision(this, this._content, new Date());
            this.history.push(revision);
            revision._persist();
        }
        this._innerResetWorkingCopy();
        this._hasCommittedChanges = true;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyCommitted);
        if (this._url && WebInspector.fileManager.isURLSaved(this._url))
            this._saveURLWithFileManager(false, this._content);
        if (shouldSetContentInProject)
            this._project.setFileContent(this, this._content, function () {});
    }, _saveURLWithFileManager: function (forceSaveAs, content) {
        WebInspector.fileManager.save(this._url, (content), forceSaveAs, callback.bind(this));
        WebInspector.fileManager.close(this._url);

        function callback(accepted) {
            if (!accepted)
                return;
            this._savedWithFileManager = true;
            this.dispatchEventToListeners(WebInspector.UISourceCode.Events.SavedStateUpdated);
        }
    }, saveToFileSystem: function (forceSaveAs) {
        if (this.isDirty()) {
            this._saveURLWithFileManager(forceSaveAs, this.workingCopy());
            this.commitWorkingCopy(function () {});
            return;
        }
        this.requestContent(this._saveURLWithFileManager.bind(this, forceSaveAs));
    }, hasUnsavedCommittedChanges: function () {
        if (this._savedWithFileManager || this.project().canSetFileContent() || !this._isEditable)
            return false;
        if (this._project.workspace().hasResourceContentTrackingExtensions())
            return false;
        return !!this._hasCommittedChanges;
    }, addRevision: function (content) {
        this._commitContent(content, true);
    }, _restoreRevisionHistory: function () {
        if (!window.localStorage)
            return;
        var registry = WebInspector.Revision._revisionHistoryRegistry();
        var historyItems = registry[this.url];
        if (!historyItems)
            return;

        function filterOutStale(historyItem) {
            if (!WebInspector.resourceTreeModel.mainFrame)
                return false;
            return historyItem.loaderId === WebInspector.resourceTreeModel.mainFrame.loaderId;
        }
        historyItems = historyItems.filter(filterOutStale);
        if (!historyItems.length)
            return;
        for (var i = 0; i < historyItems.length; ++i) {
            var content = window.localStorage[historyItems[i].key];
            var timestamp = new Date(historyItems[i].timestamp);
            var revision = new WebInspector.Revision(this, content, timestamp);
            this.history.push(revision);
        }
        this._content = this.history[this.history.length - 1].content;
        this._hasCommittedChanges = true;
        this._contentLoaded = true;
    }, _clearRevisionHistory: function () {
        if (!window.localStorage)
            return;
        var registry = WebInspector.Revision._revisionHistoryRegistry();
        var historyItems = registry[this.url];
        for (var i = 0; historyItems && i < historyItems.length; ++i)
            delete window.localStorage[historyItems[i].key];
        delete registry[this.url];
        window.localStorage["revision-history"] = JSON.stringify(registry);
    }, revertToOriginal: function () {
        function callback(content) {
            if (typeof content !== "string")
                return;
            this.addRevision(content);
        }
        this.requestOriginalContent(callback.bind(this));
        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.ApplyOriginalContent,
            url: this.url
        });
    }, revertAndClearHistory: function (callback) {
        function revert(content) {
            if (typeof content !== "string")
                return;
            this.addRevision(content);
            this._clearRevisionHistory();
            this.history = [];
            callback(this);
        }
        this.requestOriginalContent(revert.bind(this));
        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.RevertRevision,
            url: this.url
        });
    }, isEditable: function () {
        return this._isEditable;
    }, workingCopy: function () {
        if (this._workingCopyGetter) {
            this._workingCopy = this._workingCopyGetter();
            delete this._workingCopyGetter;
        }
        if (this.isDirty())
            return this._workingCopy;
        return this._content;
    }, resetWorkingCopy: function () {
        this._innerResetWorkingCopy();
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyChanged);
    }, _innerResetWorkingCopy: function () {
        delete this._workingCopy;
        delete this._workingCopyGetter;
    }, setWorkingCopy: function (newWorkingCopy) {
        this._workingCopy = newWorkingCopy;
        delete this._workingCopyGetter;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyChanged);
    }, setWorkingCopyGetter: function (workingCopyGetter) {
        this._workingCopyGetter = workingCopyGetter;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyChanged);
    }, removeWorkingCopyGetter: function () {
        if (!this._workingCopyGetter)
            return;
        this._workingCopy = this._workingCopyGetter();
        delete this._workingCopyGetter;
    }, commitWorkingCopy: function (callback) {
        if (!this.isDirty()) {
            callback(null);
            return;
        }
        this._commitContent(this.workingCopy(), true);
        callback(null);
        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.FileSaved,
            url: this.url
        });
    }, isDirty: function () {
        return typeof this._workingCopy !== "undefined" || typeof this._workingCopyGetter !== "undefined";
    }, highlighterType: function () {
        var lastIndexOfDot = this._name.lastIndexOf(".");
        var extension = lastIndexOfDot !== -1 ? this._name.substr(lastIndexOfDot + 1) : "";
        var indexOfQuestionMark = extension.indexOf("?");
        if (indexOfQuestionMark !== -1)
            extension = extension.substr(0, indexOfQuestionMark);
        var mimeType = WebInspector.ResourceType.mimeTypesForExtensions[extension.toLowerCase()];
        return mimeType || this.contentType().canonicalMimeType();
    }, content: function () {
        return this._content;
    }, searchInContent: function (query, caseSensitive, isRegex, callback) {
        var content = this.content();
        if (content) {
            var provider = new WebInspector.StaticContentProvider(this.contentType(), content);
            provider.searchInContent(query, caseSensitive, isRegex, callback);
            return;
        }
        this._project.searchInFileContent(this, query, caseSensitive, isRegex, callback);
    }, _fireContentAvailable: function (content) {
        this._contentLoaded = true;
        this._content = content;
        var callbacks = this._requestContentCallbacks.slice();
        this._requestContentCallbacks = [];
        for (var i = 0; i < callbacks.length; ++i)
            callbacks[i](content);
    }, contentLoaded: function () {
        return this._contentLoaded;
    }, uiLocationToRawLocation: function (lineNumber, columnNumber) {
        if (!this._sourceMapping)
            return null;
        return this._sourceMapping.uiLocationToRawLocation(this, lineNumber, columnNumber);
    }, consoleMessages: function () {
        return this._consoleMessages;
    }, consoleMessageAdded: function (message) {
        this._consoleMessages.push(message);
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.ConsoleMessageAdded, message);
    }, consoleMessageRemoved: function (message) {
        this._consoleMessages.remove(message);
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.ConsoleMessageRemoved, message);
    }, consoleMessagesCleared: function () {
        this._consoleMessages = [];
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.ConsoleMessagesCleared);
    }, hasSourceMapping: function () {
        return !!this._sourceMapping;
    }, setSourceMapping: function (sourceMapping) {
        if (this._sourceMapping === sourceMapping)
            return;
        this._sourceMapping = sourceMapping;
        var data = {};
        data.isIdentity = this._sourceMapping && this._sourceMapping.isIdentity();
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.SourceMappingChanged, data);
    }, __proto__: WebInspector.Object.prototype
}
WebInspector.UILocation = function (uiSourceCode, lineNumber, columnNumber) {
    this.uiSourceCode = uiSourceCode;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
}
WebInspector.UILocation.prototype = {
    uiLocationToRawLocation: function () {
        return this.uiSourceCode.uiLocationToRawLocation(this.lineNumber, this.columnNumber);
    },
    url: function () {
        return this.uiSourceCode.contentURL();
    },
    linkText: function () {
        var linkText = this.uiSourceCode.displayName();
        if (typeof this.lineNumber === "number")
            linkText += ":" + (this.lineNumber + 1);
        return linkText;
    }
}
WebInspector.RawLocation = function () {}
WebInspector.LiveLocation = function (rawLocation, updateDelegate) {
    this._rawLocation = rawLocation;
    this._updateDelegate = updateDelegate;
}
WebInspector.LiveLocation.prototype = {
    update: function () {
        var uiLocation = this.uiLocation();
        if (!uiLocation)
            return;
        if (this._updateDelegate(uiLocation))
            this.dispose();
    },
    rawLocation: function () {
        return this._rawLocation;
    },
    uiLocation: function () {
        throw "Not implemented";
    },
    dispose: function () {}
}
WebInspector.Revision = function (uiSourceCode, content, timestamp) {
    this._uiSourceCode = uiSourceCode;
    this._content = content;
    this._timestamp = timestamp;
}
WebInspector.Revision._revisionHistoryRegistry = function () {
    if (!WebInspector.Revision._revisionHistoryRegistryObject) {
        if (window.localStorage) {
            var revisionHistory = window.localStorage["revision-history"];
            try {
                WebInspector.Revision._revisionHistoryRegistryObject = revisionHistory ? JSON.parse(revisionHistory) : {};
            } catch (e) {
                WebInspector.Revision._revisionHistoryRegistryObject = {};
            }
        } else
            WebInspector.Revision._revisionHistoryRegistryObject = {};
    }
    return WebInspector.Revision._revisionHistoryRegistryObject;
}
WebInspector.Revision.filterOutStaleRevisions = function () {
    if (!window.localStorage)
        return;
    var registry = WebInspector.Revision._revisionHistoryRegistry();
    var filteredRegistry = {};
    for (var url in registry) {
        var historyItems = registry[url];
        var filteredHistoryItems = [];
        for (var i = 0; historyItems && i < historyItems.length; ++i) {
            var historyItem = historyItems[i];
            if (historyItem.loaderId === WebInspector.resourceTreeModel.mainFrame.loaderId) {
                filteredHistoryItems.push(historyItem);
                filteredRegistry[url] = filteredHistoryItems;
            } else
                delete window.localStorage[historyItem.key];
        }
    }
    WebInspector.Revision._revisionHistoryRegistryObject = filteredRegistry;

    function persist() {
        window.localStorage["revision-history"] = JSON.stringify(filteredRegistry);
    }
    setTimeout(persist, 0);
}
WebInspector.Revision.prototype = {
    get uiSourceCode() {
        return this._uiSourceCode;
    }, get timestamp() {
        return this._timestamp;
    }, get content() {
        return this._content || null;
    }, revertToThis: function () {
        function revert(content) {
            if (this._uiSourceCode._content !== content)
                this._uiSourceCode.addRevision(content);
        }
        this.requestContent(revert.bind(this));
    }, contentURL: function () {
        return this._uiSourceCode.originURL();
    }, contentType: function () {
        return this._uiSourceCode.contentType();
    }, requestContent: function (callback) {
        callback(this._content || "");
    }, searchInContent: function (query, caseSensitive, isRegex, callback) {
        callback([]);
    }, _persist: function () {
        if (this._uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem)
            return;
        if (!window.localStorage)
            return;
        var url = this.contentURL();
        if (!url || url.startsWith("inspector://"))
            return;
        var loaderId = WebInspector.resourceTreeModel.mainFrame.loaderId;
        var timestamp = this.timestamp.getTime();
        var key = "revision-history|" + url + "|" + loaderId + "|" + timestamp;
        var registry = WebInspector.Revision._revisionHistoryRegistry();
        var historyItems = registry[url];
        if (!historyItems) {
            historyItems = [];
            registry[url] = historyItems;
        }
        historyItems.push({
            url: url,
            loaderId: loaderId,
            timestamp: timestamp,
            key: key
        });

        function persist() {
            window.localStorage[key] = this._content;
            window.localStorage["revision-history"] = JSON.stringify(registry);
        }
        setTimeout(persist.bind(this), 0);
    }
}

WebInspector.PageLoad = function (mainRequest) {
    this.id = ++WebInspector.PageLoad._lastIdentifier;
    this.url = mainRequest.url;
    this.startTime = mainRequest.startTime;
}
WebInspector.PageLoad._lastIdentifier = 0;

WebInspector.ParsedURL = function (url) {
    this.isValid = false;
    this.url = url;
    this.scheme = "";
    this.host = "";
    this.port = "";
    this.path = "";
    this.queryParams = "";
    this.fragment = "";
    this.folderPathComponents = "";
    this.lastPathComponent = "";
    var match = url.match(/^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
    if (match) {
        this.isValid = true;
        this.scheme = match[1].toLowerCase();
        this.host = match[2];
        this.port = match[3];
        this.path = match[4] || "/";
        this.fragment = match[5];
    } else {
        if (this.url.startsWith("data:")) {
            this.scheme = "data";
            return;
        }
        if (this.url === "about:blank") {
            this.scheme = "about";
            return;
        }
        this.path = this.url;
    }
    var path = this.path;
    var indexOfQuery = path.indexOf("?");
    if (indexOfQuery !== -1) {
        this.queryParams = path.substring(indexOfQuery + 1)
        path = path.substring(0, indexOfQuery);
    }
    var lastSlashIndex = path.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
        this.folderPathComponents = path.substring(0, lastSlashIndex);
        this.lastPathComponent = path.substring(lastSlashIndex + 1);
    } else
        this.lastPathComponent = path;
}
WebInspector.ParsedURL.splitURL = function (url) {
    var parsedURL = new WebInspector.ParsedURL(url);
    var origin;
    var folderPath;
    var name;
    if (parsedURL.isValid) {
        origin = parsedURL.scheme + "://" + parsedURL.host;
        if (parsedURL.port)
            origin += ":" + parsedURL.port;
        folderPath = parsedURL.folderPathComponents;
        name = parsedURL.lastPathComponent;
        if (parsedURL.queryParams)
            name += "?" + parsedURL.queryParams;
    } else {
        origin = "";
        folderPath = "";
        name = url;
    }
    var result = [origin];
    var splittedPath = folderPath.split("/");
    for (var i = 1; i < splittedPath.length; ++i)
        result.push(splittedPath[i]);
    result.push(name);
    return result;
}
WebInspector.ParsedURL.normalizePath = function (path) {
    if (path.indexOf("..") === -1 && path.indexOf('.') === -1)
        return path;
    var normalizedSegments = [];
    var segments = path.split("/");
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment === ".")
            continue;
        else if (segment === "..")
            normalizedSegments.pop();
        else if (segment)
            normalizedSegments.push(segment);
    }
    var normalizedPath = normalizedSegments.join("/");
    if (normalizedPath[normalizedPath.length - 1] === "/")
        return normalizedPath;
    if (path[0] === "/" && normalizedPath)
        normalizedPath = "/" + normalizedPath;
    if ((path[path.length - 1] === "/") || (segments[segments.length - 1] === ".") || (segments[segments.length - 1] === ".."))
        normalizedPath = normalizedPath + "/";
    return normalizedPath;
}
WebInspector.ParsedURL.completeURL = function (baseURL, href) {
    if (href) {
        var trimmedHref = href.trim();
        if (trimmedHref.startsWith("data:") || trimmedHref.startsWith("blob:") || trimmedHref.startsWith("javascript:"))
            return href;
        var parsedHref = trimmedHref.asParsedURL();
        if (parsedHref && parsedHref.scheme)
            return trimmedHref;
    } else {
        return baseURL;
    }
    var parsedURL = baseURL.asParsedURL();
    if (parsedURL) {
        if (parsedURL.isDataURL())
            return href;
        var path = href;
        var query = path.indexOf("?");
        var postfix = "";
        if (query !== -1) {
            postfix = path.substring(query);
            path = path.substring(0, query);
        } else {
            var fragment = path.indexOf("#");
            if (fragment !== -1) {
                postfix = path.substring(fragment);
                path = path.substring(0, fragment);
            }
        }
        if (!path) {
            var basePath = parsedURL.path;
            if (postfix.charAt(0) === "?") {
                var baseQuery = parsedURL.path.indexOf("?");
                if (baseQuery !== -1)
                    basePath = basePath.substring(0, baseQuery);
            }
            return parsedURL.scheme + "://" + parsedURL.host + (parsedURL.port ? (":" + parsedURL.port) : "") + basePath + postfix;
        } else if (path.charAt(0) !== "/") {
            var prefix = parsedURL.path;
            var prefixQuery = prefix.indexOf("?");
            if (prefixQuery !== -1)
                prefix = prefix.substring(0, prefixQuery);
            prefix = prefix.substring(0, prefix.lastIndexOf("/")) + "/";
            path = prefix + path;
        } else if (path.length > 1 && path.charAt(1) === "/") {
            return parsedURL.scheme + ":" + path + postfix;
        }
        return parsedURL.scheme + "://" + parsedURL.host + (parsedURL.port ? (":" + parsedURL.port) : "") + WebInspector.ParsedURL.normalizePath(path) + postfix;
    }
    return null;
}
WebInspector.ParsedURL.prototype = {
    get displayName() {
        if (this._displayName)
            return this._displayName;
        if (this.isDataURL())
            return this.dataURLDisplayName();
        if (this.isAboutBlank())
            return this.url;
        this._displayName = this.lastPathComponent;
        if (!this._displayName)
            this._displayName = (this.host || "") + "/";
        if (this._displayName === "/")
            this._displayName = this.url;
        return this._displayName;
    }, dataURLDisplayName: function () {
        if (this._dataURLDisplayName)
            return this._dataURLDisplayName;
        if (!this.isDataURL())
            return "";
        this._dataURLDisplayName = this.url.trimEnd(20);
        return this._dataURLDisplayName;
    }, isAboutBlank: function () {
        return this.url === "about:blank";
    }, isDataURL: function () {
        return this.scheme === "data";
    }
}
String.prototype.asParsedURL = function () {
    var parsedURL = new WebInspector.ParsedURL(this.toString());
    if (parsedURL.isValid)
        return parsedURL;
    return null;
}
WebInspector.resourceForURL = function (url) {
    return WebInspector.resourceTreeModel.resourceForURL(url);
}
WebInspector.forAllResources = function (callback) {
    WebInspector.resourceTreeModel.forAllResources(callback);
}
WebInspector.displayNameForURL = function (url) {
    if (!url)
        return "";
    var resource = WebInspector.resourceForURL(url);
    if (resource)
        return resource.displayName;
    var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(url);
    if (uiSourceCode)
        return uiSourceCode.displayName();
    if (!WebInspector.resourceTreeModel.inspectedPageURL())
        return url.trimURL("");
    var parsedURL = WebInspector.resourceTreeModel.inspectedPageURL().asParsedURL();
    var lastPathComponent = parsedURL ? parsedURL.lastPathComponent : parsedURL;
    var index = WebInspector.resourceTreeModel.inspectedPageURL().indexOf(lastPathComponent);
    if (index !== -1 && index + lastPathComponent.length === WebInspector.resourceTreeModel.inspectedPageURL().length) {
        var baseURL = WebInspector.resourceTreeModel.inspectedPageURL().substring(0, index);
        if (url.startsWith(baseURL))
            return url.substring(index);
    }
    if (!parsedURL)
        return url;
    var displayName = url.trimURL(parsedURL.host);
    return displayName === "/" ? parsedURL.host + "/" : displayName;
}
WebInspector.linkifyStringAsFragmentWithCustomLinkifier = function (string, linkifier) {
    var container = document.createDocumentFragment();
    var linkStringRegEx = /(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\/\/|data:|www\.)[\w$\-_+*'=\|\/\\(){}[\]^%@&#~,:;.!?]{2,}[\w$\-_+*=\|\/\\({^%@&#~]/;
    var lineColumnRegEx = /:(\d+)(:(\d+))?$/;
    while (string) {
        var linkString = linkStringRegEx.exec(string);
        if (!linkString)
            break;
        linkString = linkString[0];
        var linkIndex = string.indexOf(linkString);
        var nonLink = string.substring(0, linkIndex);
        container.appendChild(document.createTextNode(nonLink));
        var title = linkString;
        var realURL = (linkString.startsWith("www.") ? "http://" + linkString : linkString);
        var lineColumnMatch = lineColumnRegEx.exec(realURL);
        var lineNumber;
        var columnNumber;
        if (lineColumnMatch) {
            realURL = realURL.substring(0, realURL.length - lineColumnMatch[0].length);
            lineNumber = parseInt(lineColumnMatch[1], 10);
            lineNumber = isNaN(lineNumber) ? undefined : lineNumber - 1;
            if (typeof (lineColumnMatch[3]) === "string") {
                columnNumber = parseInt(lineColumnMatch[3], 10);
                columnNumber = isNaN(columnNumber) ? undefined : columnNumber - 1;
            }
        }
        var linkNode = linkifier(title, realURL, lineNumber, columnNumber);
        container.appendChild(linkNode);
        string = string.substring(linkIndex + linkString.length, string.length);
    }
    if (string)
        container.appendChild(document.createTextNode(string));
    return container;
}
WebInspector.linkifyStringAsFragment = function (string) {
    function linkifier(title, url, lineNumber, columnNumber) {
        var isExternal = !WebInspector.resourceForURL(url) && !WebInspector.workspace.uiSourceCodeForURL(url);
        var urlNode = WebInspector.linkifyURLAsNode(url, title, undefined, isExternal);
        if (typeof lineNumber !== "undefined") {
            urlNode.lineNumber = lineNumber;
            if (typeof columnNumber !== "undefined")
                urlNode.columnNumber = columnNumber;
        }
        return urlNode;
    }
    return WebInspector.linkifyStringAsFragmentWithCustomLinkifier(string, linkifier);
}
WebInspector.linkifyURLAsNode = function (url, linkText, classes, isExternal, tooltipText) {
    if (!linkText)
        linkText = url;
    classes = (classes ? classes + " " : "");
    classes += isExternal ? "webkit-html-external-link" : "webkit-html-resource-link";
    var a = document.createElement("a");
    var href = sanitizeHref(url);
    if (href !== null)
        a.href = href;
    a.className = classes;
    if (typeof tooltipText === "undefined")
        a.title = url;
    else if (typeof tooltipText !== "string" || tooltipText.length)
        a.title = tooltipText;
    a.textContent = linkText.trimMiddle(WebInspector.Linkifier.MaxLengthForDisplayedURLs);
    if (isExternal)
        a.setAttribute("target", "_blank");
    return a;
}
WebInspector.formatLinkText = function (url, lineNumber) {
    var text = url ? WebInspector.displayNameForURL(url) : WebInspector.UIString("(program)");
    if (typeof lineNumber === "number")
        text += ":" + (lineNumber + 1);
    return text;
}
WebInspector.linkifyResourceAsNode = function (url, lineNumber, classes, tooltipText) {
    var linkText = WebInspector.formatLinkText(url, lineNumber);
    var anchor = WebInspector.linkifyURLAsNode(url, linkText, classes, false, tooltipText);
    anchor.lineNumber = lineNumber;
    return anchor;
}
WebInspector.linkifyRequestAsNode = function (request) {
    var anchor = WebInspector.linkifyURLAsNode(request.url);
    anchor.requestId = request.requestId;
    return anchor;
}
WebInspector.contentAsDataURL = function (content, mimeType, contentEncoded) {
    const maxDataUrlSize = 1024 * 1024;
    if (content === null || content.length > maxDataUrlSize)
        return null;
    return "data:" + mimeType + (contentEncoded ? ";base64," : ",") + content;
}
WebInspector.ResourceType = function (name, title, categoryTitle, color, isTextType) {
    this._name = name;
    this._title = title;
    this._categoryTitle = categoryTitle;
    this._color = color;
    this._isTextType = isTextType;
}
WebInspector.ResourceType.prototype = {
    name: function () {
        return this._name;
    },
    title: function () {
        return this._title;
    },
    categoryTitle: function () {
        return this._categoryTitle;
    },
    color: function () {
        return this._color;
    },
    isTextType: function () {
        return this._isTextType;
    },
    toString: function () {
        return this._name;
    },
    canonicalMimeType: function () {
        if (this === WebInspector.resourceTypes.Document)
            return "text/html";
        if (this === WebInspector.resourceTypes.Script)
            return "text/javascript";
        if (this === WebInspector.resourceTypes.Stylesheet)
            return "text/css";
        return "";
    }
}
WebInspector.resourceTypes = {
    Document: new WebInspector.ResourceType("document", "Document", "Documents", "rgb(47,102,236)", true),
    Stylesheet: new WebInspector.ResourceType("stylesheet", "Stylesheet", "Stylesheets", "rgb(157,231,119)", true),
    Image: new WebInspector.ResourceType("image", "Image", "Images", "rgb(164,60,255)", false),
    Script: new WebInspector.ResourceType("script", "Script", "Scripts", "rgb(255,121,0)", true),
    XHR: new WebInspector.ResourceType("xhr", "XHR", "XHR", "rgb(231,231,10)", true),
    Font: new WebInspector.ResourceType("font", "Font", "Fonts", "rgb(255,82,62)", false),
    WebSocket: new WebInspector.ResourceType("websocket", "WebSocket", "WebSockets", "rgb(186,186,186)", false),
    Other: new WebInspector.ResourceType("other", "Other", "Other", "rgb(186,186,186)", false)
}
WebInspector.ResourceType.mimeTypesForExtensions = {
    "js": "text/javascript",
    "css": "text/css",
    "html": "text/html",
    "htm": "text/html",
    "xml": "application/xml",
    "xsl": "application/xml",
    "asp": "application/x-aspx",
    "aspx": "application/x-aspx",
    "jsp": "application/x-jsp",
    "c": "text/x-c++src",
    "cc": "text/x-c++src",
    "cpp": "text/x-c++src",
    "h": "text/x-c++src",
    "m": "text/x-c++src",
    "mm": "text/x-c++src",
    "coffee": "text/x-coffeescript",
    "dart": "text/javascript",
    "ts": "text/typescript",
    "json": "application/json",
    "gyp": "application/json",
    "gypi": "application/json",
    "cs": "text/x-csharp",
    "java": "text/x-java",
    "php": "text/x-php",
    "phtml": "application/x-httpd-php",
    "py": "text/x-python",
    "sh": "text/x-sh",
    "scss": "text/x-scss"
}

WebInspector.DataGrid = function (columnsArray, editCallback, deleteCallback, refreshCallback, contextMenuCallback) {
    WebInspector.View.call(this);
    this.registerRequiredCSS("dataGrid.css");
    this.element.className = "data-grid";
    this.element.tabIndex = 0;
    this.element.addEventListener("keydown", this._keyDown.bind(this), false);
    this._headerTable = document.createElement("table");
    this._headerTable.className = "header";
    this._headerTableHeaders = {};
    this._dataTable = document.createElement("table");
    this._dataTable.className = "data";
    this._dataTable.addEventListener("mousedown", this._mouseDownInDataTable.bind(this), true);
    this._dataTable.addEventListener("click", this._clickInDataTable.bind(this), true);
    this._dataTable.addEventListener("contextmenu", this._contextMenuInDataTable.bind(this), true);
    if (editCallback)
        this._dataTable.addEventListener("dblclick", this._ondblclick.bind(this), false);
    this._editCallback = editCallback;
    this._deleteCallback = deleteCallback;
    this._refreshCallback = refreshCallback;
    this._contextMenuCallback = contextMenuCallback;
    this._scrollContainer = document.createElement("div");
    this._scrollContainer.className = "data-container";
    this._scrollContainer.appendChild(this._dataTable);
    this.element.appendChild(this._headerTable);
    this.element.appendChild(this._scrollContainer);
    var headerRow = document.createElement("tr");
    var columnGroup = document.createElement("colgroup");
    columnGroup.span = columnsArray.length;
    var fillerRow = document.createElement("tr");
    fillerRow.className = "filler";
    this._columnsArray = columnsArray;
    this.columns = {};
    for (var i = 0; i < columnsArray.length; ++i) {
        var column = columnsArray[i];
        column.ordinal = i;
        var columnIdentifier = column.identifier = column.id || i;
        this.columns[columnIdentifier] = column;
        if (column.disclosure)
            this.disclosureColumnIdentifier = columnIdentifier;
        var col = document.createElement("col");
        if (column.width)
            col.style.width = column.width;
        column.element = col;
        columnGroup.appendChild(col);
        var cell = document.createElement("th");
        cell.className = columnIdentifier + "-column";
        cell.columnIdentifier = columnIdentifier;
        this._headerTableHeaders[columnIdentifier] = cell;
        var div = document.createElement("div");
        if (column.titleDOMFragment)
            div.appendChild(column.titleDOMFragment);
        else
            div.textContent = column.title;
        cell.appendChild(div);
        if (column.sort) {
            cell.classList.add("sort-" + column.sort);
            this._sortColumnCell = cell;
        }
        if (column.sortable) {
            cell.addEventListener("click", this._clickInHeaderCell.bind(this), false);
            cell.classList.add("sortable");
        }
        headerRow.appendChild(cell);
        fillerRow.createChild("td", columnIdentifier + "-column");
    }
    headerRow.createChild("th", "corner");
    fillerRow.createChild("td", "corner");
    columnGroup.createChild("col", "corner");
    this._headerTableColumnGroup = columnGroup;
    this._headerTable.appendChild(this._headerTableColumnGroup);
    this.headerTableBody.appendChild(headerRow);
    this._dataTableColumnGroup = columnGroup.cloneNode(true);
    this._dataTable.appendChild(this._dataTableColumnGroup);
    this.dataTableBody.appendChild(fillerRow);
    this.selectedNode = null;
    this.expandNodesWhenArrowing = false;
    this.setRootNode(new WebInspector.DataGridNode());
    this.indentWidth = 15;
    this.resizers = [];
    this._columnWidthsInitialized = false;
}
WebInspector.DataGrid.ColumnDescriptor;
WebInspector.DataGrid.Events = {
    SelectedNode: "SelectedNode",
    DeselectedNode: "DeselectedNode",
    SortingChanged: "SortingChanged",
    ColumnsResized: "ColumnsResized"
}
WebInspector.DataGrid.Order = {
    Ascending: "ascending",
    Descending: "descending"
}
WebInspector.DataGrid.Align = {
    Center: "center",
    Right: "right"
}
WebInspector.DataGrid.createSortableDataGrid = function (columnNames, values) {
    var numColumns = columnNames.length;
    if (!numColumns)
        return null;
    var columns = [];
    for (var i = 0; i < columnNames.length; ++i)
        columns.push({
            title: columnNames[i],
            width: columnNames[i].length,
            sortable: true
        });
    var nodes = [];
    for (var i = 0; i < values.length / numColumns; ++i) {
        var data = {};
        for (var j = 0; j < columnNames.length; ++j)
            data[j] = values[numColumns * i + j];
        var node = new WebInspector.DataGridNode(data, false);
        node.selectable = false;
        nodes.push(node);
    }
    var dataGrid = new WebInspector.DataGrid(columns);
    var length = nodes.length;
    for (var i = 0; i < length; ++i)
        dataGrid.rootNode().appendChild(nodes[i]);
    dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, sortDataGrid);

    function sortDataGrid() {
        var nodes = dataGrid._rootNode.children.slice();
        var sortColumnIdentifier = dataGrid.sortColumnIdentifier();
        var sortDirection = dataGrid.isSortOrderAscending() ? 1 : -1;
        var columnIsNumeric = true;
        for (var i = 0; i < nodes.length; i++) {
            var value = nodes[i].data[sortColumnIdentifier];
            value = value instanceof Node ? Number(value.textContent) : Number(value);
            if (isNaN(value)) {
                columnIsNumeric = false;
                break;
            }
        }

        function comparator(dataGridNode1, dataGridNode2) {
            var item1 = dataGridNode1.data[sortColumnIdentifier];
            var item2 = dataGridNode2.data[sortColumnIdentifier];
            item1 = item1 instanceof Node ? item1.textContent : String(item1);
            item2 = item2 instanceof Node ? item2.textContent : String(item2);
            var comparison;
            if (columnIsNumeric) {
                var number1 = parseFloat(item1);
                var number2 = parseFloat(item2);
                comparison = number1 < number2 ? -1 : (number1 > number2 ? 1 : 0);
            } else
                comparison = item1 < item2 ? -1 : (item1 > item2 ? 1 : 0);
            return sortDirection * comparison;
        }
        nodes.sort(comparator);
        dataGrid.rootNode().removeChildren();
        for (var i = 0; i < nodes.length; i++)
            dataGrid._rootNode.appendChild(nodes[i]);
    }
    return dataGrid;
}
WebInspector.DataGrid.prototype = {
    setRootNode: function (rootNode) {
        if (this._rootNode) {
            this._rootNode.removeChildren();
            this._rootNode.dataGrid = null;
            this._rootNode._isRoot = false;
        }
        this._rootNode = rootNode;
        rootNode._isRoot = true;
        rootNode.hasChildren = false;
        rootNode._expanded = true;
        rootNode._revealed = true;
        rootNode.dataGrid = this;
    },
    rootNode: function () {
        return this._rootNode;
    },
    _ondblclick: function (event) {
        if (this._editing || this._editingNode)
            return;
        var columnIdentifier = this.columnIdentifierFromNode(event.target);
        if (!columnIdentifier || !this.columns[columnIdentifier].editable)
            return;
        this._startEditing(event.target);
    },
    _startEditingColumnOfDataGridNode: function (node, columnOrdinal) {
        this._editing = true;
        this._editingNode = node;
        this._editingNode.select();
        var element = this._editingNode._element.children[columnOrdinal];
        WebInspector.InplaceEditor.startEditing(element, this._startEditingConfig(element));
        window.getSelection().setBaseAndExtent(element, 0, element, 1);
    },
    _startEditing: function (target) {
        var element = target.enclosingNodeOrSelfWithNodeName("td");
        if (!element)
            return;
        this._editingNode = this.dataGridNodeFromNode(target);
        if (!this._editingNode) {
            if (!this.creationNode)
                return;
            this._editingNode = this.creationNode;
        }
        if (this._editingNode.isCreationNode)
            return this._startEditingColumnOfDataGridNode(this._editingNode, this._nextEditableColumn(-1));
        this._editing = true;
        WebInspector.InplaceEditor.startEditing(element, this._startEditingConfig(element));
        window.getSelection().setBaseAndExtent(element, 0, element, 1);
    },
    renderInline: function () {
        this.element.classList.add("inline");
    },
    _startEditingConfig: function (element) {
        return new WebInspector.InplaceEditor.Config(this._editingCommitted.bind(this), this._editingCancelled.bind(this), element.textContent);
    },
    _editingCommitted: function (element, newText, oldText, context, moveDirection) {
        var columnIdentifier = this.columnIdentifierFromNode(element);
        if (!columnIdentifier) {
            this._editingCancelled(element);
            return;
        }
        var columnOrdinal = this.columns[columnIdentifier].ordinal;
        var textBeforeEditing = this._editingNode.data[columnIdentifier];
        var currentEditingNode = this._editingNode;

        function moveToNextIfNeeded(wasChange) {
            if (!moveDirection)
                return;
            if (moveDirection === "forward") {
                var firstEditableColumn = this._nextEditableColumn(-1);
                if (currentEditingNode.isCreationNode && columnOrdinal === firstEditableColumn && !wasChange)
                    return;
                var nextEditableColumn = this._nextEditableColumn(columnOrdinal);
                if (nextEditableColumn !== -1)
                    return this._startEditingColumnOfDataGridNode(currentEditingNode, nextEditableColumn);
                var nextDataGridNode = currentEditingNode.traverseNextNode(true, null, true);
                if (nextDataGridNode)
                    return this._startEditingColumnOfDataGridNode(nextDataGridNode, firstEditableColumn);
                if (currentEditingNode.isCreationNode && wasChange) {
                    this.addCreationNode(false);
                    return this._startEditingColumnOfDataGridNode(this.creationNode, firstEditableColumn);
                }
                return;
            }
            if (moveDirection === "backward") {
                var prevEditableColumn = this._nextEditableColumn(columnOrdinal, true);
                if (prevEditableColumn !== -1)
                    return this._startEditingColumnOfDataGridNode(currentEditingNode, prevEditableColumn);
                var lastEditableColumn = this._nextEditableColumn(this._columnsArray.length, true);
                var nextDataGridNode = currentEditingNode.traversePreviousNode(true, true);
                if (nextDataGridNode)
                    return this._startEditingColumnOfDataGridNode(nextDataGridNode, lastEditableColumn);
                return;
            }
        }
        if (textBeforeEditing == newText) {
            this._editingCancelled(element);
            moveToNextIfNeeded.call(this, false);
            return;
        }
        this._editingNode.data[columnIdentifier] = newText;
        this._editCallback(this._editingNode, columnIdentifier, textBeforeEditing, newText);
        if (this._editingNode.isCreationNode)
            this.addCreationNode(false);
        this._editingCancelled(element);
        moveToNextIfNeeded.call(this, true);
    },
    _editingCancelled: function (element) {
        delete this._editing;
        this._editingNode = null;
    },
    _nextEditableColumn: function (columnOrdinal, moveBackward) {
        var increment = moveBackward ? -1 : 1;
        var columns = this._columnsArray;
        for (var i = columnOrdinal + increment;
            (i >= 0) && (i < columns.length); i += increment) {
            if (columns[i].editable)
                return i;
        }
        return -1;
    },
    sortColumnIdentifier: function () {
        if (!this._sortColumnCell)
            return null;
        return this._sortColumnCell.columnIdentifier;
    },
    sortOrder: function () {
        if (!this._sortColumnCell || this._sortColumnCell.classList.contains("sort-ascending"))
            return WebInspector.DataGrid.Order.Ascending;
        if (this._sortColumnCell.classList.contains("sort-descending"))
            return WebInspector.DataGrid.Order.Descending;
        return null;
    },
    isSortOrderAscending: function () {
        return !this._sortColumnCell || this._sortColumnCell.classList.contains("sort-ascending");
    },
    get headerTableBody() {
        if ("_headerTableBody" in this)
            return this._headerTableBody;
        this._headerTableBody = this._headerTable.getElementsByTagName("tbody")[0];
        if (!this._headerTableBody) {
            this._headerTableBody = this.element.ownerDocument.createElement("tbody");
            this._headerTable.insertBefore(this._headerTableBody, this._headerTable.tFoot);
        }
        return this._headerTableBody;
    },
    get dataTableBody() {
        if ("_dataTableBody" in this)
            return this._dataTableBody;
        this._dataTableBody = this._dataTable.getElementsByTagName("tbody")[0];
        if (!this._dataTableBody) {
            this._dataTableBody = this.element.ownerDocument.createElement("tbody");
            this._dataTable.insertBefore(this._dataTableBody, this._dataTable.tFoot);
        }
        return this._dataTableBody;
    },
    _autoSizeWidths: function (widths, minPercent, maxPercent) {
        if (minPercent)
            minPercent = Math.min(minPercent, Math.floor(100 / widths.length));
        var totalWidth = 0;
        for (var i = 0; i < widths.length; ++i)
            totalWidth += widths[i];
        var totalPercentWidth = 0;
        for (var i = 0; i < widths.length; ++i) {
            var width = Math.round(100 * widths[i] / totalWidth);
            if (minPercent && width < minPercent)
                width = minPercent;
            else if (maxPercent && width > maxPercent)
                width = maxPercent;
            totalPercentWidth += width;
            widths[i] = width;
        }
        var recoupPercent = totalPercentWidth - 100;
        while (minPercent && recoupPercent > 0) {
            for (var i = 0; i < widths.length; ++i) {
                if (widths[i] > minPercent) {
                    --widths[i];
                    --recoupPercent;
                    if (!recoupPercent)
                        break;
                }
            }
        }
        while (maxPercent && recoupPercent < 0) {
            for (var i = 0; i < widths.length; ++i) {
                if (widths[i] < maxPercent) {
                    ++widths[i];
                    ++recoupPercent;
                    if (!recoupPercent)
                        break;
                }
            }
        }
        return widths;
    },
    autoSizeColumns: function (minPercent, maxPercent, maxDescentLevel) {
        var widths = [];
        for (var i = 0; i < this._columnsArray.length; ++i)
            widths.push((this._columnsArray[i].title || "").length);
        maxDescentLevel = maxDescentLevel || 0;
        var children = this._enumerateChildren(this._rootNode, [], maxDescentLevel + 1);
        for (var i = 0; i < children.length; ++i) {
            var node = children[i];
            for (var j = 0; j < this._columnsArray.length; ++j) {
                var text = node.data[this._columnsArray[j].identifier] || "";
                if (text.length > widths[j])
                    widths[j] = text.length;
            }
        }
        widths = this._autoSizeWidths(widths, minPercent, maxPercent);
        for (var i = 0; i < this._columnsArray.length; ++i)
            this._columnsArray[i].element.style.width = widths[i] + "%";
        this._columnWidthsInitialized = false;
        this.updateWidths();
    },
    _enumerateChildren: function (rootNode, result, maxLevel) {
        if (!rootNode._isRoot)
            result.push(rootNode);
        if (!maxLevel)
            return;
        for (var i = 0; i < rootNode.children.length; ++i)
            this._enumerateChildren(rootNode.children[i], result, maxLevel - 1);
        return result;
    },
    onResize: function () {
        this.updateWidths();
    },
    updateWidths: function () {
        var headerTableColumns = this._headerTableColumnGroup.children;
        var tableWidth = this._dataTable.offsetWidth;
        var numColumns = headerTableColumns.length - 1;
        if (!this._columnWidthsInitialized && this.element.offsetWidth) {
            for (var i = 0; i < numColumns; i++) {
                var columnWidth = this.headerTableBody.rows[0].cells[i].offsetWidth;
                var percentWidth = (100 * columnWidth / tableWidth) + "%";
                this._headerTableColumnGroup.children[i].style.width = percentWidth;
                this._dataTableColumnGroup.children[i].style.width = percentWidth;
            }
            this._columnWidthsInitialized = true;
        }
        this._positionResizers();
        this.dispatchEventToListeners(WebInspector.DataGrid.Events.ColumnsResized);
    },
    setName: function (name) {
        this._columnWeightsSetting = WebInspector.settings.createSetting("dataGrid-" + name + "-columnWeights", {});
        this._loadColumnWeights();
    },
    _loadColumnWeights: function () {
        if (!this._columnWeightsSetting)
            return;
        var weights = this._columnWeightsSetting.get();
        for (var i = 0; i < this._columnsArray.length; ++i) {
            var column = this._columnsArray[i];
            var weight = weights[column.identifier];
            if (weight)
                column.weight = weight;
        }
        this.applyColumnWeights();
    },
    _saveColumnWeights: function () {
        if (!this._columnWeightsSetting)
            return;
        var weights = {};
        for (var i = 0; i < this._columnsArray.length; ++i) {
            var column = this._columnsArray[i];
            weights[column.identifier] = column.weight;
        }
        this._columnWeightsSetting.set(weights);
    },
    wasShown: function () {
        this._loadColumnWeights();
    },
    applyColumnWeights: function () {
        var sumOfWeights = 0.0;
        for (var i = 0; i < this._columnsArray.length; ++i) {
            var column = this._columnsArray[i];
            if (this.isColumnVisible(column))
                sumOfWeights += column.weight;
        }
        for (var i = 0; i < this._columnsArray.length; ++i) {
            var column = this._columnsArray[i];
            var width = this.isColumnVisible(column) ? (100 * column.weight / sumOfWeights) + "%" : "0%";
            this._headerTableColumnGroup.children[i].style.width = width;
            this._dataTableColumnGroup.children[i].style.width = width;
        }
        this._positionResizers();
        this.dispatchEventToListeners(WebInspector.DataGrid.Events.ColumnsResized);
    },
    isColumnVisible: function (column) {
        return !column.hidden;
    },
    setColumnVisible: function (columnIdentifier, visible) {
        if (visible === !this.columns[columnIdentifier].hidden)
            return;
        this.columns[columnIdentifier].hidden = !visible;
        this.element.classList.toggle("hide-" + columnIdentifier + "-column", !visible);
    },
    get scrollContainer() {
        return this._scrollContainer;
    },
    isScrolledToLastRow: function () {
        return this._scrollContainer.isScrolledToBottom();
    },
    scrollToLastRow: function () {
        this._scrollContainer.scrollTop = this._scrollContainer.scrollHeight - this._scrollContainer.offsetHeight;
    },
    _positionResizers: function () {
        var headerTableColumns = this._headerTableColumnGroup.children;
        var numColumns = headerTableColumns.length - 1;
        var left = [];
        var previousResizer = null;
        for (var i = 0; i < numColumns - 1; i++) {
            left[i] = (left[i - 1] || 0) + this.headerTableBody.rows[0].cells[i].offsetWidth;
        }
        for (var i = 0; i < numColumns - 1; i++) {
            var resizer = this.resizers[i];
            if (!resizer) {
                resizer = document.createElement("div");
                resizer.classList.add("data-grid-resizer");
                WebInspector.installDragHandle(resizer, this._startResizerDragging.bind(this), this._resizerDragging.bind(this), this._endResizerDragging.bind(this), "col-resize");
                this.element.appendChild(resizer);
                this.resizers[i] = resizer;
            }
            if (!this._columnsArray[i].hidden) {
                resizer.style.removeProperty("display");
                if (resizer._position !== left[i]) {
                    resizer._position = left[i];
                    resizer.style.left = left[i] + "px";
                }
                resizer.leftNeighboringColumnIndex = i;
                if (previousResizer)
                    previousResizer.rightNeighboringColumnIndex = i;
                previousResizer = resizer;
            } else {
                if (previousResizer && previousResizer._position !== left[i]) {
                    previousResizer._position = left[i];
                    previousResizer.style.left = left[i] + "px";
                }
                if (resizer.style.getPropertyValue("display") !== "none")
                    resizer.style.setProperty("display", "none");
                resizer.leftNeighboringColumnIndex = 0;
                resizer.rightNeighboringColumnIndex = 0;
            }
        }
        if (previousResizer)
            previousResizer.rightNeighboringColumnIndex = numColumns - 1;
    },
    addCreationNode: function (hasChildren) {
        if (this.creationNode)
            this.creationNode.makeNormal();
        var emptyData = {};
        for (var column in this.columns)
            emptyData[column] = null;
        this.creationNode = new WebInspector.CreationDataGridNode(emptyData, hasChildren);
        this.rootNode().appendChild(this.creationNode);
    },
    sortNodes: function (comparator, reverseMode) {
        function comparatorWrapper(a, b) {
            if (a._dataGridNode._data.summaryRow)
                return 1;
            if (b._dataGridNode._data.summaryRow)
                return -1;
            var aDataGirdNode = a._dataGridNode;
            var bDataGirdNode = b._dataGridNode;
            return reverseMode ? comparator(bDataGirdNode, aDataGirdNode) : comparator(aDataGirdNode, bDataGirdNode);
        }
        var tbody = this.dataTableBody;
        var tbodyParent = tbody.parentElement;
        tbodyParent.removeChild(tbody);
        var childNodes = tbody.childNodes;
        var fillerRow = childNodes[childNodes.length - 1];
        var sortedRows = Array.prototype.slice.call(childNodes, 0, childNodes.length - 1);
        sortedRows.sort(comparatorWrapper);
        var sortedRowsLength = sortedRows.length;
        tbody.removeChildren();
        var previousSiblingNode = null;
        for (var i = 0; i < sortedRowsLength; ++i) {
            var row = sortedRows[i];
            var node = row._dataGridNode;
            node.previousSibling = previousSiblingNode;
            if (previousSiblingNode)
                previousSiblingNode.nextSibling = node;
            tbody.appendChild(row);
            previousSiblingNode = node;
        }
        if (previousSiblingNode)
            previousSiblingNode.nextSibling = null;
        tbody.appendChild(fillerRow);
        tbodyParent.appendChild(tbody);
    },
    _keyDown: function (event) {
        if (!this.selectedNode || event.shiftKey || event.metaKey || event.ctrlKey || this._editing)
            return;
        var handled = false;
        var nextSelectedNode;
        if (event.keyIdentifier === "Up" && !event.altKey) {
            nextSelectedNode = this.selectedNode.traversePreviousNode(true);
            while (nextSelectedNode && !nextSelectedNode.selectable)
                nextSelectedNode = nextSelectedNode.traversePreviousNode(true);
            handled = nextSelectedNode ? true : false;
        } else if (event.keyIdentifier === "Down" && !event.altKey) {
            nextSelectedNode = this.selectedNode.traverseNextNode(true);
            while (nextSelectedNode && !nextSelectedNode.selectable)
                nextSelectedNode = nextSelectedNode.traverseNextNode(true);
            handled = nextSelectedNode ? true : false;
        } else if (event.keyIdentifier === "Left") {
            if (this.selectedNode.expanded) {
                if (event.altKey)
                    this.selectedNode.collapseRecursively();
                else
                    this.selectedNode.collapse();
                handled = true;
            } else if (this.selectedNode.parent && !this.selectedNode.parent._isRoot) {
                handled = true;
                if (this.selectedNode.parent.selectable) {
                    nextSelectedNode = this.selectedNode.parent;
                    handled = nextSelectedNode ? true : false;
                } else if (this.selectedNode.parent)
                    this.selectedNode.parent.collapse();
            }
        } else if (event.keyIdentifier === "Right") {
            if (!this.selectedNode.revealed) {
                this.selectedNode.reveal();
                handled = true;
            } else if (this.selectedNode.hasChildren) {
                handled = true;
                if (this.selectedNode.expanded) {
                    nextSelectedNode = this.selectedNode.children[0];
                    handled = nextSelectedNode ? true : false;
                } else {
                    if (event.altKey)
                        this.selectedNode.expandRecursively();
                    else
                        this.selectedNode.expand();
                }
            }
        } else if (event.keyCode === 8 || event.keyCode === 46) {
            if (this._deleteCallback) {
                handled = true;
                this._deleteCallback(this.selectedNode);
                this.changeNodeAfterDeletion();
            }
        } else if (isEnterKey(event)) {
            if (this._editCallback) {
                handled = true;
                this._startEditing(this.selectedNode._element.children[this._nextEditableColumn(-1)]);
            }
        }
        if (nextSelectedNode) {
            nextSelectedNode.reveal();
            nextSelectedNode.select();
        }
        if (handled)
            event.consume(true);
    },
    changeNodeAfterDeletion: function () {
        var nextSelectedNode = this.selectedNode.traverseNextNode(true);
        while (nextSelectedNode && !nextSelectedNode.selectable)
            nextSelectedNode = nextSelectedNode.traverseNextNode(true);
        if (!nextSelectedNode || nextSelectedNode.isCreationNode) {
            nextSelectedNode = this.selectedNode.traversePreviousNode(true);
            while (nextSelectedNode && !nextSelectedNode.selectable)
                nextSelectedNode = nextSelectedNode.traversePreviousNode(true);
        }
        if (nextSelectedNode) {
            nextSelectedNode.reveal();
            nextSelectedNode.select();
        }
    },
    dataGridNodeFromNode: function (target) {
        var rowElement = target.enclosingNodeOrSelfWithNodeName("tr");
        return rowElement && rowElement._dataGridNode;
    },
    columnIdentifierFromNode: function (target) {
        var cellElement = target.enclosingNodeOrSelfWithNodeName("td");
        return cellElement && cellElement.columnIdentifier_;
    },
    _clickInHeaderCell: function (event) {
        var cell = event.target.enclosingNodeOrSelfWithNodeName("th");
        if (!cell || (typeof cell.columnIdentifier === "undefined") || !cell.classList.contains("sortable"))
            return;
        var sortOrder = WebInspector.DataGrid.Order.Ascending;
        if ((cell === this._sortColumnCell) && this.isSortOrderAscending())
            sortOrder = WebInspector.DataGrid.Order.Descending;
        if (this._sortColumnCell)
            this._sortColumnCell.removeMatchingStyleClasses("sort-\\w+");
        this._sortColumnCell = cell;
        cell.classList.add("sort-" + sortOrder);
        this.dispatchEventToListeners(WebInspector.DataGrid.Events.SortingChanged);
    },
    markColumnAsSortedBy: function (columnIdentifier, sortOrder) {
        if (this._sortColumnCell)
            this._sortColumnCell.removeMatchingStyleClasses("sort-\\w+");
        this._sortColumnCell = this._headerTableHeaders[columnIdentifier];
        this._sortColumnCell.classList.add("sort-" + sortOrder);
    },
    headerTableHeader: function (columnIdentifier) {
        return this._headerTableHeaders[columnIdentifier];
    },
    _mouseDownInDataTable: function (event) {
        var gridNode = this.dataGridNodeFromNode(event.target);
        if (!gridNode || !gridNode.selectable)
            return;
        if (gridNode.isEventWithinDisclosureTriangle(event))
            return;
        if (event.metaKey) {
            if (gridNode.selected)
                gridNode.deselect();
            else
                gridNode.select();
        } else
            gridNode.select();
    },
    _contextMenuInDataTable: function (event) {
        var contextMenu = new WebInspector.ContextMenu(event);
        var gridNode = this.dataGridNodeFromNode(event.target);
        if (this._refreshCallback && (!gridNode || gridNode !== this.creationNode))
            contextMenu.appendItem(WebInspector.UIString("Refresh"), this._refreshCallback.bind(this));
        if (gridNode && gridNode.selectable && !gridNode.isEventWithinDisclosureTriangle(event)) {
            if (this._editCallback) {
                if (gridNode === this.creationNode)
                    contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Add new" : "Add New"), this._startEditing.bind(this, event.target));
                else {
                    var columnIdentifier = this.columnIdentifierFromNode(event.target);
                    if (columnIdentifier && this.columns[columnIdentifier].editable)
                        contextMenu.appendItem(WebInspector.UIString("Edit \"%s\"", this.columns[columnIdentifier].title), this._startEditing.bind(this, event.target));
                }
            }
            if (this._deleteCallback && gridNode !== this.creationNode)
                contextMenu.appendItem(WebInspector.UIString("Delete"), this._deleteCallback.bind(this, gridNode));
            if (this._contextMenuCallback)
                this._contextMenuCallback(contextMenu, gridNode);
        }
        contextMenu.show();
    },
    _clickInDataTable: function (event) {
        var gridNode = this.dataGridNodeFromNode(event.target);
        if (!gridNode || !gridNode.hasChildren)
            return;
        if (!gridNode.isEventWithinDisclosureTriangle(event))
            return;
        if (gridNode.expanded) {
            if (event.altKey)
                gridNode.collapseRecursively();
            else
                gridNode.collapse();
        } else {
            if (event.altKey)
                gridNode.expandRecursively();
            else
                gridNode.expand();
        }
    },
    get resizeMethod() {
        if (typeof this._resizeMethod === "undefined")
            return WebInspector.DataGrid.ResizeMethod.Nearest;
        return this._resizeMethod;
    },
    set resizeMethod(method) {
        this._resizeMethod = method;
    },
    _startResizerDragging: function (event) {
        this._currentResizer = event.target;
        return !!this._currentResizer.rightNeighboringColumnIndex;
    },
    _resizerDragging: function (event) {
        var resizer = this._currentResizer;
        if (!resizer)
            return;
        var tableWidth = this._dataTable.offsetWidth;
        var dragPoint = event.clientX - this.element.totalOffsetLeft();
        var leftCellIndex = resizer.leftNeighboringColumnIndex;
        var rightCellIndex = resizer.rightNeighboringColumnIndex;
        var firstRowCells = this.headerTableBody.rows[0].cells;
        var leftEdgeOfPreviousColumn = 0;
        for (var i = 0; i < leftCellIndex; i++)
            leftEdgeOfPreviousColumn += firstRowCells[i].offsetWidth;
        if (this.resizeMethod == WebInspector.DataGrid.ResizeMethod.Last) {
            rightCellIndex = this.resizers.length;
        } else if (this.resizeMethod == WebInspector.DataGrid.ResizeMethod.First) {
            leftEdgeOfPreviousColumn += firstRowCells[leftCellIndex].offsetWidth - firstRowCells[0].offsetWidth;
            leftCellIndex = 0;
        }
        var rightEdgeOfNextColumn = leftEdgeOfPreviousColumn + firstRowCells[leftCellIndex].offsetWidth + firstRowCells[rightCellIndex].offsetWidth;
        var leftMinimum = leftEdgeOfPreviousColumn + this.ColumnResizePadding;
        var rightMaximum = rightEdgeOfNextColumn - this.ColumnResizePadding;
        if (leftMinimum > rightMaximum)
            return;
        dragPoint = Number.constrain(dragPoint, leftMinimum, rightMaximum);
        resizer.style.left = (dragPoint - this.CenterResizerOverBorderAdjustment) + "px";
        var percentLeftColumn = (100 * (dragPoint - leftEdgeOfPreviousColumn) / tableWidth) + "%";
        this._headerTableColumnGroup.children[leftCellIndex].style.width = percentLeftColumn;
        this._dataTableColumnGroup.children[leftCellIndex].style.width = percentLeftColumn;
        var percentRightColumn = (100 * (rightEdgeOfNextColumn - dragPoint) / tableWidth) + "%";
        this._headerTableColumnGroup.children[rightCellIndex].style.width = percentRightColumn;
        this._dataTableColumnGroup.children[rightCellIndex].style.width = percentRightColumn;
        var leftColumn = this._columnsArray[leftCellIndex];
        var rightColumn = this._columnsArray[rightCellIndex];
        if (leftColumn.weight || rightColumn.weight) {
            var sumOfWeights = leftColumn.weight + rightColumn.weight;
            var delta = rightEdgeOfNextColumn - leftEdgeOfPreviousColumn;
            leftColumn.weight = (dragPoint - leftEdgeOfPreviousColumn) * sumOfWeights / delta;
            rightColumn.weight = (rightEdgeOfNextColumn - dragPoint) * sumOfWeights / delta;
        }
        this._positionResizers();
        event.preventDefault();
        this.dispatchEventToListeners(WebInspector.DataGrid.Events.ColumnsResized);
    },
    _endResizerDragging: function (event) {
        this._currentResizer = null;
        this._saveColumnWeights();
        this.dispatchEventToListeners(WebInspector.DataGrid.Events.ColumnsResized);
    },
    defaultAttachLocation: function () {
        return this.dataTableBody.firstChild;
    },
    ColumnResizePadding: 24,
    CenterResizerOverBorderAdjustment: 3,
    __proto__: WebInspector.View.prototype
}
WebInspector.DataGrid.ResizeMethod = {
    Nearest: "nearest",
    First: "first",
    Last: "last"
}
WebInspector.DataGridNode = function (data, hasChildren) {
    this._expanded = false;
    this._selected = false;
    this._shouldRefreshChildren = true;
    this._data = data || {};
    this.hasChildren = hasChildren || false;
    this.children = [];
    this.dataGrid = null;
    this.parent = null;
    this.previousSibling = null;
    this.nextSibling = null;
    this.disclosureToggleWidth = 10;
}
WebInspector.DataGridNode.prototype = {
    selectable: true,
    _isRoot: false,
    get element() {
        if (this._element)
            return this._element;
        if (!this.dataGrid)
            return null;
        this._element = document.createElement("tr");
        this._element._dataGridNode = this;
        if (this.hasChildren)
            this._element.classList.add("parent");
        if (this.expanded)
            this._element.classList.add("expanded");
        if (this.selected)
            this._element.classList.add("selected");
        if (this.revealed)
            this._element.classList.add("revealed");
        this.createCells();
        this._element.createChild("td", "corner");
        return this._element;
    },
    createCells: function () {
        var columnsArray = this.dataGrid._columnsArray;
        for (var i = 0; i < columnsArray.length; ++i) {
            var cell = this.createCell(columnsArray[i].identifier);
            this._element.appendChild(cell);
        }
    },
    get data() {
        return this._data;
    },
    set data(x) {
        this._data = x || {};
        this.refresh();
    },
    get revealed() {
        if ("_revealed" in this)
            return this._revealed;
        var currentAncestor = this.parent;
        while (currentAncestor && !currentAncestor._isRoot) {
            if (!currentAncestor.expanded) {
                this._revealed = false;
                return false;
            }
            currentAncestor = currentAncestor.parent;
        }
        this._revealed = true;
        return true;
    },
    set hasChildren(x) {
        if (this._hasChildren === x)
            return;
        this._hasChildren = x;
        if (!this._element)
            return;
        this._element.classList.toggle("parent", this._hasChildren);
        this._element.classList.toggle("expanded", this._hasChildren && this.expanded);
    },
    get hasChildren() {
        return this._hasChildren;
    },
    set revealed(x) {
        if (this._revealed === x)
            return;
        this._revealed = x;
        if (this._element)
            this._element.classList.toggle("revealed", this._revealed);
        for (var i = 0; i < this.children.length; ++i)
            this.children[i].revealed = x && this.expanded;
    },
    get depth() {
        if ("_depth" in this)
            return this._depth;
        if (this.parent && !this.parent._isRoot)
            this._depth = this.parent.depth + 1;
        else
            this._depth = 0;
        return this._depth;
    },
    get leftPadding() {
        if (typeof this._leftPadding === "number")
            return this._leftPadding;
        this._leftPadding = this.depth * this.dataGrid.indentWidth;
        return this._leftPadding;
    },
    get shouldRefreshChildren() {
        return this._shouldRefreshChildren;
    },
    set shouldRefreshChildren(x) {
        this._shouldRefreshChildren = x;
        if (x && this.expanded)
            this.expand();
    },
    get selected() {
        return this._selected;
    },
    set selected(x) {
        if (x)
            this.select();
        else
            this.deselect();
    },
    get expanded() {
        return this._expanded;
    },
    set expanded(x) {
        if (x)
            this.expand();
        else
            this.collapse();
    },
    refresh: function () {
        if (!this._element || !this.dataGrid)
            return;
        this._element.removeChildren();
        this.createCells();
        this._element.createChild("td", "corner");
    },
    createTD: function (columnIdentifier) {
        var cell = document.createElement("td");
        cell.className = columnIdentifier + "-column";
        cell.columnIdentifier_ = columnIdentifier;
        var alignment = this.dataGrid.columns[columnIdentifier].align;
        if (alignment)
            cell.classList.add(alignment);
        return cell;
    },
    createCell: function (columnIdentifier) {
        var cell = this.createTD(columnIdentifier);
        var data = this.data[columnIdentifier];
        var div = document.createElement("div");
        if (data instanceof Node)
            div.appendChild(data);
        else {
            div.textContent = data;
            if (this.dataGrid.columns[columnIdentifier].longText)
                div.title = data;
        }
        cell.appendChild(div);
        if (columnIdentifier === this.dataGrid.disclosureColumnIdentifier) {
            cell.classList.add("disclosure");
            if (this.leftPadding)
                cell.style.setProperty("padding-left", this.leftPadding + "px");
        }
        return cell;
    },
    nodeSelfHeight: function () {
        return 16;
    },
    appendChild: function (child) {
        this.insertChild(child, this.children.length);
    },
    insertChild: function (child, index) {
        if (!child)
            throw ("insertChild: Node can't be undefined or null.");
        if (child.parent === this)
            throw ("insertChild: Node is already a child of this node.");
        if (child.parent)
            child.parent.removeChild(child);
        this.children.splice(index, 0, child);
        this.hasChildren = true;
        child.parent = this;
        child.dataGrid = this.dataGrid;
        child._recalculateSiblings(index);
        delete child._depth;
        delete child._revealed;
        delete child._attached;
        child._shouldRefreshChildren = true;
        var current = child.children[0];
        while (current) {
            current.dataGrid = this.dataGrid;
            delete current._depth;
            delete current._revealed;
            delete current._attached;
            current._shouldRefreshChildren = true;
            current = current.traverseNextNode(false, child, true);
        }
        if (this.expanded)
            child._attach();
        if (!this.revealed)
            child.revealed = false;
    },
    removeChild: function (child) {
        if (!child)
            throw ("removeChild: Node can't be undefined or null.");
        if (child.parent !== this)
            throw ("removeChild: Node is not a child of this node.");
        child.deselect();
        child._detach();
        this.children.remove(child, true);
        if (child.previousSibling)
            child.previousSibling.nextSibling = child.nextSibling;
        if (child.nextSibling)
            child.nextSibling.previousSibling = child.previousSibling;
        child.dataGrid = null;
        child.parent = null;
        child.nextSibling = null;
        child.previousSibling = null;
        if (this.children.length <= 0)
            this.hasChildren = false;
    },
    removeChildren: function () {
        for (var i = 0; i < this.children.length; ++i) {
            var child = this.children[i];
            child.deselect();
            child._detach();
            child.dataGrid = null;
            child.parent = null;
            child.nextSibling = null;
            child.previousSibling = null;
        }
        this.children = [];
        this.hasChildren = false;
    },
    _recalculateSiblings: function (myIndex) {
        if (!this.parent)
            return;
        var previousChild = (myIndex > 0 ? this.parent.children[myIndex - 1] : null);
        if (previousChild) {
            previousChild.nextSibling = this;
            this.previousSibling = previousChild;
        } else
            this.previousSibling = null;
        var nextChild = this.parent.children[myIndex + 1];
        if (nextChild) {
            nextChild.previousSibling = this;
            this.nextSibling = nextChild;
        } else
            this.nextSibling = null;
    },
    collapse: function () {
        if (this._isRoot)
            return;
        if (this._element)
            this._element.classList.remove("expanded");
        this._expanded = false;
        for (var i = 0; i < this.children.length; ++i)
            this.children[i].revealed = false;
    },
    collapseRecursively: function () {
        var item = this;
        while (item) {
            if (item.expanded)
                item.collapse();
            item = item.traverseNextNode(false, this, true);
        }
    },
    populate: function () {},
    expand: function () {
        if (!this.hasChildren || this.expanded)
            return;
        if (this._isRoot)
            return;
        if (this.revealed && !this._shouldRefreshChildren)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].revealed = true;
        if (this._shouldRefreshChildren) {
            for (var i = 0; i < this.children.length; ++i)
                this.children[i]._detach();
            this.populate();
            if (this._attached) {
                for (var i = 0; i < this.children.length; ++i) {
                    var child = this.children[i];
                    if (this.revealed)
                        child.revealed = true;
                    child._attach();
                }
            }
            delete this._shouldRefreshChildren;
        }
        if (this._element)
            this._element.classList.add("expanded");
        this._expanded = true;
    },
    expandRecursively: function () {
        var item = this;
        while (item) {
            item.expand();
            item = item.traverseNextNode(false, this);
        }
    },
    reveal: function () {
        if (this._isRoot)
            return;
        var currentAncestor = this.parent;
        while (currentAncestor && !currentAncestor._isRoot) {
            if (!currentAncestor.expanded)
                currentAncestor.expand();
            currentAncestor = currentAncestor.parent;
        }
        this.element.scrollIntoViewIfNeeded(false);
    },
    select: function (supressSelectedEvent) {
        if (!this.dataGrid || !this.selectable || this.selected)
            return;
        if (this.dataGrid.selectedNode)
            this.dataGrid.selectedNode.deselect();
        this._selected = true;
        this.dataGrid.selectedNode = this;
        if (this._element)
            this._element.classList.add("selected");
        if (!supressSelectedEvent)
            this.dataGrid.dispatchEventToListeners(WebInspector.DataGrid.Events.SelectedNode);
    },
    revealAndSelect: function () {
        if (this._isRoot)
            return;
        this.reveal();
        this.select();
    },
    deselect: function (supressDeselectedEvent) {
        if (!this.dataGrid || this.dataGrid.selectedNode !== this || !this.selected)
            return;
        this._selected = false;
        this.dataGrid.selectedNode = null;
        if (this._element)
            this._element.classList.remove("selected");
        if (!supressDeselectedEvent)
            this.dataGrid.dispatchEventToListeners(WebInspector.DataGrid.Events.DeselectedNode);
    },
    traverseNextNode: function (skipHidden, stayWithin, dontPopulate, info) {
        if (!dontPopulate && this.hasChildren)
            this.populate();
        if (info)
            info.depthChange = 0;
        var node = (!skipHidden || this.revealed) ? this.children[0] : null;
        if (node && (!skipHidden || this.expanded)) {
            if (info)
                info.depthChange = 1;
            return node;
        }
        if (this === stayWithin)
            return null;
        node = (!skipHidden || this.revealed) ? this.nextSibling : null;
        if (node)
            return node;
        node = this;
        while (node && !node._isRoot && !((!skipHidden || node.revealed) ? node.nextSibling : null) && node.parent !== stayWithin) {
            if (info)
                info.depthChange -= 1;
            node = node.parent;
        }
        if (!node)
            return null;
        return (!skipHidden || node.revealed) ? node.nextSibling : null;
    },
    traversePreviousNode: function (skipHidden, dontPopulate) {
        var node = (!skipHidden || this.revealed) ? this.previousSibling : null;
        if (!dontPopulate && node && node.hasChildren)
            node.populate();
        while (node && ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null)) {
            if (!dontPopulate && node.hasChildren)
                node.populate();
            node = ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null);
        }
        if (node)
            return node;
        if (!this.parent || this.parent._isRoot)
            return null;
        return this.parent;
    },
    isEventWithinDisclosureTriangle: function (event) {
        if (!this.hasChildren)
            return false;
        var cell = event.target.enclosingNodeOrSelfWithNodeName("td");
        if (!cell.classList.contains("disclosure"))
            return false;
        var left = cell.totalOffsetLeft() + this.leftPadding;
        return event.pageX >= left && event.pageX <= left + this.disclosureToggleWidth;
    },
    _attach: function () {
        if (!this.dataGrid || this._attached)
            return;
        this._attached = true;
        var nextNode = null;
        var previousNode = this.traversePreviousNode(true, true);
        if (previousNode && previousNode.element.parentNode && previousNode.element.nextSibling)
            nextNode = previousNode.element.nextSibling;
        if (!nextNode)
            nextNode = this.dataGrid.defaultAttachLocation();
        this.dataGrid.dataTableBody.insertBefore(this.element, nextNode);
        if (this.expanded)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i]._attach();
    },
    _detach: function () {
        if (!this._attached)
            return;
        this._attached = false;
        if (this._element)
            this._element.remove();
        for (var i = 0; i < this.children.length; ++i)
            this.children[i]._detach();
        this.wasDetached();
    },
    wasDetached: function () {},
    savePosition: function () {
        if (this._savedPosition)
            return;
        if (!this.parent)
            throw ("savePosition: Node must have a parent.");
        this._savedPosition = {
            parent: this.parent,
            index: this.parent.children.indexOf(this)
        };
    },
    restorePosition: function () {
        if (!this._savedPosition)
            return;
        if (this.parent !== this._savedPosition.parent)
            this._savedPosition.parent.insertChild(this, this._savedPosition.index);
        delete this._savedPosition;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.CreationDataGridNode = function (data, hasChildren) {
    WebInspector.DataGridNode.call(this, data, hasChildren);
    this.isCreationNode = true;
}
WebInspector.CreationDataGridNode.prototype = {
    makeNormal: function () {
        delete this.isCreationNode;
        delete this.makeNormal;
    },
    __proto__: WebInspector.DataGridNode.prototype
}
WebInspector.ShowMoreDataGridNode = function (callback, startPosition, endPosition, chunkSize) {
    WebInspector.DataGridNode.call(this, {
        summaryRow: true
    }, false);
    this._callback = callback;
    this._startPosition = startPosition;
    this._endPosition = endPosition;
    this._chunkSize = chunkSize;
    this.showNext = document.createElement("button");
    this.showNext.setAttribute("type", "button");
    this.showNext.addEventListener("click", this._showNextChunk.bind(this), false);
    this.showNext.textContent = WebInspector.UIString("Show %d before", this._chunkSize);
    this.showAll = document.createElement("button");
    this.showAll.setAttribute("type", "button");
    this.showAll.addEventListener("click", this._showAll.bind(this), false);
    this.showLast = document.createElement("button");
    this.showLast.setAttribute("type", "button");
    this.showLast.addEventListener("click", this._showLastChunk.bind(this), false);
    this.showLast.textContent = WebInspector.UIString("Show %d after", this._chunkSize);
    this._updateLabels();
    this.selectable = false;
}
WebInspector.ShowMoreDataGridNode.prototype = {
    _showNextChunk: function () {
        this._callback(this._startPosition, this._startPosition + this._chunkSize);
    },
    _showAll: function () {
        this._callback(this._startPosition, this._endPosition);
    },
    _showLastChunk: function () {
        this._callback(this._endPosition - this._chunkSize, this._endPosition);
    },
    _updateLabels: function () {
        var totalSize = this._endPosition - this._startPosition;
        if (totalSize > this._chunkSize) {
            this.showNext.classList.remove("hidden");
            this.showLast.classList.remove("hidden");
        } else {
            this.showNext.classList.add("hidden");
            this.showLast.classList.add("hidden");
        }
        this.showAll.textContent = WebInspector.UIString("Show all %d", totalSize);
    },
    createCells: function () {
        var cell = document.createElement("td");
        if (this.depth)
            cell.style.setProperty("padding-left", (this.depth * this.dataGrid.indentWidth) + "px");
        cell.appendChild(this.showNext);
        cell.appendChild(this.showAll);
        cell.appendChild(this.showLast);
        this._element.appendChild(cell);
        var columns = this.dataGrid.columns;
        var count = 0;
        for (var c in columns)
        ++count;
        while (--count > 0) {
            cell = document.createElement("td");
            this._element.appendChild(cell);
        }
    },
    setStartPosition: function (from) {
        this._startPosition = from;
        this._updateLabels();
    },
    setEndPosition: function (to) {
        this._endPosition = to;
        this._updateLabels();
    },
    nodeSelfHeight: function () {
        return 32;
    },
    dispose: function () {},
    __proto__: WebInspector.DataGridNode.prototype
}
WebInspector.CookiesTable = function (expandable, refreshCallback, selectedCallback) {
    WebInspector.VBox.call(this);
    var readOnly = expandable;
    this._refreshCallback = refreshCallback;
    var columns = [{
        id: "name",
        title: WebInspector.UIString("Name"),
        sortable: true,
        disclosure: expandable,
        sort: WebInspector.DataGrid.Order.Ascending,
        longText: true,
        weight: 24
    }, {
        id: "value",
        title: WebInspector.UIString("Value"),
        sortable: true,
        longText: true,
        weight: 34
    }, {
        id: "domain",
        title: WebInspector.UIString("Domain"),
        sortable: true,
        weight: 7
    }, {
        id: "path",
        title: WebInspector.UIString("Path"),
        sortable: true,
        weight: 7
    }, {
        id: "expires",
        title: WebInspector.UIString("Expires / Max-Age"),
        sortable: true,
        weight: 7
    }, {
        id: "size",
        title: WebInspector.UIString("Size"),
        sortable: true,
        align: WebInspector.DataGrid.Align.Right,
        weight: 7
    }, {
        id: "httpOnly",
        title: WebInspector.UIString("HTTP"),
        sortable: true,
        align: WebInspector.DataGrid.Align.Center,
        weight: 7
    }, {
        id: "secure",
        title: WebInspector.UIString("Secure"),
        sortable: true,
        align: WebInspector.DataGrid.Align.Center,
        weight: 7
    }];
    if (readOnly)
        this._dataGrid = new WebInspector.DataGrid(columns);
    else
        this._dataGrid = new WebInspector.DataGrid(columns, undefined, this._onDeleteCookie.bind(this), refreshCallback, this._onContextMenu.bind(this));
    this._dataGrid.setName("cookiesTable");
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._rebuildTable, this);
    if (selectedCallback)
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, selectedCallback, this);
    this._nextSelectedCookie = (null);
    this._dataGrid.show(this.element);
    this._data = [];
}
WebInspector.CookiesTable.prototype = {
    _clearAndRefresh: function (domain) {
        this.clear(domain);
        this._refresh();
    },
    _onContextMenu: function (contextMenu, node) {
        if (node === this._dataGrid.creationNode)
            return;
        var cookie = node.cookie;
        var domain = cookie.domain();
        if (domain)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear all from \"%s\"" : "Clear All from \"%s\"", domain), this._clearAndRefresh.bind(this, domain));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear all" : "Clear All"), this._clearAndRefresh.bind(this, null));
    },
    setCookies: function (cookies) {
        this.setCookieFolders([{
            cookies: cookies
        }]);
    },
    setCookieFolders: function (cookieFolders) {
        this._data = cookieFolders;
        this._rebuildTable();
    },
    selectedCookie: function () {
        var node = this._dataGrid.selectedNode;
        return node ? node.cookie : null;
    },
    clear: function (domain) {
        for (var i = 0, length = this._data.length; i < length; ++i) {
            var cookies = this._data[i].cookies;
            for (var j = 0, cookieCount = cookies.length; j < cookieCount; ++j) {
                if (!domain || cookies[j].domain() === domain)
                    cookies[j].remove();
            }
        }
    },
    _rebuildTable: function () {
        var selectedCookie = this._nextSelectedCookie || this.selectedCookie();
        this._nextSelectedCookie = null;
        this._dataGrid.rootNode().removeChildren();
        for (var i = 0; i < this._data.length; ++i) {
            var item = this._data[i];
            if (item.folderName) {
                var groupData = {
                    name: item.folderName,
                    value: "",
                    domain: "",
                    path: "",
                    expires: "",
                    size: this._totalSize(item.cookies),
                    httpOnly: "",
                    secure: ""
                };
                var groupNode = new WebInspector.DataGridNode(groupData);
                groupNode.selectable = true;
                this._dataGrid.rootNode().appendChild(groupNode);
                groupNode.element.classList.add("row-group");
                this._populateNode(groupNode, item.cookies, selectedCookie);
                groupNode.expand();
            } else
                this._populateNode(this._dataGrid.rootNode(), item.cookies, selectedCookie);
        }
    },
    _populateNode: function (parentNode, cookies, selectedCookie) {
        parentNode.removeChildren();
        if (!cookies)
            return;
        this._sortCookies(cookies);
        for (var i = 0; i < cookies.length; ++i) {
            var cookie = cookies[i];
            var cookieNode = this._createGridNode(cookie);
            parentNode.appendChild(cookieNode);
            if (selectedCookie && selectedCookie.name() === cookie.name() && selectedCookie.domain() === cookie.domain() && selectedCookie.path() === cookie.path())
                cookieNode.select();
        }
    },
    _totalSize: function (cookies) {
        var totalSize = 0;
        for (var i = 0; cookies && i < cookies.length; ++i)
            totalSize += cookies[i].size();
        return totalSize;
    },
    _sortCookies: function (cookies) {
        var sortDirection = this._dataGrid.isSortOrderAscending() ? 1 : -1;

        function compareTo(getter, cookie1, cookie2) {
            return sortDirection * (getter.apply(cookie1) + "").compareTo(getter.apply(cookie2) + "")
        }

        function numberCompare(getter, cookie1, cookie2) {
            return sortDirection * (getter.apply(cookie1) - getter.apply(cookie2));
        }

        function expiresCompare(cookie1, cookie2) {
            if (cookie1.session() !== cookie2.session())
                return sortDirection * (cookie1.session() ? 1 : -1);
            if (cookie1.session())
                return 0;
            if (cookie1.maxAge() && cookie2.maxAge())
                return sortDirection * (cookie1.maxAge() - cookie2.maxAge());
            if (cookie1.expires() && cookie2.expires())
                return sortDirection * (cookie1.expires() - cookie2.expires());
            return sortDirection * (cookie1.expires() ? 1 : -1);
        }
        var comparator;
        switch (this._dataGrid.sortColumnIdentifier()) {
        case "name":
            comparator = compareTo.bind(null, WebInspector.Cookie.prototype.name);
            break;
        case "value":
            comparator = compareTo.bind(null, WebInspector.Cookie.prototype.value);
            break;
        case "domain":
            comparator = compareTo.bind(null, WebInspector.Cookie.prototype.domain);
            break;
        case "path":
            comparator = compareTo.bind(null, WebInspector.Cookie.prototype.path);
            break;
        case "expires":
            comparator = expiresCompare;
            break;
        case "size":
            comparator = numberCompare.bind(null, WebInspector.Cookie.prototype.size);
            break;
        case "httpOnly":
            comparator = compareTo.bind(null, WebInspector.Cookie.prototype.httpOnly);
            break;
        case "secure":
            comparator = compareTo.bind(null, WebInspector.Cookie.prototype.secure);
            break;
        default:
            compareTo.bind(null, WebInspector.Cookie.prototype.name);
        }
        cookies.sort(comparator);
    },
    _createGridNode: function (cookie) {
        var data = {};
        data.name = cookie.name();
        data.value = cookie.value();
        if (cookie.type() === WebInspector.Cookie.Type.Request) {
            data.domain = WebInspector.UIString("N/A");
            data.path = WebInspector.UIString("N/A");
            data.expires = WebInspector.UIString("N/A");
        } else {
            data.domain = cookie.domain() || "";
            data.path = cookie.path() || "";
            if (cookie.maxAge())
                data.expires = Number.secondsToString(parseInt(cookie.maxAge(), 10));
            else if (cookie.expires())
                data.expires = new Date(cookie.expires()).toGMTString();
            else
                data.expires = WebInspector.UIString("Session");
        }
        data.size = cookie.size();
        const checkmark = "\u2713";
        data.httpOnly = (cookie.httpOnly() ? checkmark : "");
        data.secure = (cookie.secure() ? checkmark : "");
        var node = new WebInspector.DataGridNode(data);
        node.cookie = cookie;
        node.selectable = true;
        return node;
    },
    _onDeleteCookie: function (node) {
        var cookie = node.cookie;
        var neighbour = node.traverseNextNode() || node.traversePreviousNode();
        if (neighbour)
            this._nextSelectedCookie = neighbour.cookie;
        cookie.remove();
        this._refresh();
    },
    _refresh: function () {
        if (this._refreshCallback)
            this._refreshCallback();
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.CookieItemsView = function (treeElement, cookieDomain) {
    WebInspector.VBox.call(this);
    this.element.classList.add("storage-view");
    this._deleteButton = new WebInspector.StatusBarButton(WebInspector.UIString("Delete"), "delete-storage-status-bar-item");
    this._deleteButton.visible = false;
    this._deleteButton.addEventListener("click", this._deleteButtonClicked, this);
    this._clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear"), "clear-storage-status-bar-item");
    this._clearButton.visible = false;
    this._clearButton.addEventListener("click", this._clearButtonClicked, this);
    this._refreshButton = new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"), "refresh-storage-status-bar-item");
    this._refreshButton.addEventListener("click", this._refreshButtonClicked, this);
    this._treeElement = treeElement;
    this._cookieDomain = cookieDomain;
    this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("This site has no cookies."));
    this._emptyView.show(this.element);
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), true);
}
WebInspector.CookieItemsView.prototype = {
    get statusBarItems() {
        return [this._refreshButton.element, this._clearButton.element, this._deleteButton.element];
    }, wasShown: function () {
        this._update();
    }, willHide: function () {
        this._deleteButton.visible = false;
    }, _update: function () {
        WebInspector.Cookies.getCookiesAsync(this._updateWithCookies.bind(this));
    }, _updateWithCookies: function (allCookies) {
        this._cookies = this._filterCookiesForDomain(allCookies);
        if (!this._cookies.length) {
            this._emptyView.show(this.element);
            this._clearButton.visible = false;
            this._deleteButton.visible = false;
            if (this._cookiesTable)
                this._cookiesTable.detach();
            return;
        }
        if (!this._cookiesTable)
            this._cookiesTable = new WebInspector.CookiesTable(false, this._update.bind(this), this._showDeleteButton.bind(this));
        this._cookiesTable.setCookies(this._cookies);
        this._emptyView.detach();
        this._cookiesTable.show(this.element);
        this._treeElement.subtitle = String.sprintf(WebInspector.UIString("%d cookies (%s)"), this._cookies.length, Number.bytesToString(this._totalSize));
        this._clearButton.visible = true;
        this._deleteButton.visible = !!this._cookiesTable.selectedCookie();
    }, _filterCookiesForDomain: function (allCookies) {
        var cookies = [];
        var resourceURLsForDocumentURL = [];
        this._totalSize = 0;

        function populateResourcesForDocuments(resource) {
            var url = resource.documentURL.asParsedURL();
            if (url && url.host == this._cookieDomain)
                resourceURLsForDocumentURL.push(resource.url);
        }
        WebInspector.forAllResources(populateResourcesForDocuments.bind(this));
        for (var i = 0; i < allCookies.length; ++i) {
            var pushed = false;
            var size = allCookies[i].size();
            for (var j = 0; j < resourceURLsForDocumentURL.length; ++j) {
                var resourceURL = resourceURLsForDocumentURL[j];
                if (WebInspector.Cookies.cookieMatchesResourceURL(allCookies[i], resourceURL)) {
                    this._totalSize += size;
                    if (!pushed) {
                        pushed = true;
                        cookies.push(allCookies[i]);
                    }
                }
            }
        }
        return cookies;
    }, clear: function () {
        this._cookiesTable.clear();
        this._update();
    }, _clearButtonClicked: function () {
        this.clear();
    }, _showDeleteButton: function () {
        this._deleteButton.visible = true;
    }, _deleteButtonClicked: function () {
        var selectedCookie = this._cookiesTable.selectedCookie();
        if (selectedCookie) {
            selectedCookie.remove();
            this._update();
        }
    }, _refreshButtonClicked: function (event) {
        this._update();
    }, _contextMenu: function (event) {
        if (!this._cookies.length) {
            var contextMenu = new WebInspector.ContextMenu(event);
            contextMenu.appendItem(WebInspector.UIString("Refresh"), this._update.bind(this));
            contextMenu.show();
        }
    }, __proto__: WebInspector.VBox.prototype
}
WebInspector.ApplicationCacheModel = function () {
    ApplicationCacheAgent.enable();
    InspectorBackend.registerApplicationCacheDispatcher(new WebInspector.ApplicationCacheDispatcher(this));
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameNavigated, this._frameNavigated, this);
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameDetached, this._frameDetached, this);
    this._statuses = {};
    this._manifestURLsByFrame = {};
    this._mainFrameNavigated();
    this._onLine = true;
}
WebInspector.ApplicationCacheModel.EventTypes = {
    FrameManifestStatusUpdated: "FrameManifestStatusUpdated",
    FrameManifestAdded: "FrameManifestAdded",
    FrameManifestRemoved: "FrameManifestRemoved",
    NetworkStateChanged: "NetworkStateChanged"
}
WebInspector.ApplicationCacheModel.prototype = {
    _frameNavigated: function (event) {
        var frame = (event.data);
        if (frame.isMainFrame()) {
            this._mainFrameNavigated();
            return;
        }
        ApplicationCacheAgent.getManifestForFrame(frame.id, this._manifestForFrameLoaded.bind(this, frame.id));
    },
    _frameDetached: function (event) {
        var frame = (event.data);
        this._frameManifestRemoved(frame.id);
    },
    _mainFrameNavigated: function () {
        ApplicationCacheAgent.getFramesWithManifests(this._framesWithManifestsLoaded.bind(this));
    },
    _manifestForFrameLoaded: function (frameId, error, manifestURL) {
        if (error) {
            console.error(error);
            return;
        }
        if (!manifestURL)
            this._frameManifestRemoved(frameId);
    },
    _framesWithManifestsLoaded: function (error, framesWithManifests) {
        if (error) {
            console.error(error);
            return;
        }
        for (var i = 0; i < framesWithManifests.length; ++i)
            this._frameManifestUpdated(framesWithManifests[i].frameId, framesWithManifests[i].manifestURL, framesWithManifests[i].status);
    },
    _frameManifestUpdated: function (frameId, manifestURL, status) {
        if (status === applicationCache.UNCACHED) {
            this._frameManifestRemoved(frameId);
            return;
        }
        if (!manifestURL)
            return;
        if (this._manifestURLsByFrame[frameId] && manifestURL !== this._manifestURLsByFrame[frameId])
            this._frameManifestRemoved(frameId);
        var statusChanged = this._statuses[frameId] !== status;
        this._statuses[frameId] = status;
        if (!this._manifestURLsByFrame[frameId]) {
            this._manifestURLsByFrame[frameId] = manifestURL;
            this.dispatchEventToListeners(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestAdded, frameId);
        }
        if (statusChanged)
            this.dispatchEventToListeners(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestStatusUpdated, frameId);
    },
    _frameManifestRemoved: function (frameId) {
        if (!this._manifestURLsByFrame[frameId])
            return;
        var manifestURL = this._manifestURLsByFrame[frameId];
        delete this._manifestURLsByFrame[frameId];
        delete this._statuses[frameId];
        this.dispatchEventToListeners(WebInspector.ApplicationCacheModel.EventTypes.FrameManifestRemoved, frameId);
    },
    frameManifestURL: function (frameId) {
        return this._manifestURLsByFrame[frameId] || "";
    },
    frameManifestStatus: function (frameId) {
        return this._statuses[frameId] || applicationCache.UNCACHED;
    },
    get onLine() {
        return this._onLine;
    },
    _statusUpdated: function (frameId, manifestURL, status) {
        this._frameManifestUpdated(frameId, manifestURL, status);
    },
    requestApplicationCache: function (frameId, callback) {
        function callbackWrapper(error, applicationCache) {
            if (error) {
                console.error(error);
                callback(null);
                return;
            }
            callback(applicationCache);
        }
        ApplicationCacheAgent.getApplicationCacheForFrame(frameId, callbackWrapper);
    },
    _networkStateUpdated: function (isNowOnline) {
        this._onLine = isNowOnline;
        this.dispatchEventToListeners(WebInspector.ApplicationCacheModel.EventTypes.NetworkStateChanged, isNowOnline);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.ApplicationCacheDispatcher = function (applicationCacheModel) {
    this._applicationCacheModel = applicationCacheModel;
}
WebInspector.ApplicationCacheDispatcher.prototype = {
    applicationCacheStatusUpdated: function (frameId, manifestURL, status) {
        this._applicationCacheModel._statusUpdated(frameId, manifestURL, status);
    },
    networkStateUpdated: function (isNowOnline) {
        this._applicationCacheModel._networkStateUpdated(isNowOnline);
    }
}
WebInspector.IndexedDBModel = function () {
    IndexedDBAgent.enable();
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded, this._securityOriginAdded, this);
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved, this._securityOriginRemoved, this);
    this._databases = new Map();
    this._databaseNamesBySecurityOrigin = {};
    this._reset();
}
WebInspector.IndexedDBModel.KeyTypes = {
    NumberType: "number",
    StringType: "string",
    DateType: "date",
    ArrayType: "array"
};
WebInspector.IndexedDBModel.KeyPathTypes = {
    NullType: "null",
    StringType: "string",
    ArrayType: "array"
};
WebInspector.IndexedDBModel.keyFromIDBKey = function (idbKey) {
    if (typeof (idbKey) === "undefined" || idbKey === null)
        return null;
    var key = {};
    switch (typeof (idbKey)) {
    case "number":
        key.number = idbKey;
        key.type = WebInspector.IndexedDBModel.KeyTypes.NumberType;
        break;
    case "string":
        key.string = idbKey;
        key.type = WebInspector.IndexedDBModel.KeyTypes.StringType;
        break;
    case "object":
        if (idbKey instanceof Date) {
            key.date = idbKey.getTime();
            key.type = WebInspector.IndexedDBModel.KeyTypes.DateType;
        } else if (idbKey instanceof Array) {
            key.array = [];
            for (var i = 0; i < idbKey.length; ++i)
                key.array.push(WebInspector.IndexedDBModel.keyFromIDBKey(idbKey[i]));
            key.type = WebInspector.IndexedDBModel.KeyTypes.ArrayType;
        }
        break;
    default:
        return null;
    }
    return key;
}
WebInspector.IndexedDBModel.keyRangeFromIDBKeyRange = function (idbKeyRange) {
    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
    if (typeof (idbKeyRange) === "undefined" || idbKeyRange === null)
        return null;
    var keyRange = {};
    keyRange.lower = WebInspector.IndexedDBModel.keyFromIDBKey(idbKeyRange.lower);
    keyRange.upper = WebInspector.IndexedDBModel.keyFromIDBKey(idbKeyRange.upper);
    keyRange.lowerOpen = idbKeyRange.lowerOpen;
    keyRange.upperOpen = idbKeyRange.upperOpen;
    return keyRange;
}
WebInspector.IndexedDBModel.idbKeyPathFromKeyPath = function (keyPath) {
    var idbKeyPath;
    switch (keyPath.type) {
    case WebInspector.IndexedDBModel.KeyPathTypes.NullType:
        idbKeyPath = null;
        break;
    case WebInspector.IndexedDBModel.KeyPathTypes.StringType:
        idbKeyPath = keyPath.string;
        break;
    case WebInspector.IndexedDBModel.KeyPathTypes.ArrayType:
        idbKeyPath = keyPath.array;
        break;
    }
    return idbKeyPath;
}
WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath = function (idbKeyPath) {
    if (typeof idbKeyPath === "string")
        return "\"" + idbKeyPath + "\"";
    if (idbKeyPath instanceof Array)
        return "[\"" + idbKeyPath.join("\", \"") + "\"]";
    return null;
}
WebInspector.IndexedDBModel.EventTypes = {
    DatabaseAdded: "DatabaseAdded",
    DatabaseRemoved: "DatabaseRemoved",
    DatabaseLoaded: "DatabaseLoaded"
}
WebInspector.IndexedDBModel.prototype = {
    _reset: function () {
        for (var securityOrigin in this._databaseNamesBySecurityOrigin)
            this._removeOrigin(securityOrigin);
        var securityOrigins = WebInspector.resourceTreeModel.securityOrigins();
        for (var i = 0; i < securityOrigins.length; ++i)
            this._addOrigin(securityOrigins[i]);
    },
    refreshDatabaseNames: function () {
        for (var securityOrigin in this._databaseNamesBySecurityOrigin)
            this._loadDatabaseNames(securityOrigin);
    },
    refreshDatabase: function (databaseId) {
        this._loadDatabase(databaseId);
    },
    clearObjectStore: function (databaseId, objectStoreName, callback) {
        IndexedDBAgent.clearObjectStore(databaseId.securityOrigin, databaseId.name, objectStoreName, callback);
    },
    _securityOriginAdded: function (event) {
        var securityOrigin = (event.data);
        this._addOrigin(securityOrigin);
    },
    _securityOriginRemoved: function (event) {
        var securityOrigin = (event.data);
        this._removeOrigin(securityOrigin);
    },
    _addOrigin: function (securityOrigin) {
        console.assert(!this._databaseNamesBySecurityOrigin[securityOrigin]);
        this._databaseNamesBySecurityOrigin[securityOrigin] = [];
        this._loadDatabaseNames(securityOrigin);
    },
    _removeOrigin: function (securityOrigin) {
        console.assert(this._databaseNamesBySecurityOrigin[securityOrigin]);
        for (var i = 0; i < this._databaseNamesBySecurityOrigin[securityOrigin].length; ++i)
            this._databaseRemoved(securityOrigin, this._databaseNamesBySecurityOrigin[securityOrigin][i]);
        delete this._databaseNamesBySecurityOrigin[securityOrigin];
    },
    _updateOriginDatabaseNames: function (securityOrigin, databaseNames) {
        var newDatabaseNames = {};
        for (var i = 0; i < databaseNames.length; ++i)
            newDatabaseNames[databaseNames[i]] = true;
        var oldDatabaseNames = {};
        for (var i = 0; i < this._databaseNamesBySecurityOrigin[securityOrigin].length; ++i)
            oldDatabaseNames[this._databaseNamesBySecurityOrigin[securityOrigin][i]] = true;
        this._databaseNamesBySecurityOrigin[securityOrigin] = databaseNames;
        for (var databaseName in oldDatabaseNames) {
            if (!newDatabaseNames[databaseName])
                this._databaseRemoved(securityOrigin, databaseName);
        }
        for (var databaseName in newDatabaseNames) {
            if (!oldDatabaseNames[databaseName])
                this._databaseAdded(securityOrigin, databaseName);
        }
    },
    _databaseAdded: function (securityOrigin, databaseName) {
        var databaseId = new WebInspector.IndexedDBModel.DatabaseId(securityOrigin, databaseName);
        this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseAdded, databaseId);
    },
    _databaseRemoved: function (securityOrigin, databaseName) {
        var databaseId = new WebInspector.IndexedDBModel.DatabaseId(securityOrigin, databaseName);
        this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseRemoved, databaseId);
    },
    _loadDatabaseNames: function (securityOrigin) {
        function callback(error, databaseNames) {
            if (error) {
                console.error("IndexedDBAgent error: " + error);
                return;
            }
            if (!this._databaseNamesBySecurityOrigin[securityOrigin])
                return;
            this._updateOriginDatabaseNames(securityOrigin, databaseNames);
        }
        IndexedDBAgent.requestDatabaseNames(securityOrigin, callback.bind(this));
    },
    _loadDatabase: function (databaseId) {
        function callback(error, databaseWithObjectStores) {
            if (error) {
                console.error("IndexedDBAgent error: " + error);
                return;
            }
            if (!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
                return;
            var databaseModel = new WebInspector.IndexedDBModel.Database(databaseId, databaseWithObjectStores.version, databaseWithObjectStores.intVersion);
            this._databases.put(databaseId, databaseModel);
            for (var i = 0; i < databaseWithObjectStores.objectStores.length; ++i) {
                var objectStore = databaseWithObjectStores.objectStores[i];
                var objectStoreIDBKeyPath = WebInspector.IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);
                var objectStoreModel = new WebInspector.IndexedDBModel.ObjectStore(objectStore.name, objectStoreIDBKeyPath, objectStore.autoIncrement);
                for (var j = 0; j < objectStore.indexes.length; ++j) {
                    var index = objectStore.indexes[j];
                    var indexIDBKeyPath = WebInspector.IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);
                    var indexModel = new WebInspector.IndexedDBModel.Index(index.name, indexIDBKeyPath, index.unique, index.multiEntry);
                    objectStoreModel.indexes[indexModel.name] = indexModel;
                }
                databaseModel.objectStores[objectStoreModel.name] = objectStoreModel;
            }
            this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseLoaded, databaseModel);
        }
        IndexedDBAgent.requestDatabase(databaseId.securityOrigin, databaseId.name, callback.bind(this));
    },
    loadObjectStoreData: function (databaseId, objectStoreName, idbKeyRange, skipCount, pageSize, callback) {
        this._requestData(databaseId, databaseId.name, objectStoreName, "", idbKeyRange, skipCount, pageSize, callback);
    },
    loadIndexData: function (databaseId, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback) {
        this._requestData(databaseId, databaseId.name, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback);
    },
    _requestData: function (databaseId, databaseName, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback) {
        function innerCallback(error, dataEntries, hasMore) {
            if (error) {
                console.error("IndexedDBAgent error: " + error);
                return;
            }
            if (!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
                return;
            var entries = [];
            for (var i = 0; i < dataEntries.length; ++i) {
                var key = WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].key));
                var primaryKey = WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].primaryKey));
                var value = WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].value));
                entries.push(new WebInspector.IndexedDBModel.Entry(key, primaryKey, value));
            }
            callback(entries, hasMore);
        }
        var keyRange = WebInspector.IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);
        IndexedDBAgent.requestData(databaseId.securityOrigin, databaseName, objectStoreName, indexName, skipCount, pageSize, keyRange ? keyRange : undefined, innerCallback.bind(this));
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.IndexedDBModel.Entry = function (key, primaryKey, value) {
    this.key = key;
    this.primaryKey = primaryKey;
    this.value = value;
}
WebInspector.IndexedDBModel.DatabaseId = function (securityOrigin, name) {
    this.securityOrigin = securityOrigin;
    this.name = name;
}
WebInspector.IndexedDBModel.DatabaseId.prototype = {
    equals: function (databaseId) {
        return this.name === databaseId.name && this.securityOrigin === databaseId.securityOrigin;
    },
}
WebInspector.IndexedDBModel.Database = function (databaseId, version, intVersion) {
    this.databaseId = databaseId;
    this.version = version;
    this.intVersion = intVersion;
    this.objectStores = {};
}
WebInspector.IndexedDBModel.ObjectStore = function (name, keyPath, autoIncrement) {
    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;
    this.indexes = {};
}
WebInspector.IndexedDBModel.ObjectStore.prototype = {
    get keyPathString() {
        return WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
    }
}
WebInspector.IndexedDBModel.Index = function (name, keyPath, unique, multiEntry) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
    this.multiEntry = multiEntry;
}
WebInspector.IndexedDBModel.Index.prototype = {
    get keyPathString() {
        return WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
    }
}
WebInspector.Spectrum = function () {
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("spectrum.css");
    this.element.classList.add("spectrum-container");
    this.element.tabIndex = 0;
    var topElement = this.element.createChild("div", "spectrum-top");
    topElement.createChild("div", "spectrum-fill");
    var topInnerElement = topElement.createChild("div", "spectrum-top-inner fill");
    this._draggerElement = topInnerElement.createChild("div", "spectrum-color");
    this._dragHelperElement = this._draggerElement.createChild("div", "spectrum-sat fill").createChild("div", "spectrum-val fill").createChild("div", "spectrum-dragger");
    this._sliderElement = topInnerElement.createChild("div", "spectrum-hue");
    this.slideHelper = this._sliderElement.createChild("div", "spectrum-slider");
    var rangeContainer = this.element.createChild("div", "spectrum-range-container");
    var alphaLabel = rangeContainer.createChild("label");
    alphaLabel.textContent = WebInspector.UIString("\u03B1:");
    this._alphaElement = rangeContainer.createChild("input", "spectrum-range");
    this._alphaElement.setAttribute("type", "range");
    this._alphaElement.setAttribute("min", "0");
    this._alphaElement.setAttribute("max", "100");
    this._alphaElement.addEventListener("input", alphaDrag.bind(this), false);
    this._alphaElement.addEventListener("change", alphaDrag.bind(this), false);
    var swatchElement = document.createElement("span");
    swatchElement.className = "swatch";
    this._swatchInnerElement = swatchElement.createChild("span", "swatch-inner");
    var displayContainer = this.element.createChild("div");
    displayContainer.appendChild(swatchElement);
    this._displayElement = displayContainer.createChild("span", "source-code spectrum-display-value");
    WebInspector.Spectrum.draggable(this._sliderElement, hueDrag.bind(this));
    WebInspector.Spectrum.draggable(this._draggerElement, colorDrag.bind(this), colorDragStart.bind(this));

    function hueDrag(element, dragX, dragY) {
        this._hsv[0] = (this.slideHeight - dragY) / this.slideHeight;
        this._onchange();
    }
    var initialHelperOffset;

    function colorDragStart() {
        initialHelperOffset = {
            x: this._dragHelperElement.offsetLeft,
            y: this._dragHelperElement.offsetTop
        };
    }

    function colorDrag(element, dragX, dragY, event) {
        if (event.shiftKey) {
            if (Math.abs(dragX - initialHelperOffset.x) >= Math.abs(dragY - initialHelperOffset.y))
                dragY = initialHelperOffset.y;
            else
                dragX = initialHelperOffset.x;
        }
        this._hsv[1] = dragX / this.dragWidth;
        this._hsv[2] = (this.dragHeight - dragY) / this.dragHeight;
        this._onchange();
    }

    function alphaDrag() {
        this._hsv[3] = this._alphaElement.value / 100;
        this._onchange();
    }
};
WebInspector.Spectrum.Events = {
    ColorChanged: "ColorChanged"
};
WebInspector.Spectrum.draggable = function (element, onmove, onstart, onstop) {
    var doc = document;
    var dragging;
    var offset;
    var scrollOffset;
    var maxHeight;
    var maxWidth;

    function consume(e) {
        e.consume(true);
    }

    function move(e) {
        if (dragging) {
            var dragX = Math.max(0, Math.min(e.pageX - offset.left + scrollOffset.left, maxWidth));
            var dragY = Math.max(0, Math.min(e.pageY - offset.top + scrollOffset.top, maxHeight));
            if (onmove)
                onmove(element, dragX, dragY, (e));
        }
    }

    function start(e) {
        var mouseEvent = (e);
        var rightClick = mouseEvent.which ? (mouseEvent.which === 3) : (mouseEvent.button === 2);
        if (!rightClick && !dragging) {
            if (onstart)
                onstart(element, mouseEvent);
            dragging = true;
            maxHeight = element.clientHeight;
            maxWidth = element.clientWidth;
            scrollOffset = element.scrollOffset();
            offset = element.totalOffset();
            doc.addEventListener("selectstart", consume, false);
            doc.addEventListener("dragstart", consume, false);
            doc.addEventListener("mousemove", move, false);
            doc.addEventListener("mouseup", stop, false);
            move(mouseEvent);
            consume(mouseEvent);
        }
    }

    function stop(e) {
        if (dragging) {
            doc.removeEventListener("selectstart", consume, false);
            doc.removeEventListener("dragstart", consume, false);
            doc.removeEventListener("mousemove", move, false);
            doc.removeEventListener("mouseup", stop, false);
            if (onstop)
                onstop(element, (e));
        }
        dragging = false;
    }
    element.addEventListener("mousedown", start, false);
};
WebInspector.Spectrum.prototype = {
    setColor: function (color) {
        this._hsv = color.hsva();
    },
    color: function () {
        return WebInspector.Color.fromHSVA(this._hsv);
    },
    _colorString: function () {
        var cf = WebInspector.Color.Format;
        var format = this._originalFormat;
        var color = this.color();
        var originalFormatString = color.toString(this._originalFormat);
        if (originalFormatString)
            return originalFormatString;
        if (color.hasAlpha()) {
            if (format === cf.HSLA || format === cf.HSL)
                return color.toString(cf.HSLA);
            else
                return color.toString(cf.RGBA);
        }
        if (format === cf.ShortHEX)
            return color.toString(cf.HEX);
        console.assert(format === cf.Nickname);
        return color.toString(cf.RGB);
    },
    set displayText(text) {
        this._displayElement.textContent = text;
    },
    _onchange: function () {
        this._updateUI();
        this.dispatchEventToListeners(WebInspector.Spectrum.Events.ColorChanged, this._colorString());
    },
    _updateHelperLocations: function () {
        var h = this._hsv[0];
        var s = this._hsv[1];
        var v = this._hsv[2];
        var dragX = s * this.dragWidth;
        var dragY = this.dragHeight - (v * this.dragHeight);
        dragX = Math.max(-this._dragHelperElementHeight, Math.min(this.dragWidth - this._dragHelperElementHeight, dragX - this._dragHelperElementHeight));
        dragY = Math.max(-this._dragHelperElementHeight, Math.min(this.dragHeight - this._dragHelperElementHeight, dragY - this._dragHelperElementHeight));
        this._dragHelperElement.positionAt(dragX, dragY);
        var slideY = this.slideHeight - ((h * this.slideHeight) + this.slideHelperHeight);
        this.slideHelper.style.top = slideY + "px";
        this._alphaElement.value = this._hsv[3] * 100;
    },
    _updateUI: function () {
        this._updateHelperLocations();
        this._draggerElement.style.backgroundColor = WebInspector.Color.fromHSVA([this._hsv[0], 1, 1, 1]).toString(WebInspector.Color.Format.RGB);
        this._swatchInnerElement.style.backgroundColor = this.color().toString(WebInspector.Color.Format.RGBA);
        this._alphaElement.value = this._hsv[3] * 100;
    },
    wasShown: function () {
        this.slideHeight = this._sliderElement.offsetHeight;
        this.dragWidth = this._draggerElement.offsetWidth;
        this.dragHeight = this._draggerElement.offsetHeight;
        this._dragHelperElementHeight = this._dragHelperElement.offsetHeight / 2;
        this.slideHelperHeight = this.slideHelper.offsetHeight / 2;
        this._updateUI();
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.SpectrumPopupHelper = function () {
    this._spectrum = new WebInspector.Spectrum();
    this._spectrum.element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this._popover = new WebInspector.Popover();
    this._popover.setCanShrink(false);
    this._popover.element.addEventListener("mousedown", consumeEvent, false);
    this._hideProxy = this.hide.bind(this, true);
}
WebInspector.SpectrumPopupHelper.Events = {
    Hidden: "Hidden"
};
WebInspector.SpectrumPopupHelper.prototype = {
    spectrum: function () {
        return this._spectrum;
    },
    toggle: function (element, color, format) {
        if (this._popover.isShowing())
            this.hide(true);
        else
            this.show(element, color, format);
        return this._popover.isShowing();
    },
    show: function (element, color, format) {
        if (this._popover.isShowing()) {
            if (this._anchorElement === element)
                return false;
            this.hide(true);
        }
        this._anchorElement = element;
        this._spectrum.setColor(color);
        this._spectrum._originalFormat = format !== WebInspector.Color.Format.Original ? format : color.format();
        this.reposition(element);
        document.addEventListener("mousedown", this._hideProxy, false);
        window.addEventListener("blur", this._hideProxy, false);
        return true;
    },
    reposition: function (element) {
        if (!this._previousFocusElement)
            this._previousFocusElement = WebInspector.currentFocusElement();
        this._popover.showView(this._spectrum, element);
        WebInspector.setCurrentFocusElement(this._spectrum.element);
    },
    hide: function (commitEdit) {
        if (!this._popover.isShowing())
            return;
        this._popover.hide();
        document.removeEventListener("mousedown", this._hideProxy, false);
        window.removeEventListener("blur", this._hideProxy, false);
        this.dispatchEventToListeners(WebInspector.SpectrumPopupHelper.Events.Hidden, !!commitEdit);
        WebInspector.setCurrentFocusElement(this._previousFocusElement);
        delete this._previousFocusElement;
        delete this._anchorElement;
    },
    _onKeyDown: function (event) {
        if (event.keyIdentifier === "Enter") {
            this.hide(true);
            event.consume(true);
            return;
        }
        if (event.keyIdentifier === "U+001B") {
            this.hide(false);
            event.consume(true);
        }
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.ColorSwatch = function (readOnly) {
    this.element = document.createElement("span");
    this._swatchInnerElement = this.element.createChild("span", "swatch-inner");
    var shiftClickMessage = WebInspector.UIString("Shift-click to change color format.");
    this.element.title = readOnly ? shiftClickMessage : String.sprintf("%s\n%s", WebInspector.UIString("Click to open a colorpicker."), shiftClickMessage);
    this.element.className = "swatch";
    this.element.addEventListener("mousedown", consumeEvent, false);
    this.element.addEventListener("dblclick", consumeEvent, false);
}
WebInspector.ColorSwatch.prototype = {
    setColorString: function (colorString) {
        this._swatchInnerElement.style.backgroundColor = colorString;
    }
}
WebInspector.SidebarPane = function (title) {
    WebInspector.View.call(this);
    this.setMinimumSize(25, 0);
    this.element.className = "sidebar-pane";
    this.titleElement = document.createElement("div");
    this.titleElement.className = "sidebar-pane-toolbar";
    this.bodyElement = this.element.createChild("div", "body");
    this._title = title;
    this._expandCallback = null;
}
WebInspector.SidebarPane.EventTypes = {
    wasShown: "wasShown"
}
WebInspector.SidebarPane.prototype = {
    title: function () {
        return this._title;
    },
    prepareContent: function (callback) {
        if (callback)
            callback();
    },
    expand: function () {
        this.prepareContent(this.onContentReady.bind(this));
    },
    onContentReady: function () {
        if (this._expandCallback)
            this._expandCallback();
        else
            this._expandPending = true;
    },
    setExpandCallback: function (callback) {
        this._expandCallback = callback;
        if (this._expandPending) {
            delete this._expandPending;
            this._expandCallback();
        }
    },
    wasShown: function () {
        WebInspector.View.prototype.wasShown.call(this);
        this.dispatchEventToListeners(WebInspector.SidebarPane.EventTypes.wasShown);
    },
    __proto__: WebInspector.View.prototype
}
WebInspector.SidebarPaneTitle = function (container, pane) {
    this._pane = pane;
    this.element = container.createChild("div", "sidebar-pane-title");
    this.element.textContent = pane.title();
    this.element.tabIndex = 0;
    this.element.addEventListener("click", this._toggleExpanded.bind(this), false);
    this.element.addEventListener("keydown", this._onTitleKeyDown.bind(this), false);
    this.element.appendChild(this._pane.titleElement);
    this._pane.setExpandCallback(this._expand.bind(this));
}
WebInspector.SidebarPaneTitle.prototype = {
    _expand: function () {
        this.element.classList.add("expanded");
        this._pane.show(this.element.parentNode, this.element.nextSibling);
    },
    _collapse: function () {
        this.element.classList.remove("expanded");
        if (this._pane.element.parentNode == this.element.parentNode)
            this._pane.detach();
    },
    _toggleExpanded: function () {
        if (this.element.classList.contains("expanded"))
            this._collapse();
        else
            this._pane.expand();
    },
    _onTitleKeyDown: function (event) {
        if (isEnterKey(event) || event.keyCode === WebInspector.KeyboardShortcut.Keys.Space.code)
            this._toggleExpanded();
    }
}
WebInspector.SidebarPaneStack = function () {
    WebInspector.View.call(this);
    this.setMinimumSize(25, 0);
    this.element.className = "sidebar-pane-stack";
    this.registerRequiredCSS("sidebarPane.css");
}
WebInspector.SidebarPaneStack.prototype = {
    addPane: function (pane) {
        new WebInspector.SidebarPaneTitle(this.element, pane);
    },
    __proto__: WebInspector.View.prototype
}
WebInspector.SidebarTabbedPane = function () {
    WebInspector.TabbedPane.call(this);
    this.setRetainTabOrder(true);
    this.element.classList.add("sidebar-tabbed-pane");
    this.registerRequiredCSS("sidebarPane.css");
}
WebInspector.SidebarTabbedPane.prototype = {
    addPane: function (pane) {
        var title = pane.title();
        this.appendTab(title, title, pane);
        pane.element.appendChild(pane.titleElement);
        pane.setExpandCallback(this.selectTab.bind(this, title));
    },
    __proto__: WebInspector.TabbedPane.prototype
}
WebInspector.DOMPresentationUtils = {}
WebInspector.DOMPresentationUtils.decorateNodeLabel = function (node, parentElement) {
    var title = node.nodeNameInCorrectCase();
    var nameElement = document.createElement("span");
    nameElement.textContent = title;
    parentElement.appendChild(nameElement);
    var idAttribute = node.getAttribute("id");
    if (idAttribute) {
        var idElement = document.createElement("span");
        parentElement.appendChild(idElement);
        var part = "#" + idAttribute;
        title += part;
        idElement.appendChild(document.createTextNode(part));
        nameElement.className = "extra";
    }
    var classAttribute = node.getAttribute("class");
    if (classAttribute) {
        var classes = classAttribute.split(/\s+/);
        var foundClasses = {};
        if (classes.length) {
            var classesElement = document.createElement("span");
            classesElement.className = "extra";
            parentElement.appendChild(classesElement);
            for (var i = 0; i < classes.length; ++i) {
                var className = classes[i];
                if (className && !(className in foundClasses)) {
                    var part = "." + className;
                    title += part;
                    classesElement.appendChild(document.createTextNode(part));
                    foundClasses[className] = true;
                }
            }
        }
    }
    parentElement.title = title;
}
WebInspector.DOMPresentationUtils.createSpansForNodeTitle = function (container, nodeTitle) {
    var match = nodeTitle.match(/([^#.]+)(#[^.]+)?(\..*)?/);
    container.createChild("span", "webkit-html-tag-name").textContent = match[1];
    if (match[2])
        container.createChild("span", "webkit-html-attribute-value").textContent = match[2];
    if (match[3])
        container.createChild("span", "webkit-html-attribute-name").textContent = match[3];
}
WebInspector.DOMPresentationUtils.linkifyNodeReference = function (node) {
    var link = document.createElement("span");
    link.className = "node-link";
    WebInspector.DOMPresentationUtils.decorateNodeLabel(node, link);
    link.addEventListener("click", WebInspector.domModel.inspectElement.bind(WebInspector.domModel, node.id), false);
    link.addEventListener("mouseover", WebInspector.domModel.highlightDOMNode.bind(WebInspector.domModel, node.id, "", undefined), false);
    link.addEventListener("mouseout", WebInspector.domModel.hideDOMNodeHighlight.bind(WebInspector.domModel), false);
    return link;
}
WebInspector.DOMPresentationUtils.linkifyNodeById = function (nodeId) {
    var node = WebInspector.domModel.nodeForId(nodeId);
    if (!node)
        return document.createTextNode(WebInspector.UIString("<node>"));
    return WebInspector.DOMPresentationUtils.linkifyNodeReference(node);
}
WebInspector.DOMPresentationUtils.buildImagePreviewContents = function (imageURL, showDimensions, userCallback, precomputedDimensions) {
    var resource = WebInspector.resourceTreeModel.resourceForURL(imageURL);
    if (!resource) {
        userCallback();
        return;
    }
    var imageElement = document.createElement("img");
    imageElement.addEventListener("load", buildContent, false);
    imageElement.addEventListener("error", errorCallback, false);
    resource.populateImageSource(imageElement);

    function errorCallback() {
        userCallback();
    }

    function buildContent() {
        var container = document.createElement("table");
        container.className = "image-preview-container";
        var naturalWidth = precomputedDimensions ? precomputedDimensions.naturalWidth : imageElement.naturalWidth;
        var naturalHeight = precomputedDimensions ? precomputedDimensions.naturalHeight : imageElement.naturalHeight;
        var offsetWidth = precomputedDimensions ? precomputedDimensions.offsetWidth : naturalWidth;
        var offsetHeight = precomputedDimensions ? precomputedDimensions.offsetHeight : naturalHeight;
        var description;
        if (showDimensions) {
            if (offsetHeight === naturalHeight && offsetWidth === naturalWidth)
                description = WebInspector.UIString("%d \xd7 %d pixels", offsetWidth, offsetHeight);
            else
                description = WebInspector.UIString("%d \xd7 %d pixels (Natural: %d \xd7 %d pixels)", offsetWidth, offsetHeight, naturalWidth, naturalHeight);
        }
        container.createChild("tr").createChild("td", "image-container").appendChild(imageElement);
        if (description)
            container.createChild("tr").createChild("td").createChild("span", "description").textContent = description;
        userCallback(container);
    }
}
WebInspector.DOMPresentationUtils.fullQualifiedSelector = function (node, justSelector) {
    if (node.nodeType() !== Node.ELEMENT_NODE)
        return node.localName() || node.nodeName().toLowerCase();
    return WebInspector.DOMPresentationUtils.cssPath(node, justSelector);
}
WebInspector.DOMPresentationUtils.simpleSelector = function (node) {
    var lowerCaseName = node.localName() || node.nodeName().toLowerCase();
    if (node.nodeType() !== Node.ELEMENT_NODE)
        return lowerCaseName;
    if (lowerCaseName === "input" && node.getAttribute("type") && !node.getAttribute("id") && !node.getAttribute("class"))
        return lowerCaseName + "[type=\"" + node.getAttribute("type") + "\"]";
    if (node.getAttribute("id"))
        return lowerCaseName + "#" + node.getAttribute("id");
    if (node.getAttribute("class"))
        return lowerCaseName + "." + node.getAttribute("class").trim().replace(/\s+/g, ".");
    return lowerCaseName;
}
WebInspector.DOMPresentationUtils.cssPath = function (node, optimized) {
    if (node.nodeType() !== Node.ELEMENT_NODE)
        return "";
    var steps = [];
    var contextNode = node;
    while (contextNode) {
        var step = WebInspector.DOMPresentationUtils._cssPathStep(contextNode, !!optimized, contextNode === node);
        if (!step)
            break;
        steps.push(step);
        if (step.optimized)
            break;
        contextNode = contextNode.parentNode;
    }
    steps.reverse();
    return steps.join(" > ");
}
WebInspector.DOMPresentationUtils._cssPathStep = function (node, optimized, isTargetNode) {
    if (node.nodeType() !== Node.ELEMENT_NODE)
        return null;
    var id = node.getAttribute("id");
    if (optimized) {
        if (id)
            return new WebInspector.DOMNodePathStep(idSelector(id), true);
        var nodeNameLower = node.nodeName().toLowerCase();
        if (nodeNameLower === "body" || nodeNameLower === "head" || nodeNameLower === "html")
            return new WebInspector.DOMNodePathStep(node.nodeNameInCorrectCase(), true);
    }
    var nodeName = node.nodeNameInCorrectCase();
    if (id)
        return new WebInspector.DOMNodePathStep(nodeName + idSelector(id), true);
    var parent = node.parentNode;
    if (!parent || parent.nodeType() === Node.DOCUMENT_NODE)
        return new WebInspector.DOMNodePathStep(nodeName, true);

    function prefixedElementClassNames(node) {
        var classAttribute = node.getAttribute("class");
        if (!classAttribute)
            return [];
        return classAttribute.split(/\s+/g).filter(Boolean).map(function (name) {
            return "$" + name;
        });
    }

    function idSelector(id) {
        return "#" + escapeIdentifierIfNeeded(id);
    }

    function escapeIdentifierIfNeeded(ident) {
        if (isCSSIdentifier(ident))
            return ident;
        var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident);
        var lastIndex = ident.length - 1;
        return ident.replace(/./g, function (c, i) {
            return ((shouldEscapeFirst && i === 0) || !isCSSIdentChar(c)) ? escapeAsciiChar(c, i === lastIndex) : c;
        });
    }

    function escapeAsciiChar(c, isLast) {
        return "\\" + toHexByte(c) + (isLast ? "" : " ");
    }

    function toHexByte(c) {
        var hexByte = c.charCodeAt(0).toString(16);
        if (hexByte.length === 1)
            hexByte = "0" + hexByte;
        return hexByte;
    }

    function isCSSIdentChar(c) {
        if (/[a-zA-Z0-9_-]/.test(c))
            return true;
        return c.charCodeAt(0) >= 0xA0;
    }

    function isCSSIdentifier(value) {
        return /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value);
    }
    var prefixedOwnClassNamesArray = prefixedElementClassNames(node);
    var needsClassNames = false;
    var needsNthChild = false;
    var ownIndex = -1;
    var elementIndex = -1;
    var siblings = parent.children();
    for (var i = 0;
        (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
        var sibling = siblings[i];
        if (sibling.nodeType() !== Node.ELEMENT_NODE)
            continue;
        elementIndex += 1;
        if (sibling === node) {
            ownIndex = elementIndex;
            continue;
        }
        if (needsNthChild)
            continue;
        if (sibling.nodeNameInCorrectCase() !== nodeName)
            continue;
        needsClassNames = true;
        var ownClassNames = prefixedOwnClassNamesArray.keySet();
        var ownClassNameCount = 0;
        for (var name in ownClassNames)
        ++ownClassNameCount;
        if (ownClassNameCount === 0) {
            needsNthChild = true;
            continue;
        }
        var siblingClassNamesArray = prefixedElementClassNames(sibling);
        for (var j = 0; j < siblingClassNamesArray.length; ++j) {
            var siblingClass = siblingClassNamesArray[j];
            if (!ownClassNames.hasOwnProperty(siblingClass))
                continue;
            delete ownClassNames[siblingClass];
            if (!--ownClassNameCount) {
                needsNthChild = true;
                break;
            }
        }
    }
    var result = nodeName;
    if (isTargetNode && nodeName.toLowerCase() === "input" && node.getAttribute("type") && !node.getAttribute("id") && !node.getAttribute("class"))
        result += "[type=\"" + node.getAttribute("type") + "\"]";
    if (needsNthChild) {
        result += ":nth-child(" + (ownIndex + 1) + ")";
    } else if (needsClassNames) {
        for (var prefixedName in prefixedOwnClassNamesArray.keySet())
            result += "." + escapeIdentifierIfNeeded(prefixedName.substr(1));
    }
    return new WebInspector.DOMNodePathStep(result, false);
}
WebInspector.DOMPresentationUtils.xPath = function (node, optimized) {
    if (node.nodeType() === Node.DOCUMENT_NODE)
        return "/";
    var steps = [];
    var contextNode = node;
    while (contextNode) {
        var step = WebInspector.DOMPresentationUtils._xPathValue(contextNode, optimized);
        if (!step)
            break;
        steps.push(step);
        if (step.optimized)
            break;
        contextNode = contextNode.parentNode;
    }
    steps.reverse();
    return (steps.length && steps[0].optimized ? "" : "/") + steps.join("/");
}
WebInspector.DOMPresentationUtils._xPathValue = function (node, optimized) {
    var ownValue;
    var ownIndex = WebInspector.DOMPresentationUtils._xPathIndex(node);
    if (ownIndex === -1)
        return null;
    switch (node.nodeType()) {
    case Node.ELEMENT_NODE:
        if (optimized && node.getAttribute("id"))
            return new WebInspector.DOMNodePathStep("//*[@id=\"" + node.getAttribute("id") + "\"]", true);
        ownValue = node.localName();
        break;
    case Node.ATTRIBUTE_NODE:
        ownValue = "@" + node.nodeName();
        break;
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
        ownValue = "text()";
        break;
    case Node.PROCESSING_INSTRUCTION_NODE:
        ownValue = "processing-instruction()";
        break;
    case Node.COMMENT_NODE:
        ownValue = "comment()";
        break;
    case Node.DOCUMENT_NODE:
        ownValue = "";
        break;
    default:
        ownValue = "";
        break;
    }
    if (ownIndex > 0)
        ownValue += "[" + ownIndex + "]";
    return new WebInspector.DOMNodePathStep(ownValue, node.nodeType() === Node.DOCUMENT_NODE);
}, WebInspector.DOMPresentationUtils._xPathIndex = function (node) {
    function areNodesSimilar(left, right) {
        if (left === right)
            return true;
        if (left.nodeType() === Node.ELEMENT_NODE && right.nodeType() === Node.ELEMENT_NODE)
            return left.localName() === right.localName();
        if (left.nodeType() === right.nodeType())
            return true;
        var leftType = left.nodeType() === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType();
        var rightType = right.nodeType() === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType();
        return leftType === rightType;
    }
    var siblings = node.parentNode ? node.parentNode.children() : null;
    if (!siblings)
        return 0;
    var hasSameNamedElements;
    for (var i = 0; i < siblings.length; ++i) {
        if (areNodesSimilar(node, siblings[i]) && siblings[i] !== node) {
            hasSameNamedElements = true;
            break;
        }
    }
    if (!hasSameNamedElements)
        return 0;
    var ownIndex = 1;
    for (var i = 0; i < siblings.length; ++i) {
        if (areNodesSimilar(node, siblings[i])) {
            if (siblings[i] === node)
                return ownIndex;
            ++ownIndex;
        }
    }
    return -1;
}
WebInspector.DOMNodePathStep = function (value, optimized) {
    this.value = value;
    this.optimized = optimized || false;
}
WebInspector.DOMNodePathStep.prototype = {
    toString: function () {
        return this.value;
    }
}
WebInspector.SidebarSectionTreeElement = function (title, representedObject, hasChildren) {
    TreeElement.call(this, title.escapeHTML(), representedObject || {}, hasChildren);
    this.expand();
}
WebInspector.SidebarSectionTreeElement.prototype = {
    selectable: false,
    collapse: function () {},
    get smallChildren() {
        return this._smallChildren;
    },
    set smallChildren(x) {
        if (this._smallChildren === x)
            return;
        this._smallChildren = x;
        this._childrenListNode.classList.toggle("small", this._smallChildren);
    },
    onattach: function () {
        this._listItemNode.classList.add("sidebar-tree-section");
    },
    onreveal: function () {
        if (this.listItemElement)
            this.listItemElement.scrollIntoViewIfNeeded(false);
    },
    __proto__: TreeElement.prototype
}
WebInspector.SidebarTreeElement = function (className, title, subtitle, representedObject, hasChildren) {
    TreeElement.call(this, "", representedObject, hasChildren);
    if (hasChildren) {
        this.disclosureButton = document.createElement("button");
        this.disclosureButton.className = "disclosure-button";
    }
    this.iconElement = document.createElementWithClass("div", "icon");
    this.statusElement = document.createElementWithClass("div", "status");
    this.titlesElement = document.createElementWithClass("div", "titles");
    this.titleContainer = this.titlesElement.createChild("span", "title-container");
    this.titleElement = this.titleContainer.createChild("span", "title");
    this.subtitleElement = this.titlesElement.createChild("span", "subtitle");
    this.className = className;
    this.mainTitle = title;
    this.subtitle = subtitle;
}
WebInspector.SidebarTreeElement.prototype = {
    get small() {
        return this._small;
    }, set small(x) {
        this._small = x;
        if (this._listItemNode)
            this._listItemNode.classList.toggle("small", this._small);
    }, get mainTitle() {
        return this._mainTitle;
    }, set mainTitle(x) {
        this._mainTitle = x;
        this.refreshTitles();
    }, get subtitle() {
        return this._subtitle;
    }, set subtitle(x) {
        this._subtitle = x;
        this.refreshTitles();
    }, set wait(x) {
        this._listItemNode.classList.toggle("wait", x);
    }, refreshTitles: function () {
        var mainTitle = this.mainTitle;
        if (this.titleElement.textContent !== mainTitle)
            this.titleElement.textContent = mainTitle;
        var subtitle = this.subtitle;
        if (subtitle) {
            if (this.subtitleElement.textContent !== subtitle)
                this.subtitleElement.textContent = subtitle;
            this.titlesElement.classList.remove("no-subtitle");
        } else {
            this.subtitleElement.textContent = "";
            this.titlesElement.classList.add("no-subtitle");
        }
    }, isEventWithinDisclosureTriangle: function (event) {
        return event.target === this.disclosureButton;
    }, onattach: function () {
        this._listItemNode.classList.add("sidebar-tree-item");
        if (this.className)
            this._listItemNode.classList.add(this.className);
        if (this.small)
            this._listItemNode.classList.add("small");
        if (this.hasChildren && this.disclosureButton)
            this._listItemNode.appendChild(this.disclosureButton);
        this._listItemNode.appendChild(this.iconElement);
        this._listItemNode.appendChild(this.statusElement);
        this._listItemNode.appendChild(this.titlesElement);
    }, onreveal: function () {
        if (this._listItemNode)
            this._listItemNode.scrollIntoViewIfNeeded(false);
    }, __proto__: TreeElement.prototype
}
WebInspector.Section = function (title, subtitle) {
    this.element = document.createElement("div");
    this.element.className = "section";
    this.element._section = this;
    this.headerElement = document.createElement("div");
    this.headerElement.className = "header";
    this.titleElement = document.createElement("div");
    this.titleElement.className = "title";
    this.subtitleElement = document.createElement("div");
    this.subtitleElement.className = "subtitle";
    this.headerElement.appendChild(this.subtitleElement);
    this.headerElement.appendChild(this.titleElement);
    this.headerElement.addEventListener("click", this.handleClick.bind(this), false);
    this.element.appendChild(this.headerElement);
    this.title = title;
    this.subtitle = subtitle;
    this._expanded = false;
}
WebInspector.Section.prototype = {
    get title() {
        return this._title;
    }, set title(x) {
        if (this._title === x)
            return;
        this._title = x;
        if (x instanceof Node) {
            this.titleElement.removeChildren();
            this.titleElement.appendChild(x);
        } else
            this.titleElement.textContent = x;
    }, get subtitle() {
        return this._subtitle;
    }, set subtitle(x) {
        if (this._subtitle === x)
            return;
        this._subtitle = x;
        this.subtitleElement.textContent = x;
    }, get subtitleAsTextForTest() {
        var result = this.subtitleElement.textContent;
        var child = this.subtitleElement.querySelector("[data-uncopyable]");
        if (child) {
            var linkData = child.getAttribute("data-uncopyable");
            if (linkData)
                result += linkData;
        }
        return result;
    }, get expanded() {
        return this._expanded;
    }, set expanded(x) {
        if (x)
            this.expand();
        else
            this.collapse();
    }, get populated() {
        return this._populated;
    }, set populated(x) {
        this._populated = x;
        if (!x && this._expanded) {
            this.onpopulate();
            this._populated = true;
        }
    }, onpopulate: function () {}, get firstSibling() {
        var parent = this.element.parentElement;
        if (!parent)
            return null;
        var childElement = parent.firstChild;
        while (childElement) {
            if (childElement._section)
                return childElement._section;
            childElement = childElement.nextSibling;
        }
        return null;
    }, get lastSibling() {
        var parent = this.element.parentElement;
        if (!parent)
            return null;
        var childElement = parent.lastChild;
        while (childElement) {
            if (childElement._section)
                return childElement._section;
            childElement = childElement.previousSibling;
        }
        return null;
    }, get nextSibling() {
        var curElement = this.element;
        do {
            curElement = curElement.nextSibling;
        } while (curElement && !curElement._section);
        return curElement ? curElement._section : null;
    }, get previousSibling() {
        var curElement = this.element;
        do {
            curElement = curElement.previousSibling;
        } while (curElement && !curElement._section);
        return curElement ? curElement._section : null;
    }, expand: function () {
        if (this._expanded)
            return;
        this._expanded = true;
        this.element.classList.add("expanded");
        if (!this._populated) {
            this.onpopulate();
            this._populated = true;
        }
    }, collapse: function () {
        if (!this._expanded)
            return;
        this._expanded = false;
        this.element.classList.remove("expanded");
    }, toggleExpanded: function () {
        this.expanded = !this.expanded;
    }, handleClick: function (event) {
        this.toggleExpanded();
        event.consume();
    }
}
WebInspector.PropertiesSection = function (title, subtitle) {
    WebInspector.Section.call(this, title, subtitle);
    this.headerElement.classList.add("monospace");
    this.propertiesElement = document.createElement("ol");
    this.propertiesElement.className = "properties properties-tree monospace";
    this.propertiesTreeOutline = new TreeOutline(this.propertiesElement, true);
    this.propertiesTreeOutline.setFocusable(false);
    this.propertiesTreeOutline.section = this;
    this.element.appendChild(this.propertiesElement);
}
WebInspector.PropertiesSection.prototype = {
    __proto__: WebInspector.Section.prototype
}
WebInspector.RemoteObject = function () {}
WebInspector.RemoteObject.prototype = {
    get type() {
        throw "Not implemented";
    }, get subtype() {
        throw "Not implemented";
    }, get description() {
        throw "Not implemented";
    }, get hasChildren() {
        throw "Not implemented";
    }, arrayLength: function () {
        throw "Not implemented";
    }, getOwnProperties: function (callback) {
        throw "Not implemented";
    }, getAllProperties: function (accessorPropertiesOnly, callback) {
        throw "Not implemented";
    }, callFunction: function (functionDeclaration, args, callback) {
        throw "Not implemented";
    }, callFunctionJSON: function (functionDeclaration, args, callback) {
        throw "Not implemented";
    }, target: function () {
        throw "Not implemented";
    }
}
WebInspector.RemoteObject.fromPrimitiveValue = function (value, target) {
    if (!target)
        target = WebInspector.targetManager.mainTarget();
    return new WebInspector.RemoteObjectImpl(target, undefined, typeof value, undefined, value);
}
WebInspector.RemoteObject.fromLocalObject = function (value) {
    return new WebInspector.LocalJSONObject(value);
}
WebInspector.RemoteObject.resolveNode = function (node, objectGroup, callback) {
    function mycallback(error, object) {
        if (!callback)
            return;
        if (error || !object)
            callback(null);
        else
            callback(WebInspector.RemoteObject.fromPayload(object));
    }
    DOMAgent.resolveNode(node.id, objectGroup, mycallback);
}
WebInspector.RemoteObject.fromPayload = function (payload, target) {
    if (!target)
        target = WebInspector.targetManager.mainTarget();
    console.assert(typeof payload === "object", "Remote object payload should only be an object");
    return new WebInspector.RemoteObjectImpl(target, payload.objectId, payload.type, payload.subtype, payload.value, payload.description, payload.preview);
}
WebInspector.RemoteObject.type = function (remoteObject) {
    if (remoteObject === null)
        return "null";
    var type = typeof remoteObject;
    if (type !== "object" && type !== "function")
        return type;
    return remoteObject.type;
}
WebInspector.RemoteObject.toCallArgument = function (remoteObject) {
    var type = (remoteObject.type);
    var value = remoteObject.value;
    if (type === "number") {
        switch (remoteObject.description) {
        case "NaN":
        case "Infinity":
        case "-Infinity":
        case "-0":
            value = remoteObject.description;
            break;
        }
    }
    return {
        value: value,
        objectId: remoteObject.objectId,
        type: type
    };
}
WebInspector.RemoteObjectImpl = function (target, objectId, type, subtype, value, description, preview) {
    WebInspector.RemoteObject.call(this);
    this._target = target;
    this._runtimeAgent = target.runtimeAgent();
    this._domModel = target.domModel;
    this._type = type;
    this._subtype = subtype;
    if (objectId) {
        this._objectId = objectId;
        this._description = description;
        this._hasChildren = true;
        this._preview = preview;
    } else {
        console.assert(type !== "object" || value === null);
        this._description = description || (value + "");
        this._hasChildren = false;
        if (type === "number" && typeof value !== "number")
            this.value = Number(value);
        else
            this.value = value;
    }
}
WebInspector.RemoteObjectImpl.prototype = {
    get objectId() {
        return this._objectId;
    }, get type() {
        return this._type;
    }, get subtype() {
        return this._subtype;
    }, get description() {
        return this._description;
    }, get hasChildren() {
        return this._hasChildren;
    }, get preview() {
        return this._preview;
    }, getOwnProperties: function (callback) {
        this.doGetProperties(true, false, callback);
    }, getAllProperties: function (accessorPropertiesOnly, callback) {
        this.doGetProperties(false, accessorPropertiesOnly, callback);
    }, getProperty: function (propertyPath, callback) {
        function remoteFunction(arrayStr) {
            var result = this;
            var properties = JSON.parse(arrayStr);
            for (var i = 0, n = properties.length; i < n; ++i)
                result = result[properties[i]];
            return result;
        }
        var args = [{
            value: JSON.stringify(propertyPath)
        }];
        this.callFunction(remoteFunction, args, callback);
    }, doGetProperties: function (ownProperties, accessorPropertiesOnly, callback) {
        if (!this._objectId) {
            callback(null, null);
            return;
        }

        function remoteObjectBinder(error, properties, internalProperties) {
            if (error) {
                callback(null, null);
                return;
            }
            var result = [];
            for (var i = 0; properties && i < properties.length; ++i) {
                var property = properties[i];
                result.push(new WebInspector.RemoteObjectProperty(property.name, null, property));
            }
            var internalPropertiesResult = null;
            if (internalProperties) {
                internalPropertiesResult = [];
                for (var i = 0; i < internalProperties.length; i++) {
                    var property = internalProperties[i];
                    if (!property.value)
                        continue;
                    internalPropertiesResult.push(new WebInspector.RemoteObjectProperty(property.name, WebInspector.RemoteObject.fromPayload(property.value)));
                }
            }
            callback(result, internalPropertiesResult);
        }
        this._runtimeAgent.getProperties(this._objectId, ownProperties, accessorPropertiesOnly, remoteObjectBinder);
    }, setPropertyValue: function (name, value, callback) {
        if (!this._objectId) {
            callback("Can't set a property of non-object.");
            return;
        }
        this._runtimeAgent.invoke_evaluate({
            expression: value,
            doNotPauseOnExceptionsAndMuteConsole: true
        }, evaluatedCallback.bind(this));

        function evaluatedCallback(error, result, wasThrown) {
            if (error || wasThrown) {
                callback(error || result.description);
                return;
            }
            this.doSetObjectPropertyValue(result, name, callback);
            if (result.objectId)
                this._runtimeAgent.releaseObject(result.objectId);
        }
    }, doSetObjectPropertyValue: function (result, name, callback) {
        var setPropertyValueFunction = "function(a, b) { this[a] = b; }";
        var argv = [{
                value: name
            },
            WebInspector.RemoteObject.toCallArgument(result)
        ]
        this._runtimeAgent.callFunctionOn(this._objectId, setPropertyValueFunction, argv, true, undefined, undefined, propertySetCallback);

        function propertySetCallback(error, result, wasThrown) {
            if (error || wasThrown) {
                callback(error || result.description);
                return;
            }
            callback();
        }
    }, pushNodeToFrontend: function (callback) {
        if (this._objectId)
            this._domModel.pushNodeToFrontend(this._objectId, callback);
        else
            callback(0);
    }, highlightAsDOMNode: function () {
        this._domModel.highlightDOMNode(undefined, undefined, this._objectId);
    }, hideDOMNodeHighlight: function () {
        this._domModel.hideDOMNodeHighlight();
    }, callFunction: function (functionDeclaration, args, callback) {
        function mycallback(error, result, wasThrown) {
            if (!callback)
                return;
            if (error)
                callback(null, false);
            else
                callback(WebInspector.RemoteObject.fromPayload(result), wasThrown);
        }
        this._runtimeAgent.callFunctionOn(this._objectId, functionDeclaration.toString(), args, true, undefined, undefined, mycallback);
    }, callFunctionJSON: function (functionDeclaration, args, callback) {
        function mycallback(error, result, wasThrown) {
            callback((error || wasThrown) ? null : result.value);
        }
        this._runtimeAgent.callFunctionOn(this._objectId, functionDeclaration.toString(), args, true, true, false, mycallback);
    }, release: function () {
        if (!this._objectId)
            return;
        this._runtimeAgent.releaseObject(this._objectId);
    }, arrayLength: function () {
        if (this.subtype !== "array")
            return 0;
        var matches = this._description.match(/\[([0-9]+)\]/);
        if (!matches)
            return 0;
        return parseInt(matches[1], 10);
    }, target: function () {
        return this._target;
    }, __proto__: WebInspector.RemoteObject.prototype
};
WebInspector.RemoteObject.loadFromObject = function (object, flattenProtoChain, callback) {
    if (flattenProtoChain)
        object.getAllProperties(false, callback);
    else
        WebInspector.RemoteObject.loadFromObjectPerProto(object, callback);
};
WebInspector.RemoteObject.loadFromObjectPerProto = function (object, callback) {
    var savedOwnProperties;
    var savedAccessorProperties;
    var savedInternalProperties;
    var resultCounter = 2;

    function processCallback() {
        if (--resultCounter)
            return;
        if (savedOwnProperties && savedAccessorProperties) {
            var combinedList = savedAccessorProperties.slice(0);
            for (var i = 0; i < savedOwnProperties.length; i++) {
                var property = savedOwnProperties[i];
                if (!property.isAccessorProperty())
                    combinedList.push(property);
            }
            return callback(combinedList, savedInternalProperties ? savedInternalProperties : null);
        } else {
            callback(null, null);
        }
    }

    function allAccessorPropertiesCallback(properties, internalProperties) {
        savedAccessorProperties = properties;
        processCallback();
    }

    function ownPropertiesCallback(properties, internalProperties) {
        savedOwnProperties = properties;
        savedInternalProperties = internalProperties;
        processCallback();
    }
    object.getAllProperties(true, allAccessorPropertiesCallback);
    object.getOwnProperties(ownPropertiesCallback);
};
WebInspector.ScopeRemoteObject = function (target, objectId, scopeRef, type, subtype, value, description, preview) {
    WebInspector.RemoteObjectImpl.call(this, target, objectId, type, subtype, value, description, preview);
    this._scopeRef = scopeRef;
    this._savedScopeProperties = undefined;
    this._debuggerAgent = target.debuggerAgent();
};
WebInspector.ScopeRemoteObject.fromPayload = function (payload, scopeRef, target) {
    if (!target)
        target = WebInspector.targetManager.mainTarget();
    if (scopeRef)
        return new WebInspector.ScopeRemoteObject(target, payload.objectId, scopeRef, payload.type, payload.subtype, payload.value, payload.description, payload.preview);
    else
        return new WebInspector.RemoteObjectImpl(target, payload.objectId, payload.type, payload.subtype, payload.value, payload.description, payload.preview);
}
WebInspector.ScopeRemoteObject.prototype = {
    doGetProperties: function (ownProperties, accessorPropertiesOnly, callback) {
        if (accessorPropertiesOnly) {
            callback([], []);
            return;
        }
        if (this._savedScopeProperties) {
            callback(this._savedScopeProperties.slice(), []);
            return;
        }

        function wrappedCallback(properties, internalProperties) {
            if (this._scopeRef && properties instanceof Array)
                this._savedScopeProperties = properties.slice();
            callback(properties, internalProperties);
        }
        WebInspector.RemoteObjectImpl.prototype.doGetProperties.call(this, ownProperties, accessorPropertiesOnly, wrappedCallback.bind(this));
    },
    doSetObjectPropertyValue: function (result, name, callback) {
        this._debuggerAgent.setVariableValue(this._scopeRef.number, name, WebInspector.RemoteObject.toCallArgument(result), this._scopeRef.callFrameId, this._scopeRef.functionId, setVariableValueCallback.bind(this));

        function setVariableValueCallback(error) {
            if (error) {
                callback(error);
                return;
            }
            if (this._savedScopeProperties) {
                for (var i = 0; i < this._savedScopeProperties.length; i++) {
                    if (this._savedScopeProperties[i].name === name)
                        this._savedScopeProperties[i].value = WebInspector.RemoteObject.fromPayload(result);
                }
            }
            callback();
        }
    },
    __proto__: WebInspector.RemoteObjectImpl.prototype
};
WebInspector.ScopeRef = function (number, callFrameId, functionId) {
    this.number = number;
    this.callFrameId = callFrameId;
    this.functionId = functionId;
}
WebInspector.RemoteObjectProperty = function (name, value, descriptor) {
    this.name = name;
    this.enumerable = descriptor ? !!descriptor.enumerable : true;
    this.writable = descriptor ? !!descriptor.writable : true;
    if (value === null && descriptor) {
        if (descriptor.value)
            this.value = WebInspector.RemoteObject.fromPayload(descriptor.value)
        if (descriptor.get && descriptor.get.type !== "undefined")
            this.getter = WebInspector.RemoteObject.fromPayload(descriptor.get);
        if (descriptor.set && descriptor.set.type !== "undefined")
            this.setter = WebInspector.RemoteObject.fromPayload(descriptor.set);
    } else {
        this.value = value;
    }
    if (descriptor) {
        this.isOwn = descriptor.isOwn;
        this.wasThrown = !!descriptor.wasThrown;
    }
}
WebInspector.RemoteObjectProperty.prototype = {
    isAccessorProperty: function () {
        return !!(this.getter || this.setter);
    }
};
WebInspector.RemoteObjectProperty.fromPrimitiveValue = function (name, value) {
    return new WebInspector.RemoteObjectProperty(name, WebInspector.RemoteObject.fromPrimitiveValue(value));
}
WebInspector.RemoteObjectProperty.fromScopeValue = function (name, value) {
    var result = new WebInspector.RemoteObjectProperty(name, value);
    result.writable = false;
    return result;
}
WebInspector.LocalJSONObject = function (value) {
    WebInspector.RemoteObject.call(this);
    this._value = value;
}
WebInspector.LocalJSONObject.prototype = {
    get description() {
        if (this._cachedDescription)
            return this._cachedDescription;

        function formatArrayItem(property) {
            return property.value.description;
        }

        function formatObjectItem(property) {
            return property.name + ":" + property.value.description;
        }
        if (this.type === "object") {
            switch (this.subtype) {
            case "array":
                this._cachedDescription = this._concatenate("[", "]", formatArrayItem);
                break;
            case "date":
                this._cachedDescription = "" + this._value;
                break;
            case "null":
                this._cachedDescription = "null";
                break;
            default:
                this._cachedDescription = this._concatenate("{", "}", formatObjectItem);
            }
        } else
            this._cachedDescription = String(this._value);
        return this._cachedDescription;
    }, _concatenate: function (prefix, suffix, formatProperty) {
        const previewChars = 100;
        var buffer = prefix;
        var children = this._children();
        for (var i = 0; i < children.length; ++i) {
            var itemDescription = formatProperty(children[i]);
            if (buffer.length + itemDescription.length > previewChars) {
                buffer += ",\u2026";
                break;
            }
            if (i)
                buffer += ", ";
            buffer += itemDescription;
        }
        buffer += suffix;
        return buffer;
    }, get type() {
        return typeof this._value;
    }, get subtype() {
        if (this._value === null)
            return "null";
        if (this._value instanceof Array)
            return "array";
        if (this._value instanceof Date)
            return "date";
        return undefined;
    }, get hasChildren() {
        if ((typeof this._value !== "object") || (this._value === null))
            return false;
        return !!Object.keys((this._value)).length;
    }, getOwnProperties: function (callback) {
        callback(this._children());
    }, getAllProperties: function (accessorPropertiesOnly, callback) {
        if (accessorPropertiesOnly)
            callback([], null);
        else
            callback(this._children(), null);
    }, _children: function () {
        if (!this.hasChildren)
            return [];
        var value = (this._value);

        function buildProperty(propName) {
            return new WebInspector.RemoteObjectProperty(propName, new WebInspector.LocalJSONObject(this._value[propName]));
        }
        if (!this._cachedChildren)
            this._cachedChildren = Object.keys(value).map(buildProperty.bind(this));
        return this._cachedChildren;
    }, isError: function () {
        return false;
    }, arrayLength: function () {
        return this._value instanceof Array ? this._value.length : 0;
    }, callFunction: function (functionDeclaration, args, callback) {
        var target = (this._value);
        var rawArgs = args ? args.map(function (arg) {
            return arg.value;
        }) : [];
        var result;
        var wasThrown = false;
        try {
            result = functionDeclaration.apply(target, rawArgs);
        } catch (e) {
            wasThrown = true;
        }
        if (!callback)
            return;
        callback(WebInspector.RemoteObject.fromLocalObject(result), wasThrown);
    }, callFunctionJSON: function (functionDeclaration, args, callback) {
        var target = (this._value);
        var rawArgs = args ? args.map(function (arg) {
            return arg.value;
        }) : [];
        var result;
        try {
            result = functionDeclaration.apply(target, rawArgs);
        } catch (e) {
            result = null;
        }
        callback(result);
    }, __proto__: WebInspector.RemoteObject.prototype
}
WebInspector.ObjectPropertiesSection = function (object, title, subtitle, emptyPlaceholder, ignoreHasOwnProperty, extraProperties, treeElementConstructor) {
    this.emptyPlaceholder = (emptyPlaceholder || WebInspector.UIString("No Properties"));
    this.object = object;
    this.ignoreHasOwnProperty = ignoreHasOwnProperty;
    this.extraProperties = extraProperties;
    this.treeElementConstructor = treeElementConstructor || WebInspector.ObjectPropertyTreeElement;
    this.editable = true;
    this.skipProto = false;
    WebInspector.PropertiesSection.call(this, title || "", subtitle);
}
WebInspector.ObjectPropertiesSection._arrayLoadThreshold = 100;
WebInspector.ObjectPropertiesSection.prototype = {
    enableContextMenu: function () {
        this.element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), false);
    },
    _contextMenuEventFired: function (event) {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(this.object);
        contextMenu.show();
    },
    onpopulate: function () {
        this.update();
    },
    update: function () {
        if (this.object.arrayLength() > WebInspector.ObjectPropertiesSection._arrayLoadThreshold) {
            this.propertiesTreeOutline.removeChildren();
            WebInspector.ArrayGroupingTreeElement._populateArray(this.propertiesTreeOutline, this.object, 0, this.object.arrayLength() - 1);
            return;
        }

        function callback(properties, internalProperties) {
            if (!properties)
                return;
            this.updateProperties(properties, internalProperties);
        }
        WebInspector.RemoteObject.loadFromObject(this.object, !!this.ignoreHasOwnProperty, callback.bind(this));
    },
    updateProperties: function (properties, internalProperties, rootTreeElementConstructor, rootPropertyComparer) {
        if (!rootTreeElementConstructor)
            rootTreeElementConstructor = this.treeElementConstructor;
        if (!rootPropertyComparer)
            rootPropertyComparer = WebInspector.ObjectPropertiesSection.CompareProperties;
        if (this.extraProperties) {
            for (var i = 0; i < this.extraProperties.length; ++i)
                properties.push(this.extraProperties[i]);
        }
        this.propertiesTreeOutline.removeChildren();
        WebInspector.ObjectPropertyTreeElement.populateWithProperties(this.propertiesTreeOutline, properties, internalProperties, rootTreeElementConstructor, rootPropertyComparer, this.skipProto, this.object);
        this.propertiesForTest = properties;
        if (!this.propertiesTreeOutline.children.length) {
            var title = document.createElement("div");
            title.className = "info";
            title.textContent = this.emptyPlaceholder;
            var infoElement = new TreeElement(title, null, false);
            this.propertiesTreeOutline.appendChild(infoElement);
        }
    },
    __proto__: WebInspector.PropertiesSection.prototype
}
WebInspector.ObjectPropertiesSection.CompareProperties = function (propertyA, propertyB) {
    var a = propertyA.name;
    var b = propertyB.name;
    if (a === "__proto__")
        return 1;
    if (b === "__proto__")
        return -1;
    return String.naturalOrderComparator(a, b);
}
WebInspector.ObjectPropertyTreeElement = function (property) {
    this.property = property;
    TreeElement.call(this, "", null, false);
    this.toggleOnClick = true;
    this.selectable = false;
}
WebInspector.ObjectPropertyTreeElement.prototype = {
    onpopulate: function () {
        var propertyValue = (this.property.value);
        console.assert(propertyValue);
        WebInspector.ObjectPropertyTreeElement.populate(this, propertyValue);
    },
    ondblclick: function (event) {
        if (this.property.writable || this.property.setter)
            this.startEditing(event);
        return false;
    },
    onattach: function () {
        this.update();
    },
    update: function () {
        this.nameElement = document.createElement("span");
        this.nameElement.className = "name";
        var name = this.property.name;
        if (/^\s|\s$|^$|\n/.test(name))
            name = "\"" + name.replace(/\n/g, "\u21B5") + "\"";
        this.nameElement.textContent = name;
        if (!this.property.enumerable)
            this.nameElement.classList.add("dimmed");
        if (this.property.isAccessorProperty())
            this.nameElement.classList.add("properties-accessor-property-name");
        var separatorElement = document.createElement("span");
        separatorElement.className = "separator";
        separatorElement.textContent = ": ";
        if (this.property.value) {
            this.valueElement = document.createElement("span");
            this.valueElement.className = "value";
            var description = this.property.value.description;
            var valueText;
            if (this.property.wasThrown) {
                valueText = "[Exception: " + description + "]";
            } else if (this.property.value.type === "string" && typeof description === "string") {
                valueText = "\"" + description.replace(/\n/g, "\u21B5") + "\"";
                this.valueElement._originalTextContent = "\"" + description + "\"";
            } else if (this.property.value.type === "function" && typeof description === "string") {
                valueText = /.*/.exec(description)[0].replace(/ +$/g, "");
                this.valueElement._originalTextContent = description;
            } else if (this.property.value.type !== "object" || this.property.value.subtype !== "node") {
                valueText = description;
            }
            this.valueElement.setTextContentTruncatedIfNeeded(valueText || "");
            if (this.property.wasThrown)
                this.valueElement.classList.add("error");
            if (this.property.value.subtype)
                this.valueElement.classList.add("console-formatted-" + this.property.value.subtype);
            else if (this.property.value.type)
                this.valueElement.classList.add("console-formatted-" + this.property.value.type);
            this.valueElement.addEventListener("contextmenu", this._contextMenuFired.bind(this, this.property.value), false);
            if (this.property.value.type === "object" && this.property.value.subtype === "node" && this.property.value.description) {
                WebInspector.DOMPresentationUtils.createSpansForNodeTitle(this.valueElement, this.property.value.description);
                this.valueElement.addEventListener("mousemove", this._mouseMove.bind(this, this.property.value), false);
                this.valueElement.addEventListener("mouseout", this._mouseOut.bind(this, this.property.value), false);
            } else {
                this.valueElement.title = description || "";
            }
            this.listItemElement.removeChildren();
            this.hasChildren = this.property.value.hasChildren && !this.property.wasThrown;
        } else {
            if (this.property.getter) {
                this.valueElement = WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(this.property.parentObject, [this.property.name], this._onInvokeGetterClick.bind(this));
            } else {
                this.valueElement = document.createElement("span");
                this.valueElement.className = "console-formatted-undefined";
                this.valueElement.textContent = WebInspector.UIString("<unreadable>");
                this.valueElement.title = WebInspector.UIString("No property getter");
            }
        }
        this.listItemElement.appendChild(this.nameElement);
        this.listItemElement.appendChild(separatorElement);
        this.listItemElement.appendChild(this.valueElement);
    },
    _contextMenuFired: function (value, event) {
        var contextMenu = new WebInspector.ContextMenu(event);
        this.populateContextMenu(contextMenu);
        contextMenu.appendApplicableItems(value);
        contextMenu.show();
    },
    populateContextMenu: function (contextMenu) {},
    _mouseMove: function (event) {
        this.property.value.highlightAsDOMNode();
    },
    _mouseOut: function (event) {
        this.property.value.hideDOMNodeHighlight();
    },
    updateSiblings: function () {
        if (this.parent.root)
            this.treeOutline.section.update();
        else
            this.parent.shouldRefreshChildren = true;
    },
    renderPromptAsBlock: function () {
        return false;
    },
    elementAndValueToEdit: function (event) {
        return [this.valueElement, (typeof this.valueElement._originalTextContent === "string") ? this.valueElement._originalTextContent : undefined];
    },
    startEditing: function (event) {
        var elementAndValueToEdit = this.elementAndValueToEdit(event);
        var elementToEdit = elementAndValueToEdit[0];
        var valueToEdit = elementAndValueToEdit[1];
        if (WebInspector.isBeingEdited(elementToEdit) || !this.treeOutline.section.editable || this._readOnly)
            return;
        if (typeof valueToEdit !== "undefined")
            elementToEdit.setTextContentTruncatedIfNeeded(valueToEdit, WebInspector.UIString("<string is too large to edit>"));
        var context = {
            expanded: this.expanded,
            elementToEdit: elementToEdit,
            previousContent: elementToEdit.textContent
        };
        this.hasChildren = false;
        this.listItemElement.classList.add("editing-sub-part");
        this._prompt = new WebInspector.ObjectPropertyPrompt(this.editingCommitted.bind(this, null, elementToEdit.textContent, context.previousContent, context), this.editingCancelled.bind(this, null, context), this.renderPromptAsBlock());

        function blurListener() {
            this.editingCommitted(null, elementToEdit.textContent, context.previousContent, context);
        }
        var proxyElement = this._prompt.attachAndStartEditing(elementToEdit, blurListener.bind(this));
        window.getSelection().setBaseAndExtent(elementToEdit, 0, elementToEdit, 1);
        proxyElement.addEventListener("keydown", this._promptKeyDown.bind(this, context), false);
    },
    isEditing: function () {
        return !!this._prompt;
    },
    editingEnded: function (context) {
        this._prompt.detach();
        delete this._prompt;
        this.listItemElement.scrollLeft = 0;
        this.listItemElement.classList.remove("editing-sub-part");
        if (context.expanded)
            this.expand();
    },
    editingCancelled: function (element, context) {
        this.editingEnded(context);
        this.update();
    },
    editingCommitted: function (element, userInput, previousContent, context) {
        if (userInput === previousContent) {
            this.editingCancelled(element, context);
            return;
        }
        this.editingEnded(context);
        this.applyExpression(userInput, true);
    },
    _promptKeyDown: function (context, event) {
        if (isEnterKey(event)) {
            event.consume(true);
            this.editingCommitted(null, context.elementToEdit.textContent, context.previousContent, context);
            return;
        }
        if (event.keyIdentifier === "U+001B") {
            event.consume();
            this.editingCancelled(null, context);
            return;
        }
    },
    applyExpression: function (expression, updateInterface) {
        expression = expression.trim();
        var expressionLength = expression.length;

        function callback(error) {
            if (!updateInterface)
                return;
            if (error)
                this.update();
            if (!expressionLength) {
                this.parent.removeChild(this);
            } else {
                this.updateSiblings();
            }
        };
        this.property.parentObject.setPropertyValue(this.property.name, expression.trim(), callback.bind(this));
    },
    propertyPath: function () {
        if ("_cachedPropertyPath" in this)
            return this._cachedPropertyPath;
        var current = this;
        var result;
        do {
            if (current.property) {
                if (result)
                    result = current.property.name + "." + result;
                else
                    result = current.property.name;
            }
            current = current.parent;
        } while (current && !current.root);
        this._cachedPropertyPath = result;
        return result;
    },
    _onInvokeGetterClick: function (result, wasThrown) {
        if (!result)
            return;
        this.property.value = result;
        this.property.wasThrown = wasThrown;
        this.update();
        this.shouldRefreshChildren = true;
    },
    __proto__: TreeElement.prototype
}
WebInspector.ObjectPropertyTreeElement.populate = function (treeElement, value) {
    if (treeElement.children.length && !treeElement.shouldRefreshChildren)
        return;
    if (value.arrayLength() > WebInspector.ObjectPropertiesSection._arrayLoadThreshold) {
        treeElement.removeChildren();
        WebInspector.ArrayGroupingTreeElement._populateArray(treeElement, value, 0, value.arrayLength() - 1);
        return;
    }

    function callback(properties, internalProperties) {
        treeElement.removeChildren();
        if (!properties)
            return;
        if (!internalProperties)
            internalProperties = [];
        WebInspector.ObjectPropertyTreeElement.populateWithProperties(treeElement, properties, internalProperties, treeElement.treeOutline.section.treeElementConstructor, WebInspector.ObjectPropertiesSection.CompareProperties, treeElement.treeOutline.section.skipProto, value);
    }
    WebInspector.RemoteObject.loadFromObjectPerProto(value, callback);
}
WebInspector.ObjectPropertyTreeElement.populateWithProperties = function (treeElement, properties, internalProperties, treeElementConstructor, comparator, skipProto, value) {
    properties.sort(comparator);
    for (var i = 0; i < properties.length; ++i) {
        var property = properties[i];
        if (skipProto && property.name === "__proto__")
            continue;
        if (property.isAccessorProperty()) {
            if (property.name !== "__proto__" && property.getter) {
                property.parentObject = value;
                treeElement.appendChild(new treeElementConstructor(property));
            }
            if (property.isOwn) {
                if (property.getter) {
                    var getterProperty = new WebInspector.RemoteObjectProperty("get " + property.name, property.getter);
                    getterProperty.parentObject = value;
                    treeElement.appendChild(new treeElementConstructor(getterProperty));
                }
                if (property.setter) {
                    var setterProperty = new WebInspector.RemoteObjectProperty("set " + property.name, property.setter);
                    setterProperty.parentObject = value;
                    treeElement.appendChild(new treeElementConstructor(setterProperty));
                }
            }
        } else {
            property.parentObject = value;
            treeElement.appendChild(new treeElementConstructor(property));
        }
    }
    if (value && value.type === "function") {
        var hasTargetFunction = false;
        if (internalProperties) {
            for (var i = 0; i < internalProperties.length; i++) {
                if (internalProperties[i].name == "[[TargetFunction]]") {
                    hasTargetFunction = true;
                    break;
                }
            }
        }
        if (!hasTargetFunction)
            treeElement.appendChild(new WebInspector.FunctionScopeMainTreeElement(value));
    }
    if (internalProperties) {
        for (var i = 0; i < internalProperties.length; i++) {
            internalProperties[i].parentObject = value;
            treeElement.appendChild(new treeElementConstructor(internalProperties[i]));
        }
    }
}
WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan = function (object, propertyPath, callback) {
    var rootElement = document.createElement("span");
    var element = rootElement.createChild("span", "properties-calculate-value-button");
    element.textContent = WebInspector.UIString("(...)");
    element.title = WebInspector.UIString("Invoke property getter");
    element.addEventListener("click", onInvokeGetterClick, false);

    function onInvokeGetterClick(event) {
        event.consume();
        object.getProperty(propertyPath, callback);
    }
    return rootElement;
}
WebInspector.FunctionScopeMainTreeElement = function (remoteObject) {
    TreeElement.call(this, "<function scope>", null, false);
    this.toggleOnClick = true;
    this.selectable = false;
    this._remoteObject = remoteObject;
    this.hasChildren = true;
}
WebInspector.FunctionScopeMainTreeElement.prototype = {
    onpopulate: function () {
        if (this.children.length && !this.shouldRefreshChildren)
            return;

        function didGetDetails(error, response) {
            if (error) {
                console.error(error);
                return;
            }
            this.removeChildren();
            var scopeChain = response.scopeChain;
            if (!scopeChain)
                return;
            for (var i = 0; i < scopeChain.length; ++i) {
                var scope = scopeChain[i];
                var title = null;
                var isTrueObject;
                switch (scope.type) {
                case DebuggerAgent.ScopeType.Local:
                    title = WebInspector.UIString("Local");
                    isTrueObject = false;
                    break;
                case DebuggerAgent.ScopeType.Closure:
                    title = WebInspector.UIString("Closure");
                    isTrueObject = false;
                    break;
                case DebuggerAgent.ScopeType.Catch:
                    title = WebInspector.UIString("Catch");
                    isTrueObject = false;
                    break;
                case DebuggerAgent.ScopeType.With:
                    title = WebInspector.UIString("With Block");
                    isTrueObject = true;
                    break;
                case DebuggerAgent.ScopeType.Global:
                    title = WebInspector.UIString("Global");
                    isTrueObject = true;
                    break;
                default:
                    console.error("Unknown scope type: " + scope.type);
                    continue;
                }
                var scopeRef = isTrueObject ? undefined : new WebInspector.ScopeRef(i, undefined, this._remoteObject.objectId);
                var remoteObject = WebInspector.ScopeRemoteObject.fromPayload(scope.object, scopeRef);
                if (isTrueObject) {
                    var property = WebInspector.RemoteObjectProperty.fromScopeValue(title, remoteObject);
                    property.parentObject = null;
                    this.appendChild(new this.treeOutline.section.treeElementConstructor(property));
                } else {
                    var scopeTreeElement = new WebInspector.ScopeTreeElement(title, null, remoteObject);
                    this.appendChild(scopeTreeElement);
                }
            }
        }
        DebuggerAgent.getFunctionDetails(this._remoteObject.objectId, didGetDetails.bind(this));
    },
    __proto__: TreeElement.prototype
}
WebInspector.ScopeTreeElement = function (title, subtitle, remoteObject) {
    TreeElement.call(this, title, null, false);
    this.toggleOnClick = true;
    this.selectable = false;
    this._remoteObject = remoteObject;
    this.hasChildren = true;
}
WebInspector.ScopeTreeElement.prototype = {
    onpopulate: function () {
        WebInspector.ObjectPropertyTreeElement.populate(this, this._remoteObject);
    },
    __proto__: TreeElement.prototype
}
WebInspector.ArrayGroupingTreeElement = function (object, fromIndex, toIndex, propertyCount) {
    TreeElement.call(this, String.sprintf("[%d \u2026 %d]", fromIndex, toIndex), undefined, true);
    this._fromIndex = fromIndex;
    this._toIndex = toIndex;
    this._object = object;
    this._readOnly = true;
    this._propertyCount = propertyCount;
    this._populated = false;
}
WebInspector.ArrayGroupingTreeElement._bucketThreshold = 100;
WebInspector.ArrayGroupingTreeElement._sparseIterationThreshold = 250000;
WebInspector.ArrayGroupingTreeElement._populateArray = function (treeElement, object, fromIndex, toIndex) {
    WebInspector.ArrayGroupingTreeElement._populateRanges(treeElement, object, fromIndex, toIndex, true);
}
WebInspector.ArrayGroupingTreeElement._populateRanges = function (treeElement, object, fromIndex, toIndex, topLevel) {
    object.callFunctionJSON(packRanges, [{
        value: fromIndex
    }, {
        value: toIndex
    }, {
        value: WebInspector.ArrayGroupingTreeElement._bucketThreshold
    }, {
        value: WebInspector.ArrayGroupingTreeElement._sparseIterationThreshold
    }], callback);

    function packRanges(fromIndex, toIndex, bucketThreshold, sparseIterationThreshold) {
        var ownPropertyNames = null;

        function doLoop(iterationCallback) {
            if (toIndex - fromIndex < sparseIterationThreshold) {
                for (var i = fromIndex; i <= toIndex; ++i) {
                    if (i in this)
                        iterationCallback(i);
                }
            } else {
                ownPropertyNames = ownPropertyNames || Object.getOwnPropertyNames(this);
                for (var i = 0; i < ownPropertyNames.length; ++i) {
                    var name = ownPropertyNames[i];
                    var index = name >>> 0;
                    if (String(index) === name && fromIndex <= index && index <= toIndex)
                        iterationCallback(index);
                }
            }
        }
        var count = 0;

        function countIterationCallback() {
            ++count;
        }
        doLoop.call(this, countIterationCallback);
        var bucketSize = count;
        if (count <= bucketThreshold)
            bucketSize = count;
        else
            bucketSize = Math.pow(bucketThreshold, Math.ceil(Math.log(count) / Math.log(bucketThreshold)) - 1);
        var ranges = [];
        count = 0;
        var groupStart = -1;
        var groupEnd = 0;

        function loopIterationCallback(i) {
            if (groupStart === -1)
                groupStart = i;
            groupEnd = i;
            if (++count === bucketSize) {
                ranges.push([groupStart, groupEnd, count]);
                count = 0;
                groupStart = -1;
            }
        }
        doLoop.call(this, loopIterationCallback);
        if (count > 0)
            ranges.push([groupStart, groupEnd, count]);
        return ranges;
    }

    function callback(ranges) {
        if (ranges.length == 1)
            WebInspector.ArrayGroupingTreeElement._populateAsFragment(treeElement, object, ranges[0][0], ranges[0][1]);
        else {
            for (var i = 0; i < ranges.length; ++i) {
                var fromIndex = ranges[i][0];
                var toIndex = ranges[i][1];
                var count = ranges[i][2];
                if (fromIndex == toIndex)
                    WebInspector.ArrayGroupingTreeElement._populateAsFragment(treeElement, object, fromIndex, toIndex);
                else
                    treeElement.appendChild(new WebInspector.ArrayGroupingTreeElement(object, fromIndex, toIndex, count));
            }
        }
        if (topLevel)
            WebInspector.ArrayGroupingTreeElement._populateNonIndexProperties(treeElement, object);
    }
}
WebInspector.ArrayGroupingTreeElement._populateAsFragment = function (treeElement, object, fromIndex, toIndex) {
    object.callFunction(buildArrayFragment, [{
        value: fromIndex
    }, {
        value: toIndex
    }, {
        value: WebInspector.ArrayGroupingTreeElement._sparseIterationThreshold
    }], processArrayFragment.bind(this));

    function buildArrayFragment(fromIndex, toIndex, sparseIterationThreshold) {
        var result = Object.create(null);
        if (toIndex - fromIndex < sparseIterationThreshold) {
            for (var i = fromIndex; i <= toIndex; ++i) {
                if (i in this)
                    result[i] = this[i];
            }
        } else {
            var ownPropertyNames = Object.getOwnPropertyNames(this);
            for (var i = 0; i < ownPropertyNames.length; ++i) {
                var name = ownPropertyNames[i];
                var index = name >>> 0;
                if (String(index) === name && fromIndex <= index && index <= toIndex)
                    result[index] = this[index];
            }
        }
        return result;
    }

    function processArrayFragment(arrayFragment, wasThrown) {
        if (!arrayFragment || wasThrown)
            return;
        arrayFragment.getAllProperties(false, processProperties.bind(this));
    }

    function processProperties(properties, internalProperties) {
        if (!properties)
            return;
        properties.sort(WebInspector.ObjectPropertiesSection.CompareProperties);
        for (var i = 0; i < properties.length; ++i) {
            properties[i].parentObject = this._object;
            var childTreeElement = new treeElement.treeOutline.section.treeElementConstructor(properties[i]);
            childTreeElement._readOnly = true;
            treeElement.appendChild(childTreeElement);
        }
    }
}
WebInspector.ArrayGroupingTreeElement._populateNonIndexProperties = function (treeElement, object) {
    object.callFunction(buildObjectFragment, undefined, processObjectFragment.bind(this));

    function buildObjectFragment() {
        var result = Object.create(this.__proto__);
        var names = Object.getOwnPropertyNames(this);
        for (var i = 0; i < names.length; ++i) {
            var name = names[i];
            if (String(name >>> 0) === name && name >>> 0 !== 0xffffffff)
                continue;
            var descriptor = Object.getOwnPropertyDescriptor(this, name);
            if (descriptor)
                Object.defineProperty(result, name, descriptor);
        }
        return result;
    }

    function processObjectFragment(arrayFragment, wasThrown) {
        if (!arrayFragment || wasThrown)
            return;
        arrayFragment.getOwnProperties(processProperties.bind(this));
    }

    function processProperties(properties, internalProperties) {
        if (!properties)
            return;
        properties.sort(WebInspector.ObjectPropertiesSection.CompareProperties);
        for (var i = 0; i < properties.length; ++i) {
            properties[i].parentObject = this._object;
            var childTreeElement = new treeElement.treeOutline.section.treeElementConstructor(properties[i]);
            childTreeElement._readOnly = true;
            treeElement.appendChild(childTreeElement);
        }
    }
}
WebInspector.ArrayGroupingTreeElement.prototype = {
    onpopulate: function () {
        if (this._populated)
            return;
        this._populated = true;
        if (this._propertyCount >= WebInspector.ArrayGroupingTreeElement._bucketThreshold) {
            WebInspector.ArrayGroupingTreeElement._populateRanges(this, this._object, this._fromIndex, this._toIndex, false);
            return;
        }
        WebInspector.ArrayGroupingTreeElement._populateAsFragment(this, this._object, this._fromIndex, this._toIndex);
    },
    onattach: function () {
        this.listItemElement.classList.add("name");
    },
    __proto__: TreeElement.prototype
}
WebInspector.ObjectPropertyPrompt = function (commitHandler, cancelHandler, renderAsBlock) {
    WebInspector.TextPrompt.call(this, WebInspector.runtimeModel.completionsForTextPrompt.bind(WebInspector.runtimeModel));
    this.setSuggestBoxEnabled("generic-suggest");
    if (renderAsBlock)
        this.renderAsBlock();
}
WebInspector.ObjectPropertyPrompt.prototype = {
    __proto__: WebInspector.TextPrompt.prototype
}
WebInspector.ObjectPopoverHelper = function (panelElement, getAnchor, queryObject, onHide, disableOnClick) {
    WebInspector.PopoverHelper.call(this, panelElement, getAnchor, this._showObjectPopover.bind(this), this._onHideObjectPopover.bind(this), disableOnClick);
    this._queryObject = queryObject;
    this._onHideCallback = onHide;
    this._popoverObjectGroup = "popover";
    panelElement.addEventListener("scroll", this.hidePopover.bind(this), true);
};
WebInspector.ObjectPopoverHelper.prototype = {
    setRemoteObjectFormatter: function (formatter) {
        this._remoteObjectFormatter = formatter;
    },
    _showObjectPopover: function (element, popover) {
        function didGetDetails(anchorElement, popoverContentElement, error, response) {
            if (error) {
                console.error(error);
                return;
            }
            var container = document.createElement("div");
            container.className = "inline-block";
            var title = container.createChild("div", "function-popover-title source-code");
            var functionName = title.createChild("span", "function-name");
            functionName.textContent = response.functionName || WebInspector.UIString("(anonymous function)");
            this._linkifier = new WebInspector.Linkifier();
            var rawLocation = (response.location);
            var link = this._linkifier.linkifyRawLocation(rawLocation, "function-location-link");
            if (link)
                title.appendChild(link);
            container.appendChild(popoverContentElement);
            popover.show(container, anchorElement);
        }

        function showObjectPopover(result, wasThrown, anchorOverride) {
            if (popover.disposed)
                return;
            if (wasThrown) {
                this.hidePopover();
                return;
            }
            var anchorElement = anchorOverride || element;
            var description = (this._remoteObjectFormatter && this._remoteObjectFormatter(result)) || result.description;
            var popoverContentElement = null;
            if (result.type !== "object") {
                popoverContentElement = document.createElement("span");
                popoverContentElement.className = "monospace console-formatted-" + result.type;
                popoverContentElement.style.whiteSpace = "pre";
                popoverContentElement.textContent = description;
                if (result.type === "function") {
                    DebuggerAgent.getFunctionDetails(result.objectId, didGetDetails.bind(this, anchorElement, popoverContentElement));
                    return;
                }
                if (result.type === "string")
                    popoverContentElement.textContent = "\"" + popoverContentElement.textContent + "\"";
                popover.show(popoverContentElement, anchorElement);
            } else {
                if (result.subtype === "node")
                    result.highlightAsDOMNode();
                popoverContentElement = document.createElement("div");
                this._titleElement = document.createElement("div");
                this._titleElement.className = "source-frame-popover-title monospace";
                this._titleElement.textContent = description;
                popoverContentElement.appendChild(this._titleElement);
                var section = new WebInspector.ObjectPropertiesSection(result);
                if (description.substr(0, 4) === "HTML") {
                    this._sectionUpdateProperties = section.updateProperties.bind(section);
                    section.updateProperties = this._updateHTMLId.bind(this);
                }
                section.expanded = true;
                section.element.classList.add("source-frame-popover-tree");
                section.headerElement.classList.add("hidden");
                popoverContentElement.appendChild(section.element);
                const popoverWidth = 300;
                const popoverHeight = 250;
                popover.show(popoverContentElement, anchorElement, popoverWidth, popoverHeight);
            }
        }
        this._queryObject(element, showObjectPopover.bind(this), this._popoverObjectGroup);
    },
    _onHideObjectPopover: function () {
        WebInspector.domModel.hideDOMNodeHighlight();
        if (this._linkifier) {
            this._linkifier.reset();
            delete this._linkifier;
        }
        if (this._onHideCallback)
            this._onHideCallback();
        RuntimeAgent.releaseObjectGroup(this._popoverObjectGroup);
    },
    _updateHTMLId: function (properties, rootTreeElementConstructor, rootPropertyComparer) {
        for (var i = 0; i < properties.length; ++i) {
            if (properties[i].name === "id") {
                if (properties[i].value.description)
                    this._titleElement.textContent += "#" + properties[i].value.description;
                break;
            }
        }
        this._sectionUpdateProperties(properties, rootTreeElementConstructor, rootPropertyComparer);
    },
    __proto__: WebInspector.PopoverHelper.prototype
}

WebInspector.Color = function (rgba, format, originalText) {
    this._rgba = rgba;
    this._originalText = originalText || null;
    this._format = format || null;
    if (typeof this._rgba[3] === "undefined")
        this._rgba[3] = 1;
    for (var i = 0; i < 4; ++i) {
        if (this._rgba[i] < 0)
            this._rgba[i] = 0;
        if (this._rgba[i] > 1)
            this._rgba[i] = 1;
    }
}
WebInspector.Color.parse = function (text) {
    var value = text.toLowerCase().replace(/\s+/g, "");
    var simple = /^(?:#([0-9a-f]{3,6})|rgb\(([^)]+)\)|(\w+)|hsl\(([^)]+)\))$/i;
    var match = value.match(simple);
    if (match) {
        if (match[1]) {
            var hex = match[1].toUpperCase();
            var format;
            if (hex.length === 3) {
                format = WebInspector.Color.Format.ShortHEX;
                hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
            } else
                format = WebInspector.Color.Format.HEX;
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            return new WebInspector.Color([r / 255, g / 255, b / 255, 1], format, text);
        }
        if (match[2]) {
            var rgbString = match[2].split(/\s*,\s*/);
            var rgba = [WebInspector.Color._parseRgbNumeric(rgbString[0]), WebInspector.Color._parseRgbNumeric(rgbString[1]), WebInspector.Color._parseRgbNumeric(rgbString[2]), 1];
            return new WebInspector.Color(rgba, WebInspector.Color.Format.RGB, text);
        }
        if (match[3]) {
            var nickname = match[3].toLowerCase();
            if (nickname in WebInspector.Color.Nicknames) {
                var rgba = WebInspector.Color.Nicknames[nickname];
                var color = WebInspector.Color.fromRGBA(rgba);
                color._format = WebInspector.Color.Format.Nickname;
                color._originalText = nickname;
                return color;
            }
            return null;
        }
        if (match[4]) {
            var hslString = match[4].replace(/%/g, "").split(/\s*,\s*/);
            var hsla = [WebInspector.Color._parseHueNumeric(hslString[0]), WebInspector.Color._parseSatLightNumeric(hslString[1]), WebInspector.Color._parseSatLightNumeric(hslString[2]), 1];
            var rgba = WebInspector.Color._hsl2rgb(hsla);
            return new WebInspector.Color(rgba, WebInspector.Color.Format.HSL, text);
        }
        return null;
    }
    var advanced = /^(?:rgba\(([^)]+)\)|hsla\(([^)]+)\))$/;
    match = value.match(advanced);
    if (match) {
        if (match[1]) {
            var rgbaString = match[1].split(/\s*,\s*/);
            var rgba = [WebInspector.Color._parseRgbNumeric(rgbaString[0]), WebInspector.Color._parseRgbNumeric(rgbaString[1]), WebInspector.Color._parseRgbNumeric(rgbaString[2]), WebInspector.Color._parseAlphaNumeric(rgbaString[3])];
            return new WebInspector.Color(rgba, WebInspector.Color.Format.RGBA, text);
        }
        if (match[2]) {
            var hslaString = match[2].replace(/%/g, "").split(/\s*,\s*/);
            var hsla = [WebInspector.Color._parseHueNumeric(hslaString[0]), WebInspector.Color._parseSatLightNumeric(hslaString[1]), WebInspector.Color._parseSatLightNumeric(hslaString[2]), WebInspector.Color._parseAlphaNumeric(hslaString[3])];
            var rgba = WebInspector.Color._hsl2rgb(hsla);
            return new WebInspector.Color(rgba, WebInspector.Color.Format.HSLA, text);
        }
    }
    return null;
}
WebInspector.Color.fromRGBA = function (rgba) {
    return new WebInspector.Color([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]]);
}
WebInspector.Color.fromHSVA = function (hsva) {
    var h = hsva[0];
    var s = hsva[1];
    var v = hsva[2];
    var t = (2 - s) * v;
    if (v === 0 || s === 0)
        s = 0;
    else
        s *= v / (t < 1 ? t : 2 - t);
    var hsla = [h, s, t / 2, hsva[3]];
    return new WebInspector.Color(WebInspector.Color._hsl2rgb(hsla), WebInspector.Color.Format.HSLA);
}
WebInspector.Color.prototype = {
    format: function () {
        return this._format;
    },
    hsla: function () {
        if (this._hsla)
            return this._hsla;
        var r = this._rgba[0];
        var g = this._rgba[1];
        var b = this._rgba[2];
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var diff = max - min;
        var add = max + min;
        if (min === max)
            var h = 0;
        else if (r === max)
            var h = ((1 / 6 * (g - b) / diff) + 1) % 1;
        else if (g === max)
            var h = (1 / 6 * (b - r) / diff) + 1 / 3;
        else
            var h = (1 / 6 * (r - g) / diff) + 2 / 3;
        var l = 0.5 * add;
        if (l === 0)
            var s = 0;
        else if (l === 1)
            var s = 1;
        else if (l <= 0.5)
            var s = diff / add;
        else
            var s = diff / (2 - add);
        this._hsla = [h, s, l, this._rgba[3]];
        return this._hsla;
    },
    hsva: function () {
        var hsla = this.hsla();
        var h = hsla[0];
        var s = hsla[1];
        var l = hsla[2];
        s *= l < 0.5 ? l : 1 - l;
        return [h, s !== 0 ? 2 * s / (l + s) : 0, (l + s), hsla[3]];
    },
    hasAlpha: function () {
        return this._rgba[3] !== 1;
    },
    canBeShortHex: function () {
        if (this.hasAlpha())
            return false;
        for (var i = 0; i < 3; ++i) {
            var c = Math.round(this._rgba[i] * 255);
            if (c % 17)
                return false;
        }
        return true;
    },
    toString: function (format) {
        if (!format)
            format = this._format;

        function toRgbValue(value) {
            return Math.round(value * 255);
        }

        function toHexValue(value) {
            var hex = Math.round(value * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }

        function toShortHexValue(value) {
            return (Math.round(value * 255) / 17).toString(16);
        }
        switch (format) {
        case WebInspector.Color.Format.Original:
            return this._originalText;
        case WebInspector.Color.Format.RGB:
            if (this.hasAlpha())
                return null;
            return String.sprintf("rgb(%d, %d, %d)", toRgbValue(this._rgba[0]), toRgbValue(this._rgba[1]), toRgbValue(this._rgba[2]));
        case WebInspector.Color.Format.RGBA:
            return String.sprintf("rgba(%d, %d, %d, %f)", toRgbValue(this._rgba[0]), toRgbValue(this._rgba[1]), toRgbValue(this._rgba[2]), this._rgba[3]);
        case WebInspector.Color.Format.HSL:
            if (this.hasAlpha())
                return null;
            var hsl = this.hsla();
            return String.sprintf("hsl(%d, %d%, %d%)", Math.round(hsl[0] * 360), Math.round(hsl[1] * 100), Math.round(hsl[2] * 100));
        case WebInspector.Color.Format.HSLA:
            var hsla = this.hsla();
            return String.sprintf("hsla(%d, %d%, %d%, %f)", Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100), hsla[3]);
        case WebInspector.Color.Format.HEX:
            if (this.hasAlpha())
                return null;
            return String.sprintf("#%s%s%s", toHexValue(this._rgba[0]), toHexValue(this._rgba[1]), toHexValue(this._rgba[2])).toUpperCase();
        case WebInspector.Color.Format.ShortHEX:
            if (!this.canBeShortHex())
                return null;
            return String.sprintf("#%s%s%s", toShortHexValue(this._rgba[0]), toShortHexValue(this._rgba[1]), toShortHexValue(this._rgba[2])).toUpperCase();
        case WebInspector.Color.Format.Nickname:
            return this.nickname();
        }
        return this._originalText;
    },
    _canonicalRGBA: function () {
        var rgba = new Array(3);
        for (var i = 0; i < 3; ++i)
            rgba[i] = Math.round(this._rgba[i] * 255);
        if (this._rgba[3] !== 1)
            rgba.push(this._rgba[3]);
        return rgba;
    },
    nickname: function () {
        if (!WebInspector.Color._rgbaToNickname) {
            WebInspector.Color._rgbaToNickname = {};
            for (var nickname in WebInspector.Color.Nicknames) {
                var rgba = WebInspector.Color.Nicknames[nickname];
                WebInspector.Color._rgbaToNickname[rgba] = nickname;
            }
        }
        return WebInspector.Color._rgbaToNickname[this._canonicalRGBA()] || null;
    },
    toProtocolRGBA: function () {
        var rgba = this._canonicalRGBA();
        var result = {
            r: rgba[0],
            g: rgba[1],
            b: rgba[2]
        };
        if (rgba[3] !== 1)
            result.a = rgba[3];
        return result;
    },
    invert: function () {
        var rgba = [];
        rgba[0] = 1 - this._rgba[0];
        rgba[1] = 1 - this._rgba[1];
        rgba[2] = 1 - this._rgba[2];
        rgba[3] = this._rgba[3];
        return new WebInspector.Color(rgba);
    },
    setAlpha: function (alpha) {
        var rgba = this._rgba.slice();
        rgba[3] = alpha;
        return new WebInspector.Color(rgba);
    }
}
WebInspector.Color._parseRgbNumeric = function (value) {
    var parsed = parseInt(value, 10);
    if (value.indexOf("%") !== -1)
        parsed /= 100;
    else
        parsed /= 255;
    return parsed;
}
WebInspector.Color._parseHueNumeric = function (value) {
    return isNaN(value) ? 0 : (parseFloat(value) / 360) % 1;
}
WebInspector.Color._parseSatLightNumeric = function (value) {
    return parseFloat(value) / 100;
}
WebInspector.Color._parseAlphaNumeric = function (value) {
    return isNaN(value) ? 0 : parseFloat(value);
}
WebInspector.Color._hsl2rgb = function (hsl) {
    var h = hsl[0];
    var s = hsl[1];
    var l = hsl[2];

    function hue2rgb(p, q, h) {
        if (h < 0)
            h += 1;
        else if (h > 1)
            h -= 1;
        if ((h * 6) < 1)
            return p + (q - p) * h * 6;
        else if ((h * 2) < 1)
            return q;
        else if ((h * 3) < 2)
            return p + (q - p) * ((2 / 3) - h) * 6;
        else
            return p;
    }
    if (s < 0)
        s = 0;
    if (l <= 0.5)
        var q = l * (1 + s);
    else
        var q = l + s - (l * s);
    var p = 2 * l - q;
    var tr = h + (1 / 3);
    var tg = h;
    var tb = h - (1 / 3);
    var r = hue2rgb(p, q, tr);
    var g = hue2rgb(p, q, tg);
    var b = hue2rgb(p, q, tb);
    return [r, g, b, hsl[3]];
}
WebInspector.Color.Nicknames = {
    "aliceblue": [240, 248, 255],
    "antiquewhite": [250, 235, 215],
    "aquamarine": [127, 255, 212],
    "azure": [240, 255, 255],
    "beige": [245, 245, 220],
    "bisque": [255, 228, 196],
    "black": [0, 0, 0],
    "blanchedalmond": [255, 235, 205],
    "blue": [0, 0, 255],
    "blueviolet": [138, 43, 226],
    "brown": [165, 42, 42],
    "burlywood": [222, 184, 135],
    "cadetblue": [95, 158, 160],
    "chartreuse": [127, 255, 0],
    "chocolate": [210, 105, 30],
    "coral": [255, 127, 80],
    "cornflowerblue": [100, 149, 237],
    "cornsilk": [255, 248, 220],
    "crimson": [237, 20, 61],
    "cyan": [0, 255, 255],
    "darkblue": [0, 0, 139],
    "darkcyan": [0, 139, 139],
    "darkgoldenrod": [184, 134, 11],
    "darkgray": [169, 169, 169],
    "darkgreen": [0, 100, 0],
    "darkkhaki": [189, 183, 107],
    "darkmagenta": [139, 0, 139],
    "darkolivegreen": [85, 107, 47],
    "darkorange": [255, 140, 0],
    "darkorchid": [153, 50, 204],
    "darkred": [139, 0, 0],
    "darksalmon": [233, 150, 122],
    "darkseagreen": [143, 188, 143],
    "darkslateblue": [72, 61, 139],
    "darkslategray": [47, 79, 79],
    "darkturquoise": [0, 206, 209],
    "darkviolet": [148, 0, 211],
    "deeppink": [255, 20, 147],
    "deepskyblue": [0, 191, 255],
    "dimgray": [105, 105, 105],
    "dodgerblue": [30, 144, 255],
    "firebrick": [178, 34, 34],
    "floralwhite": [255, 250, 240],
    "forestgreen": [34, 139, 34],
    "gainsboro": [220, 220, 220],
    "ghostwhite": [248, 248, 255],
    "gold": [255, 215, 0],
    "goldenrod": [218, 165, 32],
    "gray": [128, 128, 128],
    "green": [0, 128, 0],
    "greenyellow": [173, 255, 47],
    "honeydew": [240, 255, 240],
    "hotpink": [255, 105, 180],
    "indianred": [205, 92, 92],
    "indigo": [75, 0, 130],
    "ivory": [255, 255, 240],
    "khaki": [240, 230, 140],
    "lavender": [230, 230, 250],
    "lavenderblush": [255, 240, 245],
    "lawngreen": [124, 252, 0],
    "lemonchiffon": [255, 250, 205],
    "lightblue": [173, 216, 230],
    "lightcoral": [240, 128, 128],
    "lightcyan": [224, 255, 255],
    "lightgoldenrodyellow": [250, 250, 210],
    "lightgreen": [144, 238, 144],
    "lightgrey": [211, 211, 211],
    "lightpink": [255, 182, 193],
    "lightsalmon": [255, 160, 122],
    "lightseagreen": [32, 178, 170],
    "lightskyblue": [135, 206, 250],
    "lightslategray": [119, 136, 153],
    "lightsteelblue": [176, 196, 222],
    "lightyellow": [255, 255, 224],
    "lime": [0, 255, 0],
    "limegreen": [50, 205, 50],
    "linen": [250, 240, 230],
    "magenta": [255, 0, 255],
    "maroon": [128, 0, 0],
    "mediumaquamarine": [102, 205, 170],
    "mediumblue": [0, 0, 205],
    "mediumorchid": [186, 85, 211],
    "mediumpurple": [147, 112, 219],
    "mediumseagreen": [60, 179, 113],
    "mediumslateblue": [123, 104, 238],
    "mediumspringgreen": [0, 250, 154],
    "mediumturquoise": [72, 209, 204],
    "mediumvioletred": [199, 21, 133],
    "midnightblue": [25, 25, 112],
    "mintcream": [245, 255, 250],
    "mistyrose": [255, 228, 225],
    "moccasin": [255, 228, 181],
    "navajowhite": [255, 222, 173],
    "navy": [0, 0, 128],
    "oldlace": [253, 245, 230],
    "olive": [128, 128, 0],
    "olivedrab": [107, 142, 35],
    "orange": [255, 165, 0],
    "orangered": [255, 69, 0],
    "orchid": [218, 112, 214],
    "palegoldenrod": [238, 232, 170],
    "palegreen": [152, 251, 152],
    "paleturquoise": [175, 238, 238],
    "palevioletred": [219, 112, 147],
    "papayawhip": [255, 239, 213],
    "peachpuff": [255, 218, 185],
    "peru": [205, 133, 63],
    "pink": [255, 192, 203],
    "plum": [221, 160, 221],
    "powderblue": [176, 224, 230],
    "purple": [128, 0, 128],
    "red": [255, 0, 0],
    "rosybrown": [188, 143, 143],
    "royalblue": [65, 105, 225],
    "saddlebrown": [139, 69, 19],
    "salmon": [250, 128, 114],
    "sandybrown": [244, 164, 96],
    "seagreen": [46, 139, 87],
    "seashell": [255, 245, 238],
    "sienna": [160, 82, 45],
    "silver": [192, 192, 192],
    "skyblue": [135, 206, 235],
    "slateblue": [106, 90, 205],
    "slategray": [112, 128, 144],
    "snow": [255, 250, 250],
    "springgreen": [0, 255, 127],
    "steelblue": [70, 130, 180],
    "tan": [210, 180, 140],
    "teal": [0, 128, 128],
    "thistle": [216, 191, 216],
    "tomato": [255, 99, 71],
    "turquoise": [64, 224, 208],
    "violet": [238, 130, 238],
    "wheat": [245, 222, 179],
    "white": [255, 255, 255],
    "whitesmoke": [245, 245, 245],
    "yellow": [255, 255, 0],
    "yellowgreen": [154, 205, 50],
    "transparent": [0, 0, 0, 0],
};
WebInspector.Color.PageHighlight = {
    Content: WebInspector.Color.fromRGBA([111, 168, 220, .66]),
    ContentLight: WebInspector.Color.fromRGBA([111, 168, 220, .5]),
    ContentOutline: WebInspector.Color.fromRGBA([9, 83, 148]),
    Padding: WebInspector.Color.fromRGBA([147, 196, 125, .55]),
    PaddingLight: WebInspector.Color.fromRGBA([147, 196, 125, .4]),
    Border: WebInspector.Color.fromRGBA([255, 229, 153, .66]),
    BorderLight: WebInspector.Color.fromRGBA([255, 229, 153, .5]),
    Margin: WebInspector.Color.fromRGBA([246, 178, 107, .66]),
    MarginLight: WebInspector.Color.fromRGBA([246, 178, 107, .5]),
    EventTarget: WebInspector.Color.fromRGBA([255, 196, 196, .66])
}
WebInspector.Color.Format = {
    Original: "original",
    Nickname: "nickname",
    HEX: "hex",
    ShortHEX: "shorthex",
    RGB: "rgb",
    RGBA: "rgba",
    HSL: "hsl",
    HSLA: "hsla"
}
WebInspector.CSSMetadata = function (properties) {
    this._values = ([]);
    this._longhands = {};
    this._shorthands = {};
    for (var i = 0; i < properties.length; ++i) {
        var property = properties[i];
        if (typeof property === "string") {
            this._values.push(property);
            continue;
        }
        var propertyName = property.name;
        this._values.push(propertyName);
        var longhands = properties[i].longhands;
        if (longhands) {
            this._longhands[propertyName] = longhands;
            for (var j = 0; j < longhands.length; ++j) {
                var longhandName = longhands[j];
                var shorthands = this._shorthands[longhandName];
                if (!shorthands) {
                    shorthands = [];
                    this._shorthands[longhandName] = shorthands;
                }
                shorthands.push(propertyName);
            }
        }
    }
    this._values.sort();
}
WebInspector.CSSMetadata.cssPropertiesMetainfo = new WebInspector.CSSMetadata([]);
WebInspector.CSSMetadata.isColorAwareProperty = function (propertyName) {
    return WebInspector.CSSMetadata._colorAwareProperties[propertyName] === true;
}
WebInspector.CSSMetadata.colors = function () {
    if (!WebInspector.CSSMetadata._colorsKeySet)
        WebInspector.CSSMetadata._colorsKeySet = WebInspector.CSSMetadata._colors.keySet();
    return WebInspector.CSSMetadata._colorsKeySet;
}
WebInspector.CSSMetadata.InheritedProperties = ["azimuth", "border-collapse", "border-spacing", "caption-side", "color", "cursor", "direction", "elevation", "empty-cells", "font-family", "font-size", "font-style", "font-variant", "font-weight", "font", "letter-spacing", "line-height", "list-style-image", "list-style-position", "list-style-type", "list-style", "orphans", "pitch-range", "pitch", "quotes", "resize", "richness", "speak-header", "speak-numeral", "speak-punctuation", "speak", "speech-rate", "stress", "text-align", "text-indent", "text-transform", "text-shadow", "visibility", "voice-family", "volume", "white-space", "widows", "word-spacing", "zoom"].keySet();
WebInspector.CSSMetadata.NonStandardInheritedProperties = ["-webkit-font-smoothing"].keySet();
WebInspector.CSSMetadata.canonicalPropertyName = function (name) {
    if (!name || name.length < 9 || name.charAt(0) !== "-")
        return name.toLowerCase();
    var match = name.match(/(?:-webkit-)(.+)/);
    var propertiesSet = WebInspector.CSSMetadata.cssPropertiesMetainfoKeySet();
    var hasSupportedProperties = WebInspector.CSSMetadata.cssPropertiesMetainfo._values.length > 0;
    if (!match || (hasSupportedProperties && !propertiesSet.hasOwnProperty(match[1].toLowerCase())))
        return name.toLowerCase();
    return match[1].toLowerCase();
}
WebInspector.CSSMetadata.isPropertyInherited = function (propertyName) {
    return !!(WebInspector.CSSMetadata.InheritedProperties[WebInspector.CSSMetadata.canonicalPropertyName(propertyName)] || WebInspector.CSSMetadata.NonStandardInheritedProperties[propertyName.toLowerCase()]);
}
WebInspector.CSSMetadata._colors = ["aqua", "black", "blue", "fuchsia", "gray", "green", "lime", "maroon", "navy", "olive", "orange", "purple", "red", "silver", "teal", "white", "yellow", "transparent", "currentcolor", "grey", "aliceblue", "antiquewhite", "aquamarine", "azure", "beige", "bisque", "blanchedalmond", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "gainsboro", "ghostwhite", "gold", "goldenrod", "greenyellow", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "limegreen", "linen", "magenta", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "oldlace", "olivedrab", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "thistle", "tomato", "turquoise", "violet", "wheat", "whitesmoke", "yellowgreen"];
WebInspector.CSSMetadata._colorAwareProperties = ["background", "background-color", "background-image", "border", "border-color", "border-top", "border-right", "border-bottom", "border-left", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "box-shadow", "color", "fill", "outline", "outline-color", "stroke", "text-line-through-color", "text-overline-color", "text-shadow", "text-underline-color", "-webkit-box-shadow", "-webkit-column-rule-color", "-webkit-text-decoration-color", "-webkit-text-emphasis", "-webkit-text-emphasis-color"].keySet();
WebInspector.CSSMetadata._propertyDataMap = {
    "table-layout": {
        values: ["auto", "fixed"]
    },
    "visibility": {
        values: ["hidden", "visible", "collapse"]
    },
    "background-repeat": {
        values: ["repeat", "repeat-x", "repeat-y", "no-repeat", "space", "round"]
    },
    "content": {
        values: ["list-item", "close-quote", "no-close-quote", "no-open-quote", "open-quote"]
    },
    "list-style-image": {
        values: ["none"]
    },
    "clear": {
        values: ["none", "left", "right", "both"]
    },
    "text-underline-mode": {
        values: ["continuous", "skip-white-space"]
    },
    "overflow-x": {
        values: ["hidden", "auto", "visible", "overlay", "scroll"]
    },
    "stroke-linejoin": {
        values: ["round", "miter", "bevel"]
    },
    "baseline-shift": {
        values: ["baseline", "sub", "super"]
    },
    "border-bottom-width": {
        values: ["medium", "thick", "thin"]
    },
    "marquee-speed": {
        values: ["normal", "slow", "fast"]
    },
    "margin-top-collapse": {
        values: ["collapse", "separate", "discard"]
    },
    "max-height": {
        values: ["none"]
    },
    "box-orient": {
        values: ["horizontal", "vertical", "inline-axis", "block-axis"],
    },
    "font-stretch": {
        values: ["normal", "wider", "narrower", "ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded"]
    },
    "text-underline-style": {
        values: ["none", "dotted", "dashed", "solid", "double", "dot-dash", "dot-dot-dash", "wave"]
    },
    "text-overline-mode": {
        values: ["continuous", "skip-white-space"]
    },
    "-webkit-background-composite": {
        values: ["highlight", "clear", "copy", "source-over", "source-in", "source-out", "source-atop", "destination-over", "destination-in", "destination-out", "destination-atop", "xor", "plus-darker", "plus-lighter"]
    },
    "border-left-width": {
        values: ["medium", "thick", "thin"]
    },
    "box-shadow": {
        values: ["inset", "none"]
    },
    "-webkit-writing-mode": {
        values: ["lr", "rl", "tb", "lr-tb", "rl-tb", "tb-rl", "horizontal-tb", "vertical-rl", "vertical-lr", "horizontal-bt"]
    },
    "text-line-through-mode": {
        values: ["continuous", "skip-white-space"]
    },
    "border-collapse": {
        values: ["collapse", "separate"]
    },
    "page-break-inside": {
        values: ["auto", "avoid"]
    },
    "border-top-width": {
        values: ["medium", "thick", "thin"]
    },
    "outline-color": {
        values: ["invert"]
    },
    "text-line-through-style": {
        values: ["none", "dotted", "dashed", "solid", "double", "dot-dash", "dot-dot-dash", "wave"]
    },
    "outline-style": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "cursor": {
        values: ["none", "copy", "auto", "crosshair", "default", "pointer", "move", "vertical-text", "cell", "context-menu", "alias", "progress", "no-drop", "not-allowed", "-webkit-zoom-in", "-webkit-zoom-out", "e-resize", "ne-resize", "nw-resize", "n-resize", "se-resize", "sw-resize", "s-resize", "w-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "col-resize", "row-resize", "text", "wait", "help", "all-scroll", "-webkit-grab", "-webkit-grabbing"]
    },
    "border-width": {
        values: ["medium", "thick", "thin"]
    },
    "border-style": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "size": {
        values: ["a3", "a4", "a5", "b4", "b5", "landscape", "ledger", "legal", "letter", "portrait"]
    },
    "background-size": {
        values: ["contain", "cover"]
    },
    "direction": {
        values: ["ltr", "rtl"]
    },
    "marquee-direction": {
        values: ["left", "right", "auto", "reverse", "forwards", "backwards", "ahead", "up", "down"]
    },
    "enable-background": {
        values: ["accumulate", "new"]
    },
    "float": {
        values: ["none", "left", "right"]
    },
    "overflow-y": {
        values: ["hidden", "auto", "visible", "overlay", "scroll"]
    },
    "margin-bottom-collapse": {
        values: ["collapse", "separate", "discard"]
    },
    "box-reflect": {
        values: ["left", "right", "above", "below"]
    },
    "overflow": {
        values: ["hidden", "auto", "visible", "overlay", "scroll"]
    },
    "text-rendering": {
        values: ["auto", "optimizeSpeed", "optimizeLegibility", "geometricPrecision"]
    },
    "text-align": {
        values: ["-webkit-auto", "start", "end", "left", "right", "center", "justify", "-webkit-left", "-webkit-right", "-webkit-center"]
    },
    "list-style-position": {
        values: ["outside", "inside", "hanging"]
    },
    "margin-bottom": {
        values: ["auto"]
    },
    "color-interpolation": {
        values: ["linearrgb"]
    },
    "background-origin": {
        values: ["border-box", "content-box", "padding-box"]
    },
    "word-wrap": {
        values: ["normal", "break-word"]
    },
    "font-weight": {
        values: ["normal", "bold", "bolder", "lighter", "100", "200", "300", "400", "500", "600", "700", "800", "900"]
    },
    "margin-before-collapse": {
        values: ["collapse", "separate", "discard"]
    },
    "text-overline-width": {
        values: ["normal", "medium", "auto", "thick", "thin"]
    },
    "text-transform": {
        values: ["none", "capitalize", "uppercase", "lowercase"]
    },
    "border-right-style": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "border-left-style": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "-webkit-text-emphasis": {
        values: ["circle", "filled", "open", "dot", "double-circle", "triangle", "sesame"]
    },
    "font-style": {
        values: ["italic", "oblique", "normal"]
    },
    "speak": {
        values: ["none", "normal", "spell-out", "digits", "literal-punctuation", "no-punctuation"]
    },
    "color-rendering": {
        values: ["auto", "optimizeSpeed", "optimizeQuality"]
    },
    "list-style-type": {
        values: ["none", "inline", "disc", "circle", "square", "decimal", "decimal-leading-zero", "arabic-indic", "binary", "bengali", "cambodian", "khmer", "devanagari", "gujarati", "gurmukhi", "kannada", "lower-hexadecimal", "lao", "malayalam", "mongolian", "myanmar", "octal", "oriya", "persian", "urdu", "telugu", "tibetan", "thai", "upper-hexadecimal", "lower-roman", "upper-roman", "lower-greek", "lower-alpha", "lower-latin", "upper-alpha", "upper-latin", "afar", "ethiopic-halehame-aa-et", "ethiopic-halehame-aa-er", "amharic", "ethiopic-halehame-am-et", "amharic-abegede", "ethiopic-abegede-am-et", "cjk-earthly-branch", "cjk-heavenly-stem", "ethiopic", "ethiopic-halehame-gez", "ethiopic-abegede", "ethiopic-abegede-gez", "hangul-consonant", "hangul", "lower-norwegian", "oromo", "ethiopic-halehame-om-et", "sidama", "ethiopic-halehame-sid-et", "somali", "ethiopic-halehame-so-et", "tigre", "ethiopic-halehame-tig", "tigrinya-er", "ethiopic-halehame-ti-er", "tigrinya-er-abegede", "ethiopic-abegede-ti-er", "tigrinya-et", "ethiopic-halehame-ti-et", "tigrinya-et-abegede", "ethiopic-abegede-ti-et", "upper-greek", "upper-norwegian", "asterisks", "footnotes", "hebrew", "armenian", "lower-armenian", "upper-armenian", "georgian", "cjk-ideographic", "hiragana", "katakana", "hiragana-iroha", "katakana-iroha"]
    },
    "-webkit-text-combine": {
        values: ["none", "horizontal"]
    },
    "outline": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "font": {
        values: ["caption", "icon", "menu", "message-box", "small-caption", "-webkit-mini-control", "-webkit-small-control", "-webkit-control", "status-bar", "italic", "oblique", "small-caps", "normal", "bold", "bolder", "lighter", "100", "200", "300", "400", "500", "600", "700", "800", "900", "xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large", "-webkit-xxx-large", "smaller", "larger", "serif", "sans-serif", "cursive", "fantasy", "monospace", "-webkit-body", "-webkit-pictograph"]
    },
    "dominant-baseline": {
        values: ["middle", "auto", "central", "text-before-edge", "text-after-edge", "ideographic", "alphabetic", "hanging", "mathematical", "use-script", "no-change", "reset-size"]
    },
    "display": {
        values: ["none", "inline", "block", "list-item", "run-in", "compact", "inline-block", "table", "inline-table", "table-row-group", "table-header-group", "table-footer-group", "table-row", "table-column-group", "table-column", "table-cell", "table-caption", "-webkit-box", "-webkit-inline-box", "flex", "inline-flex", "grid", "inline-grid"]
    },
    "-webkit-text-emphasis-position": {
        values: ["over", "under"]
    },
    "image-rendering": {
        values: ["auto", "optimizeSpeed", "optimizeQuality"]
    },
    "alignment-baseline": {
        values: ["baseline", "middle", "auto", "before-edge", "after-edge", "central", "text-before-edge", "text-after-edge", "ideographic", "alphabetic", "hanging", "mathematical"]
    },
    "outline-width": {
        values: ["medium", "thick", "thin"]
    },
    "text-line-through-width": {
        values: ["normal", "medium", "auto", "thick", "thin"]
    },
    "box-align": {
        values: ["baseline", "center", "stretch", "start", "end"]
    },
    "border-right-width": {
        values: ["medium", "thick", "thin"]
    },
    "border-top-style": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "line-height": {
        values: ["normal"]
    },
    "text-overflow": {
        values: ["clip", "ellipsis"]
    },
    "overflow-wrap": {
        values: ["normal", "break-word"]
    },
    "box-direction": {
        values: ["normal", "reverse"]
    },
    "margin-after-collapse": {
        values: ["collapse", "separate", "discard"]
    },
    "page-break-before": {
        values: ["left", "right", "auto", "always", "avoid"]
    },
    "border-image": {
        values: ["repeat", "stretch"]
    },
    "text-decoration": {
        values: ["blink", "line-through", "overline", "underline"]
    },
    "position": {
        values: ["absolute", "fixed", "relative", "static"]
    },
    "font-family": {
        values: ["serif", "sans-serif", "cursive", "fantasy", "monospace", "-webkit-body", "-webkit-pictograph"]
    },
    "text-overflow-mode": {
        values: ["clip", "ellipsis"]
    },
    "border-bottom-style": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "unicode-bidi": {
        values: ["normal", "bidi-override", "embed", "isolate", "isolate-override", "plaintext"]
    },
    "clip-rule": {
        values: ["nonzero", "evenodd"]
    },
    "margin-left": {
        values: ["auto"]
    },
    "margin-top": {
        values: ["auto"]
    },
    "zoom": {
        values: ["normal", "document", "reset"]
    },
    "text-overline-style": {
        values: ["none", "dotted", "dashed", "solid", "double", "dot-dash", "dot-dot-dash", "wave"]
    },
    "max-width": {
        values: ["none"]
    },
    "caption-side": {
        values: ["top", "bottom"]
    },
    "empty-cells": {
        values: ["hide", "show"]
    },
    "pointer-events": {
        values: ["none", "all", "auto", "visible", "visiblepainted", "visiblefill", "visiblestroke", "painted", "fill", "stroke", "bounding-box"]
    },
    "letter-spacing": {
        values: ["normal"]
    },
    "background-clip": {
        values: ["border-box", "content-box", "padding-box"]
    },
    "-webkit-font-smoothing": {
        values: ["none", "auto", "antialiased", "subpixel-antialiased"]
    },
    "border": {
        values: ["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"]
    },
    "font-size": {
        values: ["xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large", "-webkit-xxx-large", "smaller", "larger"]
    },
    "font-variant": {
        values: ["small-caps", "normal"]
    },
    "vertical-align": {
        values: ["baseline", "middle", "sub", "super", "text-top", "text-bottom", "top", "bottom", "-webkit-baseline-middle"]
    },
    "marquee-style": {
        values: ["none", "scroll", "slide", "alternate"]
    },
    "white-space": {
        values: ["normal", "nowrap", "pre", "pre-line", "pre-wrap"]
    },
    "text-underline-width": {
        values: ["normal", "medium", "auto", "thick", "thin"]
    },
    "box-lines": {
        values: ["single", "multiple"]
    },
    "page-break-after": {
        values: ["left", "right", "auto", "always", "avoid"]
    },
    "clip-path": {
        values: ["none"]
    },
    "margin": {
        values: ["auto"]
    },
    "marquee-repetition": {
        values: ["infinite"]
    },
    "margin-right": {
        values: ["auto"]
    },
    "word-break": {
        values: ["normal", "break-all", "break-word"]
    },
    "word-spacing": {
        values: ["normal"]
    },
    "-webkit-text-emphasis-style": {
        values: ["circle", "filled", "open", "dot", "double-circle", "triangle", "sesame"]
    },
    "-webkit-transform": {
        values: ["scale", "scaleX", "scaleY", "scale3d", "rotate", "rotateX", "rotateY", "rotateZ", "rotate3d", "skew", "skewX", "skewY", "translate", "translateX", "translateY", "translateZ", "translate3d", "matrix", "matrix3d", "perspective"]
    },
    "image-resolution": {
        values: ["from-image", "snap"]
    },
    "box-sizing": {
        values: ["content-box", "padding-box", "border-box"]
    },
    "clip": {
        values: ["auto"]
    },
    "resize": {
        values: ["none", "both", "horizontal", "vertical"]
    },
    "align-content": {
        values: ["flex-start", "flex-end", "center", "space-between", "space-around", "stretch"]
    },
    "align-items": {
        values: ["flex-start", "flex-end", "center", "baseline", "stretch"]
    },
    "align-self": {
        values: ["auto", "flex-start", "flex-end", "center", "baseline", "stretch"]
    },
    "flex-direction": {
        values: ["row", "row-reverse", "column", "column-reverse"]
    },
    "justify-content": {
        values: ["flex-start", "flex-end", "center", "space-between", "space-around"]
    },
    "flex-wrap": {
        values: ["nowrap", "wrap", "wrap-reverse"]
    },
    "-webkit-animation-timing-function": {
        values: ["ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end", "steps", "cubic-bezier"]
    },
    "-webkit-animation-direction": {
        values: ["normal", "reverse", "alternate", "alternate-reverse"]
    },
    "-webkit-animation-play-state": {
        values: ["running", "paused"]
    },
    "-webkit-animation-fill-mode": {
        values: ["none", "forwards", "backwards", "both"]
    },
    "-webkit-backface-visibility": {
        values: ["visible", "hidden"]
    },
    "-webkit-box-decoration-break": {
        values: ["slice", "clone"]
    },
    "-webkit-column-break-after": {
        values: ["auto", "always", "avoid", "left", "right", "page", "column", "avoid-page", "avoid-column"]
    },
    "-webkit-column-break-before": {
        values: ["auto", "always", "avoid", "left", "right", "page", "column", "avoid-page", "avoid-column"]
    },
    "-webkit-column-break-inside": {
        values: ["auto", "avoid", "avoid-page", "avoid-column"]
    },
    "-webkit-column-span": {
        values: ["none", "all"]
    },
    "-webkit-column-count": {
        values: ["auto"]
    },
    "-webkit-column-gap": {
        values: ["normal"]
    },
    "-webkit-line-break": {
        values: ["auto", "loose", "normal", "strict"]
    },
    "-webkit-perspective": {
        values: ["none"]
    },
    "-webkit-perspective-origin": {
        values: ["left", "center", "right", "top", "bottom"]
    },
    "text-align-last": {
        values: ["auto", "start", "end", "left", "right", "center", "justify"]
    },
    "-webkit-text-decoration-line": {
        values: ["none", "underline", "overline", "line-through", "blink"]
    },
    "-webkit-text-decoration-style": {
        values: ["solid", "double", "dotted", "dashed", "wavy"]
    },
    "-webkit-text-decoration-skip": {
        values: ["none", "objects", "spaces", "ink", "edges", "box-decoration"]
    },
    "-webkit-transform-origin": {
        values: ["left", "center", "right", "top", "bottom"]
    },
    "-webkit-transform-style": {
        values: ["flat", "preserve-3d"]
    },
    "-webkit-transition-timing-function": {
        values: ["ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end", "steps", "cubic-bezier"]
    },
    "-webkit-flex": {
        m: "flexbox"
    },
    "-webkit-flex-basis": {
        m: "flexbox"
    },
    "-webkit-flex-flow": {
        m: "flexbox"
    },
    "-webkit-flex-grow": {
        m: "flexbox"
    },
    "-webkit-flex-shrink": {
        m: "flexbox"
    },
    "-webkit-animation": {
        m: "animations"
    },
    "-webkit-animation-delay": {
        m: "animations"
    },
    "-webkit-animation-duration": {
        m: "animations"
    },
    "-webkit-animation-iteration-count": {
        m: "animations"
    },
    "-webkit-animation-name": {
        m: "animations"
    },
    "-webkit-column-rule": {
        m: "multicol"
    },
    "-webkit-column-rule-color": {
        m: "multicol",
        a: "crc"
    },
    "-webkit-column-rule-style": {
        m: "multicol",
        a: "crs"
    },
    "-webkit-column-rule-width": {
        m: "multicol",
        a: "crw"
    },
    "-webkit-column-width": {
        m: "multicol",
        a: "cw"
    },
    "-webkit-columns": {
        m: "multicol"
    },
    "-webkit-order": {
        m: "flexbox"
    },
    "-webkit-text-decoration-color": {
        m: "text-decor"
    },
    "-webkit-text-emphasis-color": {
        m: "text-decor"
    },
    "-webkit-transition": {
        m: "transitions"
    },
    "-webkit-transition-delay": {
        m: "transitions"
    },
    "-webkit-transition-duration": {
        m: "transitions"
    },
    "-webkit-transition-property": {
        m: "transitions"
    },
    "background": {
        m: "background"
    },
    "background-attachment": {
        m: "background"
    },
    "background-color": {
        m: "background"
    },
    "background-image": {
        m: "background"
    },
    "background-position": {
        m: "background"
    },
    "background-position-x": {
        m: "background"
    },
    "background-position-y": {
        m: "background"
    },
    "background-repeat-x": {
        m: "background"
    },
    "background-repeat-y": {
        m: "background"
    },
    "border-top": {
        m: "background"
    },
    "border-right": {
        m: "background"
    },
    "border-bottom": {
        m: "background"
    },
    "border-left": {
        m: "background"
    },
    "border-radius": {
        m: "background"
    },
    "bottom": {
        m: "visuren"
    },
    "color": {
        m: "color",
        a: "foreground"
    },
    "counter-increment": {
        m: "generate"
    },
    "counter-reset": {
        m: "generate"
    },
    "grid-template-columns": {
        m: "grid"
    },
    "grid-template-rows": {
        m: "grid"
    },
    "height": {
        m: "box"
    },
    "image-orientation": {
        m: "images"
    },
    "left": {
        m: "visuren"
    },
    "list-style": {
        m: "lists"
    },
    "min-height": {
        m: "box"
    },
    "min-width": {
        m: "box"
    },
    "opacity": {
        m: "color",
        a: "transparency"
    },
    "orphans": {
        m: "page"
    },
    "outline-offset": {
        m: "ui"
    },
    "padding": {
        m: "box",
        a: "padding1"
    },
    "padding-bottom": {
        m: "box"
    },
    "padding-left": {
        m: "box"
    },
    "padding-right": {
        m: "box"
    },
    "padding-top": {
        m: "box"
    },
    "page": {
        m: "page"
    },
    "quotes": {
        m: "generate"
    },
    "right": {
        m: "visuren"
    },
    "tab-size": {
        m: "text"
    },
    "text-indent": {
        m: "text"
    },
    "text-shadow": {
        m: "text-decor"
    },
    "top": {
        m: "visuren"
    },
    "unicode-range": {
        m: "fonts",
        a: "descdef-unicode-range"
    },
    "widows": {
        m: "page"
    },
    "width": {
        m: "box"
    },
    "z-index": {
        m: "visuren"
    }
}
WebInspector.CSSMetadata.keywordsForProperty = function (propertyName) {
    var acceptedKeywords = ["inherit", "initial"];
    var descriptor = WebInspector.CSSMetadata.descriptor(propertyName);
    if (descriptor && descriptor.values)
        acceptedKeywords.push.apply(acceptedKeywords, descriptor.values);
    if (propertyName in WebInspector.CSSMetadata._colorAwareProperties)
        acceptedKeywords.push.apply(acceptedKeywords, WebInspector.CSSMetadata._colors);
    return new WebInspector.CSSMetadata(acceptedKeywords);
}
WebInspector.CSSMetadata.descriptor = function (propertyName) {
    if (!propertyName)
        return null;
    var unprefixedName = propertyName.replace(/^-webkit-/, "");
    var entry = WebInspector.CSSMetadata._propertyDataMap[propertyName];
    if (!entry && unprefixedName !== propertyName)
        entry = WebInspector.CSSMetadata._propertyDataMap[unprefixedName];
    return entry || null;
}
WebInspector.CSSMetadata.initializeWithSupportedProperties = function (properties) {
    WebInspector.CSSMetadata.cssPropertiesMetainfo = new WebInspector.CSSMetadata(properties);
}
WebInspector.CSSMetadata.cssPropertiesMetainfoKeySet = function () {
    if (!WebInspector.CSSMetadata._cssPropertiesMetainfoKeySet)
        WebInspector.CSSMetadata._cssPropertiesMetainfoKeySet = WebInspector.CSSMetadata.cssPropertiesMetainfo.keySet();
    return WebInspector.CSSMetadata._cssPropertiesMetainfoKeySet;
}
WebInspector.CSSMetadata.Weight = {
    "-webkit-animation": 1,
    "-webkit-animation-duration": 1,
    "-webkit-animation-iteration-count": 1,
    "-webkit-animation-name": 1,
    "-webkit-animation-timing-function": 1,
    "-webkit-appearance": 1,
    "-webkit-background-clip": 2,
    "-webkit-border-horizontal-spacing": 1,
    "-webkit-border-vertical-spacing": 1,
    "-webkit-box-shadow": 24,
    "-webkit-font-smoothing": 2,
    "-webkit-transform": 1,
    "-webkit-transition": 8,
    "-webkit-transition-delay": 7,
    "-webkit-transition-duration": 7,
    "-webkit-transition-property": 7,
    "-webkit-transition-timing-function": 6,
    "-webkit-user-select": 1,
    "background": 222,
    "background-attachment": 144,
    "background-clip": 143,
    "background-color": 222,
    "background-image": 201,
    "background-origin": 142,
    "background-size": 25,
    "border": 121,
    "border-bottom": 121,
    "border-bottom-color": 121,
    "border-bottom-left-radius": 50,
    "border-bottom-right-radius": 50,
    "border-bottom-style": 114,
    "border-bottom-width": 120,
    "border-collapse": 3,
    "border-left": 95,
    "border-left-color": 95,
    "border-left-style": 89,
    "border-left-width": 94,
    "border-radius": 50,
    "border-right": 93,
    "border-right-color": 93,
    "border-right-style": 88,
    "border-right-width": 93,
    "border-top": 111,
    "border-top-color": 111,
    "border-top-left-radius": 49,
    "border-top-right-radius": 49,
    "border-top-style": 104,
    "border-top-width": 109,
    "bottom": 16,
    "box-shadow": 25,
    "box-sizing": 2,
    "clear": 23,
    "color": 237,
    "cursor": 34,
    "direction": 4,
    "display": 210,
    "fill": 2,
    "filter": 1,
    "float": 105,
    "font": 174,
    "font-family": 25,
    "font-size": 174,
    "font-style": 9,
    "font-weight": 89,
    "height": 161,
    "left": 54,
    "letter-spacing": 3,
    "line-height": 75,
    "list-style": 17,
    "list-style-image": 8,
    "list-style-position": 8,
    "list-style-type": 17,
    "margin": 241,
    "margin-bottom": 226,
    "margin-left": 225,
    "margin-right": 213,
    "margin-top": 241,
    "max-height": 5,
    "max-width": 11,
    "min-height": 9,
    "min-width": 6,
    "opacity": 24,
    "outline": 10,
    "outline-color": 10,
    "outline-style": 10,
    "outline-width": 10,
    "overflow": 57,
    "overflow-x": 56,
    "overflow-y": 57,
    "padding": 216,
    "padding-bottom": 208,
    "padding-left": 216,
    "padding-right": 206,
    "padding-top": 216,
    "position": 136,
    "resize": 1,
    "right": 29,
    "stroke": 1,
    "stroke-width": 1,
    "table-layout": 1,
    "text-align": 66,
    "text-decoration": 53,
    "text-indent": 9,
    "text-overflow": 8,
    "text-shadow": 19,
    "text-transform": 5,
    "top": 71,
    "unicode-bidi": 1,
    "vertical-align": 37,
    "visibility": 11,
    "white-space": 24,
    "width": 255,
    "word-wrap": 6,
    "z-index": 32,
    "zoom": 10
};
WebInspector.CSSMetadata.prototype = {
    startsWith: function (prefix) {
        var firstIndex = this._firstIndexOfPrefix(prefix);
        if (firstIndex === -1)
            return [];
        var results = [];
        while (firstIndex < this._values.length && this._values[firstIndex].startsWith(prefix))
            results.push(this._values[firstIndex++]);
        return results;
    },
    mostUsedOf: function (properties) {
        var maxWeight = 0;
        var index = 0;
        for (var i = 0; i < properties.length; i++) {
            var weight = WebInspector.CSSMetadata.Weight[properties[i]];
            if (weight > maxWeight) {
                maxWeight = weight;
                index = i;
            }
        }
        return index;
    },
    _firstIndexOfPrefix: function (prefix) {
        if (!this._values.length)
            return -1;
        if (!prefix)
            return 0;
        var maxIndex = this._values.length - 1;
        var minIndex = 0;
        var foundIndex;
        do {
            var middleIndex = (maxIndex + minIndex) >> 1;
            if (this._values[middleIndex].startsWith(prefix)) {
                foundIndex = middleIndex;
                break;
            }
            if (this._values[middleIndex] < prefix)
                minIndex = middleIndex + 1;
            else
                maxIndex = middleIndex - 1;
        } while (minIndex <= maxIndex);
        if (foundIndex === undefined)
            return -1;
        while (foundIndex && this._values[foundIndex - 1].startsWith(prefix))
            foundIndex--;
        return foundIndex;
    },
    keySet: function () {
        if (!this._keySet)
            this._keySet = this._values.keySet();
        return this._keySet;
    },
    next: function (str, prefix) {
        return this._closest(str, prefix, 1);
    },
    previous: function (str, prefix) {
        return this._closest(str, prefix, -1);
    },
    _closest: function (str, prefix, shift) {
        if (!str)
            return "";
        var index = this._values.indexOf(str);
        if (index === -1)
            return "";
        if (!prefix) {
            index = (index + this._values.length + shift) % this._values.length;
            return this._values[index];
        }
        var propertiesWithPrefix = this.startsWith(prefix);
        var j = propertiesWithPrefix.indexOf(str);
        j = (j + propertiesWithPrefix.length + shift) % propertiesWithPrefix.length;
        return propertiesWithPrefix[j];
    },
    longhands: function (shorthand) {
        return this._longhands[shorthand];
    },
    shorthands: function (longhand) {
        return this._shorthands[longhand];
    }
}
WebInspector.CSSMetadata.initializeWithSupportedProperties([]);
WebInspector.CSSMetadata.initializeWithSupportedProperties([{
    "name": "-webkit-animation-iteration-count"
}, {
    "name": "-webkit-logical-height"
}, {
    "name": "-webkit-text-emphasis-position"
}, {
    "name": "-webkit-text-emphasis-style"
}, {
    "name": "text-underline-position"
}, {
    "longhands": ["-webkit-column-rule-width", "-webkit-column-rule-style", "-webkit-column-rule-color"],
    "name": "-webkit-column-rule"
}, {
    "name": "buffered-rendering"
}, {
    "name": "-webkit-appearance"
}, {
    "name": "outline-width"
}, {
    "name": "alignment-baseline"
}, {
    "name": "glyph-orientation-vertical"
}, {
    "name": "text-line-through-color"
}, {
    "longhands": ["-webkit-border-after-width", "-webkit-border-after-style", "-webkit-border-after-color"],
    "name": "-webkit-border-after"
}, {
    "name": "-webkit-column-break-inside"
}, {
    "name": "-webkit-print-color-adjust"
}, {
    "name": "list-style-type"
}, {
    "name": "page-break-before"
}, {
    "name": "flood-color"
}, {
    "name": "text-anchor"
}, {
    "name": "-webkit-padding-start"
}, {
    "name": "-webkit-column-rule-color"
}, {
    "name": "padding-left"
}, {
    "name": "shape-outside"
}, {
    "name": "-webkit-margin-before"
}, {
    "name": "-webkit-background-composite"
}, {
    "name": "perspective"
}, {
    "name": "-webkit-animation-play-state"
}, {
    "name": "border-image-repeat"
}, {
    "name": "-webkit-font-size-delta"
}, {
    "name": "border-right-style"
}, {
    "name": "border-left-style"
}, {
    "longhands": ["flex-direction", "flex-wrap"],
    "name": "flex-flow"
}, {
    "name": "outline-color"
}, {
    "name": "flex-grow"
}, {
    "name": "max-width"
}, {
    "longhands": ["grid-column-start", "grid-column-end"],
    "name": "grid-column"
}, {
    "name": "animation-duration"
}, {
    "longhands": ["-webkit-column-width", "-webkit-column-count"],
    "name": "-webkit-columns"
}, {
    "name": "-webkit-box-flex-group"
}, {
    "name": "-webkit-animation-delay"
}, {
    "name": "flex-shrink"
}, {
    "name": "text-rendering"
}, {
    "name": "align-items"
}, {
    "name": "border-collapse"
}, {
    "name": "-webkit-mask-position-x"
}, {
    "name": "-webkit-mask-position-y"
}, {
    "name": "outline-style"
}, {
    "name": "-webkit-margin-bottom-collapse"
}, {
    "name": "color-interpolation-filters"
}, {
    "name": "kerning"
}, {
    "name": "font-variant"
}, {
    "name": "-webkit-animation-fill-mode"
}, {
    "longhands": ["border-right-width", "border-right-style", "border-right-color"],
    "name": "border-right"
}, {
    "name": "touch-action-delay"
}, {
    "name": "visibility"
}, {
    "name": "-internal-marquee-speed"
}, {
    "name": "-webkit-border-before-style"
}, {
    "name": "resize"
}, {
    "name": "-webkit-rtl-ordering"
}, {
    "name": "-webkit-box-ordinal-group"
}, {
    "name": "paint-order"
}, {
    "name": "stroke-linecap"
}, {
    "name": "animation-direction"
}, {
    "name": "-internal-marquee-direction"
}, {
    "name": "-webkit-background-size"
}, {
    "name": "border-top-left-radius"
}, {
    "name": "-webkit-column-width"
}, {
    "name": "-webkit-box-align"
}, {
    "name": "-webkit-padding-after"
}, {
    "longhands": ["list-style-type", "list-style-position", "list-style-image"],
    "name": "list-style"
}, {
    "name": "-webkit-mask-repeat-y"
}, {
    "name": "-webkit-margin-before-collapse"
}, {
    "name": "stroke"
}, {
    "name": "text-decoration-line"
}, {
    "name": "-webkit-font-feature-settings"
}, {
    "name": "-webkit-mask-repeat-x"
}, {
    "name": "padding-bottom"
}, {
    "name": "font-style"
}, {
    "name": "-webkit-transition-delay"
}, {
    "longhands": ["background-repeat-x", "background-repeat-y"],
    "name": "background-repeat"
}, {
    "name": "flex-basis"
}, {
    "name": "-webkit-margin-after"
}, {
    "longhands": ["-webkit-transform-origin-x", "-webkit-transform-origin-y", "-webkit-transform-origin-z"],
    "name": "-webkit-transform-origin"
}, {
    "name": "border-image-slice"
}, {
    "name": "vector-effect"
}, {
    "name": "-webkit-animation-timing-function"
}, {
    "name": "text-underline-style"
}, {
    "name": "-webkit-border-after-style"
}, {
    "name": "-webkit-perspective-origin-x"
}, {
    "name": "-webkit-perspective-origin-y"
}, {
    "longhands": ["outline-color", "outline-style", "outline-width"],
    "name": "outline"
}, {
    "name": "table-layout"
}, {
    "longhands": ["text-decoration-line", "text-decoration-style", "text-decoration-color"],
    "name": "text-decoration"
}, {
    "name": "transition-duration"
}, {
    "name": "order"
}, {
    "name": "-webkit-box-orient"
}, {
    "name": "counter-reset"
}, {
    "name": "flood-opacity"
}, {
    "name": "flex-direction"
}, {
    "name": "-webkit-text-stroke-width"
}, {
    "name": "min-height"
}, {
    "longhands": ["-webkit-mask-box-image-source", "-webkit-mask-box-image-slice", "-webkit-mask-box-image-width", "-webkit-mask-box-image-outset", "-webkit-mask-box-image-repeat"],
    "name": "-webkit-mask-box-image"
}, {
    "name": "left"
}, {
    "longhands": ["-webkit-mask-image", "-webkit-mask-position-x", "-webkit-mask-position-y", "-webkit-mask-size", "-webkit-mask-repeat-x", "-webkit-mask-repeat-y", "-webkit-mask-origin", "-webkit-mask-clip"],
    "name": "-webkit-mask"
}, {
    "name": "-webkit-border-after-width"
}, {
    "name": "stroke-width"
}, {
    "name": "-webkit-box-decoration-break"
}, {
    "longhands": ["-webkit-mask-position-x", "-webkit-mask-position-y"],
    "name": "-webkit-mask-position"
}, {
    "name": "background-origin"
}, {
    "name": "-webkit-border-start-color"
}, {
    "name": "grid-auto-flow"
}, {
    "name": "-webkit-background-clip"
}, {
    "name": "-webkit-border-horizontal-spacing"
}, {
    "longhands": ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
    "name": "border-radius"
}, {
    "longhands": ["flex-grow", "flex-shrink", "flex-basis"],
    "name": "flex"
}, {
    "name": "text-indent"
}, {
    "name": "text-transform"
}, {
    "name": "text-line-through-mode"
}, {
    "name": "font-size"
}, {
    "name": "-webkit-animation-name"
}, {
    "longhands": ["-webkit-text-stroke-width", "-webkit-text-stroke-color"],
    "name": "-webkit-text-stroke"
}, {
    "name": "padding-top"
}, {
    "name": "-webkit-border-end-width"
}, {
    "name": "-webkit-text-combine"
}, {
    "name": "grid-template-rows"
}, {
    "name": "content"
}, {
    "name": "padding-right"
}, {
    "name": "-webkit-transform"
}, {
    "name": "marker-mid"
}, {
    "name": "-webkit-min-logical-width"
}, {
    "name": "clip-rule"
}, {
    "name": "text-overline-width"
}, {
    "name": "font-family"
}, {
    "longhands": ["transition-property", "transition-duration", "transition-timing-function", "transition-delay"],
    "name": "transition"
}, {
    "name": "-webkit-border-fit"
}, {
    "name": "filter"
}, {
    "name": "border-right-width"
}, {
    "name": "-webkit-mask-composite"
}, {
    "name": "-webkit-line-box-contain"
}, {
    "name": "color-interpolation"
}, {
    "name": "border-top-style"
}, {
    "name": "fill-opacity"
}, {
    "name": "marker-start"
}, {
    "name": "border-bottom-width"
}, {
    "longhands": ["-webkit-text-emphasis-style", "-webkit-text-emphasis-color"],
    "name": "-webkit-text-emphasis"
}, {
    "longhands": ["grid-row-start", "grid-column-start", "grid-row-end", "grid-column-end"],
    "name": "grid-area"
}, {
    "name": "size"
}, {
    "name": "background-clip"
}, {
    "name": "-webkit-text-fill-color"
}, {
    "name": "top"
}, {
    "name": "-webkit-box-reflect"
}, {
    "longhands": ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"],
    "name": "border-width"
}, {
    "name": "-webkit-column-rule-style"
}, {
    "name": "-webkit-column-count"
}, {
    "name": "animation-play-state"
}, {
    "longhands": ["padding-top", "padding-right", "padding-bottom", "padding-left"],
    "name": "padding"
}, {
    "name": "dominant-baseline"
}, {
    "name": "background-attachment"
}, {
    "name": "-webkit-box-flex"
}, {
    "name": "-webkit-border-start-width"
}, {
    "name": "isolation"
}, {
    "name": "color-rendering"
}, {
    "name": "border-left-width"
}, {
    "name": "grid-column-end"
}, {
    "name": "background-blend-mode"
}, {
    "name": "vertical-align"
}, {
    "name": "-webkit-max-logical-height"
}, {
    "name": "grid-auto-rows"
}, {
    "name": "shape-padding"
}, {
    "name": "-internal-marquee-increment"
}, {
    "name": "margin-left"
}, {
    "name": "animation-name"
}, {
    "name": "border-image-source"
}, {
    "longhands": ["border-top-color", "border-top-style", "border-top-width", "border-right-color", "border-right-style", "border-right-width", "border-bottom-color", "border-bottom-style", "border-bottom-width", "border-left-color", "border-left-style", "border-left-width"],
    "name": "border"
}, {
    "name": "-webkit-transition-timing-function"
}, {
    "name": "-webkit-wrap-flow"
}, {
    "name": "margin-bottom"
}, {
    "name": "unicode-range"
}, {
    "longhands": ["animation-name", "animation-duration", "animation-timing-function", "animation-delay", "animation-iteration-count", "animation-direction", "animation-fill-mode", "animation-play-state"],
    "name": "animation"
}, {
    "name": "glyph-orientation-horizontal"
}, {
    "name": "font-weight"
}, {
    "name": "shape-margin"
}, {
    "name": "-webkit-margin-end"
}, {
    "name": "object-position"
}, {
    "name": "page-break-after"
}, {
    "name": "transition-property"
}, {
    "name": "white-space"
}, {
    "name": "-webkit-border-after-color"
}, {
    "name": "-webkit-transform-origin-x"
}, {
    "name": "-webkit-max-logical-width"
}, {
    "name": "-webkit-border-before-color"
}, {
    "name": "font-kerning"
}, {
    "name": "clear"
}, {
    "name": "animation-timing-function"
}, {
    "longhands": ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
    "name": "-webkit-border-radius"
}, {
    "name": "text-underline-mode"
}, {
    "name": "-webkit-text-decorations-in-effect"
}, {
    "name": "-webkit-animation-direction"
}, {
    "name": "justify-self"
}, {
    "name": "transition-timing-function"
}, {
    "name": "counter-increment"
}, {
    "name": "-webkit-transform-style"
}, {
    "name": "grid-auto-columns"
}, {
    "longhands": ["font-family", "font-size", "font-style", "font-variant", "font-weight", "line-height"],
    "name": "font"
}, {
    "name": "flex-wrap"
}, {
    "name": "grid-row-start"
}, {
    "name": "list-style-image"
}, {
    "name": "-webkit-tap-highlight-color"
}, {
    "name": "-webkit-text-emphasis-color"
}, {
    "longhands": ["border-left-width", "border-left-style", "border-left-color"],
    "name": "border-left"
}, {
    "name": "-webkit-border-end-color"
}, {
    "name": "-internal-callback"
}, {
    "name": "box-shadow"
}, {
    "name": "align-self"
}, {
    "longhands": ["border-bottom-width", "border-bottom-style", "border-bottom-color"],
    "name": "border-bottom"
}, {
    "longhands": ["-webkit-border-horizontal-spacing", "-webkit-border-vertical-spacing"],
    "name": "border-spacing"
}, {
    "name": "text-underline-color"
}, {
    "name": "text-line-through-style"
}, {
    "name": "-webkit-column-span"
}, {
    "name": "grid-row-end"
}, {
    "longhands": ["-webkit-border-end-width", "-webkit-border-end-style", "-webkit-border-end-color"],
    "name": "-webkit-border-end"
}, {
    "name": "perspective-origin"
}, {
    "name": "page-break-inside"
}, {
    "name": "orphans"
}, {
    "name": "-webkit-border-start-style"
}, {
    "name": "scroll-behavior"
}, {
    "name": "-webkit-hyphenate-character"
}, {
    "name": "column-fill"
}, {
    "name": "tab-size"
}, {
    "name": "border-bottom-color"
}, {
    "name": "border-bottom-right-radius"
}, {
    "name": "line-height"
}, {
    "name": "stroke-linejoin"
}, {
    "name": "text-align-last"
}, {
    "name": "text-overline-mode"
}, {
    "name": "word-spacing"
}, {
    "name": "transform-style"
}, {
    "name": "-webkit-app-region"
}, {
    "name": "-webkit-border-end-style"
}, {
    "name": "-webkit-transform-origin-z"
}, {
    "name": "-webkit-aspect-ratio"
}, {
    "name": "-webkit-transform-origin-y"
}, {
    "name": "background-repeat-x"
}, {
    "name": "background-repeat-y"
}, {
    "longhands": ["grid-row-start", "grid-row-end"],
    "name": "grid-row"
}, {
    "name": "-webkit-ruby-position"
}, {
    "name": "-webkit-logical-width"
}, {
    "longhands": ["border-image-source", "border-image-slice", "border-image-width", "border-image-outset", "border-image-repeat"],
    "name": "border-image"
}, {
    "name": "caption-side"
}, {
    "name": "mask-source-type"
}, {
    "name": "-webkit-mask-box-image-slice"
}, {
    "name": "-webkit-border-image"
}, {
    "name": "-webkit-text-security"
}, {
    "name": "-webkit-mask-box-image-repeat"
}, {
    "longhands": ["-webkit-mask-repeat-x", "-webkit-mask-repeat-y"],
    "name": "-webkit-mask-repeat"
}, {
    "name": "baseline-shift"
}, {
    "name": "text-justify"
}, {
    "name": "text-decoration-color"
}, {
    "name": "color"
}, {
    "name": "shape-image-threshold"
}, {
    "longhands": ["min-height", "max-height"],
    "name": "height"
}, {
    "name": "margin-right"
}, {
    "name": "color-profile"
}, {
    "name": "speak"
}, {
    "name": "border-bottom-left-radius"
}, {
    "name": "-webkit-column-break-after"
}, {
    "name": "-webkit-font-smoothing"
}, {
    "name": "clip"
}, {
    "name": "-webkit-line-break"
}, {
    "name": "fill-rule"
}, {
    "name": "-webkit-margin-start"
}, {
    "name": "min-width"
}, {
    "name": "-webkit-column-gap"
}, {
    "name": "empty-cells"
}, {
    "name": "direction"
}, {
    "name": "clip-path"
}, {
    "name": "-webkit-wrap-through"
}, {
    "name": "justify-content"
}, {
    "name": "z-index"
}, {
    "name": "background-position-y"
}, {
    "name": "text-decoration-style"
}, {
    "name": "grid-template-areas"
}, {
    "name": "-webkit-min-logical-height"
}, {
    "name": "-webkit-user-select"
}, {
    "name": "cursor"
}, {
    "name": "-webkit-mask-box-image-source"
}, {
    "longhands": ["margin-top", "margin-right", "margin-bottom", "margin-left"],
    "name": "margin"
}, {
    "longhands": ["-webkit-animation-name", "-webkit-animation-duration", "-webkit-animation-timing-function", "-webkit-animation-delay", "-webkit-animation-iteration-count", "-webkit-animation-direction", "-webkit-animation-fill-mode", "-webkit-animation-play-state"],
    "name": "-webkit-animation"
}, {
    "name": "letter-spacing"
}, {
    "name": "orientation"
}, {
    "name": "will-change"
}, {
    "name": "mix-blend-mode"
}, {
    "name": "text-line-through-width"
}, {
    "name": "-webkit-highlight"
}, {
    "name": "transform-origin"
}, {
    "name": "font-variant-ligatures"
}, {
    "name": "-webkit-animation-duration"
}, {
    "name": "text-overline-color"
}, {
    "name": "-webkit-mask-origin"
}, {
    "name": "-webkit-clip-path"
}, {
    "name": "word-break"
}, {
    "longhands": ["-webkit-border-before-width", "-webkit-border-before-style", "-webkit-border-before-color"],
    "name": "-webkit-border-before"
}, {
    "name": "text-overflow"
}, {
    "name": "-webkit-locale"
}, {
    "name": "font-stretch"
}, {
    "name": "border-top-right-radius"
}, {
    "name": "border-image-outset"
}, {
    "name": "fill"
}, {
    "name": "touch-action"
}, {
    "name": "border-right-color"
}, {
    "name": "min-zoom"
}, {
    "name": "-webkit-border-before-width"
}, {
    "name": "backface-visibility"
}, {
    "name": "background-image"
}, {
    "name": "-webkit-transition-property"
}, {
    "name": "writing-mode"
}, {
    "name": "stroke-opacity"
}, {
    "name": "box-sizing"
}, {
    "name": "margin-top"
}, {
    "name": "position"
}, {
    "name": "enable-background"
}, {
    "name": "list-style-position"
}, {
    "name": "-webkit-box-pack"
}, {
    "name": "quotes"
}, {
    "longhands": ["border-top-width", "border-top-style", "border-top-color"],
    "name": "border-top"
}, {
    "longhands": ["-webkit-transition-property", "-webkit-transition-duration", "-webkit-transition-timing-function", "-webkit-transition-delay"],
    "name": "-webkit-transition"
}, {
    "name": "-webkit-column-break-before"
}, {
    "name": "lighting-color"
}, {
    "name": "background-size"
}, {
    "name": "-webkit-mask-size"
}, {
    "name": "animation-fill-mode"
}, {
    "name": "-webkit-filter"
}, {
    "name": "word-wrap"
}, {
    "name": "max-zoom"
}, {
    "name": "text-overline-style"
}, {
    "longhands": ["background-image", "background-position-x", "background-position-y", "background-size", "background-repeat-x", "background-repeat-y", "background-attachment", "background-origin", "background-clip", "background-color"],
    "name": "background"
}, {
    "name": "-webkit-padding-before"
}, {
    "name": "grid-column-start"
}, {
    "name": "text-align"
}, {
    "name": "marker-end"
}, {
    "name": "zoom"
}, {
    "longhands": ["-webkit-margin-before-collapse", "-webkit-margin-after-collapse"],
    "name": "-webkit-margin-collapse"
}, {
    "name": "-webkit-margin-top-collapse"
}, {
    "name": "page"
}, {
    "name": "right"
}, {
    "name": "-webkit-user-modify"
}, {
    "longhands": ["marker-start", "marker-mid", "marker-end"],
    "name": "marker"
}, {
    "name": "mask-type"
}, {
    "name": "-webkit-transition-duration"
}, {
    "name": "-webkit-writing-mode"
}, {
    "name": "border-top-width"
}, {
    "name": "bottom"
}, {
    "name": "-webkit-user-drag"
}, {
    "name": "-webkit-border-vertical-spacing"
}, {
    "name": "background-color"
}, {
    "name": "-webkit-backface-visibility"
}, {
    "name": "-webkit-padding-end"
}, {
    "longhands": ["-webkit-border-start-width", "-webkit-border-start-style", "-webkit-border-start-color"],
    "name": "-webkit-border-start"
}, {
    "name": "animation-delay"
}, {
    "name": "unicode-bidi"
}, {
    "name": "text-shadow"
}, {
    "name": "-webkit-box-direction"
}, {
    "name": "image-rendering"
}, {
    "name": "src"
}, {
    "name": "-internal-marquee-repetition"
}, {
    "name": "pointer-events"
}, {
    "name": "border-image-width"
}, {
    "name": "-webkit-mask-clip"
}, {
    "name": "-webkit-mask-image"
}, {
    "name": "float"
}, {
    "name": "max-height"
}, {
    "name": "outline-offset"
}, {
    "name": "-webkit-box-shadow"
}, {
    "name": "overflow-wrap"
}, {
    "name": "-internal-marquee-style"
}, {
    "name": "transform"
}, {
    "longhands": ["min-width", "max-width"],
    "name": "width"
}, {
    "name": "stroke-miterlimit"
}, {
    "name": "stop-opacity"
}, {
    "name": "border-top-color"
}, {
    "longhands": ["background-position-x", "background-position-y"],
    "name": "background-position"
}, {
    "name": "object-fit"
}, {
    "name": "-webkit-mask-box-image-width"
}, {
    "name": "-webkit-background-origin"
}, {
    "name": "transition-delay"
}, {
    "longhands": ["border-top-style", "border-right-style", "border-bottom-style", "border-left-style"],
    "name": "border-style"
}, {
    "name": "animation-iteration-count"
}, {
    "name": "-webkit-margin-after-collapse"
}, {
    "longhands": ["overflow-x", "overflow-y"],
    "name": "overflow"
}, {
    "name": "user-zoom"
}, {
    "name": "grid-template-columns"
}, {
    "name": "-webkit-perspective-origin"
}, {
    "name": "display"
}, {
    "name": "-webkit-column-rule-width"
}, {
    "name": "-webkit-box-lines"
}, {
    "longhands": ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"],
    "name": "border-color"
}, {
    "name": "stroke-dashoffset"
}, {
    "name": "widows"
}, {
    "name": "border-left-color"
}, {
    "name": "overflow-y"
}, {
    "name": "overflow-x"
}, {
    "name": "shape-rendering"
}, {
    "name": "opacity"
}, {
    "name": "-webkit-perspective"
}, {
    "name": "text-underline-width"
}, {
    "name": "-webkit-text-stroke-color"
}, {
    "name": "-webkit-text-orientation"
}, {
    "name": "-webkit-mask-box-image-outset"
}, {
    "name": "align-content"
}, {
    "name": "border-bottom-style"
}, {
    "name": "mask"
}, {
    "name": "background-position-x"
}, {
    "name": "stop-color"
}, {
    "name": "stroke-dasharray"
}, {
    "name": "-webkit-line-clamp"
}]);
WebInspector.StatusBarItem = function (elementType) {
    this.element = document.createElement(elementType);
    this._enabled = true;
    this._visible = true;
}
WebInspector.StatusBarItem.prototype = {
    setEnabled: function (value) {
        if (this._enabled === value)
            return;
        this._enabled = value;
        this._applyEnabledState();
    },
    _applyEnabledState: function () {
        this.element.disabled = !this._enabled;
    },
    get visible() {
        return this._visible;
    },
    set visible(x) {
        if (this._visible === x)
            return;
        this.element.classList.toggle("hidden", !x);
        this._visible = x;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.StatusBarText = function (text, className) {
    WebInspector.StatusBarItem.call(this, "span");
    this.element.className = "status-bar-item status-bar-text";
    if (className)
        this.element.classList.add(className);
    this.element.textContent = text;
}
WebInspector.StatusBarText.prototype = {
    setText: function (text) {
        this.element.textContent = text;
    },
    __proto__: WebInspector.StatusBarItem.prototype
}
WebInspector.StatusBarInput = function (placeholder, width) {
    WebInspector.StatusBarItem.call(this, "input");
    this.element.className = "status-bar-item";
    this.element.addEventListener("input", this._onChangeCallback.bind(this), false);
    if (width)
        this.element.style.width = width + "px";
    if (placeholder)
        this.element.setAttribute("placeholder", placeholder);
}
WebInspector.StatusBarInput.prototype = {
    setOnChangeHandler: function (handler) {
        this._onChangeHandler = handler;
    },
    setValue: function (value) {
        this.element.value = value;
        this._onChangeCallback();
    },
    _onChangeCallback: function () {
        this._onChangeHandler && this._onChangeHandler(this.element.value);
    },
    __proto__: WebInspector.StatusBarItem.prototype
}
WebInspector.StatusBarButton = function (title, className, states) {
    WebInspector.StatusBarItem.call(this, "button");
    this.element.className = className + " status-bar-item";
    this.element.addEventListener("click", this._clicked.bind(this), false);
    this.glyph = document.createElement("div");
    this.glyph.className = "glyph";
    this.element.appendChild(this.glyph);
    this.glyphShadow = document.createElement("div");
    this.glyphShadow.className = "glyph shadow";
    this.element.appendChild(this.glyphShadow);
    this.states = states;
    if (!states)
        this.states = 2;
    if (states == 2)
        this._state = false;
    else
        this._state = 0;
    this.title = title;
    this.className = className;
}
WebInspector.StatusBarButton.prototype = {
    _clicked: function () {
        this.dispatchEventToListeners("click");
        if (this._longClickInterval) {
            clearInterval(this._longClickInterval);
            delete this._longClickInterval;
        }
    },
    _applyEnabledState: function () {
        this.element.disabled = !this._enabled;
        if (this._longClickInterval) {
            clearInterval(this._longClickInterval);
            delete this._longClickInterval;
        }
    },
    enabled: function () {
        return this._enabled;
    },
    get title() {
        return this._title;
    },
    set title(x) {
        if (this._title === x)
            return;
        this._title = x;
        this.element.title = x;
    },
    get state() {
        return this._state;
    },
    set state(x) {
        if (this._state === x)
            return;
        if (this.states === 2)
            this.element.classList.toggle("toggled-on", x);
        else {
            this.element.classList.remove("toggled-" + this._state);
            if (x !== 0)
                this.element.classList.add("toggled-" + x);
        }
        this._state = x;
    },
    get toggled() {
        if (this.states !== 2)
            throw ("Only used toggled when there are 2 states, otherwise, use state");
        return this.state;
    },
    set toggled(x) {
        if (this.states !== 2)
            throw ("Only used toggled when there are 2 states, otherwise, use state");
        this.state = x;
    },
    makeLongClickEnabled: function () {
        var boundMouseDown = mouseDown.bind(this);
        var boundMouseUp = mouseUp.bind(this);
        this.element.addEventListener("mousedown", boundMouseDown, false);
        this.element.addEventListener("mouseout", boundMouseUp, false);
        this.element.addEventListener("mouseup", boundMouseUp, false);
        var longClicks = 0;
        this._longClickData = {
            mouseUp: boundMouseUp,
            mouseDown: boundMouseDown
        };

        function mouseDown(e) {
            if (e.which !== 1)
                return;
            longClicks = 0;
            this._longClickInterval = setInterval(longClicked.bind(this), 200);
        }

        function mouseUp(e) {
            if (e.which !== 1)
                return;
            if (this._longClickInterval) {
                clearInterval(this._longClickInterval);
                delete this._longClickInterval;
            }
        }

        function longClicked() {
            ++longClicks;
            this.dispatchEventToListeners(longClicks === 1 ? "longClickDown" : "longClickPress");
        }
    },
    unmakeLongClickEnabled: function () {
        if (!this._longClickData)
            return;
        this.element.removeEventListener("mousedown", this._longClickData.mouseDown, false);
        this.element.removeEventListener("mouseout", this._longClickData.mouseUp, false);
        this.element.removeEventListener("mouseup", this._longClickData.mouseUp, false);
        delete this._longClickData;
    },
    setLongClickOptionsEnabled: function (buttonsProvider) {
        if (buttonsProvider) {
            if (!this._longClickOptionsData) {
                this.makeLongClickEnabled();
                this.longClickGlyph = document.createElement("div");
                this.longClickGlyph.className = "fill long-click-glyph";
                this.element.appendChild(this.longClickGlyph);
                this.longClickGlyphShadow = document.createElement("div");
                this.longClickGlyphShadow.className = "fill long-click-glyph shadow";
                this.element.appendChild(this.longClickGlyphShadow);
                var longClickDownListener = this._showOptions.bind(this);
                this.addEventListener("longClickDown", longClickDownListener, this);
                this._longClickOptionsData = {
                    glyphElement: this.longClickGlyph,
                    glyphShadowElement: this.longClickGlyphShadow,
                    longClickDownListener: longClickDownListener
                };
            }
            this._longClickOptionsData.buttonsProvider = buttonsProvider;
        } else {
            if (!this._longClickOptionsData)
                return;
            this.element.removeChild(this._longClickOptionsData.glyphElement);
            this.element.removeChild(this._longClickOptionsData.glyphShadowElement);
            this.removeEventListener("longClickDown", this._longClickOptionsData.longClickDownListener, this);
            delete this._longClickOptionsData;
            this.unmakeLongClickEnabled();
        }
    },
    _showOptions: function () {
        var buttons = this._longClickOptionsData.buttonsProvider();
        var mainButtonClone = new WebInspector.StatusBarButton(this.title, this.className, this.states);
        mainButtonClone.addEventListener("click", this._clicked, this);
        mainButtonClone.state = this.state;
        buttons.push(mainButtonClone);
        document.documentElement.addEventListener("mouseup", mouseUp, false);
        var optionsGlassPane = new WebInspector.GlassPane();
        var optionsBarElement = optionsGlassPane.element.createChild("div", "alternate-status-bar-buttons-bar");
        const buttonHeight = 23;
        var hostButtonPosition = this.element.totalOffset();
        var topNotBottom = hostButtonPosition.top + buttonHeight * buttons.length < document.documentElement.offsetHeight;
        if (topNotBottom)
            buttons = buttons.reverse();
        optionsBarElement.style.height = (buttonHeight * buttons.length) + "px";
        if (topNotBottom)
            optionsBarElement.style.top = (hostButtonPosition.top + 1) + "px";
        else
            optionsBarElement.style.top = (hostButtonPosition.top - (buttonHeight * (buttons.length - 1))) + "px";
        optionsBarElement.style.left = (hostButtonPosition.left + 1) + "px";
        for (var i = 0; i < buttons.length; ++i) {
            buttons[i].element.addEventListener("mousemove", mouseOver, false);
            buttons[i].element.addEventListener("mouseout", mouseOut, false);
            optionsBarElement.appendChild(buttons[i].element);
        }
        var hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
        buttons[hostButtonIndex].element.classList.add("emulate-active");

        function mouseOver(e) {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("status-bar-item");
            buttonElement.classList.add("emulate-active");
        }

        function mouseOut(e) {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("status-bar-item");
            buttonElement.classList.remove("emulate-active");
        }

        function mouseUp(e) {
            if (e.which !== 1)
                return;
            optionsGlassPane.dispose();
            document.documentElement.removeEventListener("mouseup", mouseUp, false);
            for (var i = 0; i < buttons.length; ++i) {
                if (buttons[i].element.classList.contains("emulate-active")) {
                    buttons[i].element.classList.remove("emulate-active");
                    buttons[i]._clicked();
                    break;
                }
            }
        }
    },
    __proto__: WebInspector.StatusBarItem.prototype
}
WebInspector.StatusBarComboBox = function (changeHandler, className) {
    WebInspector.StatusBarItem.call(this, "span");
    this.element.className = "status-bar-select-container";
    this._selectElement = this.element.createChild("select", "status-bar-item");
    this.element.createChild("div", "status-bar-select-arrow");
    if (changeHandler)
        this._selectElement.addEventListener("change", changeHandler, false);
    if (className)
        this._selectElement.classList.add(className);
}
WebInspector.StatusBarComboBox.prototype = {
    selectElement: function () {
        return this._selectElement;
    },
    size: function () {
        return this._selectElement.childElementCount;
    },
    addOption: function (option) {
        this._selectElement.appendChild(option);
    },
    createOption: function (label, title, value) {
        var option = this._selectElement.createChild("option");
        option.text = label;
        if (title)
            option.title = title;
        if (typeof value !== "undefined")
            option.value = value;
        return option;
    },
    _applyEnabledState: function () {
        this._selectElement.disabled = !this._enabled;
    },
    removeOption: function (option) {
        this._selectElement.removeChild(option);
    },
    removeOptions: function () {
        this._selectElement.removeChildren();
    },
    selectedOption: function () {
        if (this._selectElement.selectedIndex >= 0)
            return this._selectElement[this._selectElement.selectedIndex];
        return null;
    },
    select: function (option) {
        this._selectElement.selectedIndex = Array.prototype.indexOf.call(this._selectElement, option);
    },
    setSelectedIndex: function (index) {
        this._selectElement.selectedIndex = index;
    },
    selectedIndex: function () {
        return this._selectElement.selectedIndex;
    },
    __proto__: WebInspector.StatusBarItem.prototype
}
WebInspector.StatusBarCheckbox = function (title) {
    WebInspector.StatusBarItem.call(this, "label");
    this.element.classList.add("status-bar-item", "checkbox");
    this._checkbox = this.element.createChild("input");
    this._checkbox.type = "checkbox";
    this.element.createTextChild(title);
}
WebInspector.StatusBarCheckbox.prototype = {
    checked: function () {
        return this._checkbox.checked;
    },
    __proto__: WebInspector.StatusBarItem.prototype
}
WebInspector.StatusBarStatesSettingButton = function (className, states, titles, currentStateSetting, lastStateSetting, stateChangedCallback) {
    WebInspector.StatusBarButton.call(this, "", className, states.length);
    var onClickBound = this._onClick.bind(this);
    this.addEventListener("click", onClickBound, this);
    this._states = states;
    this._buttons = [];
    for (var index = 0; index < states.length; index++) {
        var button = new WebInspector.StatusBarButton(titles[index], className, states.length);
        button.state = this._states[index];
        button.addEventListener("click", onClickBound, this);
        this._buttons.push(button);
    }
    this._currentStateSetting = currentStateSetting;
    this._lastStateSetting = lastStateSetting;
    this._stateChangedCallback = stateChangedCallback;
    this.setLongClickOptionsEnabled(this._createOptions.bind(this));
    this._currentState = null;
    this.toggleState(this._defaultState());
}
WebInspector.StatusBarStatesSettingButton.prototype = {
    _onClick: function (e) {
        this.toggleState(e.target.state);
    },
    toggleState: function (state) {
        if (this._currentState === state)
            return;
        if (this._currentState)
            this._lastStateSetting.set(this._currentState);
        this._currentState = state;
        this._currentStateSetting.set(this._currentState);
        if (this._stateChangedCallback)
            this._stateChangedCallback(state);
        var defaultState = this._defaultState();
        this.state = defaultState;
        this.title = this._buttons[this._states.indexOf(defaultState)].title;
    },
    _defaultState: function () {
        if (!this._currentState) {
            var state = this._currentStateSetting.get();
            return this._states.indexOf(state) >= 0 ? state : this._states[0];
        }
        var lastState = this._lastStateSetting.get();
        if (lastState && this._states.indexOf(lastState) >= 0 && lastState != this._currentState)
            return lastState;
        if (this._states.length > 1 && this._currentState === this._states[0])
            return this._states[1];
        return this._states[0];
    },
    _createOptions: function () {
        var options = [];
        for (var index = 0; index < this._states.length; index++) {
            if (this._states[index] !== this.state && this._states[index] !== this._currentState)
                options.push(this._buttons[index]);
        }
        return options;
    },
    __proto__: WebInspector.StatusBarButton.prototype
}
WebInspector.DropDownMenu = function () {
    this.element = document.createElementWithClass("select", "drop-down-menu");
    this.element.addEventListener("mousedown", this._onBeforeMouseDown.bind(this), true);
    this.element.addEventListener("mousedown", consumeEvent, false);
    this.element.addEventListener("change", this._onChange.bind(this), false);
}
WebInspector.DropDownMenu.Events = {
    BeforeShow: "BeforeShow",
    ItemSelected: "ItemSelected"
}
WebInspector.DropDownMenu.prototype = {
    _onBeforeMouseDown: function () {
        this.dispatchEventToListeners(WebInspector.DropDownMenu.Events.BeforeShow, null);
    },
    _onChange: function () {
        var options = this.element.options;
        var selectedOption = options[this.element.selectedIndex];
        this.dispatchEventToListeners(WebInspector.DropDownMenu.Events.ItemSelected, selectedOption.id);
    },
    addItem: function (id, title) {
        var option = new Option(title);
        option.id = id;
        this.element.appendChild(option);
    },
    selectItem: function (id) {
        var children = this.element.children;
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            if (child.id === id) {
                this.element.selectedIndex = i;
                return;
            }
        }
        this.element.selectedIndex = -1;
    },
    clear: function () {
        this.element.removeChildren();
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.CompletionDictionary = function () {}
WebInspector.CompletionDictionary.prototype = {
    addWord: function (word) {},
    removeWord: function (word) {},
    hasWord: function (word) {},
    wordsWithPrefix: function (prefix) {},
    wordCount: function (word) {},
    reset: function () {}
}
WebInspector.SampleCompletionDictionary = function () {
    this._words = {};
}
WebInspector.SampleCompletionDictionary.prototype = {
    addWord: function (word) {
        if (!this._words[word])
            this._words[word] = 1;
        else
            ++this._words[word];
    },
    removeWord: function (word) {
        if (!this._words[word])
            return;
        if (this._words[word] === 1)
            delete this._words[word];
        else
            --this._words[word];
    },
    wordsWithPrefix: function (prefix) {
        var words = [];
        for (var i in this._words) {
            if (i.startsWith(prefix))
                words.push(i);
        }
        return words;
    },
    hasWord: function (word) {
        return !!this._words[word];
    },
    wordCount: function (word) {
        return this._words[word] ? this._words[word] : 0;
    },
    reset: function () {
        this._words = {};
    }
}
WebInspector.InplaceEditor = function () {};
WebInspector.InplaceEditor.startEditing = function (element, config) {
    if (config.multiline)
        return WebInspector.moduleManager.instance(WebInspector.InplaceEditor).startEditing(element, config);
    if (!WebInspector.InplaceEditor._defaultInstance)
        WebInspector.InplaceEditor._defaultInstance = new WebInspector.InplaceEditor();
    return WebInspector.InplaceEditor._defaultInstance.startEditing(element, config);
}
WebInspector.InplaceEditor.prototype = {
    editorContent: function (editingContext) {
        var element = editingContext.element;
        if (element.tagName === "INPUT" && element.type === "text")
            return element.value;
        return element.textContent;
    },
    setUpEditor: function (editingContext) {
        var element = editingContext.element;
        element.classList.add("editing");
        var oldTabIndex = element.getAttribute("tabIndex");
        if (typeof oldTabIndex !== "number" || oldTabIndex < 0)
            element.tabIndex = 0;
        WebInspector.setCurrentFocusElement(element);
        editingContext.oldTabIndex = oldTabIndex;
    },
    closeEditor: function (editingContext) {
        var element = editingContext.element;
        element.classList.remove("editing");
        if (typeof editingContext.oldTabIndex !== "number")
            element.removeAttribute("tabIndex");
        else
            element.tabIndex = editingContext.oldTabIndex;
        element.scrollTop = 0;
        element.scrollLeft = 0;
    },
    cancelEditing: function (editingContext) {
        var element = editingContext.element;
        if (element.tagName === "INPUT" && element.type === "text")
            element.value = editingContext.oldText;
        else
            element.textContent = editingContext.oldText;
    },
    augmentEditingHandle: function (editingContext, handle) {},
    startEditing: function (element, config) {
        if (!WebInspector.markBeingEdited(element, true))
            return null;
        config = config || new WebInspector.InplaceEditor.Config(function () {}, function () {});
        var editingContext = {
            element: element,
            config: config
        };
        var committedCallback = config.commitHandler;
        var cancelledCallback = config.cancelHandler;
        var pasteCallback = config.pasteHandler;
        var context = config.context;
        var isMultiline = config.multiline || false;
        var moveDirection = "";
        var self = this;

        function consumeCopy(e) {
            e.consume();
        }
        this.setUpEditor(editingContext);
        editingContext.oldText = isMultiline ? config.initialValue : this.editorContent(editingContext);

        function blurEventListener(e) {
            if (!isMultiline || !e || !e.relatedTarget || !e.relatedTarget.isSelfOrDescendant(element))
                editingCommitted.call(element);
        }

        function cleanUpAfterEditing() {
            WebInspector.markBeingEdited(element, false);
            element.removeEventListener("blur", blurEventListener, isMultiline);
            element.removeEventListener("keydown", keyDownEventListener, true);
            if (pasteCallback)
                element.removeEventListener("paste", pasteEventListener, true);
            WebInspector.restoreFocusFromElement(element);
            self.closeEditor(editingContext);
        }

        function editingCancelled() {
            self.cancelEditing(editingContext);
            cleanUpAfterEditing();
            cancelledCallback(this, context);
        }

        function editingCommitted() {
            cleanUpAfterEditing();
            committedCallback(this, self.editorContent(editingContext), editingContext.oldText, context, moveDirection);
        }

        function defaultFinishHandler(event) {
            var isMetaOrCtrl = WebInspector.isMac() ? event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey : event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;
            if (isEnterKey(event) && (event.isMetaOrCtrlForTest || !isMultiline || isMetaOrCtrl))
                return "commit";
            else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code || event.keyIdentifier === "U+001B")
                return "cancel";
            else if (!isMultiline && event.keyIdentifier === "U+0009")
                return "move-" + (event.shiftKey ? "backward" : "forward");
        }

        function handleEditingResult(result, event) {
            if (result === "commit") {
                editingCommitted.call(element);
                event.consume(true);
            } else if (result === "cancel") {
                editingCancelled.call(element);
                event.consume(true);
            } else if (result && result.startsWith("move-")) {
                moveDirection = result.substring(5);
                if (event.keyIdentifier !== "U+0009")
                    blurEventListener();
            }
        }

        function pasteEventListener(event) {
            var result = pasteCallback(event);
            handleEditingResult(result, event);
        }

        function keyDownEventListener(event) {
            var handler = config.customFinishHandler || defaultFinishHandler;
            var result = handler(event);
            handleEditingResult(result, event);
        }
        element.addEventListener("blur", blurEventListener, isMultiline);
        element.addEventListener("keydown", keyDownEventListener, true);
        if (pasteCallback)
            element.addEventListener("paste", pasteEventListener, true);
        var handle = {
            cancel: editingCancelled.bind(element),
            commit: editingCommitted.bind(element)
        };
        this.augmentEditingHandle(editingContext, handle);
        return handle;
    }
}
WebInspector.InplaceEditor.Config = function (commitHandler, cancelHandler, context) {
    this.commitHandler = commitHandler;
    this.cancelHandler = cancelHandler
    this.context = context;
    this.pasteHandler;
    this.multiline;
    this.customFinishHandler;
}
WebInspector.InplaceEditor.Config.prototype = {
    setPasteHandler: function (pasteHandler) {
        this.pasteHandler = pasteHandler;
    },
    setMultilineOptions: function (initialValue, mode, theme, lineWrapping, smartIndent) {
        this.multiline = true;
        this.initialValue = initialValue;
        this.mode = mode;
        this.theme = theme;
        this.lineWrapping = lineWrapping;
        this.smartIndent = smartIndent;
    },
    setCustomFinishHandler: function (customFinishHandler) {
        this.customFinishHandler = customFinishHandler;
    }
}
WebInspector.TextEditor = function () {};
WebInspector.TextEditor.Events = {
    GutterClick: "gutterClick"
};
WebInspector.TextEditor.GutterClickEventData;
WebInspector.TextEditor.prototype = {
    undo: function () {},
    redo: function () {},
    isClean: function () {},
    markClean: function () {},
    indent: function () {},
    cursorPositionToCoordinates: function (lineNumber, column) {
        return null;
    },
    coordinatesToCursorPosition: function (x, y) {
        return null;
    },
    tokenAtTextPosition: function (lineNumber, column) {
        return null;
    },
    setMimeType: function (mimeType) {},
    setReadOnly: function (readOnly) {},
    readOnly: function () {},
    defaultFocusedElement: function () {},
    highlightRange: function (range, cssClass) {},
    removeHighlight: function (highlightDescriptor) {},
    addBreakpoint: function (lineNumber, disabled, conditional) {},
    removeBreakpoint: function (lineNumber) {},
    setExecutionLine: function (lineNumber) {},
    clearExecutionLine: function () {},
    addDecoration: function (lineNumber, element) {},
    removeDecoration: function (lineNumber, element) {},
    highlightSearchResults: function (regex, range) {},
    revealPosition: function (lineNumber, columnNumber, shouldHighlight) {},
    clearPositionHighlight: function () {},
    elementsToRestoreScrollPositionsFor: function () {},
    inheritScrollPositions: function (textEditor) {},
    beginUpdates: function () {},
    endUpdates: function () {},
    onResize: function () {},
    editRange: function (range, text) {},
    scrollToLine: function (lineNumber) {},
    firstVisibleLine: function () {},
    lastVisibleLine: function () {},
    selection: function () {},
    lastSelection: function () {},
    setSelection: function (textRange) {},
    copyRange: function (range) {},
    setText: function (text) {},
    text: function () {},
    range: function () {},
    line: function (lineNumber) {},
    get linesCount() {},
    setAttribute: function (line, name, value) {},
    getAttribute: function (line, name) {},
    removeAttribute: function (line, name) {},
    wasShown: function () {},
    willHide: function () {},
    setCompletionDictionary: function (dictionary) {},
    textEditorPositionHandle: function (lineNumber, columnNumber) {}
}
WebInspector.TextEditorPositionHandle = function () {}
WebInspector.TextEditorPositionHandle.prototype = {
    resolve: function () {},
    equal: function (positionHandle) {}
}
WebInspector.TextEditorDelegate = function () {}
WebInspector.TextEditorDelegate.prototype = {
    onTextChanged: function (oldRange, newRange) {},
    selectionChanged: function (textRange) {},
    scrollChanged: function (lineNumber) {},
    editorFocused: function () {},
    populateLineGutterContextMenu: function (contextMenu, lineNumber) {},
    populateTextAreaContextMenu: function (contextMenu, lineNumber) {},
    createLink: function (hrefValue, isExternal) {},
    onJumpToPosition: function (from, to) {}
}
WebInspector.TokenizerFactory = function () {}
WebInspector.TokenizerFactory.prototype = {
    createTokenizer: function (mimeType) {}
}
WebInspector.SourceFrame = function (contentProvider) {
    WebInspector.VBox.call(this);
    this.element.classList.add("script-view");
    this._url = contentProvider.contentURL();
    this._contentProvider = contentProvider;
    var textEditorDelegate = new WebInspector.TextEditorDelegateForSourceFrame(this);
    WebInspector.moduleManager.loadModule("codemirror");
    this._textEditor = new WebInspector.CodeMirrorTextEditor(this._url, textEditorDelegate);
    this._currentSearchResultIndex = -1;
    this._searchResults = [];
    this._messages = [];
    this._rowMessages = {};
    this._messageBubbles = {};
    this._textEditor.setReadOnly(!this.canEditSource());
    this._shortcuts = {};
    this.element.addEventListener("keydown", this._handleKeyDown.bind(this), false);
    this._sourcePosition = new WebInspector.StatusBarText("", "source-frame-cursor-position");
}
WebInspector.SourceFrame.createSearchRegex = function (query, modifiers) {
    var regex;
    modifiers = modifiers || "";
    try {
        if (/^\/.+\/$/.test(query)) {
            regex = new RegExp(query.substring(1, query.length - 1), modifiers);
            regex.__fromRegExpQuery = true;
        }
    } catch (e) {}
    if (!regex)
        regex = createPlainTextSearchRegex(query, "i" + modifiers);
    return regex;
}
WebInspector.SourceFrame.Events = {
    ScrollChanged: "ScrollChanged",
    SelectionChanged: "SelectionChanged",
    JumpHappened: "JumpHappened"
}
WebInspector.SourceFrame.prototype = {
    addShortcut: function (key, handler) {
        this._shortcuts[key] = handler;
    },
    wasShown: function () {
        this._ensureContentLoaded();
        this._textEditor.show(this.element);
        this._editorAttached = true;
        this._wasShownOrLoaded();
    },
    _isEditorShowing: function () {
        return this.isShowing() && this._editorAttached;
    },
    willHide: function () {
        WebInspector.View.prototype.willHide.call(this);
        this._clearPositionToReveal();
    },
    statusBarText: function () {
        return this._sourcePosition.element;
    },
    statusBarItems: function () {
        return [];
    },
    defaultFocusedElement: function () {
        return this._textEditor.defaultFocusedElement();
    },
    get loaded() {
        return this._loaded;
    },
    hasContent: function () {
        return true;
    },
    get textEditor() {
        return this._textEditor;
    },
    _ensureContentLoaded: function () {
        if (!this._contentRequested) {
            this._contentRequested = true;
            this._contentProvider.requestContent(this.setContent.bind(this));
        }
    },
    addMessage: function (msg) {
        this._messages.push(msg);
        if (this.loaded)
            this.addMessageToSource(msg.line - 1, msg);
    },
    clearMessages: function () {
        for (var line in this._messageBubbles) {
            var bubble = this._messageBubbles[line];
            var lineNumber = parseInt(line, 10);
            this._textEditor.removeDecoration(lineNumber, bubble);
        }
        this._messages = [];
        this._rowMessages = {};
        this._messageBubbles = {};
    },
    revealPosition: function (line, column, shouldHighlight) {
        this._clearLineToScrollTo();
        this._clearSelectionToSet();
        this._positionToReveal = {
            line: line,
            column: column,
            shouldHighlight: shouldHighlight
        };
        this._innerRevealPositionIfNeeded();
    },
    _innerRevealPositionIfNeeded: function () {
        if (!this._positionToReveal)
            return;
        if (!this.loaded || !this._isEditorShowing())
            return;
        this._textEditor.revealPosition(this._positionToReveal.line, this._positionToReveal.column, this._positionToReveal.shouldHighlight);
        delete this._positionToReveal;
    },
    _clearPositionToReveal: function () {
        this._textEditor.clearPositionHighlight();
        delete this._positionToReveal;
    },
    scrollToLine: function (line) {
        this._clearPositionToReveal();
        this._lineToScrollTo = line;
        this._innerScrollToLineIfNeeded();
    },
    _innerScrollToLineIfNeeded: function () {
        if (typeof this._lineToScrollTo === "number") {
            if (this.loaded && this._isEditorShowing()) {
                this._textEditor.scrollToLine(this._lineToScrollTo);
                delete this._lineToScrollTo;
            }
        }
    },
    _clearLineToScrollTo: function () {
        delete this._lineToScrollTo;
    },
    selection: function () {
        return this.textEditor.selection();
    },
    setSelection: function (textRange) {
        this._selectionToSet = textRange;
        this._innerSetSelectionIfNeeded();
    },
    _innerSetSelectionIfNeeded: function () {
        if (this._selectionToSet && this.loaded && this._isEditorShowing()) {
            this._textEditor.setSelection(this._selectionToSet);
            delete this._selectionToSet;
        }
    },
    _clearSelectionToSet: function () {
        delete this._selectionToSet;
    },
    _wasShownOrLoaded: function () {
        this._innerRevealPositionIfNeeded();
        this._innerSetSelectionIfNeeded();
        this._innerScrollToLineIfNeeded();
    },
    onTextChanged: function (oldRange, newRange) {
        if (this._searchResultsChangedCallback && !this._isReplacing)
            this._searchResultsChangedCallback();
        this.clearMessages();
    },
    _simplifyMimeType: function (content, mimeType) {
        if (!mimeType)
            return "";
        if (mimeType.indexOf("javascript") >= 0 || mimeType.indexOf("jscript") >= 0 || mimeType.indexOf("ecmascript") >= 0)
            return "text/javascript";
        if (mimeType === "text/x-php" && content.match(/\<\?.*\?\>/g))
            return "application/x-httpd-php";
        return mimeType;
    },
    setHighlighterType: function (highlighterType) {
        this._highlighterType = highlighterType;
        this._updateHighlighterType("");
    },
    _updateHighlighterType: function (content) {
        this._textEditor.setMimeType(this._simplifyMimeType(content, this._highlighterType));
    },
    setContent: function (content) {
        if (!this._loaded) {
            this._loaded = true;
            this._textEditor.setText(content || "");
            this._textEditor.markClean();
        } else {
            var firstLine = this._textEditor.firstVisibleLine();
            var selection = this._textEditor.selection();
            this._textEditor.setText(content || "");
            this._textEditor.scrollToLine(firstLine);
            this._textEditor.setSelection(selection);
        }
        this._updateHighlighterType(content || "");
        this._textEditor.beginUpdates();
        this._setTextEditorDecorations();
        this._wasShownOrLoaded();
        if (this._delayedFindSearchMatches) {
            this._delayedFindSearchMatches();
            delete this._delayedFindSearchMatches;
        }
        this.onTextEditorContentLoaded();
        this._textEditor.endUpdates();
    },
    onTextEditorContentLoaded: function () {},
    _setTextEditorDecorations: function () {
        this._rowMessages = {};
        this._messageBubbles = {};
        this._textEditor.beginUpdates();
        this._addExistingMessagesToSource();
        this._textEditor.endUpdates();
    },
    performSearch: function (query, shouldJump, callback, currentMatchChangedCallback, searchResultsChangedCallback) {
        function doFindSearchMatches(query) {
            this._currentSearchResultIndex = -1;
            this._searchResults = [];
            var regex = WebInspector.SourceFrame.createSearchRegex(query);
            this._searchRegex = regex;
            this._searchResults = this._collectRegexMatches(regex);
            if (!this._searchResults.length)
                this._textEditor.cancelSearchResultsHighlight();
            else if (shouldJump)
                this.jumpToNextSearchResult();
            else
                this._textEditor.highlightSearchResults(regex, null);
            callback(this, this._searchResults.length);
        }
        this._resetSearch();
        this._currentSearchMatchChangedCallback = currentMatchChangedCallback;
        this._searchResultsChangedCallback = searchResultsChangedCallback;
        if (this.loaded)
            doFindSearchMatches.call(this, query);
        else
            this._delayedFindSearchMatches = doFindSearchMatches.bind(this, query);
        this._ensureContentLoaded();
    },
    _editorFocused: function () {
        if (!this._searchResults.length)
            return;
        this._currentSearchResultIndex = -1;
        if (this._currentSearchMatchChangedCallback)
            this._currentSearchMatchChangedCallback(this._currentSearchResultIndex);
        this._textEditor.highlightSearchResults(this._searchRegex, null);
    },
    _searchResultAfterSelectionIndex: function (selection) {
        if (!selection)
            return 0;
        for (var i = 0; i < this._searchResults.length; ++i) {
            if (this._searchResults[i].compareTo(selection) >= 0)
                return i;
        }
        return 0;
    },
    _resetSearch: function () {
        delete this._delayedFindSearchMatches;
        delete this._currentSearchMatchChangedCallback;
        delete this._searchResultsChangedCallback;
        this._currentSearchResultIndex = -1;
        this._searchResults = [];
        delete this._searchRegex;
    },
    searchCanceled: function () {
        var range = this._currentSearchResultIndex !== -1 ? this._searchResults[this._currentSearchResultIndex] : null;
        this._resetSearch();
        if (!this.loaded)
            return;
        this._textEditor.cancelSearchResultsHighlight();
        if (range)
            this._textEditor.setSelection(range);
    },
    hasSearchResults: function () {
        return this._searchResults.length > 0;
    },
    jumpToFirstSearchResult: function () {
        this.jumpToSearchResult(0);
    },
    jumpToLastSearchResult: function () {
        this.jumpToSearchResult(this._searchResults.length - 1);
    },
    jumpToNextSearchResult: function () {
        var currentIndex = this._searchResultAfterSelectionIndex(this._textEditor.selection());
        var nextIndex = this._currentSearchResultIndex === -1 ? currentIndex : currentIndex + 1;
        this.jumpToSearchResult(nextIndex);
    },
    jumpToPreviousSearchResult: function () {
        var currentIndex = this._searchResultAfterSelectionIndex(this._textEditor.selection());
        this.jumpToSearchResult(currentIndex - 1);
    },
    showingFirstSearchResult: function () {
        return this._searchResults.length && this._currentSearchResultIndex === 0;
    },
    showingLastSearchResult: function () {
        return this._searchResults.length && this._currentSearchResultIndex === (this._searchResults.length - 1);
    },
    get currentSearchResultIndex() {
        return this._currentSearchResultIndex;
    },
    jumpToSearchResult: function (index) {
        if (!this.loaded || !this._searchResults.length)
            return;
        this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
        if (this._currentSearchMatchChangedCallback)
            this._currentSearchMatchChangedCallback(this._currentSearchResultIndex);
        this._textEditor.highlightSearchResults(this._searchRegex, this._searchResults[this._currentSearchResultIndex]);
    },
    replaceSelectionWith: function (text) {
        var range = this._searchResults[this._currentSearchResultIndex];
        if (!range)
            return;
        this._textEditor.highlightSearchResults(this._searchRegex, null);
        this._isReplacing = true;
        var newRange = this._textEditor.editRange(range, text);
        delete this._isReplacing;
        this._textEditor.setSelection(newRange.collapseToEnd());
    },
    replaceAllWith: function (query, replacement) {
        this._textEditor.highlightSearchResults(this._searchRegex, null);
        var text = this._textEditor.text();
        var range = this._textEditor.range();
        var regex = WebInspector.SourceFrame.createSearchRegex(query, "g");
        if (regex.__fromRegExpQuery)
            text = text.replace(regex, replacement);
        else
            text = text.replace(regex, function () {
                return replacement;
            });
        this._isReplacing = true;
        this._textEditor.editRange(range, text);
        delete this._isReplacing;
    },
    _collectRegexMatches: function (regexObject) {
        var ranges = [];
        for (var i = 0; i < this._textEditor.linesCount; ++i) {
            var line = this._textEditor.line(i);
            var offset = 0;
            do {
                var match = regexObject.exec(line);
                if (match) {
                    if (match[0].length)
                        ranges.push(new WebInspector.TextRange(i, offset + match.index, i, offset + match.index + match[0].length));
                    offset += match.index + 1;
                    line = line.substring(match.index + 1);
                }
            } while (match && line);
        }
        return ranges;
    },
    _addExistingMessagesToSource: function () {
        var length = this._messages.length;
        for (var i = 0; i < length; ++i)
            this.addMessageToSource(this._messages[i].line - 1, this._messages[i]);
    },
    addMessageToSource: function (lineNumber, msg) {
        if (lineNumber >= this._textEditor.linesCount)
            lineNumber = this._textEditor.linesCount - 1;
        if (lineNumber < 0)
            lineNumber = 0;
        var rowMessages = this._rowMessages[lineNumber];
        if (!rowMessages) {
            rowMessages = [];
            this._rowMessages[lineNumber] = rowMessages;
        }
        for (var i = 0; i < rowMessages.length; ++i) {
            if (rowMessages[i].consoleMessage.isEqual(msg)) {
                rowMessages[i].repeatCount++;
                this._updateMessageRepeatCount(rowMessages[i]);
                return;
            }
        }
        var rowMessage = {
            consoleMessage: msg
        };
        rowMessages.push(rowMessage);
        this._textEditor.beginUpdates();
        var messageBubbleElement = this._messageBubbles[lineNumber];
        if (!messageBubbleElement) {
            messageBubbleElement = document.createElement("div");
            messageBubbleElement.className = "webkit-html-message-bubble";
            this._messageBubbles[lineNumber] = messageBubbleElement;
            this._textEditor.addDecoration(lineNumber, messageBubbleElement);
        }
        var imageElement = document.createElement("div");
        switch (msg.level) {
        case WebInspector.ConsoleMessage.MessageLevel.Error:
            messageBubbleElement.classList.add("webkit-html-error-message");
            imageElement.className = "error-icon-small";
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Warning:
            messageBubbleElement.classList.add("webkit-html-warning-message");
            imageElement.className = "warning-icon-small";
            break;
        }
        var messageLineElement = document.createElement("div");
        messageLineElement.className = "webkit-html-message-line";
        messageBubbleElement.appendChild(messageLineElement);
        messageLineElement.appendChild(imageElement);
        messageLineElement.appendChild(document.createTextNode(msg.messageText));
        rowMessage.element = messageLineElement;
        rowMessage.repeatCount = 1;
        this._updateMessageRepeatCount(rowMessage);
        this._textEditor.endUpdates();
    },
    _updateMessageRepeatCount: function (rowMessage) {
        if (rowMessage.repeatCount < 2)
            return;
        if (!rowMessage.repeatCountElement) {
            var repeatCountElement = document.createElement("span");
            rowMessage.element.appendChild(repeatCountElement);
            rowMessage.repeatCountElement = repeatCountElement;
        }
        rowMessage.repeatCountElement.textContent = WebInspector.UIString(" (repeated %d times)", rowMessage.repeatCount);
    },
    removeMessageFromSource: function (lineNumber, msg) {
        if (lineNumber >= this._textEditor.linesCount)
            lineNumber = this._textEditor.linesCount - 1;
        if (lineNumber < 0)
            lineNumber = 0;
        var rowMessages = this._rowMessages[lineNumber];
        for (var i = 0; rowMessages && i < rowMessages.length; ++i) {
            var rowMessage = rowMessages[i];
            if (rowMessage.consoleMessage !== msg)
                continue;
            var messageLineElement = rowMessage.element;
            var messageBubbleElement = messageLineElement.parentElement;
            messageBubbleElement.removeChild(messageLineElement);
            rowMessages.remove(rowMessage);
            if (!rowMessages.length)
                delete this._rowMessages[lineNumber];
            if (!messageBubbleElement.childElementCount) {
                this._textEditor.removeDecoration(lineNumber, messageBubbleElement);
                delete this._messageBubbles[lineNumber];
            }
            break;
        }
    },
    populateLineGutterContextMenu: function (contextMenu, lineNumber) {},
    populateTextAreaContextMenu: function (contextMenu, lineNumber) {},
    onJumpToPosition: function (from, to) {
        this.dispatchEventToListeners(WebInspector.SourceFrame.Events.JumpHappened, {
            from: from,
            to: to
        });
    },
    inheritScrollPositions: function (sourceFrame) {
        this._textEditor.inheritScrollPositions(sourceFrame._textEditor);
    },
    canEditSource: function () {
        return false;
    },
    selectionChanged: function (textRange) {
        this._updateSourcePosition(textRange);
        this.dispatchEventToListeners(WebInspector.SourceFrame.Events.SelectionChanged, textRange);
        WebInspector.notifications.dispatchEventToListeners(WebInspector.SourceFrame.Events.SelectionChanged, textRange);
    },
    _updateSourcePosition: function (textRange) {
        if (!textRange)
            return;
        if (textRange.isEmpty()) {
            this._sourcePosition.setText(WebInspector.UIString("Line %d, Column %d", textRange.endLine + 1, textRange.endColumn + 1));
            return;
        }
        textRange = textRange.normalize();
        var selectedText = this._textEditor.copyRange(textRange);
        if (textRange.startLine === textRange.endLine)
            this._sourcePosition.setText(WebInspector.UIString("%d characters selected", selectedText.length));
        else
            this._sourcePosition.setText(WebInspector.UIString("%d lines, %d characters selected", textRange.endLine - textRange.startLine + 1, selectedText.length));
    },
    scrollChanged: function (lineNumber) {
        this.dispatchEventToListeners(WebInspector.SourceFrame.Events.ScrollChanged, lineNumber);
    },
    _handleKeyDown: function (e) {
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(e);
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler())
            e.consume(true);
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.TextEditorDelegateForSourceFrame = function (sourceFrame) {
    this._sourceFrame = sourceFrame;
}
WebInspector.TextEditorDelegateForSourceFrame.prototype = {
    onTextChanged: function (oldRange, newRange) {
        this._sourceFrame.onTextChanged(oldRange, newRange);
    },
    selectionChanged: function (textRange) {
        this._sourceFrame.selectionChanged(textRange);
    },
    scrollChanged: function (lineNumber) {
        this._sourceFrame.scrollChanged(lineNumber);
    },
    editorFocused: function () {
        this._sourceFrame._editorFocused();
    },
    populateLineGutterContextMenu: function (contextMenu, lineNumber) {
        this._sourceFrame.populateLineGutterContextMenu(contextMenu, lineNumber);
    },
    populateTextAreaContextMenu: function (contextMenu, lineNumber) {
        this._sourceFrame.populateTextAreaContextMenu(contextMenu, lineNumber);
    },
    createLink: function (hrefValue, isExternal) {
        var targetLocation = WebInspector.ParsedURL.completeURL(this._sourceFrame._url, hrefValue);
        return WebInspector.linkifyURLAsNode(targetLocation || hrefValue, hrefValue, undefined, isExternal);
    },
    onJumpToPosition: function (from, to) {
        this._sourceFrame.onJumpToPosition(from, to);
    }
}
WebInspector.ResourceView = function (resource) {
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("resourceView.css");
    this.element.classList.add("resource-view");
    this.resource = resource;
}
WebInspector.ResourceView.prototype = {
    hasContent: function () {
        return false;
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.ResourceView.hasTextContent = function (resource) {
    if (resource.type.isTextType())
        return true;
    if (resource.type === WebInspector.resourceTypes.Other)
        return !!resource.content && !resource.contentEncoded;
    return false;
}
WebInspector.ResourceView.nonSourceViewForResource = function (resource) {
    switch (resource.type) {
    case WebInspector.resourceTypes.Image:
        return new WebInspector.ImageView(resource);
    case WebInspector.resourceTypes.Font:
        return new WebInspector.FontView(resource);
    default:
        return new WebInspector.ResourceView(resource);
    }
}
WebInspector.ResourceSourceFrame = function (resource) {
    this._resource = resource;
    WebInspector.SourceFrame.call(this, resource);
}
WebInspector.ResourceSourceFrame.prototype = {
    get resource() {
        return this._resource;
    }, populateTextAreaContextMenu: function (contextMenu, lineNumber) {
        contextMenu.appendApplicableItems(this._resource);
    }, __proto__: WebInspector.SourceFrame.prototype
}
WebInspector.ResourceSourceFrameFallback = function (resource) {
    WebInspector.VBox.call(this);
    this._resource = resource;
    this.element.classList.add("script-view");
    this._content = this.element.createChild("div", "script-view-fallback monospace");
}
WebInspector.ResourceSourceFrameFallback.prototype = {
    wasShown: function () {
        if (!this._contentRequested) {
            this._contentRequested = true;
            this._resource.requestContent(this._contentLoaded.bind(this));
        }
    },
    _contentLoaded: function (content) {
        this._content.textContent = content;
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.FontView = function (resource) {
    WebInspector.ResourceView.call(this, resource);
    this.element.classList.add("font");
}
WebInspector.FontView._fontPreviewLines = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "1234567890"];
WebInspector.FontView._fontId = 0;
WebInspector.FontView._measureFontSize = 50;
WebInspector.FontView.prototype = {
    hasContent: function () {
        return true;
    },
    _createContentIfNeeded: function () {
        if (this.fontPreviewElement)
            return;
        var uniqueFontName = "WebInspectorFontPreview" + (++WebInspector.FontView._fontId);
        this.fontStyleElement = document.createElement("style");
        this.fontStyleElement.textContent = "@font-face { font-family: \"" + uniqueFontName + "\"; src: url(" + this.resource.url + "); }";
        document.head.appendChild(this.fontStyleElement);
        var fontPreview = document.createElement("div");
        for (var i = 0; i < WebInspector.FontView._fontPreviewLines.length; ++i) {
            if (i > 0)
                fontPreview.appendChild(document.createElement("br"));
            fontPreview.appendChild(document.createTextNode(WebInspector.FontView._fontPreviewLines[i]));
        }
        this.fontPreviewElement = fontPreview.cloneNode(true);
        this.fontPreviewElement.style.setProperty("font-family", uniqueFontName);
        this.fontPreviewElement.style.setProperty("visibility", "hidden");
        this._dummyElement = fontPreview;
        this._dummyElement.style.visibility = "hidden";
        this._dummyElement.style.zIndex = "-1";
        this._dummyElement.style.display = "inline";
        this._dummyElement.style.position = "absolute";
        this._dummyElement.style.setProperty("font-family", uniqueFontName);
        this._dummyElement.style.setProperty("font-size", WebInspector.FontView._measureFontSize + "px");
        this.element.appendChild(this.fontPreviewElement);
    },
    wasShown: function () {
        this._createContentIfNeeded();
        this.updateFontPreviewSize();
    },
    onResize: function () {
        if (this._inResize)
            return;
        this._inResize = true;
        try {
            this.updateFontPreviewSize();
        } finally {
            delete this._inResize;
        }
    },
    _measureElement: function () {
        this.element.appendChild(this._dummyElement);
        var result = {
            width: this._dummyElement.offsetWidth,
            height: this._dummyElement.offsetHeight
        };
        this.element.removeChild(this._dummyElement);
        return result;
    },
    updateFontPreviewSize: function () {
        if (!this.fontPreviewElement || !this.isShowing())
            return;
        this.fontPreviewElement.style.removeProperty("visibility");
        var dimension = this._measureElement();
        const height = dimension.height;
        const width = dimension.width;
        const containerWidth = this.element.offsetWidth - 50;
        const containerHeight = this.element.offsetHeight - 30;
        if (!height || !width || !containerWidth || !containerHeight) {
            this.fontPreviewElement.style.removeProperty("font-size");
            return;
        }
        var widthRatio = containerWidth / width;
        var heightRatio = containerHeight / height;
        var finalFontSize = Math.floor(WebInspector.FontView._measureFontSize * Math.min(widthRatio, heightRatio)) - 2;
        this.fontPreviewElement.style.setProperty("font-size", finalFontSize + "px", null);
    },
    __proto__: WebInspector.ResourceView.prototype
}
WebInspector.ImageView = function (resource) {
    WebInspector.ResourceView.call(this, resource);
    this.element.classList.add("image");
}
WebInspector.ImageView.prototype = {
    hasContent: function () {
        return true;
    },
    wasShown: function () {
        this._createContentIfNeeded();
    },
    _createContentIfNeeded: function () {
        if (this._container)
            return;
        var imageContainer = document.createElement("div");
        imageContainer.className = "image";
        this.element.appendChild(imageContainer);
        var imagePreviewElement = document.createElement("img");
        imagePreviewElement.classList.add("resource-image-view");
        imageContainer.appendChild(imagePreviewElement);
        imagePreviewElement.addEventListener("contextmenu", this._contextMenu.bind(this), true);
        this._container = document.createElement("div");
        this._container.className = "info";
        this.element.appendChild(this._container);
        var imageNameElement = document.createElement("h1");
        imageNameElement.className = "title";
        imageNameElement.textContent = this.resource.displayName;
        this._container.appendChild(imageNameElement);
        var infoListElement = document.createElement("dl");
        infoListElement.className = "infoList";
        this.resource.populateImageSource(imagePreviewElement);

        function onImageLoad() {
            var content = this.resource.content;
            if (content)
                var resourceSize = this._base64ToSize(content);
            else
                var resourceSize = this.resource.resourceSize;
            var imageProperties = [{
                name: WebInspector.UIString("Dimensions"),
                value: WebInspector.UIString("%d × %d", imagePreviewElement.naturalWidth, imagePreviewElement.naturalHeight)
            }, {
                name: WebInspector.UIString("File size"),
                value: Number.bytesToString(resourceSize)
            }, {
                name: WebInspector.UIString("MIME type"),
                value: this.resource.mimeType
            }];
            infoListElement.removeChildren();
            for (var i = 0; i < imageProperties.length; ++i) {
                var dt = document.createElement("dt");
                dt.textContent = imageProperties[i].name;
                infoListElement.appendChild(dt);
                var dd = document.createElement("dd");
                dd.textContent = imageProperties[i].value;
                infoListElement.appendChild(dd);
            }
            var dt = document.createElement("dt");
            dt.textContent = WebInspector.UIString("URL");
            infoListElement.appendChild(dt);
            var dd = document.createElement("dd");
            var externalResource = true;
            dd.appendChild(WebInspector.linkifyURLAsNode(this.resource.url, undefined, undefined, externalResource));
            infoListElement.appendChild(dd);
            this._container.appendChild(infoListElement);
        }
        imagePreviewElement.addEventListener("load", onImageLoad.bind(this), false);
        this._imagePreviewElement = imagePreviewElement;
    },
    _base64ToSize: function (content) {
        if (!content.length)
            return 0;
        var size = (content.length || 0) * 3 / 4;
        if (content.length > 0 && content[content.length - 1] === "=")
            size--;
        if (content.length > 1 && content[content.length - 2] === "=")
            size--;
        return size;
    },
    _contextMenu: function (event) {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy image URL" : "Copy Image URL"), this._copyImageURL.bind(this));
        if (this._imagePreviewElement.src)
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy image as Data URL" : "Copy Image As Data URL"), this._copyImageAsDataURL.bind(this));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Open image in new tab" : "Open Image in New Tab"), this._openInNewTab.bind(this));
        contextMenu.show();
    },
    _copyImageAsDataURL: function () {
        InspectorFrontendHost.copyText(this._imagePreviewElement.src);
    },
    _copyImageURL: function () {
        InspectorFrontendHost.copyText(this.resource.url);
    },
    _openInNewTab: function () {
        InspectorFrontendHost.openInNewTab(this.resource.url);
    },
    __proto__: WebInspector.ResourceView.prototype
}
WebInspector.SplitView = function (isVertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight) {
    WebInspector.View.call(this);
    this.registerRequiredCSS("splitView.css");
    this.element.classList.add("split-view");
    this._mainView = new WebInspector.VBox();
    this._mainView.makeLayoutBoundary();
    this._mainElement = this._mainView.element;
    this._mainElement.className = "split-view-contents scroll-target split-view-main vbox";
    this._sidebarView = new WebInspector.VBox();
    this._sidebarView.makeLayoutBoundary();
    this._sidebarElement = this._sidebarView.element;
    this._sidebarElement.className = "split-view-contents scroll-target split-view-sidebar vbox";
    this._resizerElement = this.element.createChild("div", "split-view-resizer");
    this._resizerElement.createChild("div", "split-view-resizer-border");
    if (secondIsSidebar) {
        this._mainView.show(this.element);
        this._sidebarView.show(this.element);
    } else {
        this._sidebarView.show(this.element);
        this._mainView.show(this.element);
    }
    this._onDragStartBound = this._onDragStart.bind(this);
    this._resizerElements = [];
    this._resizable = true;
    this._defaultSidebarWidth = defaultSidebarWidth || 200;
    this._defaultSidebarHeight = defaultSidebarHeight || this._defaultSidebarWidth;
    this._settingName = settingName;
    this.setSecondIsSidebar(secondIsSidebar);
    this._innerSetVertical(isVertical);
    this._showMode = WebInspector.SplitView.ShowMode.Both;
    this.installResizer(this._resizerElement);
}
WebInspector.SplitView.SettingForOrientation;
WebInspector.SplitView.ShowMode = {
    Both: "Both",
    OnlyMain: "OnlyMain",
    OnlySidebar: "OnlySidebar"
}
WebInspector.SplitView.Events = {
    SidebarSizeChanged: "SidebarSizeChanged",
    ShowModeChanged: "ShowModeChanged"
}
WebInspector.SplitView.MinPadding = 20;
WebInspector.SplitView.prototype = {
    isVertical: function () {
        return this._isVertical;
    },
    setVertical: function (isVertical) {
        if (this._isVertical === isVertical)
            return;
        this._innerSetVertical(isVertical);
        if (this.isShowing())
            this._updateLayout();
    },
    _innerSetVertical: function (isVertical) {
        this.element.classList.remove(this._isVertical ? "hbox" : "vbox");
        this._isVertical = isVertical;
        this.element.classList.add(this._isVertical ? "hbox" : "vbox");
        delete this._resizerElementSize;
        this._sidebarSize = -1;
        this._restoreSidebarSizeFromSettings();
        if (this._shouldSaveShowMode)
            this._restoreAndApplyShowModeFromSettings();
        this._updateShowHideSidebarButton();
        this._updateResizersClass();
        this.invalidateMinimumSize();
    },
    _updateLayout: function (animate) {
        delete this._totalSize;
        this._innerSetSidebarSize(this._preferredSidebarSize(), !!animate);
    },
    mainElement: function () {
        return this._mainElement;
    },
    sidebarElement: function () {
        return this._sidebarElement;
    },
    isSidebarSecond: function () {
        return this._secondIsSidebar;
    },
    enableShowModeSaving: function () {
        this._shouldSaveShowMode = true;
        this._restoreAndApplyShowModeFromSettings();
    },
    showMode: function () {
        return this._showMode;
    },
    setSecondIsSidebar: function (secondIsSidebar) {
        this._mainElement.classList.toggle("split-view-contents-first", secondIsSidebar);
        this._mainElement.classList.toggle("split-view-contents-second", !secondIsSidebar);
        this._sidebarElement.classList.toggle("split-view-contents-first", !secondIsSidebar);
        this._sidebarElement.classList.toggle("split-view-contents-second", secondIsSidebar);
        if (secondIsSidebar) {
            if (this._sidebarElement.parentElement && this._sidebarElement.nextSibling)
                this.element.appendChild(this._sidebarElement);
        } else {
            if (this._mainElement.parentElement && this._mainElement.nextSibling)
                this.element.appendChild(this._mainElement);
        }
        this._secondIsSidebar = secondIsSidebar;
    },
    sidebarSide: function () {
        if (this._showMode !== WebInspector.SplitView.ShowMode.Both)
            return null;
        return this._isVertical ? (this._secondIsSidebar ? "right" : "left") : (this._secondIsSidebar ? "bottom" : "top");
    },
    preferredSidebarSize: function () {
        return this._preferredSidebarSize();
    },
    resizerElement: function () {
        return this._resizerElement;
    },
    hideMain: function (animate) {
        this._showOnly(this._sidebarView, this._mainView, animate);
        this._updateShowMode(WebInspector.SplitView.ShowMode.OnlySidebar);
    },
    hideSidebar: function (animate) {
        this._showOnly(this._mainView, this._sidebarView, animate);
        this._updateShowMode(WebInspector.SplitView.ShowMode.OnlyMain);
    },
    detachChildViews: function () {
        this._mainView.detachChildViews();
        this._sidebarView.detachChildViews();
    },
    _showOnly: function (sideToShow, sideToHide, animate) {
        this._cancelAnimation();

        function callback() {
            sideToShow.show(this.element);
            sideToHide.detach();
            sideToShow.element.classList.add("maximized");
            sideToHide.element.classList.remove("maximized");
            this._resizerElement.classList.add("hidden");
            this._removeAllLayoutProperties();
        }
        if (animate) {
            this._animate(true, callback.bind(this));
        } else {
            callback.call(this);
            this.doResize();
        }
        this._sidebarSize = -1;
        this.setResizable(false);
    },
    _removeAllLayoutProperties: function () {
        this._sidebarElement.style.removeProperty("flexBasis");
        this._resizerElement.style.removeProperty("left");
        this._resizerElement.style.removeProperty("right");
        this._resizerElement.style.removeProperty("top");
        this._resizerElement.style.removeProperty("bottom");
        this._resizerElement.style.removeProperty("margin-left");
        this._resizerElement.style.removeProperty("margin-right");
        this._resizerElement.style.removeProperty("margin-top");
        this._resizerElement.style.removeProperty("margin-bottom");
    },
    showBoth: function (animate) {
        if (this._showMode === WebInspector.SplitView.ShowMode.Both)
            animate = false;
        this._cancelAnimation();
        this._mainElement.classList.remove("maximized");
        this._sidebarElement.classList.remove("maximized");
        this._resizerElement.classList.remove("hidden");
        this._mainView.show(this.element);
        this._sidebarView.show(this.element);
        this.setSecondIsSidebar(this._secondIsSidebar);
        this._sidebarSize = -1;
        this.setResizable(true);
        this._updateShowMode(WebInspector.SplitView.ShowMode.Both);
        this._updateLayout(animate);
    },
    setResizable: function (resizable) {
        this._resizable = resizable;
        this._updateResizersClass();
    },
    setSidebarSize: function (size) {
        this._savedSidebarSize = size;
        this._saveSetting();
        this._innerSetSidebarSize(size, false);
    },
    sidebarSize: function () {
        return Math.max(0, this._sidebarSize);
    },
    totalSize: function () {
        if (!this._totalSize)
            this._totalSize = this._isVertical ? this.element.offsetWidth : this.element.offsetHeight;
        return this._totalSize;
    },
    _updateShowMode: function (showMode) {
        this._showMode = showMode;
        this._saveShowModeToSettings();
        this._updateShowHideSidebarButton();
        this.dispatchEventToListeners(WebInspector.SplitView.Events.ShowModeChanged, showMode);
        this.invalidateMinimumSize();
    },
    _innerSetSidebarSize: function (size, animate) {
        if (this._showMode !== WebInspector.SplitView.ShowMode.Both || !this.isShowing())
            return;
        size = this._applyConstraints(size);
        if (this._sidebarSize === size)
            return;
        this._removeAllLayoutProperties();
        var sizeValue = (size) + "px";
        this.sidebarElement().style.flexBasis = sizeValue;
        if (!this._resizerElementSize)
            this._resizerElementSize = this._isVertical ? this._resizerElement.offsetWidth : this._resizerElement.offsetHeight;
        if (this._isVertical) {
            if (this._secondIsSidebar) {
                this._resizerElement.style.right = sizeValue;
                this._resizerElement.style.marginRight = -this._resizerElementSize / 2 + "px";
            } else {
                this._resizerElement.style.left = sizeValue;
                this._resizerElement.style.marginLeft = -this._resizerElementSize / 2 + "px";
            }
        } else {
            if (this._secondIsSidebar) {
                this._resizerElement.style.bottom = sizeValue;
                this._resizerElement.style.marginBottom = -this._resizerElementSize / 2 + "px";
            } else {
                this._resizerElement.style.top = sizeValue;
                this._resizerElement.style.marginTop = -this._resizerElementSize / 2 + "px";
            }
        }
        this._sidebarSize = size;
        if (animate) {
            this._animate(false);
        } else {
            this.doResize();
            this.dispatchEventToListeners(WebInspector.SplitView.Events.SidebarSizeChanged, this.sidebarSize());
        }
    },
    _animate: function (reverse, callback) {
        var animationTime = 50;
        this._animationCallback = callback;
        var animatedMarginPropertyName;
        if (this._isVertical)
            animatedMarginPropertyName = this._secondIsSidebar ? "margin-right" : "margin-left";
        else
            animatedMarginPropertyName = this._secondIsSidebar ? "margin-bottom" : "margin-top";
        var zoomFactor = 1;
        var marginFrom = reverse ? "0" : "-" + (this._sidebarSize / zoomFactor) + "px";
        var marginTo = reverse ? "-" + (this._sidebarSize / zoomFactor) + "px" : "0";
        this.element.style.setProperty(animatedMarginPropertyName, marginFrom);
        if (!reverse) {
            suppressUnused(this._mainElement.offsetWidth);
            suppressUnused(this._sidebarElement.offsetWidth);
        }
        if (!reverse)
            this._sidebarView.doResize();
        this.element.style.setProperty("transition", animatedMarginPropertyName + " " + animationTime + "ms linear");
        var boundAnimationFrame;
        var startTime;

        function animationFrame() {
            delete this._animationFrameHandle;
            if (!startTime) {
                this.element.style.setProperty(animatedMarginPropertyName, marginTo);
                startTime = window.performance.now();
            } else if (window.performance.now() < startTime + animationTime) {
                this._mainView.doResize();
            } else {
                this._cancelAnimation();
                this._mainView.doResize();
                this.dispatchEventToListeners(WebInspector.SplitView.Events.SidebarSizeChanged, this.sidebarSize());
                return;
            }
            this._animationFrameHandle = window.requestAnimationFrame(boundAnimationFrame);
        }
        boundAnimationFrame = animationFrame.bind(this);
        this._animationFrameHandle = window.requestAnimationFrame(boundAnimationFrame);
    },
    _cancelAnimation: function () {
        this.element.style.removeProperty("margin-top");
        this.element.style.removeProperty("margin-right");
        this.element.style.removeProperty("margin-bottom");
        this.element.style.removeProperty("margin-left");
        this.element.style.removeProperty("transition");
        if (this._animationFrameHandle) {
            window.cancelAnimationFrame(this._animationFrameHandle);
            delete this._animationFrameHandle;
        }
        if (this._animationCallback) {
            this._animationCallback();
            delete this._animationCallback;
        }
    },
    _applyConstraints: function (sidebarSize) {
        var totalSize = this.totalSize();
        var size = this._sidebarView.minimumSize();
        var from = this.isVertical() ? size.width : size.height;
        if (!from)
            from = WebInspector.SplitView.MinPadding;
        size = this._mainView.minimumSize();
        var minMainSize = this.isVertical() ? size.width : size.height;
        if (!minMainSize)
            minMainSize = WebInspector.SplitView.MinPadding;
        var to = totalSize - minMainSize;
        if (from <= to)
            return Number.constrain(sidebarSize, from, to);
        return Math.max(0, to);
    },
    wasShown: function () {
        this._forceUpdateLayout();
    },
    willHide: function () {
    },
    onResize: function () {
        this._updateLayout();
    },
    onLayout: function () {
        this._updateLayout();
    },
    calculateMinimumSize: function () {
        if (this._showMode === WebInspector.SplitView.ShowMode.OnlyMain)
            return this._mainView.minimumSize();
        if (this._showMode === WebInspector.SplitView.ShowMode.OnlySidebar)
            return this._sidebarView.minimumSize();
        var mainSize = this._mainView.minimumSize();
        var sidebarSize = this._sidebarView.minimumSize();
        var min = WebInspector.SplitView.MinPadding;
        if (this._isVertical)
            return new Size((mainSize.width || min) + (sidebarSize.width || min), Math.max(mainSize.height, sidebarSize.height));
        else
            return new Size(Math.max(mainSize.width, sidebarSize.width), (mainSize.height || min) + (sidebarSize.height || min));
    },
    _startResizerDragging: function (event) {
        if (!this._resizable)
            return false;
        var dipEventPosition = (this._isVertical ? event.pageX : event.pageY) * WebInspector.zoomManager.zoomFactor();
        this._dragOffset = (this._secondIsSidebar ? this.totalSize() - this._sidebarSize : this._sidebarSize) - dipEventPosition;
        return true;
    },
    _resizerDragging: function (event) {
        var dipEventPosition = (this._isVertical ? event.pageX : event.pageY) * WebInspector.zoomManager.zoomFactor();
        var newOffset = dipEventPosition + this._dragOffset;
        var newSize = (this._secondIsSidebar ? this.totalSize() - newOffset : newOffset);
        var constrainedSize = this._applyConstraints(newSize);
        this._savedSidebarSize = constrainedSize;
        this._saveSetting();
        this._innerSetSidebarSize(constrainedSize, false);
        event.preventDefault();
    },
    _endResizerDragging: function (event) {
        delete this._dragOffset;
    },
    hideDefaultResizer: function () {
        this.uninstallResizer(this._resizerElement);
    },
    installResizer: function (resizerElement) {
        resizerElement.addEventListener("mousedown", this._onDragStartBound, false);
        resizerElement.classList.toggle("ew-resizer-widget", this._isVertical && this._resizable);
        resizerElement.classList.toggle("ns-resizer-widget", !this._isVertical && this._resizable);
        if (this._resizerElements.indexOf(resizerElement) === -1)
            this._resizerElements.push(resizerElement);
    },
    uninstallResizer: function (resizerElement) {
        resizerElement.removeEventListener("mousedown", this._onDragStartBound, false);
        resizerElement.classList.remove("ew-resizer-widget");
        resizerElement.classList.remove("ns-resizer-widget");
        this._resizerElements.remove(resizerElement);
    },
    hasCustomResizer: function () {
        return this._resizerElements.length > 1 || (this._resizerElements.length == 1 && this._resizerElements[0] !== this._resizerElement);
    },
    toggleResizer: function (resizer, on) {
        if (on)
            this.installResizer(resizer);
        else
            this.uninstallResizer(resizer);
    },
    _updateResizersClass: function () {
        for (var i = 0; i < this._resizerElements.length; ++i) {
            this._resizerElements[i].classList.toggle("ew-resizer-widget", this._isVertical && this._resizable);
            this._resizerElements[i].classList.toggle("ns-resizer-widget", !this._isVertical && this._resizable);
        }
    },
    _onDragStart: function (event) {
        if (this._resizerElements.indexOf(event.target) === -1)
            return;
        WebInspector.elementDragStart(this._startResizerDragging.bind(this), this._resizerDragging.bind(this), this._endResizerDragging.bind(this), this._isVertical ? "ew-resize" : "ns-resize", event);
    },
    _setting: function () {
        if (!this._settingName)
            return null;
        if (!WebInspector.settings[this._settingName])
            WebInspector.settings[this._settingName] = WebInspector.settings.createSetting(this._settingName, {});
        return WebInspector.settings[this._settingName];
    },
    _settingForOrientation: function () {
        var state = this._setting() ? this._setting().get() : {};
        return this._isVertical ? state.vertical : state.horizontal;
    },
    _preferredSidebarSize: function () {
        var size = this._savedSidebarSize;
        if (!size) {
            size = this._isVertical ? this._defaultSidebarWidth : this._defaultSidebarHeight;
            if (0 < size && size < 1)
                size *= this.totalSize();
        }
        return size;
    },
    _restoreSidebarSizeFromSettings: function () {
        var settingForOrientation = this._settingForOrientation();
        this._savedSidebarSize = settingForOrientation ? settingForOrientation.size : 0;
    },
    _restoreAndApplyShowModeFromSettings: function () {
        var orientationState = this._settingForOrientation();
        this._savedShowMode = orientationState ? orientationState.showMode : WebInspector.SplitView.ShowMode.Both;
        this._showMode = this._savedShowMode;
        switch (this._savedShowMode) {
        case WebInspector.SplitView.ShowMode.Both:
            this.showBoth();
            break;
        case WebInspector.SplitView.ShowMode.OnlyMain:
            this.hideSidebar();
            break;
        case WebInspector.SplitView.ShowMode.OnlySidebar:
            this.hideMain();
            break;
        }
    },
    _saveShowModeToSettings: function () {
        this._savedShowMode = this._showMode;
        this._saveSetting();
    },
    _saveSetting: function () {
        var setting = this._setting();
        if (!setting)
            return;
        var state = setting.get();
        var orientationState = (this._isVertical ? state.vertical : state.horizontal) || {};
        orientationState.size = this._savedSidebarSize;
        if (this._shouldSaveShowMode)
            orientationState.showMode = this._savedShowMode;
        if (this._isVertical)
            state.vertical = orientationState;
        else
            state.horizontal = orientationState;
        setting.set(state);
    },
    _forceUpdateLayout: function () {
        this._sidebarSize = -1;
        this._updateLayout();
    },
    _onZoomChanged: function (event) {
        this._forceUpdateLayout();
    },
    createShowHideSidebarButton: function (title, className) {
        console.assert(this.isVertical(), "Buttons for split view with horizontal split are not supported yet.");
        this._showHideSidebarButtonTitle = WebInspector.UIString(title);
        this._showHideSidebarButton = new WebInspector.StatusBarButton("", "sidebar-show-hide-button " + className, 3);
        this._showHideSidebarButton.addEventListener("click", buttonClicked.bind(this));
        this._updateShowHideSidebarButton();

        function buttonClicked(event) {
            if (this._showMode !== WebInspector.SplitView.ShowMode.Both)
                this.showBoth(true);
            else
                this.hideSidebar(true);
        }
        return this._showHideSidebarButton;
    },
    _updateShowHideSidebarButton: function () {
        if (!this._showHideSidebarButton)
            return;
        var sidebarHidden = this._showMode === WebInspector.SplitView.ShowMode.OnlyMain;
        this._showHideSidebarButton.state = sidebarHidden ? "show" : "hide";
        this._showHideSidebarButton.element.classList.toggle("top-sidebar-show-hide-button", !this.isVertical() && !this.isSidebarSecond());
        this._showHideSidebarButton.element.classList.toggle("right-sidebar-show-hide-button", this.isVertical() && this.isSidebarSecond());
        this._showHideSidebarButton.element.classList.toggle("bottom-sidebar-show-hide-button", !this.isVertical() && this.isSidebarSecond());
        this._showHideSidebarButton.element.classList.toggle("left-sidebar-show-hide-button", this.isVertical() && !this.isSidebarSecond());
        this._showHideSidebarButton.title = sidebarHidden ? WebInspector.UIString("Show %s", this._showHideSidebarButtonTitle) : WebInspector.UIString("Hide %s", this._showHideSidebarButtonTitle);
    },
    __proto__: WebInspector.View.prototype
}
WebInspector.StackView = function (isVertical) {
    WebInspector.VBox.call(this);
    this._isVertical = isVertical;
    this._currentSplitView = null;
}
WebInspector.StackView.prototype = {
    appendView: function (view, sidebarSizeSettingName, defaultSidebarWidth, defaultSidebarHeight) {
        var splitView = new WebInspector.SplitView(this._isVertical, true, sidebarSizeSettingName, defaultSidebarWidth, defaultSidebarHeight);
        view.show(splitView.mainElement());
        splitView.hideSidebar();
        if (!this._currentSplitView) {
            splitView.show(this.element);
        } else {
            splitView.show(this._currentSplitView.sidebarElement());
            this._currentSplitView.showBoth();
        }
        this._currentSplitView = splitView;
        return splitView;
    },
    detachChildViews: function () {
        WebInspector.View.prototype.detachChildViews.call(this);
        this._currentSplitView = null;
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.ExtensionServerAPI = function () {}
WebInspector.ExtensionServerAPI.prototype = {
    addExtensions: function (descriptors) {}
}
WebInspector.ExtensionServerProxy = function () {}
WebInspector.ExtensionServerProxy._ensureExtensionServer = function () {
    if (!WebInspector.extensionServer)
        WebInspector.extensionServer = WebInspector.moduleManager.instance(WebInspector.ExtensionServerAPI);
}, WebInspector.ExtensionServerProxy.prototype = {
    setFrontendReady: function () {
        this._frontendReady = true;
        this._pushExtensionsToServer();
    },
    _addExtensions: function (extensions) {
        if (extensions.length === 0)
            return;
        console.assert(!this._pendingExtensions);
        this._pendingExtensions = extensions;
        this._pushExtensionsToServer();
    },
    _pushExtensionsToServer: function () {
        if (!this._frontendReady || !this._pendingExtensions)
            return;
        WebInspector.ExtensionServerProxy._ensureExtensionServer();
        WebInspector.extensionServer.addExtensions(this._pendingExtensions);
        delete this._pendingExtensions;
    }
}
WebInspector.extensionServerProxy = new WebInspector.ExtensionServerProxy();
WebInspector.addExtensions = function (extensions) {
    WebInspector.extensionServerProxy._addExtensions(extensions);
}
WebInspector.setInspectedTabId = function (tabId) {
    WebInspector._inspectedTabId = tabId;
}
WebInspector.EmptyView = function (text) {
    WebInspector.VBox.call(this);
    this._text = text;
}
WebInspector.EmptyView.prototype = {
    wasShown: function () {
        this.element.classList.add("empty-view");
        this.element.textContent = this._text;
    },
    set text(text) {
        this._text = text;
        if (this.isShowing())
            this.element.textContent = this._text;
    },
    __proto__: WebInspector.VBox.prototype
}
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
WebInspector.TempFile = function (dirPath, name, callback) {
    this._fileEntry = null;
    this._writer = null;

    function didInitFs(fs) {
        fs.root.getDirectory(dirPath, {
            create: true
        }, didGetDir.bind(this), errorHandler);
    }

    function didGetDir(dir) {
        dir.getFile(name, {
            create: true
        }, didCreateFile.bind(this), errorHandler);
    }

    function didCreateFile(fileEntry) {
        this._fileEntry = fileEntry;
        fileEntry.createWriter(didCreateWriter.bind(this), errorHandler);
    }

    function didCreateWriter(writer) {
        function didTruncate(e) {
            this._writer = writer;
            writer.onwrite = null;
            writer.onerror = null;
            callback(this);
        }

        function onTruncateError(e) {
            WebInspector.console.log("Failed to truncate temp file " + e.code + " : " + e.message, WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(null);
        }
        if (writer.length) {
            writer.onwrite = didTruncate.bind(this);
            writer.onerror = onTruncateError;
            writer.truncate(0);
        } else {
            this._writer = writer;
            callback(this);
        }
    }

    function errorHandler(e) {
        WebInspector.console.log("Failed to create temp file " + e.code + " : " + e.message, WebInspector.ConsoleMessage.MessageLevel.Error);
        callback(null);
    }

    function didClearTempStorage() {
        window.requestFileSystem(window.TEMPORARY, 10, didInitFs.bind(this), errorHandler);
    }
    WebInspector.TempFile._ensureTempStorageCleared(didClearTempStorage.bind(this));
}
WebInspector.TempFile.prototype = {
    write: function (data, callback) {
        var blob = new Blob([data], {
            type: 'text/plain'
        });
        this._writer.onerror = function (e) {
            WebInspector.console.log("Failed to write into a temp file: " + e.message, WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(false);
        }
        this._writer.onwrite = function (e) {
            callback(true);
        }
        this._writer.write(blob);
    },
    finishWriting: function () {
        this._writer = null;
    },
    read: function (callback) {
        function didGetFile(file) {
            var reader = new FileReader();
            reader.onloadend = function (e) {
                callback((this.result));
            }
            reader.onerror = function (error) {
                WebInspector.console.log("Failed to read from temp file: " + error.message, WebInspector.ConsoleMessage.MessageLevel.Error);
            }
            reader.readAsText(file);
        }

        function didFailToGetFile(error) {
            WebInspector.console.log("Failed to load temp file: " + error.message, WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(null);
        }
        this._fileEntry.file(didGetFile, didFailToGetFile);
    },
    writeToOutputSteam: function (outputStream, delegate) {
        function didGetFile(file) {
            var reader = new WebInspector.ChunkedFileReader(file, 10 * 1000 * 1000, delegate);
            reader.start(outputStream);
        }

        function didFailToGetFile(error) {
            WebInspector.console.log("Failed to load temp file: " + error.message, WebInspector.ConsoleMessage.MessageLevel.Error);
            outputStream.close();
        }
        this._fileEntry.file(didGetFile, didFailToGetFile);
    },
    remove: function () {
        if (this._fileEntry)
            this._fileEntry.remove(function () {});
    }
}
WebInspector.BufferedTempFileWriter = function (dirPath, name) {
    this._chunks = [];
    this._tempFile = null;
    this._isWriting = false;
    this._finishCallback = null;
    this._isFinished = false;
    new WebInspector.TempFile(dirPath, name, this._didCreateTempFile.bind(this));
}
WebInspector.BufferedTempFileWriter.prototype = {
    write: function (data) {
        if (!this._chunks)
            return;
        if (this._finishCallback)
            throw new Error("Now writes are allowed after close.");
        this._chunks.push(data);
        if (this._tempFile && !this._isWriting)
            this._writeNextChunk();
    },
    close: function (callback) {
        this._finishCallback = callback;
        if (this._isFinished)
            callback(this._tempFile);
        else if (!this._isWriting && !this._chunks.length)
            this._notifyFinished();
    },
    _didCreateTempFile: function (tempFile) {
        this._tempFile = tempFile;
        if (!tempFile) {
            this._chunks = null;
            this._notifyFinished();
            return;
        }
        if (this._chunks.length)
            this._writeNextChunk();
    },
    _writeNextChunk: function () {
        var chunkSize = 0;
        var endIndex = 0;
        for (; endIndex < this._chunks.length; endIndex++) {
            chunkSize += this._chunks[endIndex].length;
            if (chunkSize > 10 * 1000 * 1000)
                break;
        }
        var chunk = this._chunks.slice(0, endIndex + 1).join("");
        this._chunks.splice(0, endIndex + 1);
        this._isWriting = true;
        this._tempFile.write(chunk, this._didWriteChunk.bind(this));
    },
    _didWriteChunk: function (success) {
        this._isWriting = false;
        if (!success) {
            this._tempFile = null;
            this._chunks = null;
            this._notifyFinished();
            return;
        }
        if (this._chunks.length)
            this._writeNextChunk();
        else if (this._finishCallback)
            this._notifyFinished();
    },
    _notifyFinished: function () {
        this._isFinished = true;
        if (this._tempFile)
            this._tempFile.finishWriting();
        if (this._finishCallback)
            this._finishCallback(this._tempFile);
    }
}
WebInspector.TempStorageCleaner = function () {
    this._worker = new SharedWorker("TempStorageSharedWorker.js", "TempStorage");
    this._callbacks = [];
    this._worker.port.onmessage = this._handleMessage.bind(this);
    this._worker.port.onerror = this._handleError.bind(this);
}
WebInspector.TempStorageCleaner.prototype = {
    ensureStorageCleared: function (callback) {
        if (this._callbacks)
            this._callbacks.push(callback);
        else
            callback();
    },
    _handleMessage: function (event) {
        if (event.data.type === "tempStorageCleared") {
            if (event.data.error)
                WebInspector.console.log(event.data.error, WebInspector.ConsoleMessage.MessageLevel.Error);
            this._notifyCallbacks();
        }
    },
    _handleError: function (event) {
        WebInspector.console.log(WebInspector.UIString("Failed to clear temp storage: %s", event.data), WebInspector.ConsoleMessage.MessageLevel.Error);
        this._notifyCallbacks();
    },
    _notifyCallbacks: function () {
        var callbacks = this._callbacks;
        this._callbacks = null;
        for (var i = 0; i < callbacks.length; i++)
            callbacks[i]();
    }
}
WebInspector.TempFile._ensureTempStorageCleared = function (callback) {
    if (!WebInspector.TempFile._storageCleaner)
        WebInspector.TempFile._storageCleaner = new WebInspector.TempStorageCleaner();
    WebInspector.TempFile._storageCleaner.ensureStorageCleared(callback);
}
WebInspector.TextRange = function (startLine, startColumn, endLine, endColumn) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
}
WebInspector.TextRange.createFromLocation = function (line, column) {
    return new WebInspector.TextRange(line, column, line, column);
}
WebInspector.TextRange.fromObject = function (serializedTextRange) {
    return new WebInspector.TextRange(serializedTextRange.startLine, serializedTextRange.startColumn, serializedTextRange.endLine, serializedTextRange.endColumn);
}
WebInspector.TextRange.prototype = {
    isEmpty: function () {
        return this.startLine === this.endLine && this.startColumn === this.endColumn;
    },
    immediatelyPrecedes: function (range) {
        if (!range)
            return false;
        return this.endLine === range.startLine && this.endColumn === range.startColumn;
    },
    immediatelyFollows: function (range) {
        if (!range)
            return false;
        return range.immediatelyPrecedes(this);
    },
    get linesCount() {
        return this.endLine - this.startLine;
    },
    collapseToEnd: function () {
        return new WebInspector.TextRange(this.endLine, this.endColumn, this.endLine, this.endColumn);
    },
    normalize: function () {
        if (this.startLine > this.endLine || (this.startLine === this.endLine && this.startColumn > this.endColumn))
            return new WebInspector.TextRange(this.endLine, this.endColumn, this.startLine, this.startColumn);
        else
            return this.clone();
    },
    clone: function () {
        return new WebInspector.TextRange(this.startLine, this.startColumn, this.endLine, this.endColumn);
    },
    serializeToObject: function () {
        var serializedTextRange = {};
        serializedTextRange.startLine = this.startLine;
        serializedTextRange.startColumn = this.startColumn;
        serializedTextRange.endLine = this.endLine;
        serializedTextRange.endColumn = this.endColumn;
        return serializedTextRange;
    },
    compareTo: function (other) {
        if (this.startLine > other.startLine)
            return 1;
        if (this.startLine < other.startLine)
            return -1;
        if (this.startColumn > other.startColumn)
            return 1;
        if (this.startColumn < other.startColumn)
            return -1;
        return 0;
    },
    equal: function (other) {
        return this.startLine === other.startLine && this.endLine === other.endLine && this.startColumn === other.startColumn && this.endColumn === other.endColumn;
    },
    shift: function (lineOffset) {
        return new WebInspector.TextRange(this.startLine + lineOffset, this.startColumn, this.endLine + lineOffset, this.endColumn);
    },
    toString: function () {
        return JSON.stringify(this);
    }
}
WebInspector.SourceRange = function (offset, length) {
    this.offset = offset;
    this.length = length;
}
WebInspector.TextUtils = {
    isStopChar: function (char) {
        return (char > " " && char < "0") || (char > "9" && char < "A") || (char > "Z" && char < "_") || (char > "_" && char < "a") || (char > "z" && char <= "~");
    },
    isWordChar: function (char) {
        return !WebInspector.TextUtils.isStopChar(char) && !WebInspector.TextUtils.isSpaceChar(char);
    },
    isSpaceChar: function (char) {
        return WebInspector.TextUtils._SpaceCharRegex.test(char);
    },
    isWord: function (word) {
        for (var i = 0; i < word.length; ++i) {
            if (!WebInspector.TextUtils.isWordChar(word.charAt(i)))
                return false;
        }
        return true;
    },
    isOpeningBraceChar: function (char) {
        return char === "(" || char === "{";
    },
    isClosingBraceChar: function (char) {
        return char === ")" || char === "}";
    },
    isBraceChar: function (char) {
        return WebInspector.TextUtils.isOpeningBraceChar(char) || WebInspector.TextUtils.isClosingBraceChar(char);
    },
    textToWords: function (text) {
        var words = [];
        var startWord = -1;
        for (var i = 0; i < text.length; ++i) {
            if (!WebInspector.TextUtils.isWordChar(text.charAt(i))) {
                if (startWord !== -1)
                    words.push(text.substring(startWord, i));
                startWord = -1;
            } else if (startWord === -1)
                startWord = i;
        }
        if (startWord !== -1)
            words.push(text.substring(startWord));
        return words;
    },
    findBalancedCurlyBrackets: function (source, startIndex, lastIndex) {
        lastIndex = lastIndex || source.length;
        startIndex = startIndex || 0;
        var counter = 0;
        var inString = false;
        for (var index = startIndex; index < lastIndex; ++index) {
            var character = source[index];
            if (inString) {
                if (character === "\\")
                ++index;
                else if (character === "\"")
                    inString = false;
            } else {
                if (character === "\"")
                    inString = true;
                else if (character === "{")
                ++counter;
                else if (character === "}") {
                    if (--counter === 0)
                        return index + 1;
                }
            }
        }
        return -1;
    }
}
WebInspector.TextUtils._SpaceCharRegex = /\s/;
WebInspector.TextUtils.Indent = {
    TwoSpaces: "  ",
    FourSpaces: "    ",
    EightSpaces: "        ",
    TabCharacter: "\t"
}
WebInspector.FileSystemModel = function () {
    WebInspector.Object.call(this);
    this._fileSystemsForOrigin = {};
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded, this._securityOriginAdded, this);
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved, this._securityOriginRemoved, this);
    FileSystemAgent.enable();
    this._reset();
}
WebInspector.FileSystemModel.prototype = {
    _reset: function () {
        for (var securityOrigin in this._fileSystemsForOrigin)
            this._removeOrigin(securityOrigin);
        var securityOrigins = WebInspector.resourceTreeModel.securityOrigins();
        for (var i = 0; i < securityOrigins.length; ++i)
            this._addOrigin(securityOrigins[i]);
    },
    _securityOriginAdded: function (event) {
        var securityOrigin = (event.data);
        this._addOrigin(securityOrigin);
    },
    _securityOriginRemoved: function (event) {
        var securityOrigin = (event.data);
        this._removeOrigin(securityOrigin);
    },
    _addOrigin: function (securityOrigin) {
        this._fileSystemsForOrigin[securityOrigin] = {};
        var types = ["persistent", "temporary"];
        for (var i = 0; i < types.length; ++i)
            this._requestFileSystemRoot(securityOrigin, types[i], this._fileSystemRootReceived.bind(this, securityOrigin, types[i], this._fileSystemsForOrigin[securityOrigin]));
    },
    _removeOrigin: function (securityOrigin) {
        for (var type in this._fileSystemsForOrigin[securityOrigin]) {
            var fileSystem = this._fileSystemsForOrigin[securityOrigin][type];
            delete this._fileSystemsForOrigin[securityOrigin][type];
            this._fileSystemRemoved(fileSystem);
        }
        delete this._fileSystemsForOrigin[securityOrigin];
    },
    _requestFileSystemRoot: function (origin, type, callback) {
        function innerCallback(error, errorCode, backendRootEntry) {
            if (error) {
                callback(FileError.SECURITY_ERR);
                return;
            }
            callback(errorCode, backendRootEntry);
        }
        FileSystemAgent.requestFileSystemRoot(origin, type, innerCallback);
    },
    _fileSystemAdded: function (fileSystem) {
        this.dispatchEventToListeners(WebInspector.FileSystemModel.EventTypes.FileSystemAdded, fileSystem);
    },
    _fileSystemRemoved: function (fileSystem) {
        this.dispatchEventToListeners(WebInspector.FileSystemModel.EventTypes.FileSystemRemoved, fileSystem);
    },
    refreshFileSystemList: function () {
        this._reset();
    },
    _fileSystemRootReceived: function (origin, type, store, errorCode, backendRootEntry) {
        if (!errorCode && backendRootEntry && this._fileSystemsForOrigin[origin] === store) {
            var fileSystem = new WebInspector.FileSystemModel.FileSystem(this, origin, type, backendRootEntry);
            store[type] = fileSystem;
            this._fileSystemAdded(fileSystem);
        }
    },
    requestDirectoryContent: function (directory, callback) {
        this._requestDirectoryContent(directory.url, this._directoryContentReceived.bind(this, directory, callback));
    },
    _requestDirectoryContent: function (url, callback) {
        function innerCallback(error, errorCode, backendEntries) {
            if (error) {
                callback(FileError.SECURITY_ERR);
                return;
            }
            if (errorCode !== 0) {
                callback(errorCode);
                return;
            }
            callback(errorCode, backendEntries);
        }
        FileSystemAgent.requestDirectoryContent(url, innerCallback);
    },
    _directoryContentReceived: function (parentDirectory, callback, errorCode, backendEntries) {
        if (!backendEntries) {
            callback(errorCode);
            return;
        }
        var entries = [];
        for (var i = 0; i < backendEntries.length; ++i) {
            if (backendEntries[i].isDirectory)
                entries.push(new WebInspector.FileSystemModel.Directory(this, parentDirectory.fileSystem, backendEntries[i]));
            else
                entries.push(new WebInspector.FileSystemModel.File(this, parentDirectory.fileSystem, backendEntries[i]));
        }
        callback(errorCode, entries);
    },
    requestMetadata: function (entry, callback) {
        function innerCallback(error, errorCode, metadata) {
            if (error) {
                callback(FileError.SECURITY_ERR);
                return;
            }
            callback(errorCode, metadata);
        }
        FileSystemAgent.requestMetadata(entry.url, innerCallback);
    },
    requestFileContent: function (file, readAsText, start, end, charset, callback) {
        this._requestFileContent(file.url, readAsText, start, end, charset, callback);
    },
    _requestFileContent: function (url, readAsText, start, end, charset, callback) {
        function innerCallback(error, errorCode, content, charset) {
            if (error) {
                if (callback)
                    callback(FileError.SECURITY_ERR);
                return;
            }
            if (callback)
                callback(errorCode, content, charset);
        }
        FileSystemAgent.requestFileContent(url, readAsText, start, end, charset, innerCallback);
    },
    deleteEntry: function (entry, callback) {
        var fileSystemModel = this;
        if (entry === entry.fileSystem.root)
            this._deleteEntry(entry.url, hookFileSystemDeletion);
        else
            this._deleteEntry(entry.url, callback);

        function hookFileSystemDeletion(errorCode) {
            callback(errorCode);
            if (!errorCode)
                fileSystemModel._removeFileSystem(entry.fileSystem);
        }
    },
    _deleteEntry: function (url, callback) {
        function innerCallback(error, errorCode) {
            if (error) {
                if (callback)
                    callback(FileError.SECURITY_ERR);
                return;
            }
            if (callback)
                callback(errorCode);
        }
        FileSystemAgent.deleteEntry(url, innerCallback);
    },
    _removeFileSystem: function (fileSystem) {
        var origin = fileSystem.origin;
        var type = fileSystem.type;
        if (this._fileSystemsForOrigin[origin] && this._fileSystemsForOrigin[origin][type]) {
            delete this._fileSystemsForOrigin[origin][type];
            this._fileSystemRemoved(fileSystem);
            if (Object.isEmpty(this._fileSystemsForOrigin[origin]))
                delete this._fileSystemsForOrigin[origin];
        }
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.FileSystemModel.EventTypes = {
    FileSystemAdded: "FileSystemAdded",
    FileSystemRemoved: "FileSystemRemoved"
}
WebInspector.FileSystemModel.FileSystem = function (fileSystemModel, origin, type, backendRootEntry) {
    this.origin = origin;
    this.type = type;
    this.root = new WebInspector.FileSystemModel.Directory(fileSystemModel, this, backendRootEntry);
}
WebInspector.FileSystemModel.FileSystem.prototype = {
    get name() {
        return "filesystem:" + this.origin + "/" + this.type;
    }
}
WebInspector.FileSystemModel.Entry = function (fileSystemModel, fileSystem, backendEntry) {
    this._fileSystemModel = fileSystemModel;
    this._fileSystem = fileSystem;
    this._url = backendEntry.url;
    this._name = backendEntry.name;
    this._isDirectory = backendEntry.isDirectory;
}
WebInspector.FileSystemModel.Entry.compare = function (x, y) {
    if (x.isDirectory != y.isDirectory)
        return y.isDirectory ? 1 : -1;
    return x.name.compareTo(y.name);
}
WebInspector.FileSystemModel.Entry.prototype = {
    get fileSystemModel() {
        return this._fileSystemModel;
    }, get fileSystem() {
        return this._fileSystem;
    }, get url() {
        return this._url;
    }, get name() {
        return this._name;
    }, get isDirectory() {
        return this._isDirectory;
    }, requestMetadata: function (callback) {
        this.fileSystemModel.requestMetadata(this, callback);
    }, deleteEntry: function (callback) {
        this.fileSystemModel.deleteEntry(this, callback);
    }
}
WebInspector.FileSystemModel.Directory = function (fileSystemModel, fileSystem, backendEntry) {
    WebInspector.FileSystemModel.Entry.call(this, fileSystemModel, fileSystem, backendEntry);
}
WebInspector.FileSystemModel.Directory.prototype = {
    requestDirectoryContent: function (callback) {
        this.fileSystemModel.requestDirectoryContent(this, callback);
    },
    __proto__: WebInspector.FileSystemModel.Entry.prototype
}
WebInspector.FileSystemModel.File = function (fileSystemModel, fileSystem, backendEntry) {
    WebInspector.FileSystemModel.Entry.call(this, fileSystemModel, fileSystem, backendEntry);
    this._mimeType = backendEntry.mimeType;
    this._resourceType = WebInspector.resourceTypes[backendEntry.resourceType];
    this._isTextFile = backendEntry.isTextFile;
}
WebInspector.FileSystemModel.File.prototype = {
    get mimeType() {
        return this._mimeType;
    }, get resourceType() {
        return this._resourceType;
    }, get isTextFile() {
        return this._isTextFile;
    }, requestFileContent: function (readAsText, start, end, charset, callback) {
        this.fileSystemModel.requestFileContent(this, readAsText, start, end, charset, callback);
    }, __proto__: WebInspector.FileSystemModel.Entry.prototype
}
WebInspector.OutputStreamDelegate = function () {}
WebInspector.OutputStreamDelegate.prototype = {
    onTransferStarted: function () {},
    onTransferFinished: function () {},
    onChunkTransferred: function (reader) {},
    onError: function (reader, event) {},
}
WebInspector.OutputStream = function () {}
WebInspector.OutputStream.prototype = {
    write: function (data, callback) {},
    close: function () {}
}
WebInspector.ChunkedReader = function () {}
WebInspector.ChunkedReader.prototype = {
    fileSize: function () {},
    loadedSize: function () {},
    fileName: function () {},
    cancel: function () {}
}
WebInspector.ChunkedFileReader = function (file, chunkSize, delegate) {
    this._file = file;
    this._fileSize = file.size;
    this._loadedSize = 0;
    this._chunkSize = chunkSize;
    this._delegate = delegate;
    this._isCanceled = false;
}
WebInspector.ChunkedFileReader.prototype = {
    start: function (output) {
        this._output = output;
        this._reader = new FileReader();
        this._reader.onload = this._onChunkLoaded.bind(this);
        this._reader.onerror = this._delegate.onError.bind(this._delegate, this);
        this._delegate.onTransferStarted();
        this._loadChunk();
    },
    cancel: function () {
        this._isCanceled = true;
    },
    loadedSize: function () {
        return this._loadedSize;
    },
    fileSize: function () {
        return this._fileSize;
    },
    fileName: function () {
        return this._file.name;
    },
    _onChunkLoaded: function (event) {
        if (this._isCanceled)
            return;
        if (event.target.readyState !== FileReader.DONE)
            return;
        var data = event.target.result;
        this._loadedSize += data.length;
        this._output.write(data);
        if (this._isCanceled)
            return;
        this._delegate.onChunkTransferred(this);
        if (this._loadedSize === this._fileSize) {
            this._file = null;
            this._reader = null;
            this._output.close();
            this._delegate.onTransferFinished();
            return;
        }
        this._loadChunk();
    },
    _loadChunk: function () {
        var chunkStart = this._loadedSize;
        var chunkEnd = Math.min(this._fileSize, chunkStart + this._chunkSize)
        var nextPart = this._file.slice(chunkStart, chunkEnd);
        this._reader.readAsText(nextPart);
    }
}
WebInspector.ChunkedXHRReader = function (url, delegate) {
    this._url = url;
    this._delegate = delegate;
    this._fileSize = 0;
    this._loadedSize = 0;
    this._isCanceled = false;
}
WebInspector.ChunkedXHRReader.prototype = {
    start: function (output) {
        this._output = output;
        this._xhr = new XMLHttpRequest();
        this._xhr.open("GET", this._url, true);
        this._xhr.onload = this._onLoad.bind(this);
        this._xhr.onprogress = this._onProgress.bind(this);
        this._xhr.onerror = this._delegate.onError.bind(this._delegate, this);
        this._xhr.send(null);
        this._delegate.onTransferStarted();
    },
    cancel: function () {
        this._isCanceled = true;
        this._xhr.abort();
    },
    loadedSize: function () {
        return this._loadedSize;
    },
    fileSize: function () {
        return this._fileSize;
    },
    fileName: function () {
        return this._url;
    },
    _onProgress: function (event) {
        if (this._isCanceled)
            return;
        if (event.lengthComputable)
            this._fileSize = event.total;
        var data = this._xhr.responseText.substring(this._loadedSize);
        if (!data.length)
            return;
        this._loadedSize += data.length;
        this._output.write(data);
        if (this._isCanceled)
            return;
        this._delegate.onChunkTransferred(this);
    },
    _onLoad: function (event) {
        this._onProgress(event);
        if (this._isCanceled)
            return;
        this._output.close();
        this._delegate.onTransferFinished();
    }
}
WebInspector.createFileSelectorElement = function (callback) {
    var fileSelectorElement = document.createElement("input");
    fileSelectorElement.type = "file";
    fileSelectorElement.style.display = "none";
    fileSelectorElement.setAttribute("tabindex", -1);
    fileSelectorElement.onchange = onChange;

    function onChange(event) {
        callback(fileSelectorElement.files[0]);
    };
    return fileSelectorElement;
}
WebInspector.FileOutputStream = function () {}
WebInspector.FileOutputStream.prototype = {
    open: function (fileName, callback) {
        this._closed = false;
        this._writeCallbacks = [];
        this._fileName = fileName;

        function callbackWrapper(accepted) {
            if (accepted)
                WebInspector.fileManager.addEventListener(WebInspector.FileManager.EventTypes.AppendedToURL, this._onAppendDone, this);
            callback(accepted);
        }
        WebInspector.fileManager.save(this._fileName, "", true, callbackWrapper.bind(this));
    },
    write: function (data, callback) {
        this._writeCallbacks.push(callback);
        WebInspector.fileManager.append(this._fileName, data);
    },
    close: function () {
        this._closed = true;
        if (this._writeCallbacks.length)
            return;
        WebInspector.fileManager.removeEventListener(WebInspector.FileManager.EventTypes.AppendedToURL, this._onAppendDone, this);
        WebInspector.fileManager.close(this._fileName);
    },
    _onAppendDone: function (event) {
        if (event.data !== this._fileName)
            return;
        var callback = this._writeCallbacks.shift();
        if (callback)
            callback(this);
        if (!this._writeCallbacks.length) {
            if (this._closed) {
                WebInspector.fileManager.removeEventListener(WebInspector.FileManager.EventTypes.AppendedToURL, this._onAppendDone, this);
                WebInspector.fileManager.close(this._fileName);
            }
        }
    }
}

function SourceMapV3() {
    this.version;
    this.file;
    this.sources;
    this.sections;
    this.mappings;
    this.sourceRoot;
}
SourceMapV3.Section = function () {
    this.map;
    this.offset;
}
SourceMapV3.Offset = function () {
    this.line;
    this.column;
}
WebInspector.SourceMap = function (sourceMappingURL, payload) {
    if (!WebInspector.SourceMap.prototype._base64Map) {
        const base64Digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        WebInspector.SourceMap.prototype._base64Map = {};
        for (var i = 0; i < base64Digits.length; ++i)
            WebInspector.SourceMap.prototype._base64Map[base64Digits.charAt(i)] = i;
    }
    this._sourceMappingURL = sourceMappingURL;
    this._reverseMappingsBySourceURL = {};
    this._mappings = [];
    this._sources = {};
    this._sourceContentByURL = {};
    this._parseMappingPayload(payload);
}
WebInspector.SourceMap._sourceMapRequestHeaderName = "X-Source-Map-Request-From";
WebInspector.SourceMap._sourceMapRequestHeaderValue = "inspector";
WebInspector.SourceMap.hasSourceMapRequestHeader = function (request) {
    return request && request.requestHeaderValue(WebInspector.SourceMap._sourceMapRequestHeaderName) === WebInspector.SourceMap._sourceMapRequestHeaderValue;
}
WebInspector.SourceMap.load = function (sourceMapURL, compiledURL, callback) {
    var headers = {};
    headers[WebInspector.SourceMap._sourceMapRequestHeaderName] = WebInspector.SourceMap._sourceMapRequestHeaderValue;
    NetworkAgent.loadResourceForFrontend(WebInspector.resourceTreeModel.mainFrame.id, sourceMapURL, headers, contentLoaded);

    function contentLoaded(error, statusCode, headers, content) {
        if (error || !content || statusCode >= 400) {
            callback(null);
            return;
        }
        if (content.slice(0, 3) === ")]}")
            content = content.substring(content.indexOf('\n'));
        try {
            var payload = (JSON.parse(content));
            var baseURL = sourceMapURL.startsWith("data:") ? compiledURL : sourceMapURL;
            callback(new WebInspector.SourceMap(baseURL, payload));
        } catch (e) {
            console.error(e.message);
            callback(null);
        }
    }
}
WebInspector.SourceMap.prototype = {
    url: function () {
        return this._sourceMappingURL;
    },
    sources: function () {
        return Object.keys(this._sources);
    },
    sourceContent: function (sourceURL) {
        return this._sourceContentByURL[sourceURL];
    },
    sourceContentProvider: function (sourceURL, contentType) {
        var sourceContent = this.sourceContent(sourceURL);
        if (sourceContent)
            return new WebInspector.StaticContentProvider(contentType, sourceContent);
        return new WebInspector.CompilerSourceMappingContentProvider(sourceURL, contentType);
    },
    _parseMappingPayload: function (mappingPayload) {
        if (mappingPayload.sections)
            this._parseSections(mappingPayload.sections);
        else
            this._parseMap(mappingPayload, 0, 0);
    },
    _parseSections: function (sections) {
        for (var i = 0; i < sections.length; ++i) {
            var section = sections[i];
            this._parseMap(section.map, section.offset.line, section.offset.column);
        }
    },
    findEntry: function (lineNumber, columnNumber) {
        var first = 0;
        var count = this._mappings.length;
        while (count > 1) {
            var step = count >> 1;
            var middle = first + step;
            var mapping = this._mappings[middle];
            if (lineNumber < mapping[0] || (lineNumber === mapping[0] && columnNumber < mapping[1]))
                count = step;
            else {
                first = middle;
                count -= step;
            }
        }
        var entry = this._mappings[first];
        if (!first && entry && (lineNumber < entry[0] || (lineNumber === entry[0] && columnNumber < entry[1])))
            return null;
        return entry;
    },
    findEntryReversed: function (sourceURL, lineNumber) {
        var mappings = this._reverseMappingsBySourceURL[sourceURL];
        for (; lineNumber < mappings.length; ++lineNumber) {
            var mapping = mappings[lineNumber];
            if (mapping)
                return mapping;
        }
        return this._mappings[0];
    },
    _parseMap: function (map, lineNumber, columnNumber) {
        var sourceIndex = 0;
        var sourceLineNumber = 0;
        var sourceColumnNumber = 0;
        var nameIndex = 0;
        var sources = [];
        var originalToCanonicalURLMap = {};
        for (var i = 0; i < map.sources.length; ++i) {
            var originalSourceURL = map.sources[i];
            var sourceRoot = map.sourceRoot || "";
            if (sourceRoot && !sourceRoot.endsWith("/"))
                sourceRoot += "/";
            var href = sourceRoot + originalSourceURL;
            var url = WebInspector.ParsedURL.completeURL(this._sourceMappingURL, href) || href;
            originalToCanonicalURLMap[originalSourceURL] = url;
            sources.push(url);
            this._sources[url] = true;
            if (map.sourcesContent && map.sourcesContent[i])
                this._sourceContentByURL[url] = map.sourcesContent[i];
        }
        var stringCharIterator = new WebInspector.SourceMap.StringCharIterator(map.mappings);
        var sourceURL = sources[sourceIndex];
        while (true) {
            if (stringCharIterator.peek() === ",")
                stringCharIterator.next();
            else {
                while (stringCharIterator.peek() === ";") {
                    lineNumber += 1;
                    columnNumber = 0;
                    stringCharIterator.next();
                }
                if (!stringCharIterator.hasNext())
                    break;
            }
            columnNumber += this._decodeVLQ(stringCharIterator);
            if (this._isSeparator(stringCharIterator.peek())) {
                this._mappings.push([lineNumber, columnNumber]);
                continue;
            }
            var sourceIndexDelta = this._decodeVLQ(stringCharIterator);
            if (sourceIndexDelta) {
                sourceIndex += sourceIndexDelta;
                sourceURL = sources[sourceIndex];
            }
            sourceLineNumber += this._decodeVLQ(stringCharIterator);
            sourceColumnNumber += this._decodeVLQ(stringCharIterator);
            if (!this._isSeparator(stringCharIterator.peek()))
                nameIndex += this._decodeVLQ(stringCharIterator);
            this._mappings.push([lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber]);
        }
        for (var i = 0; i < this._mappings.length; ++i) {
            var mapping = this._mappings[i];
            var url = mapping[2];
            if (!url)
                continue;
            if (!this._reverseMappingsBySourceURL[url])
                this._reverseMappingsBySourceURL[url] = [];
            var reverseMappings = this._reverseMappingsBySourceURL[url];
            var sourceLine = mapping[3];
            if (!reverseMappings[sourceLine])
                reverseMappings[sourceLine] = [mapping[0], mapping[1]];
        }
    },
    _isSeparator: function (char) {
        return char === "," || char === ";";
    },
    _decodeVLQ: function (stringCharIterator) {
        var result = 0;
        var shift = 0;
        do {
            var digit = this._base64Map[stringCharIterator.next()];
            result += (digit & this._VLQ_BASE_MASK) << shift;
            shift += this._VLQ_BASE_SHIFT;
        } while (digit & this._VLQ_CONTINUATION_MASK);
        var negative = result & 1;
        result >>= 1;
        return negative ? -result : result;
    },
    _VLQ_BASE_SHIFT: 5,
    _VLQ_BASE_MASK: (1 << 5) - 1,
    _VLQ_CONTINUATION_MASK: 1 << 5
}
WebInspector.SourceMap.StringCharIterator = function (string) {
    this._string = string;
    this._position = 0;
}
WebInspector.SourceMap.StringCharIterator.prototype = {
    next: function () {
        return this._string.charAt(this._position++);
    },
    peek: function () {
        return this._string.charAt(this._position);
    },
    hasNext: function () {
        return this._position < this._string.length;
    }
}
WebInspector.SourceMapping = function () {}
WebInspector.SourceMapping.prototype = {
    rawLocationToUILocation: function (rawLocation) {},
    uiLocationToRawLocation: function (uiSourceCode, lineNumber, columnNumber) {},
    isIdentity: function () {}
}
WebInspector.ScriptSourceMapping = function () {}
WebInspector.ScriptSourceMapping.prototype = {
    addScript: function (script) {}
}
WebInspector.LayerTreeModel = function () {
    WebInspector.Object.call(this);
    this._layersById = {};
    this._lastPaintRectByLayerId = {};
    this._backendNodeIdToNodeId = {};
    InspectorBackend.registerLayerTreeDispatcher(new WebInspector.LayerTreeDispatcher(this));
    WebInspector.domModel.addEventListener(WebInspector.DOMModel.Events.DocumentUpdated, this._onDocumentUpdated, this);
}
WebInspector.LayerTreeModel.Events = {
    LayerTreeChanged: "LayerTreeChanged",
    LayerPainted: "LayerPainted",
}
WebInspector.LayerTreeModel.prototype = {
    disable: function () {
        if (!this._enabled)
            return;
        this._enabled = false;
        this._backendNodeIdToNodeId = {};
        LayerTreeAgent.disable();
    },
    enable: function (callback) {
        if (this._enabled)
            return;
        this._enabled = true;
        LayerTreeAgent.enable();
    },
    setSnapshot: function (snapshot) {
        this.disable();
        this._resolveNodesAndRepopulate(snapshot.layers);
    },
    root: function () {
        return this._root;
    },
    contentRoot: function () {
        return this._contentRoot;
    },
    forEachLayer: function (callback, root) {
        if (!root) {
            root = this.root();
            if (!root)
                return false;
        }
        return callback(root) || root.children().some(this.forEachLayer.bind(this, callback));
    },
    layerById: function (id) {
        return this._layersById[id] || null;
    },
    _resolveNodesAndRepopulate: function (payload) {
        if (payload)
            this._resolveBackendNodeIdsForLayers(payload, onBackendNodeIdsResolved.bind(this));
        else
            onBackendNodeIdsResolved.call(this);

        function onBackendNodeIdsResolved() {
            this._repopulate(payload || []);
            this.dispatchEventToListeners(WebInspector.LayerTreeModel.Events.LayerTreeChanged);
        }
    },
    _repopulate: function (layers) {
        this._root = null;
        this._contentRoot = null;
        if (!layers)
            return;
        var oldLayersById = this._layersById;
        this._layersById = {};
        for (var i = 0; i < layers.length; ++i) {
            var layerId = layers[i].layerId;
            var layer = oldLayersById[layerId];
            if (layer)
                layer._reset(layers[i]);
            else
                layer = new WebInspector.Layer(layers[i]);
            this._layersById[layerId] = layer;
            if (layers[i].backendNodeId) {
                layer._setNodeId(this._backendNodeIdToNodeId[layers[i].backendNodeId]);
                if (!this._contentRoot)
                    this._contentRoot = layer;
            }
            var lastPaintRect = this._lastPaintRectByLayerId[layerId];
            if (lastPaintRect)
                layer._lastPaintRect = lastPaintRect;
            var parentId = layer.parentId();
            if (parentId) {
                var parent = this._layersById[parentId];
                if (!parent)
                    console.assert(parent, "missing parent " + parentId + " for layer " + layerId);
                parent.addChild(layer);
            } else {
                if (this._root)
                    console.assert(false, "Multiple root layers");
                this._root = layer;
            }
        }
        this._lastPaintRectByLayerId = {};
    },
    _layerTreeChanged: function (layers) {
        if (!this._enabled)
            return;
        this._resolveNodesAndRepopulate(layers);
    },
    _resolveBackendNodeIdsForLayers: function (layers, callback) {
        var idsToResolve = {};
        var requestedIds = [];
        for (var i = 0; i < layers.length; ++i) {
            var backendNodeId = layers[i].backendNodeId;
            if (!backendNodeId || idsToResolve[backendNodeId] || (this._backendNodeIdToNodeId[backendNodeId] && WebInspector.domModel.nodeForId(this._backendNodeIdToNodeId[backendNodeId]))) {
                continue;
            }
            idsToResolve[backendNodeId] = true;
            requestedIds.push(backendNodeId);
        }
        if (!requestedIds.length) {
            callback();
            return;
        }
        WebInspector.domModel.pushNodesByBackendIdsToFrontend(requestedIds, populateBackendNodeIdMap.bind(this));

        function populateBackendNodeIdMap(nodeIds) {
            if (nodeIds) {
                for (var i = 0; i < requestedIds.length; ++i) {
                    var nodeId = nodeIds[i];
                    if (nodeId)
                        this._backendNodeIdToNodeId[requestedIds[i]] = nodeId;
                }
            }
            callback();
        }
    },
    _layerPainted: function (layerId, clipRect) {
        var layer = this._layersById[layerId];
        if (!layer) {
            this._lastPaintRectByLayerId[layerId] = clipRect;
            return;
        }
        layer._didPaint(clipRect);
        this.dispatchEventToListeners(WebInspector.LayerTreeModel.Events.LayerPainted, layer);
    },
    _onDocumentUpdated: function () {
        this.disable();
        this.enable();
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.Layer = function (layerPayload) {
    this._scrollRects = [];
    this._reset(layerPayload);
}
WebInspector.Layer.prototype = {
    id: function () {
        return this._layerPayload.layerId;
    },
    parentId: function () {
        return this._layerPayload.parentLayerId;
    },
    parent: function () {
        return this._parent;
    },
    isRoot: function () {
        return !this.parentId();
    },
    children: function () {
        return this._children;
    },
    addChild: function (child) {
        if (child._parent)
            console.assert(false, "Child already has a parent");
        this._children.push(child);
        child._parent = this;
    },
    _setNodeId: function (nodeId) {
        this._nodeId = nodeId;
    },
    nodeId: function () {
        return this._nodeId;
    },
    nodeIdForSelfOrAncestor: function () {
        for (var layer = this; layer; layer = layer._parent) {
            var nodeId = layer._nodeId;
            if (nodeId)
                return nodeId;
        }
        return null;
    },
    offsetX: function () {
        return this._layerPayload.offsetX;
    },
    offsetY: function () {
        return this._layerPayload.offsetY;
    },
    width: function () {
        return this._layerPayload.width;
    },
    height: function () {
        return this._layerPayload.height;
    },
    transform: function () {
        return this._layerPayload.transform;
    },
    anchorPoint: function () {
        return [this._layerPayload.anchorX || 0, this._layerPayload.anchorY || 0, this._layerPayload.anchorZ || 0, ];
    },
    invisible: function () {
        return this._layerPayload.invisible;
    },
    paintCount: function () {
        return this._paintCount || this._layerPayload.paintCount;
    },
    lastPaintRect: function () {
        return this._lastPaintRect;
    },
    scrollRects: function () {
        return this._scrollRects;
    },
    requestCompositingReasons: function (callback) {
        var wrappedCallback = InspectorBackend.wrapClientCallback(callback, "LayerTreeAgent.reasonsForCompositingLayer(): ", undefined, []);
        LayerTreeAgent.compositingReasons(this.id(), wrappedCallback);
    },
    requestSnapshot: function (callback) {
        var wrappedCallback = InspectorBackend.wrapClientCallback(callback, "LayerTreeAgent.makeSnapshot(): ", WebInspector.PaintProfilerSnapshot);
        LayerTreeAgent.makeSnapshot(this.id(), wrappedCallback);
    },
    _didPaint: function (rect) {
        this._lastPaintRect = rect;
        this._paintCount = this.paintCount() + 1;
        this._image = null;
    },
    _reset: function (layerPayload) {
        this._children = [];
        this._parent = null;
        this._paintCount = 0;
        this._layerPayload = layerPayload;
        this._image = null;
        this._nodeId = 0;
        this._scrollRects = this._layerPayload.scrollRects || [];
    }
}
WebInspector.LayerTreeSnapshot = function (layers) {
    this.layers = layers;
}
WebInspector.LayerTreeDispatcher = function (layerTreeModel) {
    this._layerTreeModel = layerTreeModel;
}
WebInspector.LayerTreeDispatcher.prototype = {
    layerTreeDidChange: function (layers) {
        this._layerTreeModel._layerTreeChanged(layers);
    },
    layerPainted: function (layerId, clipRect) {
        this._layerTreeModel._layerPainted(layerId, clipRect);
    }
}
WebInspector.Script = function (scriptId, sourceURL, startLine, startColumn, endLine, endColumn, isContentScript, sourceMapURL, hasSourceURL) {
    this.scriptId = scriptId;
    this.sourceURL = sourceURL;
    this.lineOffset = startLine;
    this.columnOffset = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
    this.isContentScript = isContentScript;
    this.sourceMapURL = sourceMapURL;
    this.hasSourceURL = hasSourceURL;
    this._locations = new Set();
    this._sourceMappings = [];
}
WebInspector.Script.Events = {
    ScriptEdited: "ScriptEdited",
}
WebInspector.Script.snippetSourceURLPrefix = "snippets:///";
WebInspector.Script._trimSourceURLComment = function (source) {
    var sourceURLRegex = /\n[\040\t]*\/\/[@#]\ssourceURL=\s*(\S*?)\s*$/mg;
    return source.replace(sourceURLRegex, "");
}, WebInspector.Script.prototype = {
    contentURL: function () {
        return this.sourceURL;
    },
    contentType: function () {
        return WebInspector.resourceTypes.Script;
    },
    requestContent: function (callback) {
        if (this._source) {
            callback(this._source);
            return;
        }

        function didGetScriptSource(error, source) {
            this._source = WebInspector.Script._trimSourceURLComment(error ? "" : source);
            callback(this._source);
        }
        if (this.scriptId) {
            DebuggerAgent.getScriptSource(this.scriptId, didGetScriptSource.bind(this));
        } else
            callback("");
    },
    searchInContent: function (query, caseSensitive, isRegex, callback) {
        function innerCallback(error, searchMatches) {
            if (error)
                console.error(error);
            var result = [];
            for (var i = 0; i < searchMatches.length; ++i) {
                var searchMatch = new WebInspector.ContentProvider.SearchMatch(searchMatches[i].lineNumber, searchMatches[i].lineContent);
                result.push(searchMatch);
            }
            callback(result || []);
        }
        if (this.scriptId) {
            DebuggerAgent.searchInContent(this.scriptId, query, caseSensitive, isRegex, innerCallback);
        } else
            callback([]);
    },
    _appendSourceURLCommentIfNeeded: function (source) {
        if (!this.hasSourceURL)
            return source;
        return source + "\n //# sourceURL=" + this.sourceURL;
    },
    editSource: function (newSource, callback) {
        function didEditScriptSource(error, errorData, callFrames, debugData, asyncStackTrace) {
            if (!error)
                this._source = newSource;
            var needsStepIn = !!debugData && debugData["stack_update_needs_step_in"] === true;
            callback(error, errorData, callFrames, asyncStackTrace, needsStepIn);
            if (!error)
                this.dispatchEventToListeners(WebInspector.Script.Events.ScriptEdited, newSource);
        }
        newSource = WebInspector.Script._trimSourceURLComment(newSource);
        newSource = this._appendSourceURLCommentIfNeeded(newSource);
        if (this.scriptId)
            DebuggerAgent.setScriptSource(this.scriptId, newSource, undefined, didEditScriptSource.bind(this));
        else
            callback("Script failed to parse");
    },
    isInlineScript: function () {
        var startsAtZero = !this.lineOffset && !this.columnOffset;
        return !!this.sourceURL && !startsAtZero;
    },
    isAnonymousScript: function () {
        return !this.sourceURL;
    },
    isSnippet: function () {
        return !!this.sourceURL && this.sourceURL.startsWith(WebInspector.Script.snippetSourceURLPrefix);
    },
    rawLocationToUILocation: function (lineNumber, columnNumber) {
        var uiLocation;
        var rawLocation = new WebInspector.DebuggerModel.Location(this.scriptId, lineNumber, columnNumber || 0);
        for (var i = this._sourceMappings.length - 1; !uiLocation && i >= 0; --i)
            uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
        console.assert(uiLocation, "Script raw location can not be mapped to any ui location.");
        return (uiLocation);
    },
    pushSourceMapping: function (sourceMapping) {
        this._sourceMappings.push(sourceMapping);
        this.updateLocations();
    },
    popSourceMapping: function () {
        var sourceMapping = this._sourceMappings.pop();
        this.updateLocations();
        return sourceMapping;
    },
    updateLocations: function () {
        var items = this._locations.items();
        for (var i = 0; i < items.length; ++i)
            items[i].update();
    },
    createLiveLocation: function (rawLocation, updateDelegate) {
        console.assert(rawLocation.scriptId === this.scriptId);
        var location = new WebInspector.Script.Location(this, rawLocation, updateDelegate);
        this._locations.add(location);
        location.update();
        return location;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.Script.Location = function (script, rawLocation, updateDelegate) {
    WebInspector.LiveLocation.call(this, rawLocation, updateDelegate);
    this._script = script;
}
WebInspector.Script.Location.prototype = {
    uiLocation: function () {
        var debuggerModelLocation = (this.rawLocation());
        return this._script.rawLocationToUILocation(debuggerModelLocation.lineNumber, debuggerModelLocation.columnNumber);
    },
    dispose: function () {
        WebInspector.LiveLocation.prototype.dispose.call(this);
        this._script._locations.remove(this);
    },
    __proto__: WebInspector.LiveLocation.prototype
}
WebInspector.LinkifierFormatter = function () {}
WebInspector.LinkifierFormatter.prototype = {
    formatLiveAnchor: function (anchor, uiLocation) {}
}
WebInspector.Linkifier = function (formatter) {
    this._formatter = formatter || new WebInspector.Linkifier.DefaultFormatter(WebInspector.Linkifier.MaxLengthForDisplayedURLs);
    this._liveLocations = [];
}
WebInspector.Linkifier.setLinkHandler = function (handler) {
    WebInspector.Linkifier._linkHandler = handler;
}
WebInspector.Linkifier.handleLink = function (url, lineNumber) {
    if (!WebInspector.Linkifier._linkHandler)
        return false;
    return WebInspector.Linkifier._linkHandler.handleLink(url, lineNumber)
}
WebInspector.Linkifier.linkifyUsingRevealer = function (revealable, text, fallbackHref, fallbackLineNumber, title, classes) {
    var a = document.createElement("a");
    a.className = (classes || "") + " webkit-html-resource-link";
    a.textContent = text.trimMiddle(WebInspector.Linkifier.MaxLengthForDisplayedURLs);
    a.title = title || text;
    if (fallbackHref) {
        a.href = fallbackHref;
        a.lineNumber = fallbackLineNumber;
    }

    function clickHandler(event) {
        event.consume(true);
        if (fallbackHref && WebInspector.Linkifier.handleLink(fallbackHref, fallbackLineNumber))
            return;
        WebInspector.Revealer.reveal(this);
    }
    a.addEventListener("click", clickHandler.bind(revealable), false);
    return a;
}
WebInspector.Linkifier.prototype = {
    linkifyLocation: function (sourceURL, lineNumber, columnNumber, classes) {
        var rawLocation = WebInspector.debuggerModel.createRawLocationByURL(sourceURL, lineNumber, columnNumber || 0);
        if (!rawLocation)
            return WebInspector.linkifyResourceAsNode(sourceURL, lineNumber, classes);
        return this.linkifyRawLocation(rawLocation, classes);
    },
    linkifyRawLocation: function (rawLocation, classes) {
        var script = WebInspector.debuggerModel.scriptForId(rawLocation.scriptId);
        if (!script)
            return null;
        var anchor = this._createAnchor(classes);
        var liveLocation = script.createLiveLocation(rawLocation, this._updateAnchor.bind(this, anchor));
        this._liveLocations.push(liveLocation);
        return anchor;
    },
    linkifyCSSLocation: function (styleSheetId, rawLocation, classes) {
        var anchor = this._createAnchor(classes);
        var liveLocation = WebInspector.cssModel.createLiveLocation(styleSheetId, rawLocation, this._updateAnchor.bind(this, anchor));
        if (!liveLocation)
            return null;
        this._liveLocations.push(liveLocation);
        return anchor;
    },
    _createAnchor: function (classes) {
        var anchor = document.createElement("a");
        anchor.className = (classes || "") + " webkit-html-resource-link";

        function clickHandler(event) {
            event.consume(true);
            if (!anchor.__uiLocation)
                return;
            if (WebInspector.Linkifier.handleLink(anchor.__uiLocation.url(), anchor.__uiLocation.lineNumber))
                return;
            WebInspector.Revealer.reveal(anchor.__uiLocation);
        }
        anchor.addEventListener("click", clickHandler, false);
        return anchor;
    },
    reset: function () {
        for (var i = 0; i < this._liveLocations.length; ++i)
            this._liveLocations[i].dispose();
        this._liveLocations = [];
    },
    _updateAnchor: function (anchor, uiLocation) {
        anchor.__uiLocation = uiLocation;
        this._formatter.formatLiveAnchor(anchor, uiLocation);
    }
}
WebInspector.Linkifier.DefaultFormatter = function (maxLength) {
    this._maxLength = maxLength;
}
WebInspector.Linkifier.DefaultFormatter.prototype = {
    formatLiveAnchor: function (anchor, uiLocation) {
        var text = uiLocation.linkText();
        if (this._maxLength)
            text = text.trimMiddle(this._maxLength);
        anchor.textContent = text;
        var titleText = uiLocation.uiSourceCode.originURL();
        if (typeof uiLocation.lineNumber === "number")
            titleText += ":" + (uiLocation.lineNumber + 1);
        anchor.title = titleText;
    }
}
WebInspector.Linkifier.DefaultCSSFormatter = function () {
    WebInspector.Linkifier.DefaultFormatter.call(this, WebInspector.Linkifier.DefaultCSSFormatter.MaxLengthForDisplayedURLs);
}
WebInspector.Linkifier.DefaultCSSFormatter.MaxLengthForDisplayedURLs = 30;
WebInspector.Linkifier.DefaultCSSFormatter.prototype = {
    formatLiveAnchor: function (anchor, uiLocation) {
        WebInspector.Linkifier.DefaultFormatter.prototype.formatLiveAnchor.call(this, anchor, uiLocation);
        anchor.classList.add("webkit-html-resource-link");
        anchor.setAttribute("data-uncopyable", anchor.textContent);
        anchor.textContent = "";
    },
    __proto__: WebInspector.Linkifier.DefaultFormatter.prototype
}
WebInspector.Linkifier.MaxLengthForDisplayedURLs = 150;
WebInspector.Linkifier.LinkHandler = function () {}
WebInspector.Linkifier.LinkHandler.prototype = {
    handleLink: function (url, lineNumber) {}
}
WebInspector.Linkifier.liveLocationText = function (scriptId, lineNumber, columnNumber) {
    var script = WebInspector.debuggerModel.scriptForId(scriptId);
    if (!script)
        return "";
    var uiLocation = script.rawLocationToUILocation(lineNumber, columnNumber);
    return uiLocation.linkText();
}

WebInspector.PresentationConsoleMessageHelper = function (workspace) {
    this._pendingConsoleMessages = {};
    this._presentationConsoleMessages = [];
    this._workspace = workspace;
    WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._consoleMessageAdded, this);
    WebInspector.console.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
}
WebInspector.PresentationConsoleMessageHelper.prototype = {
    _consoleMessageAdded: function (event) {
        var message = (event.data);
        if (!message.url || !message.isErrorOrWarning())
            return;
        var rawLocation = this._rawLocation(message);
        if (rawLocation)
            this._addConsoleMessageToScript(message, rawLocation);
        else
            this._addPendingConsoleMessage(message);
    },
    _rawLocation: function (message) {
        var lineNumber = message.stackTrace ? message.stackTrace[0].lineNumber - 1 : message.line - 1;
        var columnNumber = message.stackTrace && message.stackTrace[0].columnNumber ? message.stackTrace[0].columnNumber - 1 : 0;
        return WebInspector.debuggerModel.createRawLocationByURL(message.url, lineNumber, columnNumber);
    },
    _addConsoleMessageToScript: function (message, rawLocation) {
        this._presentationConsoleMessages.push(new WebInspector.PresentationConsoleMessage(message, rawLocation));
    },
    _addPendingConsoleMessage: function (message) {
        if (!message.url)
            return;
        if (!this._pendingConsoleMessages[message.url])
            this._pendingConsoleMessages[message.url] = [];
        this._pendingConsoleMessages[message.url].push(message);
    },
    _parsedScriptSource: function (event) {
        var script = (event.data);
        var messages = this._pendingConsoleMessages[script.sourceURL];
        if (!messages)
            return;
        var pendingMessages = [];
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            var rawLocation = this._rawLocation(message);
            if (script.scriptId === rawLocation.scriptId)
                this._addConsoleMessageToScript(message, rawLocation);
            else
                pendingMessages.push(message);
        }
        if (pendingMessages.length)
            this._pendingConsoleMessages[script.sourceURL] = pendingMessages;
        else
            delete this._pendingConsoleMessages[script.sourceURL];
    },
    _consoleCleared: function () {
        this._pendingConsoleMessages = {};
        for (var i = 0; i < this._presentationConsoleMessages.length; ++i)
            this._presentationConsoleMessages[i].dispose();
        this._presentationConsoleMessages = [];
        var uiSourceCodes = this._workspace.uiSourceCodes();
        for (var i = 0; i < uiSourceCodes.length; ++i)
            uiSourceCodes[i].consoleMessagesCleared();
    },
    _debuggerReset: function () {
        this._pendingConsoleMessages = {};
        this._presentationConsoleMessages = [];
    }
}
WebInspector.PresentationConsoleMessage = function (message, rawLocation) {
    this.originalMessage = message;
    this._liveLocation = WebInspector.debuggerModel.createLiveLocation(rawLocation, this._updateLocation.bind(this));
}
WebInspector.PresentationConsoleMessage.prototype = {
    _updateLocation: function (uiLocation) {
        if (this._uiLocation)
            this._uiLocation.uiSourceCode.consoleMessageRemoved(this);
        this._uiLocation = uiLocation;
        this._uiLocation.uiSourceCode.consoleMessageAdded(this);
    },
    get lineNumber() {
        return this._uiLocation.lineNumber;
    },
    dispose: function () {
        this._liveLocation.dispose();
    }
}
WebInspector.FileSystemProjectDelegate = function (isolatedFileSystem, workspace) {
    this._fileSystem = isolatedFileSystem;
    this._normalizedFileSystemPath = this._fileSystem.path();
    if (WebInspector.isWin())
        this._normalizedFileSystemPath = this._normalizedFileSystemPath.replace(/\\/g, "/");
    this._fileSystemURL = "file://" + this._normalizedFileSystemPath + "/";
    this._workspace = workspace;
    this._searchCallbacks = {};
    this._indexingCallbacks = {};
    this._indexingProgresses = {};
}
WebInspector.FileSystemProjectDelegate._scriptExtensions = ["js", "java", "coffee", "ts", "dart"].keySet();
WebInspector.FileSystemProjectDelegate._styleSheetExtensions = ["css", "scss", "sass", "less"].keySet();
WebInspector.FileSystemProjectDelegate._documentExtensions = ["htm", "html", "asp", "aspx", "phtml", "jsp"].keySet();
WebInspector.FileSystemProjectDelegate.projectId = function (fileSystemPath) {
    return "filesystem:" + fileSystemPath;
}
WebInspector.FileSystemProjectDelegate._lastRequestId = 0;
WebInspector.FileSystemProjectDelegate.prototype = {
    id: function () {
        return WebInspector.FileSystemProjectDelegate.projectId(this._fileSystem.path());
    },
    type: function () {
        return WebInspector.projectTypes.FileSystem;
    },
    fileSystemPath: function () {
        return this._fileSystem.path();
    },
    displayName: function () {
        return this._normalizedFileSystemPath.substr(this._normalizedFileSystemPath.lastIndexOf("/") + 1);
    },
    _filePathForPath: function (path) {
        return "/" + path;
    },
    requestFileContent: function (path, callback) {
        var filePath = this._filePathForPath(path);
        this._fileSystem.requestFileContent(filePath, callback);
    },
    requestMetadata: function (path, callback) {
        var filePath = this._filePathForPath(path);
        this._fileSystem.requestMetadata(filePath, callback);
    },
    canSetFileContent: function () {
        return true;
    },
    setFileContent: function (path, newContent, callback) {
        var filePath = this._filePathForPath(path);
        this._fileSystem.setFileContent(filePath, newContent, callback.bind(this, ""));
    },
    canRename: function () {
        return true;
    },
    rename: function (path, newName, callback) {
        var filePath = this._filePathForPath(path);
        this._fileSystem.renameFile(filePath, newName, innerCallback.bind(this));

        function innerCallback(success, newName) {
            if (!success) {
                callback(false, newName);
                return;
            }
            var validNewName = (newName);
            console.assert(validNewName);
            var slash = filePath.lastIndexOf("/");
            var parentPath = filePath.substring(0, slash);
            filePath = parentPath + "/" + validNewName;
            var newURL = this._workspace.urlForPath(this._fileSystem.path(), filePath);
            var extension = this._extensionForPath(validNewName);
            var newOriginURL = this._fileSystemURL + filePath
            var newContentType = this._contentTypeForExtension(extension);
            callback(true, validNewName, newURL, newOriginURL, newContentType);
        }
    },
    searchInFileContent: function (path, query, caseSensitive, isRegex, callback) {
        var filePath = this._filePathForPath(path);
        this._fileSystem.requestFileContent(filePath, contentCallback);

        function contentCallback(content) {
            var result = [];
            if (content !== null)
                result = WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex);
            callback(result);
        }
    },
    findFilesMatchingSearchRequest: function (queries, fileQueries, caseSensitive, isRegex, progress, callback) {
        var result = null;
        var queriesToRun = queries.slice();
        if (!queriesToRun.length)
            queriesToRun.push("");
        progress.setTotalWork(queriesToRun.length);
        searchNextQuery.call(this);

        function searchNextQuery() {
            if (!queriesToRun.length) {
                matchFileQueries.call(null, result);
                return;
            }
            var query = queriesToRun.shift();
            this._searchInPath(isRegex ? "" : query, progress, innerCallback.bind(this));
        }

        function innerCallback(files) {
            files = files.sort();
            progress.worked(1);
            if (!result)
                result = files;
            else
                result = result.intersectOrdered(files, String.naturalOrderComparator);
            searchNextQuery.call(this);
        }

        function matchFileQueries(files) {
            var fileRegexes = [];
            for (var i = 0; i < fileQueries.length; ++i)
                fileRegexes.push(new RegExp(fileQueries[i], caseSensitive ? "" : "i"));

            function filterOutNonMatchingFiles(file) {
                for (var i = 0; i < fileRegexes.length; ++i) {
                    if (!file.match(fileRegexes[i]))
                        return false;
                }
                return true;
            }
            files = files.filter(filterOutNonMatchingFiles);
            progress.done();
            callback(files);
        }
    },
    _searchInPath: function (query, progress, callback) {
        var requestId = ++WebInspector.FileSystemProjectDelegate._lastRequestId;
        this._searchCallbacks[requestId] = innerCallback.bind(this);
        InspectorFrontendHost.searchInPath(requestId, this._fileSystem.path(), query);

        function innerCallback(files) {
            function trimAndNormalizeFileSystemPath(fullPath) {
                var trimmedPath = fullPath.substr(this._fileSystem.path().length + 1);
                if (WebInspector.isWin())
                    trimmedPath = trimmedPath.replace(/\\/g, "/");
                return trimmedPath;
            }
            files = files.map(trimAndNormalizeFileSystemPath.bind(this));
            progress.worked(1);
            callback(files);
        }
    },
    searchCompleted: function (requestId, files) {
        if (!this._searchCallbacks[requestId])
            return;
        var callback = this._searchCallbacks[requestId];
        delete this._searchCallbacks[requestId];
        callback(files);
    },
    indexContent: function (progress, callback) {
        var requestId = ++WebInspector.FileSystemProjectDelegate._lastRequestId;
        this._indexingCallbacks[requestId] = callback;
        this._indexingProgresses[requestId] = progress;
        progress.setTotalWork(1);
        progress.addEventListener(WebInspector.Progress.Events.Canceled, this._indexingCanceled.bind(this, requestId));
        InspectorFrontendHost.indexPath(requestId, this._fileSystem.path());
    },
    _indexingCanceled: function (requestId) {
        if (!this._indexingProgresses[requestId])
            return;
        InspectorFrontendHost.stopIndexing(requestId);
        delete this._indexingProgresses[requestId];
        delete this._indexingCallbacks[requestId];
    },
    indexingTotalWorkCalculated: function (requestId, totalWork) {
        if (!this._indexingProgresses[requestId])
            return;
        var progress = this._indexingProgresses[requestId];
        progress.setTotalWork(totalWork);
    },
    indexingWorked: function (requestId, worked) {
        if (!this._indexingProgresses[requestId])
            return;
        var progress = this._indexingProgresses[requestId];
        progress.worked(worked);
    },
    indexingDone: function (requestId) {
        if (!this._indexingProgresses[requestId])
            return;
        var progress = this._indexingProgresses[requestId];
        var callback = this._indexingCallbacks[requestId];
        delete this._indexingProgresses[requestId];
        delete this._indexingCallbacks[requestId];
        progress.done();
        callback.call();
    },
    _extensionForPath: function (path) {
        var extensionIndex = path.lastIndexOf(".");
        if (extensionIndex === -1)
            return "";
        return path.substring(extensionIndex + 1).toLowerCase();
    },
    _contentTypeForExtension: function (extension) {
        if (WebInspector.FileSystemProjectDelegate._scriptExtensions[extension])
            return WebInspector.resourceTypes.Script;
        if (WebInspector.FileSystemProjectDelegate._styleSheetExtensions[extension])
            return WebInspector.resourceTypes.Stylesheet;
        if (WebInspector.FileSystemProjectDelegate._documentExtensions[extension])
            return WebInspector.resourceTypes.Document;
        return WebInspector.resourceTypes.Other;
    },
    populate: function () {
        this._fileSystem.requestFilesRecursive("", this._addFile.bind(this));
    },
    refresh: function (path) {
        this._fileSystem.requestFilesRecursive(path, this._addFile.bind(this));
    },
    excludeFolder: function (path) {
        WebInspector.isolatedFileSystemManager.mapping().addExcludedFolder(this._fileSystem.path(), path);
    },
    createFile: function (path, name, content, callback) {
        this._fileSystem.createFile(path, name, innerCallback.bind(this));
        var createFilePath;

        function innerCallback(filePath) {
            if (!filePath) {
                callback(null);
                return;
            }
            createFilePath = filePath;
            if (!content) {
                contentSet.call(this);
                return;
            }
            this._fileSystem.setFileContent(filePath, content, contentSet.bind(this));
        }

        function contentSet() {
            this._addFile(createFilePath);
            callback(createFilePath);
        }
    },
    deleteFile: function (path) {
        this._fileSystem.deleteFile(path);
        this._removeFile(path);
    },
    remove: function () {
        WebInspector.isolatedFileSystemManager.removeFileSystem(this._fileSystem.path());
    },
    _addFile: function (filePath) {
        if (!filePath)
            console.assert(false);
        var slash = filePath.lastIndexOf("/");
        var parentPath = filePath.substring(0, slash);
        var name = filePath.substring(slash + 1);
        var url = this._workspace.urlForPath(this._fileSystem.path(), filePath);
        var extension = this._extensionForPath(name);
        var contentType = this._contentTypeForExtension(extension);
        var fileDescriptor = new WebInspector.FileDescriptor(parentPath, name, this._fileSystemURL + filePath, url, contentType, true);
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.FileAdded, fileDescriptor);
    },
    _removeFile: function (path) {
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.FileRemoved, path);
    },
    reset: function () {
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.Reset, null);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.fileSystemProjectDelegate;
WebInspector.FileSystemWorkspaceProvider = function (isolatedFileSystemManager, workspace) {
    this._isolatedFileSystemManager = isolatedFileSystemManager;
    this._workspace = workspace;
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);
    this._projectDelegates = {};
}
WebInspector.FileSystemWorkspaceProvider.prototype = {
    _fileSystemAdded: function (event) {
        var fileSystem = (event.data);
        var projectId = WebInspector.FileSystemProjectDelegate.projectId(fileSystem.path());
        var projectDelegate = new WebInspector.FileSystemProjectDelegate(fileSystem, this._workspace)
        this._projectDelegates[projectDelegate.id()] = projectDelegate;
        console.assert(!this._workspace.project(projectDelegate.id()));
        this._workspace.addProject(projectDelegate);
        projectDelegate.populate();
    },
    _fileSystemRemoved: function (event) {
        var fileSystem = (event.data);
        var projectId = WebInspector.FileSystemProjectDelegate.projectId(fileSystem.path());
        this._workspace.removeProject(projectId);
        delete this._projectDelegates[projectId];
    },
    fileSystemPath: function (uiSourceCode) {
        var projectDelegate = this._projectDelegates[uiSourceCode.project().id()];
        return projectDelegate.fileSystemPath();
    },
    delegate: function (fileSystemPath) {
        var projectId = WebInspector.FileSystemProjectDelegate.projectId(fileSystemPath);
        return this._projectDelegates[projectId];
    }
}
WebInspector.fileSystemWorkspaceProvider;
WebInspector.FileSystemMapping = function () {
    WebInspector.Object.call(this);
    this._fileSystemMappingSetting = WebInspector.settings.createSetting("fileSystemMapping", {});
    this._excludedFoldersSetting = WebInspector.settings.createSetting("workspaceExcludedFolders", {});
    var defaultCommonExcludedFolders = ["/\\.git/", "/\\.sass-cache/", "/\\.hg/", "/\\.idea/", "/\\.svn/", "/\\.cache/", "/\\.project/"];
    var defaultWinExcludedFolders = ["/Thumbs.db$", "/ehthumbs.db$", "/Desktop.ini$", "/\\$RECYCLE.BIN/"];
    var defaultMacExcludedFolders = ["/\\.DS_Store$", "/\\.Trashes$", "/\\.Spotlight-V100$", "/\\.AppleDouble$", "/\\.LSOverride$", "/Icon$", "/\\._.*$"];
    var defaultLinuxExcludedFolders = ["/.*~$"];
    var defaultExcludedFolders = defaultCommonExcludedFolders;
    if (WebInspector.isWin())
        defaultExcludedFolders = defaultExcludedFolders.concat(defaultWinExcludedFolders);
    else if (WebInspector.isMac())
        defaultExcludedFolders = defaultExcludedFolders.concat(defaultMacExcludedFolders);
    else
        defaultExcludedFolders = defaultExcludedFolders.concat(defaultLinuxExcludedFolders);
    var defaultExcludedFoldersPattern = defaultExcludedFolders.join("|");
    WebInspector.settings.workspaceFolderExcludePattern = WebInspector.settings.createRegExpSetting("workspaceFolderExcludePattern", defaultExcludedFoldersPattern, WebInspector.isWin() ? "i" : "");
    this._fileSystemMappings = {};
    this._excludedFolders = {};
    this._loadFromSettings();
}
WebInspector.FileSystemMapping.Events = {
    FileMappingAdded: "FileMappingAdded",
    FileMappingRemoved: "FileMappingRemoved",
    ExcludedFolderAdded: "ExcludedFolderAdded",
    ExcludedFolderRemoved: "ExcludedFolderRemoved"
}
WebInspector.FileSystemMapping.prototype = {
    _loadFromSettings: function () {
        var savedMapping = this._fileSystemMappingSetting.get();
        this._fileSystemMappings = {};
        for (var fileSystemPath in savedMapping) {
            var savedFileSystemMappings = savedMapping[fileSystemPath];
            this._fileSystemMappings[fileSystemPath] = [];
            var fileSystemMappings = this._fileSystemMappings[fileSystemPath];
            for (var i = 0; i < savedFileSystemMappings.length; ++i) {
                var savedEntry = savedFileSystemMappings[i];
                var entry = new WebInspector.FileSystemMapping.Entry(savedEntry.fileSystemPath, savedEntry.urlPrefix, savedEntry.pathPrefix);
                fileSystemMappings.push(entry);
            }
        }
        var savedExcludedFolders = this._excludedFoldersSetting.get();
        this._excludedFolders = {};
        for (var fileSystemPath in savedExcludedFolders) {
            var savedExcludedFoldersForPath = savedExcludedFolders[fileSystemPath];
            this._excludedFolders[fileSystemPath] = [];
            var excludedFolders = this._excludedFolders[fileSystemPath];
            for (var i = 0; i < savedExcludedFoldersForPath.length; ++i) {
                var savedEntry = savedExcludedFoldersForPath[i];
                var entry = new WebInspector.FileSystemMapping.ExcludedFolderEntry(savedEntry.fileSystemPath, savedEntry.path);
                excludedFolders.push(entry);
            }
        }
        this._rebuildIndexes();
    },
    _saveToSettings: function () {
        var savedMapping = this._fileSystemMappings;
        this._fileSystemMappingSetting.set(savedMapping);
        var savedExcludedFolders = this._excludedFolders;
        this._excludedFoldersSetting.set(savedExcludedFolders);
        this._rebuildIndexes();
    },
    _rebuildIndexes: function () {
        this._mappingForURLPrefix = {};
        this._urlPrefixes = [];
        for (var fileSystemPath in this._fileSystemMappings) {
            var fileSystemMapping = this._fileSystemMappings[fileSystemPath];
            for (var i = 0; i < fileSystemMapping.length; ++i) {
                var entry = fileSystemMapping[i];
                this._mappingForURLPrefix[entry.urlPrefix] = entry;
                this._urlPrefixes.push(entry.urlPrefix);
            }
        }
        this._urlPrefixes.sort();
    },
    addFileSystem: function (fileSystemPath) {
        if (this._fileSystemMappings[fileSystemPath])
            return;
        this._fileSystemMappings[fileSystemPath] = [];
        this._saveToSettings();
    },
    removeFileSystem: function (fileSystemPath) {
        if (!this._fileSystemMappings[fileSystemPath])
            return;
        delete this._fileSystemMappings[fileSystemPath];
        delete this._excludedFolders[fileSystemPath];
        this._saveToSettings();
    },
    addFileMapping: function (fileSystemPath, urlPrefix, pathPrefix) {
        var entry = new WebInspector.FileSystemMapping.Entry(fileSystemPath, urlPrefix, pathPrefix);
        this._fileSystemMappings[fileSystemPath].push(entry);
        this._saveToSettings();
        this.dispatchEventToListeners(WebInspector.FileSystemMapping.Events.FileMappingAdded, entry);
    },
    removeFileMapping: function (fileSystemPath, urlPrefix, pathPrefix) {
        var entry = this._mappingEntryForPathPrefix(fileSystemPath, pathPrefix);
        if (!entry)
            return;
        this._fileSystemMappings[fileSystemPath].remove(entry);
        this._saveToSettings();
        this.dispatchEventToListeners(WebInspector.FileSystemMapping.Events.FileMappingRemoved, entry);
    },
    addExcludedFolder: function (fileSystemPath, excludedFolderPath) {
        if (!this._excludedFolders[fileSystemPath])
            this._excludedFolders[fileSystemPath] = [];
        var entry = new WebInspector.FileSystemMapping.ExcludedFolderEntry(fileSystemPath, excludedFolderPath);
        this._excludedFolders[fileSystemPath].push(entry);
        this._saveToSettings();
        this.dispatchEventToListeners(WebInspector.FileSystemMapping.Events.ExcludedFolderAdded, entry);
    },
    removeExcludedFolder: function (fileSystemPath, path) {
        var entry = this._excludedFolderEntryForPath(fileSystemPath, path);
        if (!entry)
            return;
        this._excludedFolders[fileSystemPath].remove(entry);
        this._saveToSettings();
        this.dispatchEventToListeners(WebInspector.FileSystemMapping.Events.ExcludedFolderRemoved, entry);
    },
    fileSystemPaths: function () {
        return Object.keys(this._fileSystemMappings);
    },
    _mappingEntryForURL: function (url) {
        for (var i = this._urlPrefixes.length - 1; i >= 0; --i) {
            var urlPrefix = this._urlPrefixes[i];
            if (url.startsWith(urlPrefix))
                return this._mappingForURLPrefix[urlPrefix];
        }
        return null;
    },
    _excludedFolderEntryForPath: function (fileSystemPath, path) {
        var entries = this._excludedFolders[fileSystemPath];
        if (!entries)
            return null;
        for (var i = 0; i < entries.length; ++i) {
            if (entries[i].path === path)
                return entries[i];
        }
        return null;
    },
    _mappingEntryForPath: function (fileSystemPath, filePath) {
        var entries = this._fileSystemMappings[fileSystemPath];
        if (!entries)
            return null;
        var entry = null;
        for (var i = 0; i < entries.length; ++i) {
            var pathPrefix = entries[i].pathPrefix;
            if (entry && entry.pathPrefix.length > pathPrefix.length)
                continue;
            if (filePath.startsWith(pathPrefix.substr(1)))
                entry = entries[i];
        }
        return entry;
    },
    _mappingEntryForPathPrefix: function (fileSystemPath, pathPrefix) {
        var entries = this._fileSystemMappings[fileSystemPath];
        for (var i = 0; i < entries.length; ++i) {
            if (pathPrefix === entries[i].pathPrefix)
                return entries[i];
        }
        return null;
    },
    isFileExcluded: function (fileSystemPath, folderPath) {
        var excludedFolders = this._excludedFolders[fileSystemPath] || [];
        for (var i = 0; i < excludedFolders.length; ++i) {
            var entry = excludedFolders[i];
            if (entry.path === folderPath)
                return true;
        }
        var regex = WebInspector.settings.workspaceFolderExcludePattern.asRegExp();
        return regex && regex.test(folderPath);
    },
    excludedFolders: function (fileSystemPath) {
        var excludedFolders = this._excludedFolders[fileSystemPath];
        return excludedFolders ? excludedFolders.slice() : [];
    },
    mappingEntries: function (fileSystemPath) {
        return this._fileSystemMappings[fileSystemPath].slice();
    },
    hasMappingForURL: function (url) {
        return !!this._mappingEntryForURL(url);
    },
    fileForURL: function (url) {
        var entry = this._mappingEntryForURL(url);
        if (!entry)
            return null;
        var file = {};
        file.fileSystemPath = entry.fileSystemPath;
        file.filePath = entry.pathPrefix.substr(1) + url.substr(entry.urlPrefix.length);
        return file;
    },
    urlForPath: function (fileSystemPath, filePath) {
        var entry = this._mappingEntryForPath(fileSystemPath, filePath);
        if (!entry)
            return "";
        return entry.urlPrefix + filePath.substring(entry.pathPrefix.length - 1);
    },
    removeMappingForURL: function (url) {
        var entry = this._mappingEntryForURL(url);
        if (!entry)
            return;
        this._fileSystemMappings[entry.fileSystemPath].remove(entry);
        this._saveToSettings();
    },
    addMappingForResource: function (url, fileSystemPath, filePath) {
        var commonPathSuffixLength = 0;
        var normalizedFilePath = "/" + filePath;
        for (var i = 0; i < normalizedFilePath.length; ++i) {
            var filePathCharacter = normalizedFilePath[normalizedFilePath.length - 1 - i];
            var urlCharacter = url[url.length - 1 - i];
            if (filePathCharacter !== urlCharacter)
                break;
            if (filePathCharacter === "/")
                commonPathSuffixLength = i;
        }
        var pathPrefix = normalizedFilePath.substr(0, normalizedFilePath.length - commonPathSuffixLength);
        var urlPrefix = url.substr(0, url.length - commonPathSuffixLength);
        this.addFileMapping(fileSystemPath, urlPrefix, pathPrefix);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.FileSystemMapping.Entry = function (fileSystemPath, urlPrefix, pathPrefix) {
    this.fileSystemPath = fileSystemPath;
    this.urlPrefix = urlPrefix;
    this.pathPrefix = pathPrefix;
}
WebInspector.FileSystemMapping.ExcludedFolderEntry = function (fileSystemPath, path) {
    this.fileSystemPath = fileSystemPath;
    this.path = path;
}
WebInspector.IsolatedFileSystem = function (manager, path, name, rootURL) {
    this._manager = manager;
    this._path = path;
    this._name = name;
    this._rootURL = rootURL;
}
WebInspector.IsolatedFileSystem.errorMessage = function (error) {
    var msg;
    switch (error.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
        msg = "QUOTA_EXCEEDED_ERR";
        break;
    case FileError.NOT_FOUND_ERR:
        msg = "NOT_FOUND_ERR";
        break;
    case FileError.SECURITY_ERR:
        msg = "SECURITY_ERR";
        break;
    case FileError.INVALID_MODIFICATION_ERR:
        msg = "INVALID_MODIFICATION_ERR";
        break;
    case FileError.INVALID_STATE_ERR:
        msg = "INVALID_STATE_ERR";
        break;
    default:
        msg = WebInspector.UIString("Unknown Error");
        break;
    };
    return WebInspector.UIString("File system error: %s", msg);
}
WebInspector.IsolatedFileSystem.prototype = {
    path: function () {
        return this._path;
    },
    name: function () {
        return this._name;
    },
    rootURL: function () {
        return this._rootURL;
    },
    _requestFileSystem: function (callback) {
        this._manager.requestDOMFileSystem(this._path, callback);
    },
    requestFilesRecursive: function (path, callback) {
        this._requestFileSystem(fileSystemLoaded.bind(this));
        var domFileSystem;

        function fileSystemLoaded(fs) {
            domFileSystem = (fs);
            console.assert(domFileSystem);
            this._requestEntries(domFileSystem, path, innerCallback.bind(this));
        }

        function innerCallback(entries) {
            for (var i = 0; i < entries.length; ++i) {
                var entry = entries[i];
                if (!entry.isDirectory) {
                    if (this._manager.mapping().isFileExcluded(this._path, entry.fullPath))
                        continue;
                    callback(entry.fullPath.substr(1));
                } else {
                    if (this._manager.mapping().isFileExcluded(this._path, entry.fullPath + "/"))
                        continue;
                    this._requestEntries(domFileSystem, entry.fullPath, innerCallback.bind(this));
                }
            }
        }
    },
    createFile: function (path, name, callback) {
        this._requestFileSystem(fileSystemLoaded.bind(this));
        var newFileIndex = 1;
        if (!name)
            name = "NewFile";
        var nameCandidate;

        function fileSystemLoaded(fs) {
            var domFileSystem = (fs);
            console.assert(domFileSystem);
            domFileSystem.root.getDirectory(path, null, dirEntryLoaded.bind(this), errorHandler.bind(this));
        }

        function dirEntryLoaded(dirEntry) {
            var nameCandidate = name;
            if (newFileIndex > 1)
                nameCandidate += newFileIndex;
            ++newFileIndex;
            dirEntry.getFile(nameCandidate, {
                create: true,
                exclusive: true
            }, fileCreated, fileCreationError.bind(this));

            function fileCreated(entry) {
                callback(entry.fullPath.substr(1));
            }

            function fileCreationError(error) {
                if (error.code === FileError.INVALID_MODIFICATION_ERR) {
                    dirEntryLoaded.call(this, dirEntry);
                    return;
                }
                var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
                console.error(errorMessage + " when testing if file exists '" + (this._path + "/" + path + "/" + nameCandidate) + "'");
                callback(null);
            }
        }

        function errorHandler(error) {
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            var filePath = this._path + "/" + path;
            if (nameCandidate)
                filePath += "/" + nameCandidate;
            console.error(errorMessage + " when getting content for file '" + (filePath) + "'");
            callback(null);
        }
    },
    deleteFile: function (path) {
        this._requestFileSystem(fileSystemLoaded.bind(this));

        function fileSystemLoaded(fs) {
            var domFileSystem = (fs);
            console.assert(domFileSystem);
            domFileSystem.root.getFile(path, null, fileEntryLoaded.bind(this), errorHandler.bind(this));
        }

        function fileEntryLoaded(fileEntry) {
            fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
        }

        function fileEntryRemoved() {}

        function errorHandler(error) {
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            console.error(errorMessage + " when deleting file '" + (this._path + "/" + path) + "'");
        }
    },
    requestMetadata: function (path, callback) {
        this._requestFileSystem(fileSystemLoaded);

        function fileSystemLoaded(fs) {
            var domFileSystem = (fs);
            console.assert(domFileSystem);
            domFileSystem.root.getFile(path, null, fileEntryLoaded, errorHandler);
        }

        function fileEntryLoaded(entry) {
            entry.getMetadata(successHandler, errorHandler);
        }

        function successHandler(metadata) {
            callback(metadata.modificationTime, metadata.size);
        }

        function errorHandler(error) {
            callback(null, null);
        }
    },
    requestFileContent: function (path, callback) {
        this._requestFileSystem(fileSystemLoaded.bind(this));

        function fileSystemLoaded(fs) {
            var domFileSystem = (fs);
            console.assert(domFileSystem);
            domFileSystem.root.getFile(path, null, fileEntryLoaded.bind(this), errorHandler.bind(this));
        }

        function fileEntryLoaded(entry) {
            entry.file(fileLoaded, errorHandler.bind(this));
        }

        function fileLoaded(file) {
            var reader = new FileReader();
            reader.onloadend = readerLoadEnd;
            reader.readAsText(file);
        }

        function readerLoadEnd() {
            callback((this.result));
        }

        function errorHandler(error) {
            if (error.code === FileError.NOT_FOUND_ERR) {
                callback(null);
                return;
            }
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            console.error(errorMessage + " when getting content for file '" + (this._path + "/" + path) + "'");
            callback(null);
        }
    },
    setFileContent: function (path, content, callback) {
        this._requestFileSystem(fileSystemLoaded.bind(this));

        function fileSystemLoaded(fs) {
            var domFileSystem = (fs);
            console.assert(domFileSystem);
            domFileSystem.root.getFile(path, {
                create: true
            }, fileEntryLoaded.bind(this), errorHandler.bind(this));
        }

        function fileEntryLoaded(entry) {
            entry.createWriter(fileWriterCreated.bind(this), errorHandler.bind(this));
        }

        function fileWriterCreated(fileWriter) {
            fileWriter.onerror = errorHandler.bind(this);
            fileWriter.onwriteend = fileTruncated;
            fileWriter.truncate(0);

            function fileTruncated() {
                fileWriter.onwriteend = writerEnd;
                var blob = new Blob([content], {
                    type: "text/plain"
                });
                fileWriter.write(blob);
            }
        }

        function writerEnd() {
            callback();
        }

        function errorHandler(error) {
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            console.error(errorMessage + " when setting content for file '" + (this._path + "/" + path) + "'");
            callback();
        }
    },
    renameFile: function (path, newName, callback) {
        newName = newName ? newName.trim() : newName;
        if (!newName || newName.indexOf("/") !== -1) {
            callback(false);
            return;
        }
        var fileEntry;
        var dirEntry;
        var newFileEntry;
        this._requestFileSystem(fileSystemLoaded.bind(this));

        function fileSystemLoaded(fs) {
            var domFileSystem = (fs);
            console.assert(domFileSystem);
            domFileSystem.root.getFile(path, null, fileEntryLoaded.bind(this), errorHandler.bind(this));
        }

        function fileEntryLoaded(entry) {
            if (entry.name === newName) {
                callback(false);
                return;
            }
            fileEntry = entry;
            fileEntry.getParent(dirEntryLoaded.bind(this), errorHandler.bind(this));
        }

        function dirEntryLoaded(entry) {
            dirEntry = entry;
            dirEntry.getFile(newName, null, newFileEntryLoaded, newFileEntryLoadErrorHandler.bind(this));
        }

        function newFileEntryLoaded(entry) {
            callback(false);
        }

        function newFileEntryLoadErrorHandler(error) {
            if (error.code !== FileError.NOT_FOUND_ERR) {
                callback(false);
                return;
            }
            fileEntry.moveTo(dirEntry, newName, fileRenamed, errorHandler.bind(this));
        }

        function fileRenamed(entry) {
            callback(true, entry.name);
        }

        function errorHandler(error) {
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            console.error(errorMessage + " when renaming file '" + (this._path + "/" + path) + "' to '" + newName + "'");
            callback(false);
        }
    },
    _readDirectory: function (dirEntry, callback) {
        var dirReader = dirEntry.createReader();
        var entries = [];

        function innerCallback(results) {
            if (!results.length)
                callback(entries.sort());
            else {
                entries = entries.concat(toArray(results));
                dirReader.readEntries(innerCallback, errorHandler);
            }
        }

        function toArray(list) {
            return Array.prototype.slice.call(list || [], 0);
        }
        dirReader.readEntries(innerCallback, errorHandler);

        function errorHandler(error) {
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            console.error(errorMessage + " when reading directory '" + dirEntry.fullPath + "'");
            callback([]);
        }
    },
    _requestEntries: function (domFileSystem, path, callback) {
        domFileSystem.root.getDirectory(path, null, innerCallback.bind(this), errorHandler);

        function innerCallback(dirEntry) {
            this._readDirectory(dirEntry, callback)
        }

        function errorHandler(error) {
            var errorMessage = WebInspector.IsolatedFileSystem.errorMessage(error);
            console.error(errorMessage + " when requesting entry '" + path + "'");
            callback([]);
        }
    }
}
WebInspector.IsolatedFileSystemManager = function () {
    this._fileSystems = {};
    this._pendingFileSystemRequests = {};
    this._fileSystemMapping = new WebInspector.FileSystemMapping();
    this._requestFileSystems();
}
WebInspector.IsolatedFileSystemManager.FileSystem;
WebInspector.IsolatedFileSystemManager.Events = {
    FileSystemAdded: "FileSystemAdded",
    FileSystemRemoved: "FileSystemRemoved"
}
WebInspector.IsolatedFileSystemManager.prototype = {
    mapping: function () {
        return this._fileSystemMapping;
    },
    _requestFileSystems: function () {
        console.assert(!this._loaded);
        InspectorFrontendHost.requestFileSystems();
    },
    addFileSystem: function () {
        InspectorFrontendHost.addFileSystem();
    },
    removeFileSystem: function (fileSystemPath) {
        InspectorFrontendHost.removeFileSystem(fileSystemPath);
    },
    _fileSystemsLoaded: function (fileSystems) {
        var addedFileSystemPaths = {};
        for (var i = 0; i < fileSystems.length; ++i) {
            this._innerAddFileSystem(fileSystems[i]);
            addedFileSystemPaths[fileSystems[i].fileSystemPath] = true;
        }
        var fileSystemPaths = this._fileSystemMapping.fileSystemPaths();
        for (var i = 0; i < fileSystemPaths.length; ++i) {
            var fileSystemPath = fileSystemPaths[i];
            if (!addedFileSystemPaths[fileSystemPath])
                this._fileSystemRemoved(fileSystemPath);
        }
        this._loaded = true;
        this._processPendingFileSystemRequests();
    },
    _innerAddFileSystem: function (fileSystem) {
        var fileSystemPath = fileSystem.fileSystemPath;
        this._fileSystemMapping.addFileSystem(fileSystemPath);
        var isolatedFileSystem = new WebInspector.IsolatedFileSystem(this, fileSystemPath, fileSystem.fileSystemName, fileSystem.rootURL);
        this._fileSystems[fileSystemPath] = isolatedFileSystem;
        this.dispatchEventToListeners(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, isolatedFileSystem);
    },
    _processPendingFileSystemRequests: function () {
        for (var fileSystemPath in this._pendingFileSystemRequests) {
            var callbacks = this._pendingFileSystemRequests[fileSystemPath];
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](this._isolatedFileSystem(fileSystemPath));
        }
        delete this._pendingFileSystemRequests;
    },
    _fileSystemAdded: function (errorMessage, fileSystem) {
        var fileSystemPath;
        if (errorMessage)
            WebInspector.console.showErrorMessage(errorMessage)
        else if (fileSystem) {
            this._innerAddFileSystem(fileSystem);
            fileSystemPath = fileSystem.fileSystemPath;
        }
    },
    _fileSystemRemoved: function (fileSystemPath) {
        this._fileSystemMapping.removeFileSystem(fileSystemPath);
        var isolatedFileSystem = this._fileSystems[fileSystemPath];
        delete this._fileSystems[fileSystemPath];
        if (isolatedFileSystem)
            this.dispatchEventToListeners(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, isolatedFileSystem);
    },
    _isolatedFileSystem: function (fileSystemPath) {
        var fileSystem = this._fileSystems[fileSystemPath];
        if (!fileSystem)
            return null;
        if (!InspectorFrontendHost.isolatedFileSystem)
            return null;
        return InspectorFrontendHost.isolatedFileSystem(fileSystem.name(), fileSystem.rootURL());
    },
    requestDOMFileSystem: function (fileSystemPath, callback) {
        if (!this._loaded) {
            if (!this._pendingFileSystemRequests[fileSystemPath])
                this._pendingFileSystemRequests[fileSystemPath] = this._pendingFileSystemRequests[fileSystemPath] || [];
            this._pendingFileSystemRequests[fileSystemPath].push(callback);
            return;
        }
        callback(this._isolatedFileSystem(fileSystemPath));
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.isolatedFileSystemManager;
WebInspector.IsolatedFileSystemDispatcher = function (IsolatedFileSystemManager) {
    this._IsolatedFileSystemManager = IsolatedFileSystemManager;
}
WebInspector.IsolatedFileSystemDispatcher.prototype = {
    fileSystemsLoaded: function (fileSystems) {
        this._IsolatedFileSystemManager._fileSystemsLoaded(fileSystems);
    },
    fileSystemRemoved: function (fileSystemPath) {
        this._IsolatedFileSystemManager._fileSystemRemoved(fileSystemPath);
    },
    fileSystemAdded: function (errorMessage, fileSystem) {
        this._IsolatedFileSystemManager._fileSystemAdded(errorMessage, fileSystem);
    }
}
WebInspector.isolatedFileSystemDispatcher;
WebInspector.FileDescriptor = function (parentPath, name, originURL, url, contentType, isEditable, isContentScript) {
    this.parentPath = parentPath;
    this.name = name;
    this.originURL = originURL;
    this.url = url;
    this.contentType = contentType;
    this.isEditable = isEditable;
    this.isContentScript = isContentScript || false;
}
WebInspector.ProjectDelegate = function () {}
WebInspector.ProjectDelegate.Events = {
    FileAdded: "FileAdded",
    FileRemoved: "FileRemoved",
    Reset: "Reset",
}
WebInspector.ProjectDelegate.prototype = {
    id: function () {},
    type: function () {},
    displayName: function () {},
    requestMetadata: function (path, callback) {},
    requestFileContent: function (path, callback) {},
    canSetFileContent: function () {},
    setFileContent: function (path, newContent, callback) {},
    canRename: function () {},
    rename: function (path, newName, callback) {},
    refresh: function (path) {},
    excludeFolder: function (path) {},
    createFile: function (path, name, content, callback) {},
    deleteFile: function (path) {},
    remove: function () {},
    searchInFileContent: function (path, query, caseSensitive, isRegex, callback) {},
    findFilesMatchingSearchRequest: function (queries, fileQueries, caseSensitive, isRegex, progress, callback) {},
    indexContent: function (progress, callback) {}
}
WebInspector.Project = function (workspace, projectDelegate) {
    this._uiSourceCodesMap = {};
    this._uiSourceCodesList = [];
    this._workspace = workspace;
    this._projectDelegate = projectDelegate;
    this._displayName = this._projectDelegate.displayName();
    this._projectDelegate.addEventListener(WebInspector.ProjectDelegate.Events.FileAdded, this._fileAdded, this);
    this._projectDelegate.addEventListener(WebInspector.ProjectDelegate.Events.FileRemoved, this._fileRemoved, this);
    this._projectDelegate.addEventListener(WebInspector.ProjectDelegate.Events.Reset, this._reset, this);
}
WebInspector.Project.prototype = {
    id: function () {
        return this._projectDelegate.id();
    },
    type: function () {
        return this._projectDelegate.type();
    },
    displayName: function () {
        return this._displayName;
    },
    isServiceProject: function () {
        return this._projectDelegate.type() === WebInspector.projectTypes.Debugger || this._projectDelegate.type() === WebInspector.projectTypes.Formatter || this._projectDelegate.type() === WebInspector.projectTypes.LiveEdit;
    },
    _fileAdded: function (event) {
        var fileDescriptor = (event.data);
        var path = fileDescriptor.parentPath ? fileDescriptor.parentPath + "/" + fileDescriptor.name : fileDescriptor.name;
        var uiSourceCode = this.uiSourceCode(path);
        if (uiSourceCode)
            return;
        uiSourceCode = new WebInspector.UISourceCode(this, fileDescriptor.parentPath, fileDescriptor.name, fileDescriptor.originURL, fileDescriptor.url, fileDescriptor.contentType, fileDescriptor.isEditable);
        uiSourceCode.isContentScript = fileDescriptor.isContentScript;
        this._uiSourceCodesMap[path] = {
            uiSourceCode: uiSourceCode,
            index: this._uiSourceCodesList.length
        };
        this._uiSourceCodesList.push(uiSourceCode);
        this._workspace.dispatchEventToListeners(WebInspector.Workspace.Events.UISourceCodeAdded, uiSourceCode);
    },
    _fileRemoved: function (event) {
        var path = (event.data);
        this._removeFile(path);
    },
    _removeFile: function (path) {
        var uiSourceCode = this.uiSourceCode(path);
        if (!uiSourceCode)
            return;
        var entry = this._uiSourceCodesMap[path];
        var movedUISourceCode = this._uiSourceCodesList[this._uiSourceCodesList.length - 1];
        this._uiSourceCodesList[entry.index] = movedUISourceCode;
        var movedEntry = this._uiSourceCodesMap[movedUISourceCode.path()];
        movedEntry.index = entry.index;
        this._uiSourceCodesList.splice(this._uiSourceCodesList.length - 1, 1);
        delete this._uiSourceCodesMap[path];
        this._workspace.dispatchEventToListeners(WebInspector.Workspace.Events.UISourceCodeRemoved, entry.uiSourceCode);
    },
    _reset: function () {
        this._workspace.dispatchEventToListeners(WebInspector.Workspace.Events.ProjectWillReset, this);
        this._uiSourceCodesMap = {};
        this._uiSourceCodesList = [];
    },
    workspace: function () {
        return this._workspace;
    },
    uiSourceCode: function (path) {
        var entry = this._uiSourceCodesMap[path];
        return entry ? entry.uiSourceCode : null;
    },
    uiSourceCodeForOriginURL: function (originURL) {
        for (var i = 0; i < this._uiSourceCodesList.length; ++i) {
            var uiSourceCode = this._uiSourceCodesList[i];
            if (uiSourceCode.originURL() === originURL)
                return uiSourceCode;
        }
        return null;
    },
    uiSourceCodes: function () {
        return this._uiSourceCodesList;
    },
    requestMetadata: function (uiSourceCode, callback) {
        this._projectDelegate.requestMetadata(uiSourceCode.path(), callback);
    },
    requestFileContent: function (uiSourceCode, callback) {
        this._projectDelegate.requestFileContent(uiSourceCode.path(), callback);
    },
    canSetFileContent: function () {
        return this._projectDelegate.canSetFileContent();
    },
    setFileContent: function (uiSourceCode, newContent, callback) {
        this._projectDelegate.setFileContent(uiSourceCode.path(), newContent, onSetContent.bind(this));

        function onSetContent(content) {
            this._workspace.dispatchEventToListeners(WebInspector.Workspace.Events.UISourceCodeContentCommitted, {
                uiSourceCode: uiSourceCode,
                content: newContent
            });
            callback(content);
        }
    },
    canRename: function () {
        return this._projectDelegate.canRename();
    },
    rename: function (uiSourceCode, newName, callback) {
        if (newName === uiSourceCode.name()) {
            callback(true, uiSourceCode.name(), uiSourceCode.url, uiSourceCode.originURL(), uiSourceCode.contentType());
            return;
        }
        this._projectDelegate.rename(uiSourceCode.path(), newName, innerCallback.bind(this));

        function innerCallback(success, newName, newURL, newOriginURL, newContentType) {
            if (!success || !newName) {
                callback(false);
                return;
            }
            var oldPath = uiSourceCode.path();
            var newPath = uiSourceCode.parentPath() ? uiSourceCode.parentPath() + "/" + newName : newName;
            this._uiSourceCodesMap[newPath] = this._uiSourceCodesMap[oldPath];
            delete this._uiSourceCodesMap[oldPath];
            callback(true, newName, newURL, newOriginURL, newContentType);
        }
    },
    refresh: function (path) {
        this._projectDelegate.refresh(path);
    },
    excludeFolder: function (path) {
        this._projectDelegate.excludeFolder(path);
        var uiSourceCodes = this._uiSourceCodesList.slice();
        for (var i = 0; i < uiSourceCodes.length; ++i) {
            var uiSourceCode = uiSourceCodes[i];
            if (uiSourceCode.path().startsWith(path.substr(1)))
                this._removeFile(uiSourceCode.path());
        }
    },
    createFile: function (path, name, content, callback) {
        this._projectDelegate.createFile(path, name, content, innerCallback);

        function innerCallback(filePath) {
            callback(filePath);
        }
    },
    deleteFile: function (path) {
        this._projectDelegate.deleteFile(path);
    },
    remove: function () {
        this._projectDelegate.remove();
    },
    searchInFileContent: function (uiSourceCode, query, caseSensitive, isRegex, callback) {
        this._projectDelegate.searchInFileContent(uiSourceCode.path(), query, caseSensitive, isRegex, callback);
    },
    findFilesMatchingSearchRequest: function (queries, fileQueries, caseSensitive, isRegex, progress, callback) {
        this._projectDelegate.findFilesMatchingSearchRequest(queries, fileQueries, caseSensitive, isRegex, progress, callback);
    },
    indexContent: function (progress, callback) {
        this._projectDelegate.indexContent(progress, callback);
    },
    dispose: function () {
        this._projectDelegate.reset();
    }
}
WebInspector.projectTypes = {
    Debugger: "debugger",
    Formatter: "formatter",
    LiveEdit: "liveedit",
    Network: "network",
    Snippets: "snippets",
    FileSystem: "filesystem"
}

WebInspector.ContentProviderBasedProjectDelegate = function (type) {
    this._type = type;
    this._contentProviders = {};
    this._isContentScriptMap = {};
}
WebInspector.ContentProviderBasedProjectDelegate.prototype = {
    id: function () {
        return "";
    },
    type: function () {
        return this._type;
    },
    displayName: function () {
        return "";
    },
    requestMetadata: function (path, callback) {
        callback(null, null);
    },
    requestFileContent: function (path, callback) {
        var contentProvider = this._contentProviders[path];
        contentProvider.requestContent(callback);

        function innerCallback(content, encoded, mimeType) {
            callback(content);
        }
    },
    canSetFileContent: function () {
        return false;
    },
    setFileContent: function (path, newContent, callback) {
        callback(null);
    },
    canRename: function () {
        return false;
    },
    rename: function (path, newName, callback) {
        this.performRename(path, newName, innerCallback.bind(this));

        function innerCallback(success, newName) {
            if (success)
                this._updateName(path, (newName));
            callback(success, newName);
        }
    },
    refresh: function (path) {},
    excludeFolder: function (path) {},
    createFile: function (path, name, content, callback) {},
    deleteFile: function (path) {},
    remove: function () {},
    performRename: function (path, newName, callback) {
        callback(false);
    },
    _updateName: function (path, newName) {
        var oldPath = path;
        var copyOfPath = path.split("/");
        copyOfPath[copyOfPath.length - 1] = newName;
        var newPath = copyOfPath.join("/");
        this._contentProviders[newPath] = this._contentProviders[oldPath];
        delete this._contentProviders[oldPath];
    },
    searchInFileContent: function (path, query, caseSensitive, isRegex, callback) {
        var contentProvider = this._contentProviders[path];
        contentProvider.searchInContent(query, caseSensitive, isRegex, callback);
    },
    findFilesMatchingSearchRequest: function (queries, fileQueries, caseSensitive, isRegex, progress, callback) {
        var result = [];
        var paths = Object.keys(this._contentProviders);
        var totalCount = paths.length;
        if (totalCount === 0) {
            setTimeout(doneCallback, 0);
            return;
        }

        function filterOutContentScripts(path) {
            return !this._isContentScriptMap[path];
        }
        if (!WebInspector.settings.searchInContentScripts.get())
            paths = paths.filter(filterOutContentScripts.bind(this));
        var fileRegexes = [];
        for (var i = 0; i < fileQueries.length; ++i)
            fileRegexes.push(new RegExp(fileQueries[i], caseSensitive ? "" : "i"));

        function filterOutNonMatchingFiles(file) {
            for (var i = 0; i < fileRegexes.length; ++i) {
                if (!file.match(fileRegexes[i]))
                    return false;
            }
            return true;
        }
        paths = paths.filter(filterOutNonMatchingFiles);
        var barrier = new CallbackBarrier();
        progress.setTotalWork(paths.length);
        for (var i = 0; i < paths.length; ++i)
            searchInContent.call(this, paths[i], barrier.createCallback(searchInContentCallback.bind(null, paths[i])));
        barrier.callWhenDone(doneCallback);

        function searchInContent(path, callback) {
            var queriesToRun = queries.slice();
            searchNextQuery.call(this);

            function searchNextQuery() {
                if (!queriesToRun.length) {
                    callback(true);
                    return;
                }
                var query = queriesToRun.shift();
                this._contentProviders[path].searchInContent(query, caseSensitive, isRegex, contentCallback.bind(this));
            }

            function contentCallback(searchMatches) {
                if (!searchMatches.length) {
                    callback(false);
                    return;
                }
                searchNextQuery.call(this);
            }
        }

        function searchInContentCallback(path, matches) {
            if (matches)
                result.push(path);
            progress.worked(1);
        }

        function doneCallback() {
            callback(result);
            progress.done();
        }
    },
    indexContent: function (progress, callback) {
        setTimeout(innerCallback, 0);

        function innerCallback() {
            progress.done();
            callback();
        }
    },
    addContentProvider: function (parentPath, name, url, contentProvider, isEditable, isContentScript) {
        var path = parentPath ? parentPath + "/" + name : name;
        if (this._contentProviders[path])
            return path;
        var fileDescriptor = new WebInspector.FileDescriptor(parentPath, name, url, url, contentProvider.contentType(), isEditable, isContentScript);
        this._contentProviders[path] = contentProvider;
        this._isContentScriptMap[path] = isContentScript || false;
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.FileAdded, fileDescriptor);
        return path;
    },
    removeFile: function (path) {
        delete this._contentProviders[path];
        delete this._isContentScriptMap[path];
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.FileRemoved, path);
    },
    contentProviders: function () {
        return this._contentProviders;
    },
    reset: function () {
        this._contentProviders = {};
        this._isContentScriptMap = {};
        this.dispatchEventToListeners(WebInspector.ProjectDelegate.Events.Reset, null);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.SimpleProjectDelegate = function (name, type) {
    WebInspector.ContentProviderBasedProjectDelegate.call(this, type);
    this._name = name;
    this._lastUniqueSuffix = 0;
}
WebInspector.SimpleProjectDelegate.projectId = function (name, type) {
    var typePrefix = type !== WebInspector.projectTypes.Network ? (type + ":") : "";
    return typePrefix + name;
}
WebInspector.SimpleProjectDelegate.prototype = {
    id: function () {
        return WebInspector.SimpleProjectDelegate.projectId(this._name, this.type());
    },
    displayName: function () {
        if (typeof this._displayName !== "undefined")
            return this._displayName;
        if (!this._name) {
            this._displayName = this.type() !== WebInspector.projectTypes.Snippets ? WebInspector.UIString("(no domain)") : "";
            return this._displayName;
        }
        var parsedURL = new WebInspector.ParsedURL(this._name);
        if (parsedURL.isValid) {
            this._displayName = parsedURL.host + (parsedURL.port ? (":" + parsedURL.port) : "");
            if (!this._displayName)
                this._displayName = this._name;
        } else
            this._displayName = this._name;
        return this._displayName;
    },
    addFile: function (parentPath, name, forceUniquePath, url, contentProvider, isEditable, isContentScript) {
        if (forceUniquePath)
            name = this._ensureUniqueName(parentPath, name);
        return this.addContentProvider(parentPath, name, url, contentProvider, isEditable, isContentScript);
    },
    _ensureUniqueName: function (parentPath, name) {
        var path = parentPath ? parentPath + "/" + name : name;
        var uniquePath = path;
        var suffix = "";
        var contentProviders = this.contentProviders();
        while (contentProviders[uniquePath]) {
            suffix = " (" + (++this._lastUniqueSuffix) + ")";
            uniquePath = path + suffix;
        }
        return name + suffix;
    },
    __proto__: WebInspector.ContentProviderBasedProjectDelegate.prototype
}
WebInspector.SimpleWorkspaceProvider = function (workspace, type) {
    this._workspace = workspace;
    this._type = type;
    this._simpleProjectDelegates = {};
}
WebInspector.SimpleWorkspaceProvider.prototype = {
    _projectDelegate: function (projectName) {
        if (this._simpleProjectDelegates[projectName])
            return this._simpleProjectDelegates[projectName];
        var simpleProjectDelegate = new WebInspector.SimpleProjectDelegate(projectName, this._type);
        this._simpleProjectDelegates[projectName] = simpleProjectDelegate;
        this._workspace.addProject(simpleProjectDelegate);
        return simpleProjectDelegate;
    },
    addFileForURL: function (url, contentProvider, isEditable, isContentScript) {
        return this._innerAddFileForURL(url, contentProvider, isEditable, false, isContentScript);
    },
    addUniqueFileForURL: function (url, contentProvider, isEditable, isContentScript) {
        return this._innerAddFileForURL(url, contentProvider, isEditable, true, isContentScript);
    },
    _innerAddFileForURL: function (url, contentProvider, isEditable, forceUnique, isContentScript) {
        var splitURL = WebInspector.ParsedURL.splitURL(url);
        var projectName = splitURL[0];
        var parentPath = splitURL.slice(1, splitURL.length - 1).join("/");
        var name = splitURL[splitURL.length - 1];
        var projectDelegate = this._projectDelegate(projectName);
        var path = projectDelegate.addFile(parentPath, name, forceUnique, url, contentProvider, isEditable, isContentScript);
        var uiSourceCode = (this._workspace.uiSourceCode(projectDelegate.id(), path));
        console.assert(uiSourceCode);
        return uiSourceCode;
    },
    reset: function () {
        for (var projectName in this._simpleProjectDelegates)
            this._simpleProjectDelegates[projectName].reset();
        this._simpleProjectDelegates = {};
    },
    __proto__: WebInspector.Object.prototype
}

WebInspector.CompilerSourceMappingContentProvider = function (sourceURL, contentType) {
    this._sourceURL = sourceURL;
    this._contentType = contentType;
}
WebInspector.CompilerSourceMappingContentProvider.prototype = {
    contentURL: function () {
        return this._sourceURL;
    },
    contentType: function () {
        return this._contentType;
    },
    requestContent: function (callback) {
        NetworkAgent.loadResourceForFrontend(WebInspector.resourceTreeModel.mainFrame.id, this._sourceURL, undefined, contentLoaded.bind(this));

        function contentLoaded(error, statusCode, headers, content) {
            if (error || statusCode >= 400) {
                console.error("Could not load content for " + this._sourceURL + " : " + (error || ("HTTP status code: " + statusCode)));
                callback(null);
                return;
            }
            callback(content);
        }
    },
    searchInContent: function (query, caseSensitive, isRegex, callback) {
        this.requestContent(contentLoaded);

        function contentLoaded(content) {
            if (typeof content !== "string") {
                callback([]);
                return;
            }
            callback(WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex));
        }
    }
}
WebInspector.StaticContentProvider = function (contentType, content) {
    this._content = content;
    this._contentType = contentType;
}
WebInspector.StaticContentProvider.prototype = {
    contentURL: function () {
        return "";
    },
    contentType: function () {
        return this._contentType;
    },
    requestContent: function (callback) {
        callback(this._content);
    },
    searchInContent: function (query, caseSensitive, isRegex, callback) {
        function performSearch() {
            callback(WebInspector.ContentProvider.performSearchInContent(this._content, query, caseSensitive, isRegex));
        }
        window.setTimeout(performSearch.bind(this), 0);
    }
}

WebInspector.DebuggerProjectDelegate = function () {
    WebInspector.ContentProviderBasedProjectDelegate.call(this, WebInspector.projectTypes.Debugger);
}
WebInspector.DebuggerProjectDelegate.prototype = {
    id: function () {
        return "debugger:";
    },
    displayName: function () {
        return "debugger";
    },
    addScript: function (script) {
        var contentProvider = script.isInlineScript() ? new WebInspector.ConcatenatedScriptsContentProvider([script]) : script;
        var splitURL = WebInspector.ParsedURL.splitURL(script.sourceURL);
        var name = splitURL[splitURL.length - 1];
        name = "VM" + script.scriptId + (name ? " " + name : "");
        return this.addContentProvider("", name, script.sourceURL, contentProvider, false, script.isContentScript);
    },
    __proto__: WebInspector.ContentProviderBasedProjectDelegate.prototype
}
WebInspector.ResourceScriptMapping = function (debuggerModel, workspace) {
    this._debuggerModel = debuggerModel;
    this._workspace = workspace;
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    this._boundURLs = new StringSet();
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
}
WebInspector.ResourceScriptMapping.prototype = {
    rawLocationToUILocation: function (rawLocation) {
        var debuggerModelLocation = (rawLocation);
        var script = this._debuggerModel.scriptForId(debuggerModelLocation.scriptId);
        var uiSourceCode = this._workspaceUISourceCodeForScript(script);
        if (!uiSourceCode)
            return null;
        var scriptFile = uiSourceCode.scriptFile();
        if (scriptFile && ((scriptFile.hasDivergedFromVM() && !scriptFile.isMergingToVM()) || scriptFile.isDivergingFromVM()))
            return null;
        return new WebInspector.UILocation(uiSourceCode, debuggerModelLocation.lineNumber, debuggerModelLocation.columnNumber || 0);
    },
    uiLocationToRawLocation: function (uiSourceCode, lineNumber, columnNumber) {
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        console.assert(scripts.length);
        return this._debuggerModel.createRawLocation(scripts[0], lineNumber, columnNumber);
    },
    addScript: function (script) {
        if (script.isAnonymousScript())
            return;
        script.pushSourceMapping(this);
        var uiSourceCode = this._workspaceUISourceCodeForScript(script);
        if (!uiSourceCode)
            return;
        this._bindUISourceCodeToScripts(uiSourceCode, [script]);
    },
    isIdentity: function () {
        return true;
    },
    _uiSourceCodeAddedToWorkspace: function (event) {
        var uiSourceCode = (event.data);
        if (uiSourceCode.project().isServiceProject())
            return;
        if (!uiSourceCode.url)
            return;
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        if (!scripts.length)
            return;
        this._bindUISourceCodeToScripts(uiSourceCode, scripts);
    },
    _hasMergedToVM: function (uiSourceCode) {
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        if (!scripts.length)
            return;
        for (var i = 0; i < scripts.length; ++i)
            scripts[i].updateLocations();
    },
    _hasDivergedFromVM: function (uiSourceCode) {
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        if (!scripts.length)
            return;
        for (var i = 0; i < scripts.length; ++i)
            scripts[i].updateLocations();
    },
    _workspaceUISourceCodeForScript: function (script) {
        if (script.isAnonymousScript())
            return null;
        return this._workspace.uiSourceCodeForURL(script.sourceURL);
    },
    _scriptsForUISourceCode: function (uiSourceCode) {
        if (!uiSourceCode.url)
            return [];
        return this._debuggerModel.scriptsForSourceURL(uiSourceCode.url);
    },
    _bindUISourceCodeToScripts: function (uiSourceCode, scripts) {
        console.assert(scripts.length);
        var scriptFile = new WebInspector.ResourceScriptFile(this, uiSourceCode, scripts);
        uiSourceCode.setScriptFile(scriptFile);
        for (var i = 0; i < scripts.length; ++i)
            scripts[i].updateLocations();
        uiSourceCode.setSourceMapping(this);
        this._boundURLs.put(uiSourceCode.url);
    },
    _unbindUISourceCode: function (uiSourceCode) {
        var scriptFile = (uiSourceCode.scriptFile());
        if (scriptFile) {
            scriptFile.dispose();
            uiSourceCode.setScriptFile(null);
        }
        uiSourceCode.setSourceMapping(null);
    },
    _debuggerReset: function () {
        var boundURLs = this._boundURLs.values();
        for (var i = 0; i < boundURLs.length; ++i) {
            var uiSourceCode = this._workspace.uiSourceCodeForURL(boundURLs[i]);
            if (!uiSourceCode)
                continue;
            this._unbindUISourceCode(uiSourceCode);
        }
        this._boundURLs.clear();
    },
}
WebInspector.ScriptFile = function () {}
WebInspector.ScriptFile.Events = {
    DidMergeToVM: "DidMergeToVM",
    DidDivergeFromVM: "DidDivergeFromVM",
}
WebInspector.ScriptFile.prototype = {
    hasDivergedFromVM: function () {
        return false;
    },
    isDivergingFromVM: function () {
        return false;
    },
    isMergingToVM: function () {
        return false;
    },
    checkMapping: function () {},
}
WebInspector.ResourceScriptFile = function (resourceScriptMapping, uiSourceCode, scripts) {
    console.assert(scripts.length);
    WebInspector.ScriptFile.call(this);
    this._resourceScriptMapping = resourceScriptMapping;
    this._uiSourceCode = uiSourceCode;
    if (this._uiSourceCode.contentType() === WebInspector.resourceTypes.Script)
        this._script = scripts[0];
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this._update();
}
WebInspector.ResourceScriptFile.prototype = {
    _workingCopyCommitted: function (event) {
        function innerCallback(error, errorData) {
            if (error) {
                this._update();
                WebInspector.LiveEditSupport.logDetailedError(error, errorData, this._script);
                return;
            }
            this._scriptSource = source;
            this._update();
            WebInspector.LiveEditSupport.logSuccess();
        }
        if (!this._script)
            return;
        var source = this._uiSourceCode.workingCopy();
        this._resourceScriptMapping._debuggerModel.setScriptSource(this._script.scriptId, source, innerCallback.bind(this));
    },
    _isDiverged: function () {
        if (this._uiSourceCode.isDirty())
            return true;
        if (!this._script)
            return false;
        if (typeof this._scriptSource === "undefined")
            return false;
        return this._uiSourceCode.workingCopy() !== this._scriptSource;
    },
    _workingCopyChanged: function (event) {
        this._update();
    },
    _update: function () {
        if (this._isDiverged() && !this._hasDivergedFromVM)
            this._divergeFromVM();
        else if (!this._isDiverged() && this._hasDivergedFromVM)
            this._mergeToVM();
    },
    _divergeFromVM: function () {
        this._isDivergingFromVM = true;
        this._resourceScriptMapping._hasDivergedFromVM(this._uiSourceCode);
        delete this._isDivergingFromVM;
        this._hasDivergedFromVM = true;
        this.dispatchEventToListeners(WebInspector.ScriptFile.Events.DidDivergeFromVM, this._uiSourceCode);
    },
    _mergeToVM: function () {
        delete this._hasDivergedFromVM;
        this._isMergingToVM = true;
        this._resourceScriptMapping._hasMergedToVM(this._uiSourceCode);
        delete this._isMergingToVM;
        this.dispatchEventToListeners(WebInspector.ScriptFile.Events.DidMergeToVM, this._uiSourceCode);
    },
    hasDivergedFromVM: function () {
        return this._hasDivergedFromVM;
    },
    isDivergingFromVM: function () {
        return this._isDivergingFromVM;
    },
    isMergingToVM: function () {
        return this._isMergingToVM;
    },
    checkMapping: function () {
        if (!this._script)
            return;
        if (typeof this._scriptSource !== "undefined")
            return;
        this._script.requestContent(callback.bind(this));

        function callback(source) {
            this._scriptSource = source;
            this._update();
        }
    },
    dispose: function () {
        this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
        this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.CompilerScriptMapping = function (debuggerModel, workspace, networkWorkspaceProvider) {
    this._debuggerModel = debuggerModel;
    this._workspace = workspace;
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    this._networkWorkspaceProvider = networkWorkspaceProvider;
    this._sourceMapForSourceMapURL = {};
    this._pendingSourceMapLoadingCallbacks = {};
    this._sourceMapForScriptId = {};
    this._scriptForSourceMap = new Map();
    this._sourceMapForURL = new StringMap();
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
}
WebInspector.CompilerScriptMapping.prototype = {
    rawLocationToUILocation: function (rawLocation) {
        var debuggerModelLocation = (rawLocation);
        var sourceMap = this._sourceMapForScriptId[debuggerModelLocation.scriptId];
        if (!sourceMap)
            return null;
        var lineNumber = debuggerModelLocation.lineNumber;
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        var entry = sourceMap.findEntry(lineNumber, columnNumber);
        if (!entry || entry.length === 2)
            return null;
        var url = (entry[2]);
        var uiSourceCode = this._workspace.uiSourceCodeForURL(url);
        if (!uiSourceCode)
            return null;
        return new WebInspector.UILocation(uiSourceCode, (entry[3]), (entry[4]));
    },
    uiLocationToRawLocation: function (uiSourceCode, lineNumber, columnNumber) {
        if (!uiSourceCode.url)
            return null;
        var sourceMap = this._sourceMapForURL.get(uiSourceCode.url);
        if (!sourceMap)
            return null;
        var script = (this._scriptForSourceMap.get(sourceMap));
        console.assert(script);
        var entry = sourceMap.findEntryReversed(uiSourceCode.url, lineNumber);
        return this._debuggerModel.createRawLocation(script, (entry[0]), (entry[1]));
    },
    addScript: function (script) {
        script.pushSourceMapping(this);
        this.loadSourceMapForScript(script, sourceMapLoaded.bind(this));

        function sourceMapLoaded(sourceMap) {
            if (!sourceMap)
                return;
            if (this._scriptForSourceMap.get(sourceMap)) {
                this._sourceMapForScriptId[script.scriptId] = sourceMap;
                script.updateLocations();
                return;
            }
            this._sourceMapForScriptId[script.scriptId] = sourceMap;
            this._scriptForSourceMap.put(sourceMap, script);
            var sourceURLs = sourceMap.sources();
            for (var i = 0; i < sourceURLs.length; ++i) {
                var sourceURL = sourceURLs[i];
                if (this._sourceMapForURL.get(sourceURL))
                    continue;
                this._sourceMapForURL.put(sourceURL, sourceMap);
                if (!this._workspace.hasMappingForURL(sourceURL) && !this._workspace.uiSourceCodeForURL(sourceURL)) {
                    var contentProvider = sourceMap.sourceContentProvider(sourceURL, WebInspector.resourceTypes.Script);
                    this._networkWorkspaceProvider.addFileForURL(sourceURL, contentProvider, true);
                }
                var uiSourceCode = this._workspace.uiSourceCodeForURL(sourceURL);
                if (uiSourceCode) {
                    this._bindUISourceCode(uiSourceCode);
                    uiSourceCode.isContentScript = script.isContentScript;
                } else {
                    WebInspector.console.showErrorMessage(WebInspector.UIString("Failed to locate workspace file mapped to URL %s from source map %s", sourceURL, sourceMap.url()));
                }
            }
            script.updateLocations();
        }
    },
    isIdentity: function () {
        return false;
    },
    _bindUISourceCode: function (uiSourceCode) {
        uiSourceCode.setSourceMapping(this);
    },
    _unbindUISourceCode: function (uiSourceCode) {
        uiSourceCode.setSourceMapping(null);
    },
    _uiSourceCodeAddedToWorkspace: function (event) {
        var uiSourceCode = (event.data);
        if (!uiSourceCode.url || !this._sourceMapForURL.get(uiSourceCode.url))
            return;
        this._bindUISourceCode(uiSourceCode);
    },
    loadSourceMapForScript: function (script, callback) {
        if (!script.sourceMapURL) {
            callback(null);
            return;
        }
        var scriptURL = WebInspector.ParsedURL.completeURL(WebInspector.resourceTreeModel.inspectedPageURL(), script.sourceURL);
        if (!scriptURL) {
            callback(null);
            return;
        }
        var sourceMapURL = WebInspector.ParsedURL.completeURL(scriptURL, script.sourceMapURL);
        if (!sourceMapURL) {
            callback(null);
            return;
        }
        var sourceMap = this._sourceMapForSourceMapURL[sourceMapURL];
        if (sourceMap) {
            callback(sourceMap);
            return;
        }
        var pendingCallbacks = this._pendingSourceMapLoadingCallbacks[sourceMapURL];
        if (pendingCallbacks) {
            pendingCallbacks.push(callback);
            return;
        }
        pendingCallbacks = [callback];
        this._pendingSourceMapLoadingCallbacks[sourceMapURL] = pendingCallbacks;
        WebInspector.SourceMap.load(sourceMapURL, scriptURL, sourceMapLoaded.bind(this));

        function sourceMapLoaded(sourceMap) {
            var url = (sourceMapURL);
            var callbacks = this._pendingSourceMapLoadingCallbacks[url];
            delete this._pendingSourceMapLoadingCallbacks[url];
            if (!callbacks)
                return;
            if (sourceMap)
                this._sourceMapForSourceMapURL[url] = sourceMap;
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](sourceMap);
        }
    },
    _debuggerReset: function () {
        function unbindUISourceCodesForSourceMap(sourceMap) {
            var sourceURLs = sourceMap.sources();
            for (var i = 0; i < sourceURLs.length; ++i) {
                var sourceURL = sourceURLs[i];
                var uiSourceCode = this._workspace.uiSourceCodeForURL(sourceURL);
                if (!uiSourceCode)
                    continue;
                this._unbindUISourceCode(uiSourceCode);
            }
        }
        this._sourceMapForURL.values().forEach(unbindUISourceCodesForSourceMap.bind(this));
        this._sourceMapForSourceMapURL = {};
        this._pendingSourceMapLoadingCallbacks = {};
        this._sourceMapForScriptId = {};
        this._scriptForSourceMap.clear();
        this._sourceMapForURL.clear();
    }
}

WebInspector.evaluateForTestInFrontend = function (callId, script) {
    if (!InspectorFrontendHost.isUnderTest())
        return;

    function invokeMethod() {
        var message;
        try {
            script = script + "//# sourceURL=evaluateInWebInspector" + callId + ".js";
            var result = window.eval(script);
            message = typeof result === "undefined" ? "\"<undefined>\"" : JSON.stringify(result);
        } catch (e) {
            message = e.toString();
        }
        RuntimeAgent.evaluate("didEvaluateForTestInFrontend(" + callId + ", " + message + ")", "test");
    }
    InspectorBackend.connection().runAfterPendingDispatches(invokeMethod);
}
WebInspector.Dialog = function (relativeToElement, delegate) {
    this._delegate = delegate;
    this._relativeToElement = relativeToElement;
    this._glassPane = new WebInspector.GlassPane();
    this._glassPane.element.tabIndex = 0;
    this._glassPane.element.addEventListener("focus", this._onGlassPaneFocus.bind(this), false);
    this._element = this._glassPane.element.createChild("div");
    this._element.tabIndex = 0;
    this._element.addEventListener("focus", this._onFocus.bind(this), false);
    this._element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this._closeKeys = [WebInspector.KeyboardShortcut.Keys.Enter.code, WebInspector.KeyboardShortcut.Keys.Esc.code, ];
    delegate.show(this._element);
    this._position();
    this._delegate.focus();
}
WebInspector.Dialog.currentInstance = function () {
    return WebInspector.Dialog._instance;
}
WebInspector.Dialog.show = function (relativeToElement, delegate) {
    if (WebInspector.Dialog._instance)
        return;
    WebInspector.Dialog._instance = new WebInspector.Dialog(relativeToElement, delegate);
}
WebInspector.Dialog.hide = function () {
    if (!WebInspector.Dialog._instance)
        return;
    WebInspector.Dialog._instance._hide();
}
WebInspector.Dialog.prototype = {
    _hide: function () {
        if (this._isHiding)
            return;
        this._isHiding = true;
        this._delegate.willHide();
        delete WebInspector.Dialog._instance;
        this._glassPane.dispose();
    },
    _onGlassPaneFocus: function (event) {
        this._hide();
    },
    _onFocus: function (event) {
        this._delegate.focus();
    },
    _position: function () {
        this._delegate.position(this._element, this._relativeToElement);
    },
    _onKeyDown: function (event) {
        if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Tab.code) {
            event.preventDefault();
            return;
        }
        if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Enter.code)
            this._delegate.onEnter();
        if (this._closeKeys.indexOf(event.keyCode) >= 0) {
            this._hide();
            event.consume(true);
        }
    }
};
WebInspector.DialogDelegate = function () {
    this.element;
}
WebInspector.DialogDelegate.prototype = {
    show: function (element) {
        element.appendChild(this.element);
        this.element.classList.add("dialog-contents");
        element.classList.add("dialog");
    },
    position: function (element, relativeToElement) {
        var container = WebInspector.Dialog._modalHostView.element;
        var box = relativeToElement.boxInWindow(window).relativeToElement(container);
        var positionX = box.x + (relativeToElement.offsetWidth - element.offsetWidth) / 2;
        positionX = Number.constrain(positionX, 0, container.offsetWidth - element.offsetWidth);
        var positionY = box.y + (relativeToElement.offsetHeight - element.offsetHeight) / 2;
        positionY = Number.constrain(positionY, 0, container.offsetHeight - element.offsetHeight);
        element.style.position = "absolute";
        element.positionAt(positionX, positionY, container);
    },
    focus: function () {},
    onEnter: function () {},
    willHide: function () {},
    __proto__: WebInspector.Object.prototype
}
WebInspector.Dialog._modalHostView = null;
WebInspector.Dialog.setModalHostView = function (view) {
    WebInspector.Dialog._modalHostView = view;
};
WebInspector.Dialog.modalHostView = function () {
    return WebInspector.Dialog._modalHostView;
};
WebInspector.Dialog.modalHostRepositioned = function () {
    if (WebInspector.Dialog._instance)
        WebInspector.Dialog._instance._position();
};
WebInspector.GoToLineDialog = function (sourceFrame) {
    WebInspector.DialogDelegate.call(this);
    this.element = document.createElement("div");
    this.element.className = "go-to-line-dialog";
    this.element.createChild("label").textContent = WebInspector.UIString("Go to line: ");
    this._input = this.element.createChild("input");
    this._input.setAttribute("type", "text");
    this._input.setAttribute("size", 6);
    this._goButton = this.element.createChild("button");
    this._goButton.textContent = WebInspector.UIString("Go");
    this._goButton.addEventListener("click", this._onGoClick.bind(this), false);
    this._sourceFrame = sourceFrame;
}
WebInspector.GoToLineDialog.install = function (panel, sourceFrameGetter) {
    var goToLineShortcut = WebInspector.GoToLineDialog.createShortcut();
    panel.registerShortcuts([goToLineShortcut], WebInspector.GoToLineDialog._show.bind(null, sourceFrameGetter));
}
WebInspector.GoToLineDialog._show = function (sourceFrameGetter, event) {
    var sourceFrame = sourceFrameGetter();
    if (!sourceFrame)
        return false;
    WebInspector.Dialog.show(sourceFrame.element, new WebInspector.GoToLineDialog(sourceFrame));
    return true;
}
WebInspector.GoToLineDialog.createShortcut = function () {
    return WebInspector.KeyboardShortcut.makeDescriptor("g", WebInspector.KeyboardShortcut.Modifiers.Ctrl);
}
WebInspector.GoToLineDialog.prototype = {
    focus: function () {
        WebInspector.setCurrentFocusElement(this._input);
        this._input.select();
    },
    _onGoClick: function () {
        this._applyLineNumber();
        WebInspector.Dialog.hide();
    },
    _applyLineNumber: function () {
        var value = this._input.value;
        var lineNumber = parseInt(value, 10) - 1;
        if (!isNaN(lineNumber) && lineNumber >= 0)
            this._sourceFrame.revealPosition(lineNumber, 0, true);
    },
    onEnter: function () {
        this._applyLineNumber();
    },
    __proto__: WebInspector.DialogDelegate.prototype
}
WebInspector.SettingsScreen = function (onHide) {
    WebInspector.HelpScreen.call(this);
    this.element.id = "settings-screen";
    this._onHide = onHide;
    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.element.classList.add("help-window-main");
    var settingsLabelElement = document.createElement("div");
    settingsLabelElement.className = "help-window-label";
    settingsLabelElement.createTextChild(WebInspector.UIString("Settings"));
    this._tabbedPane.element.insertBefore(settingsLabelElement, this._tabbedPane.element.firstChild);
    this._tabbedPane.element.appendChild(this._createCloseButton());
    this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.General, WebInspector.UIString("General"), new WebInspector.GenericSettingsTab());
    this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Workspace, WebInspector.UIString("Workspace"), new WebInspector.WorkspaceSettingsTab());
    if (WebInspector.experimentsSettings.experimentsEnabled)
        this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Experiments, WebInspector.UIString("Experiments"), new WebInspector.ExperimentsSettingsTab());
    this._tabbedPane.appendTab(WebInspector.SettingsScreen.Tabs.Shortcuts, WebInspector.UIString("Shortcuts"), WebInspector.shortcutsScreen.createShortcutsTabView());
    this._tabbedPane.shrinkableTabs = false;
    this._tabbedPane.verticalTabLayout = true;
    this._lastSelectedTabSetting = WebInspector.settings.createSetting("lastSelectedSettingsTab", WebInspector.SettingsScreen.Tabs.General);
    this.selectTab(this._lastSelectedTabSetting.get());
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
}
WebInspector.SettingsScreen.regexValidator = function (text) {
    var regex;
    try {
        regex = new RegExp(text);
    } catch (e) {}
    return regex ? null : WebInspector.UIString("Invalid pattern");
}
WebInspector.SettingsScreen.integerValidator = function (min, max, text) {
    var value = Number(text);
    if (isNaN(value))
        return WebInspector.UIString("Invalid number format");
    if (value < min || value > max)
        return WebInspector.UIString("Value is out of range [%d, %d]", min, max);
    return null;
}
WebInspector.SettingsScreen.Tabs = {
    General: "general",
    Overrides: "overrides",
    Workspace: "workspace",
    Experiments: "experiments",
    Shortcuts: "shortcuts"
}
WebInspector.SettingsScreen.prototype = {
    selectTab: function (tabId) {
        this._tabbedPane.selectTab(tabId);
    },
    _tabSelected: function (event) {
        this._lastSelectedTabSetting.set(this._tabbedPane.selectedTabId);
    },
    wasShown: function () {
        this._tabbedPane.show(this.element);
        WebInspector.HelpScreen.prototype.wasShown.call(this);
    },
    isClosingKey: function (keyCode) {
        return [WebInspector.KeyboardShortcut.Keys.Enter.code, WebInspector.KeyboardShortcut.Keys.Esc.code, ].indexOf(keyCode) >= 0;
    },
    willHide: function () {
        this._onHide();
        WebInspector.HelpScreen.prototype.willHide.call(this);
    },
    __proto__: WebInspector.HelpScreen.prototype
}
WebInspector.SettingsTab = function (name, id) {
    WebInspector.VBox.call(this);
    this.element.classList.add("settings-tab-container");
    if (id)
        this.element.id = id;
    var header = this.element.createChild("header");
    header.createChild("h3").appendChild(document.createTextNode(name));
    this.containerElement = this.element.createChild("div", "help-container-wrapper").createChild("div", "settings-tab help-content help-container");
}
WebInspector.SettingsTab.prototype = {
    _appendSection: function (name) {
        var block = this.containerElement.createChild("div", "help-block");
        if (name)
            block.createChild("div", "help-section-title").textContent = name;
        return block;
    },
    _createSelectSetting: function (name, options, setting) {
        var p = document.createElement("p");
        var labelElement = p.createChild("label");
        labelElement.textContent = name;
        var select = p.createChild("select");
        var settingValue = setting.get();
        for (var i = 0; i < options.length; ++i) {
            var option = options[i];
            select.add(new Option(option[0], option[1]));
            if (settingValue === option[1])
                select.selectedIndex = i;
        }

        function changeListener(e) {
            setting.set(options[select.selectedIndex][1]);
        }
        select.addEventListener("change", changeListener, false);
        return p;
    },
    _createInputSetting: function (label, setting, numeric, maxLength, width, validatorCallback) {
        var p = document.createElement("p");
        var labelElement = p.createChild("label");
        labelElement.textContent = label;
        var inputElement = p.createChild("input");
        inputElement.value = setting.get();
        inputElement.type = "text";
        if (numeric)
            inputElement.className = "numeric";
        if (maxLength)
            inputElement.maxLength = maxLength;
        if (width)
            inputElement.style.width = width;
        if (validatorCallback) {
            var errorMessageLabel = p.createChild("div");
            errorMessageLabel.classList.add("field-error-message");
            errorMessageLabel.style.color = "DarkRed";
            inputElement.oninput = function () {
                var error = validatorCallback(inputElement.value);
                if (!error)
                    error = "";
                errorMessageLabel.textContent = error;
            };
        }

        function onBlur() {
            setting.set(numeric ? Number(inputElement.value) : inputElement.value);
        }
        inputElement.addEventListener("blur", onBlur, false);
        return p;
    },
    _createCustomSetting: function (name, element) {
        var p = document.createElement("p");
        var fieldsetElement = document.createElement("fieldset");
        fieldsetElement.createChild("label").textContent = name;
        fieldsetElement.appendChild(element);
        p.appendChild(fieldsetElement);
        return p;
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.GenericSettingsTab = function () {
    WebInspector.SettingsTab.call(this, WebInspector.UIString("General"), "general-tab-content");
    var p = this._appendSection();
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Disable cache (while DevTools is open)"), WebInspector.settings.cacheDisabled));
    var disableJSElement = WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Disable JavaScript"), WebInspector.settings.javaScriptDisabled);
    p.appendChild(disableJSElement);
    WebInspector.settings.javaScriptDisabled.addChangeListener(this._javaScriptDisabledChanged, this);
    this._disableJSCheckbox = disableJSElement.getElementsByTagName("input")[0];
    var disableJSInfoParent = this._disableJSCheckbox.parentElement.createChild("span", "monospace");
    this._disableJSInfo = disableJSInfoParent.createChild("span", "object-info-state-note hidden");
    this._disableJSInfo.title = WebInspector.UIString("JavaScript is blocked on the inspected page (may be disabled in browser settings).");
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._updateScriptDisabledCheckbox, this);
    this._updateScriptDisabledCheckbox();
    p = this._appendSection(WebInspector.UIString("Appearance"));
    var splitVerticallyTitle = WebInspector.UIString("Split panels vertically when docked to %s", WebInspector.experimentsSettings.dockToLeft.isEnabled() ? "left or right" : "right");
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(splitVerticallyTitle, WebInspector.settings.splitVerticallyWhenDockedToRight));
    var panelShortcutTitle = WebInspector.UIString("Enable %s + 1-9 shortcut to switch panels", WebInspector.isMac() ? "Cmd" : "Ctrl");
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(panelShortcutTitle, WebInspector.settings.shortcutPanelSwitch));
    p = this._appendSection(WebInspector.UIString("Elements"));
    var colorFormatElement = this._createSelectSetting(WebInspector.UIString("Color format"), [
        [WebInspector.UIString("As authored"), WebInspector.Color.Format.Original],
        ["HEX: #DAC0DE", WebInspector.Color.Format.HEX],
        ["RGB: rgb(128, 255, 255)", WebInspector.Color.Format.RGB],
        ["HSL: hsl(300, 80%, 90%)", WebInspector.Color.Format.HSL]
    ], WebInspector.settings.colorFormat);
    p.appendChild(colorFormatElement);
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show user agent styles"), WebInspector.settings.showUserAgentStyles));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show user agent shadow DOM"), WebInspector.settings.showUAShadowDOM));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Word wrap"), WebInspector.settings.domWordWrap));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show rulers"), WebInspector.settings.showMetricsRulers));
    p = this._appendSection(WebInspector.UIString("Sources"));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Search in content scripts"), WebInspector.settings.searchInContentScripts));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Enable JavaScript source maps"), WebInspector.settings.jsSourceMapsEnabled));
    var checkbox = WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Enable CSS source maps"), WebInspector.settings.cssSourceMapsEnabled);
    p.appendChild(checkbox);
    var fieldset = WebInspector.SettingsUI.createSettingFieldset(WebInspector.settings.cssSourceMapsEnabled);
    var autoReloadCSSCheckbox = fieldset.createChild("input");
    fieldset.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Auto-reload generated CSS"), WebInspector.settings.cssReloadEnabled, false, autoReloadCSSCheckbox));
    checkbox.appendChild(fieldset);
    var indentationElement = this._createSelectSetting(WebInspector.UIString("Default indentation"), [
        [WebInspector.UIString("2 spaces"), WebInspector.TextUtils.Indent.TwoSpaces],
        [WebInspector.UIString("4 spaces"), WebInspector.TextUtils.Indent.FourSpaces],
        [WebInspector.UIString("8 spaces"), WebInspector.TextUtils.Indent.EightSpaces],
        [WebInspector.UIString("Tab character"), WebInspector.TextUtils.Indent.TabCharacter]
    ], WebInspector.settings.textEditorIndent);
    p.appendChild(indentationElement);
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Detect indentation"), WebInspector.settings.textEditorAutoDetectIndent));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Autocompletion"), WebInspector.settings.textEditorAutocompletion));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Bracket matching"), WebInspector.settings.textEditorBracketMatching));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show whitespace characters"), WebInspector.settings.showWhitespacesInEditor));
    if (WebInspector.experimentsSettings.frameworksDebuggingSupport.isEnabled()) {
        checkbox = WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Skip stepping through sources with particular names"), WebInspector.settings.skipStackFramesSwitch);
        fieldset = WebInspector.SettingsUI.createSettingFieldset(WebInspector.settings.skipStackFramesSwitch);
        fieldset.appendChild(this._createInputSetting(WebInspector.UIString("Pattern"), WebInspector.settings.skipStackFramesPattern, false, 1000, "100px", WebInspector.SettingsScreen.regexValidator));
        checkbox.appendChild(fieldset);
        p.appendChild(checkbox);
    }
    WebInspector.settings.skipStackFramesSwitch.addChangeListener(this._skipStackFramesSwitchOrPatternChanged, this);
    WebInspector.settings.skipStackFramesPattern.addChangeListener(this._skipStackFramesSwitchOrPatternChanged, this);
    p = this._appendSection(WebInspector.UIString("Profiler"));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show advanced heap snapshot properties"), WebInspector.settings.showAdvancedHeapSnapshotProperties));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("High resolution CPU profiling"), WebInspector.settings.highResolutionCpuProfiling));
    p = this._appendSection(WebInspector.UIString("Console"));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Log XMLHttpRequests"), WebInspector.settings.monitoringXHREnabled));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Preserve log upon navigation"), WebInspector.settings.preserveConsoleLog));
    p.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show timestamps"), WebInspector.settings.consoleTimestampsEnabled));
    if (WebInspector.openAnchorLocationRegistry.handlerNames.length > 0) {
        var handlerSelector = new WebInspector.HandlerSelector(WebInspector.openAnchorLocationRegistry);
        p = this._appendSection(WebInspector.UIString("Extensions"));
        p.appendChild(this._createCustomSetting(WebInspector.UIString("Open links in"), handlerSelector.element));
    }
    p = this._appendSection();
    var restoreDefaults = p.createChild("input", "settings-tab-text-button");
    restoreDefaults.type = "button";
    restoreDefaults.value = WebInspector.UIString("Restore defaults and reload");
    restoreDefaults.addEventListener("click", restoreAndReload);

    function restoreAndReload() {
        if (window.localStorage)
            window.localStorage.clear();
        WebInspector.reload();
    }
}
WebInspector.GenericSettingsTab.prototype = {
    _updateScriptDisabledCheckbox: function () {
        function executionStatusCallback(error, status) {
            if (error || !status)
                return;
            var forbidden = (status === "forbidden");
            var disabled = forbidden || (status === "disabled");
            this._disableJSInfo.classList.toggle("hidden", !forbidden);
            this._disableJSCheckbox.checked = disabled;
            this._disableJSCheckbox.disabled = forbidden;
        }
        PageAgent.getScriptExecutionStatus(executionStatusCallback.bind(this));
    },
    _javaScriptDisabledChanged: function () {
        PageAgent.setScriptExecutionDisabled(WebInspector.settings.javaScriptDisabled.get(), this._updateScriptDisabledCheckbox.bind(this));
    },
    _skipStackFramesSwitchOrPatternChanged: function () {
        WebInspector.debuggerModel.applySkipStackFrameSettings();
    },
    _appendDrawerNote: function (p) {
        var noteElement = p.createChild("div", "help-field-note");
        noteElement.createTextChild("Hit ");
        noteElement.createChild("span", "help-key").textContent = "Esc";
        noteElement.createTextChild(WebInspector.UIString(" or click the"));
        noteElement.appendChild(new WebInspector.StatusBarButton(WebInspector.UIString("Drawer"), "console-status-bar-item").element);
        noteElement.createTextChild(WebInspector.UIString("toolbar item"));
    },
    __proto__: WebInspector.SettingsTab.prototype
}
WebInspector.WorkspaceSettingsTab = function () {
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Workspace"), "workspace-tab-content");
    WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);
    this._commonSection = this._appendSection(WebInspector.UIString("Common"));
    var folderExcludePatternInput = this._createInputSetting(WebInspector.UIString("Folder exclude pattern"), WebInspector.settings.workspaceFolderExcludePattern, false, 0, "270px", WebInspector.SettingsScreen.regexValidator);
    this._commonSection.appendChild(folderExcludePatternInput);
    this._fileSystemsSection = this._appendSection(WebInspector.UIString("Folders"));
    this._fileSystemsListContainer = this._fileSystemsSection.createChild("p", "settings-list-container");
    this._addFileSystemRowElement = this._fileSystemsSection.createChild("div");
    var addFileSystemButton = this._addFileSystemRowElement.createChild("input", "settings-tab-text-button");
    addFileSystemButton.type = "button";
    addFileSystemButton.value = WebInspector.UIString("Add folder\u2026");
    addFileSystemButton.addEventListener("click", this._addFileSystemClicked.bind(this));
    this._editFileSystemButton = this._addFileSystemRowElement.createChild("input", "settings-tab-text-button");
    this._editFileSystemButton.type = "button";
    this._editFileSystemButton.value = WebInspector.UIString("Edit\u2026");
    this._editFileSystemButton.addEventListener("click", this._editFileSystemClicked.bind(this));
    this._updateEditFileSystemButtonState();
    this._reset();
}
WebInspector.WorkspaceSettingsTab.prototype = {
    wasShown: function () {
        WebInspector.SettingsTab.prototype.wasShown.call(this);
        this._reset();
    },
    _reset: function () {
        this._resetFileSystems();
    },
    _resetFileSystems: function () {
        this._fileSystemsListContainer.removeChildren();
        var fileSystemPaths = WebInspector.isolatedFileSystemManager.mapping().fileSystemPaths();
        delete this._fileSystemsList;
        if (!fileSystemPaths.length) {
            var noFileSystemsMessageElement = this._fileSystemsListContainer.createChild("div", "no-file-systems-message");
            noFileSystemsMessageElement.textContent = WebInspector.UIString("You have no file systems added.");
            return;
        }
        this._fileSystemsList = new WebInspector.SettingsList(["path"], this._renderFileSystem.bind(this));
        this._fileSystemsList.element.classList.add("file-systems-list");
        this._fileSystemsList.addEventListener(WebInspector.SettingsList.Events.Selected, this._fileSystemSelected.bind(this));
        this._fileSystemsList.addEventListener(WebInspector.SettingsList.Events.Removed, this._fileSystemRemovedfromList.bind(this));
        this._fileSystemsList.addEventListener(WebInspector.SettingsList.Events.DoubleClicked, this._fileSystemDoubleClicked.bind(this));
        this._fileSystemsListContainer.appendChild(this._fileSystemsList.element);
        for (var i = 0; i < fileSystemPaths.length; ++i)
            this._fileSystemsList.addItem(fileSystemPaths[i]);
        this._updateEditFileSystemButtonState();
    },
    _updateEditFileSystemButtonState: function () {
        this._editFileSystemButton.disabled = !this._selectedFileSystemPath();
    },
    _fileSystemSelected: function (event) {
        this._updateEditFileSystemButtonState();
    },
    _fileSystemDoubleClicked: function (event) {
        var id = (event.data);
        this._editFileSystem(id);
    },
    _editFileSystemClicked: function (event) {
        this._editFileSystem(this._selectedFileSystemPath());
    },
    _editFileSystem: function (id) {
        WebInspector.EditFileSystemDialog.show(WebInspector.inspectorView.element, id);
    },
    _createRemoveButton: function (handler) {
        var removeButton = document.createElement("button");
        removeButton.classList.add("button");
        removeButton.classList.add("remove-item-button");
        removeButton.value = WebInspector.UIString("Remove");
        if (handler)
            removeButton.addEventListener("click", handler, false);
        else
            removeButton.disabled = true;
        return removeButton;
    },
    _renderFileSystem: function (columnElement, column, id) {
        if (!id)
            return "";
        var fileSystemPath = id;
        var textElement = columnElement.createChild("span", "list-column-text");
        var pathElement = textElement.createChild("span", "file-system-path");
        pathElement.title = fileSystemPath;
        const maxTotalPathLength = 55;
        const maxFolderNameLength = 30;
        var lastIndexOfSlash = fileSystemPath.lastIndexOf(WebInspector.isWin() ? "\\" : "/");
        var folderName = fileSystemPath.substr(lastIndexOfSlash + 1);
        var folderPath = fileSystemPath.substr(0, lastIndexOfSlash + 1);
        folderPath = folderPath.trimMiddle(maxTotalPathLength - Math.min(maxFolderNameLength, folderName.length));
        folderName = folderName.trimMiddle(maxFolderNameLength);
        var folderPathElement = pathElement.createChild("span");
        folderPathElement.textContent = folderPath;
        var nameElement = pathElement.createChild("span", "file-system-path-name");
        nameElement.textContent = folderName;
    },
    _fileSystemRemovedfromList: function (event) {
        var id = (event.data);
        if (!id)
            return;
        WebInspector.isolatedFileSystemManager.removeFileSystem(id);
    },
    _addFileSystemClicked: function () {
        WebInspector.isolatedFileSystemManager.addFileSystem();
    },
    _fileSystemAdded: function (event) {
        var fileSystem = (event.data);
        if (!this._fileSystemsList)
            this._reset();
        else
            this._fileSystemsList.addItem(fileSystem.path());
    },
    _fileSystemRemoved: function (event) {
        var fileSystem = (event.data);
        var selectedFileSystemPath = this._selectedFileSystemPath();
        if (this._fileSystemsList.itemForId(fileSystem.path()))
            this._fileSystemsList.removeItem(fileSystem.path());
        if (!this._fileSystemsList.itemIds().length)
            this._reset();
        this._updateEditFileSystemButtonState();
    },
    _selectedFileSystemPath: function () {
        return this._fileSystemsList ? this._fileSystemsList.selectedId() : null;
    },
    __proto__: WebInspector.SettingsTab.prototype
}
WebInspector.ExperimentsSettingsTab = function () {
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Experiments"), "experiments-tab-content");
    var experiments = WebInspector.experimentsSettings.experiments;
    if (experiments.length) {
        var experimentsSection = this._appendSection();
        experimentsSection.appendChild(this._createExperimentsWarningSubsection());
        for (var i = 0; i < experiments.length; ++i)
            experimentsSection.appendChild(this._createExperimentCheckbox(experiments[i]));
    }
}
WebInspector.ExperimentsSettingsTab.prototype = {
    _createExperimentsWarningSubsection: function () {
        var subsection = document.createElement("div");
        var warning = subsection.createChild("span", "settings-experiments-warning-subsection-warning");
        warning.textContent = WebInspector.UIString("WARNING:");
        subsection.appendChild(document.createTextNode(" "));
        var message = subsection.createChild("span", "settings-experiments-warning-subsection-message");
        message.textContent = WebInspector.UIString("These experiments could be dangerous and may require restart.");
        return subsection;
    },
    _createExperimentCheckbox: function (experiment) {
        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = experiment.name;
        input.checked = experiment.isEnabled();

        function listener() {
            experiment.setEnabled(input.checked);
        }
        input.addEventListener("click", listener, false);
        var p = document.createElement("p");
        var label = document.createElement("label");
        label.appendChild(input);
        label.appendChild(document.createTextNode(WebInspector.UIString(experiment.title)));
        p.appendChild(label);
        return p;
    },
    __proto__: WebInspector.SettingsTab.prototype
}
WebInspector.SettingsController = function () {
    this._statusBarButton = new WebInspector.StatusBarButton(WebInspector.UIString("Settings"), "settings-status-bar-item");
    this._statusBarButton.element.addEventListener("mouseup", this._mouseUp.bind(this), false);
    this._settingsScreen;
}
WebInspector.SettingsController.prototype = {
    get statusBarItem() {
        return this._statusBarButton.element;
    }, _mouseUp: function () {
        this.showSettingsScreen();
    }, _onHideSettingsScreen: function () {
        delete this._settingsScreenVisible;
    }, showSettingsScreen: function (tabId) {
        if (!this._settingsScreen)
            this._settingsScreen = new WebInspector.SettingsScreen(this._onHideSettingsScreen.bind(this));
        if (tabId)
            this._settingsScreen.selectTab(tabId);
        this._settingsScreen.showModal();
        this._settingsScreenVisible = true;
    }, resize: function () {
        if (this._settingsScreen && this._settingsScreen.isShowing())
            this._settingsScreen.doResize();
    }
}
WebInspector.SettingsController.SettingsScreenActionDelegate = function () {}
WebInspector.SettingsController.SettingsScreenActionDelegate.prototype = {
    handleAction: function () {
        WebInspector.settingsController.showSettingsScreen(WebInspector.SettingsScreen.Tabs.General);
        return true;
    }
}
WebInspector.SettingsList = function (columns, itemRenderer) {
    this.element = document.createElement("div");
    this.element.classList.add("settings-list");
    this.element.tabIndex = -1;
    this._itemRenderer = itemRenderer;
    this._listItems = {};
    this._ids = [];
    this._columns = columns;
}
WebInspector.SettingsList.Events = {
    Selected: "Selected",
    Removed: "Removed",
    DoubleClicked: "DoubleClicked",
}
WebInspector.SettingsList.prototype = {
    addItem: function (itemId, beforeId) {
        var listItem = document.createElement("div");
        listItem._id = itemId;
        listItem.classList.add("settings-list-item");
        if (typeof beforeId !== undefined)
            this.element.insertBefore(listItem, this._listItems[beforeId]);
        else
            this.element.appendChild(listItem);
        var listItemContents = listItem.createChild("div", "settings-list-item-contents");
        var listItemColumnsElement = listItemContents.createChild("div", "settings-list-item-columns");
        listItem.columnElements = {};
        for (var i = 0; i < this._columns.length; ++i) {
            var columnElement = listItemColumnsElement.createChild("div", "list-column");
            var columnId = this._columns[i];
            listItem.columnElements[columnId] = columnElement;
            this._itemRenderer(columnElement, columnId, itemId);
        }
        var removeItemButton = this._createRemoveButton(removeItemClicked.bind(this));
        listItemContents.addEventListener("click", this.selectItem.bind(this, itemId), false);
        listItemContents.addEventListener("dblclick", this._onDoubleClick.bind(this, itemId), false);
        listItemContents.appendChild(removeItemButton);
        this._listItems[itemId] = listItem;
        if (typeof beforeId !== undefined)
            this._ids.splice(this._ids.indexOf(beforeId), 0, itemId);
        else
            this._ids.push(itemId);

        function removeItemClicked(event) {
            removeItemButton.disabled = true;
            this.removeItem(itemId);
            this.dispatchEventToListeners(WebInspector.SettingsList.Events.Removed, itemId);
            event.consume();
        }
        return listItem;
    },
    removeItem: function (id) {
        this._listItems[id].remove();
        delete this._listItems[id];
        this._ids.remove(id);
        if (id === this._selectedId) {
            delete this._selectedId;
            if (this._ids.length)
                this.selectItem(this._ids[0]);
        }
    },
    itemIds: function () {
        return this._ids.slice();
    },
    columns: function () {
        return this._columns.slice();
    },
    selectedId: function () {
        return this._selectedId;
    },
    selectedItem: function () {
        return this._selectedId ? this._listItems[this._selectedId] : null;
    },
    itemForId: function (itemId) {
        return this._listItems[itemId];
    },
    _onDoubleClick: function (id, event) {
        this.dispatchEventToListeners(WebInspector.SettingsList.Events.DoubleClicked, id);
    },
    selectItem: function (id, event) {
        if (typeof this._selectedId !== "undefined") {
            this._listItems[this._selectedId].classList.remove("selected");
        }
        this._selectedId = id;
        if (typeof this._selectedId !== "undefined") {
            this._listItems[this._selectedId].classList.add("selected");
        }
        this.dispatchEventToListeners(WebInspector.SettingsList.Events.Selected, id);
        if (event)
            event.consume();
    },
    _createRemoveButton: function (handler) {
        var removeButton = document.createElement("button");
        removeButton.classList.add("remove-item-button");
        removeButton.value = WebInspector.UIString("Remove");
        removeButton.addEventListener("click", handler, false);
        return removeButton;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.EditableSettingsList = function (columns, valuesProvider, validateHandler, editHandler) {
    WebInspector.SettingsList.call(this, columns, this._renderColumn.bind(this));
    this._validateHandler = validateHandler;
    this._editHandler = editHandler;
    this._valuesProvider = valuesProvider;
    this._addInputElements = {};
    this._editInputElements = {};
    this._textElements = {};
    this._addMappingItem = this.addItem(null);
    this._addMappingItem.classList.add("item-editing");
    this._addMappingItem.classList.add("add-list-item");
}
WebInspector.EditableSettingsList.prototype = {
    addItem: function (itemId, beforeId) {
        var listItem = WebInspector.SettingsList.prototype.addItem.call(this, itemId, beforeId);
        listItem.classList.add("editable");
        return listItem;
    },
    _renderColumn: function (columnElement, columnId, itemId) {
        columnElement.classList.add("settings-list-column-" + columnId);
        var placeholder = (columnId === "url") ? WebInspector.UIString("URL prefix") : WebInspector.UIString("Folder path");
        if (itemId === null) {
            var inputElement = columnElement.createChild("input", "list-column-editor");
            inputElement.placeholder = placeholder;
            inputElement.addEventListener("blur", this._onAddMappingInputBlur.bind(this));
            inputElement.addEventListener("input", this._validateEdit.bind(this, itemId));
            this._addInputElements[columnId] = inputElement;
            return;
        }
        var validItemId = itemId;
        if (!this._editInputElements[itemId])
            this._editInputElements[itemId] = {};
        if (!this._textElements[itemId])
            this._textElements[itemId] = {};
        var value = this._valuesProvider(itemId, columnId);
        var textElement = columnElement.createChild("span", "list-column-text");
        textElement.textContent = value;
        textElement.title = value;
        columnElement.addEventListener("click", rowClicked.bind(this), false);
        this._textElements[itemId][columnId] = textElement;
        var inputElement = columnElement.createChild("input", "list-column-editor");
        inputElement.value = value;
        inputElement.addEventListener("blur", this._editMappingBlur.bind(this, itemId));
        inputElement.addEventListener("input", this._validateEdit.bind(this, itemId));
        columnElement.inputElement = inputElement;
        this._editInputElements[itemId][columnId] = inputElement;

        function rowClicked(event) {
            if (itemId === this._editingId)
                return;
            event.consume();
            console.assert(!this._editingId);
            this._editingId = validItemId;
            var listItem = this.itemForId(validItemId);
            listItem.classList.add("item-editing");
            var inputElement = event.target.inputElement || this._editInputElements[validItemId][this.columns()[0]];
            inputElement.focus();
            inputElement.select();
        }
    },
    _data: function (itemId) {
        var inputElements = this._inputElements(itemId);
        var data = {};
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i)
            data[columns[i]] = inputElements[columns[i]].value;
        return data;
    },
    _inputElements: function (itemId) {
        if (!itemId)
            return this._addInputElements;
        return this._editInputElements[itemId] || null;
    },
    _validateEdit: function (itemId) {
        var errorColumns = this._validateHandler(itemId, this._data(itemId));
        var hasChanges = this._hasChanges(itemId);
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i) {
            var columnId = columns[i];
            var inputElement = this._inputElements(itemId)[columnId];
            if (hasChanges && errorColumns.indexOf(columnId) !== -1)
                inputElement.classList.add("editable-item-error");
            else
                inputElement.classList.remove("editable-item-error");
        }
        return !errorColumns.length;
    },
    _hasChanges: function (itemId) {
        var hasChanges = false;
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i) {
            var columnId = columns[i];
            var oldValue = itemId ? this._textElements[itemId][columnId].textContent : "";
            var newValue = this._inputElements(itemId)[columnId].value;
            if (oldValue !== newValue) {
                hasChanges = true;
                break;
            }
        }
        return hasChanges;
    },
    _editMappingBlur: function (itemId, event) {
        var inputElements = Object.values(this._editInputElements[itemId]);
        if (inputElements.indexOf(event.relatedTarget) !== -1)
            return;
        var listItem = this.itemForId(itemId);
        listItem.classList.remove("item-editing");
        delete this._editingId;
        if (!this._hasChanges(itemId))
            return;
        if (!this._validateEdit(itemId)) {
            var columns = this.columns();
            for (var i = 0; i < columns.length; ++i) {
                var columnId = columns[i];
                var inputElement = this._editInputElements[itemId][columnId];
                inputElement.value = this._textElements[itemId][columnId].textContent;
                inputElement.classList.remove("editable-item-error");
            }
            return;
        }
        this._editHandler(itemId, this._data(itemId));
    },
    _onAddMappingInputBlur: function (event) {
        var inputElements = Object.values(this._addInputElements);
        if (inputElements.indexOf(event.relatedTarget) !== -1)
            return;
        if (!this._hasChanges(null))
            return;
        if (!this._validateEdit(null))
            return;
        this._editHandler(null, this._data(null));
        var columns = this.columns();
        for (var i = 0; i < columns.length; ++i) {
            var columnId = columns[i];
            var inputElement = this._addInputElements[columnId];
            inputElement.value = "";
        }
    },
    __proto__: WebInspector.SettingsList.prototype
}
WebInspector.settingsController;
WebInspector.EditFileSystemDialog = function (fileSystemPath) {
    WebInspector.DialogDelegate.call(this);
    this._fileSystemPath = fileSystemPath;
    this.element = document.createElement("div");
    this.element.className = "edit-file-system-dialog";
    var header = this.element.createChild("div", "header");
    var headerText = header.createChild("span");
    headerText.textContent = WebInspector.UIString("Edit file system");
    var closeButton = header.createChild("div", "close-button-gray done-button");
    closeButton.addEventListener("click", this._onDoneClick.bind(this), false);
    var contents = this.element.createChild("div", "contents");
    WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.FileMappingAdded, this._fileMappingAdded, this);
    WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.FileMappingRemoved, this._fileMappingRemoved, this);
    WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.ExcludedFolderAdded, this._excludedFolderAdded, this);
    WebInspector.isolatedFileSystemManager.mapping().addEventListener(WebInspector.FileSystemMapping.Events.ExcludedFolderRemoved, this._excludedFolderRemoved, this);
    var blockHeader = contents.createChild("div", "block-header");
    blockHeader.textContent = WebInspector.UIString("Mappings");
    this._fileMappingsSection = contents.createChild("div", "section file-mappings-section");
    this._fileMappingsListContainer = this._fileMappingsSection.createChild("div", "settings-list-container");
    var entries = WebInspector.isolatedFileSystemManager.mapping().mappingEntries(this._fileSystemPath);
    this._fileMappingsList = new WebInspector.EditableSettingsList(["url", "path"], this._fileMappingValuesProvider.bind(this), this._fileMappingValidate.bind(this), this._fileMappingEdit.bind(this));
    this._fileMappingsList.addEventListener(WebInspector.SettingsList.Events.Removed, this._fileMappingRemovedfromList.bind(this));
    this._fileMappingsList.element.classList.add("file-mappings-list");
    this._fileMappingsListContainer.appendChild(this._fileMappingsList.element);
    this._entries = {};
    for (var i = 0; i < entries.length; ++i)
        this._addMappingRow(entries[i]);
    blockHeader = contents.createChild("div", "block-header");
    blockHeader.textContent = WebInspector.UIString("Excluded folders");
    this._excludedFolderListSection = contents.createChild("div", "section excluded-folders-section");
    this._excludedFolderListContainer = this._excludedFolderListSection.createChild("div", "settings-list-container");
    var excludedFolderEntries = WebInspector.isolatedFileSystemManager.mapping().excludedFolders(fileSystemPath);
    this._excludedFolderList = new WebInspector.EditableSettingsList(["path"], this._excludedFolderValueProvider.bind(this), this._excludedFolderValidate.bind(this), this._excludedFolderEdit.bind(this));
    this._excludedFolderList.addEventListener(WebInspector.SettingsList.Events.Removed, this._excludedFolderRemovedfromList.bind(this));
    this._excludedFolderList.element.classList.add("excluded-folders-list");
    this._excludedFolderListContainer.appendChild(this._excludedFolderList.element);
    this._excludedFolderEntries = new StringMap();
    for (var i = 0; i < excludedFolderEntries.length; ++i)
        this._addExcludedFolderRow(excludedFolderEntries[i]);
    this.element.tabIndex = 0;
}
WebInspector.EditFileSystemDialog.show = function (element, fileSystemPath) {
    WebInspector.Dialog.show(element, new WebInspector.EditFileSystemDialog(fileSystemPath));
    var glassPane = document.getElementById("glass-pane");
    glassPane.classList.add("settings-glass-pane");
}
WebInspector.EditFileSystemDialog.prototype = {
    show: function (element) {
        element.appendChild(this.element);
        this.element.classList.add("dialog-contents");
        element.classList.add("settings-dialog");
        element.classList.add("settings-tab");
        this._dialogElement = element;
    },
    _resize: function () {
        if (!this._dialogElement || !this._relativeToElement)
            return;
        const minWidth = 200;
        const minHeight = 150;
        var maxHeight = this._relativeToElement.offsetHeight - 10;
        maxHeight = Math.max(minHeight, maxHeight);
        var maxWidth = Math.min(540, this._relativeToElement.offsetWidth - 10);
        maxWidth = Math.max(minWidth, maxWidth);
        this._dialogElement.style.maxHeight = maxHeight + "px";
        this._dialogElement.style.width = maxWidth + "px";
        WebInspector.DialogDelegate.prototype.position(this._dialogElement, this._relativeToElement);
    },
    position: function (element, relativeToElement) {
        this._relativeToElement = relativeToElement;
        this._resize();
    },
    willHide: function (event) {},
    _fileMappingAdded: function (event) {
        var entry = (event.data);
        this._addMappingRow(entry);
    },
    _fileMappingRemoved: function (event) {
        var entry = (event.data);
        if (this._fileSystemPath !== entry.fileSystemPath)
            return;
        delete this._entries[entry.urlPrefix];
        if (this._fileMappingsList.itemForId(entry.urlPrefix))
            this._fileMappingsList.removeItem(entry.urlPrefix);
        this._resize();
    },
    _fileMappingValuesProvider: function (itemId, columnId) {
        if (!itemId)
            return "";
        var entry = this._entries[itemId];
        switch (columnId) {
        case "url":
            return entry.urlPrefix;
        case "path":
            return entry.pathPrefix;
        default:
            console.assert("Should not be reached.");
        }
        return "";
    },
    _fileMappingValidate: function (itemId, data) {
        var oldPathPrefix = itemId ? this._entries[itemId].pathPrefix : null;
        return this._validateMapping(data["url"], itemId, data["path"], oldPathPrefix);
    },
    _fileMappingEdit: function (itemId, data) {
        if (itemId) {
            var urlPrefix = itemId;
            var pathPrefix = this._entries[itemId].pathPrefix;
            var fileSystemPath = this._entries[itemId].fileSystemPath;
            WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(fileSystemPath, urlPrefix, pathPrefix);
        }
        this._addFileMapping(data["url"], data["path"]);
    },
    _validateMapping: function (urlPrefix, allowedURLPrefix, path, allowedPathPrefix) {
        var columns = [];
        if (!this._checkURLPrefix(urlPrefix, allowedURLPrefix))
            columns.push("url");
        if (!this._checkPathPrefix(path, allowedPathPrefix))
            columns.push("path");
        return columns;
    },
    _fileMappingRemovedfromList: function (event) {
        var urlPrefix = (event.data);
        if (!urlPrefix)
            return;
        var entry = this._entries[urlPrefix];
        WebInspector.isolatedFileSystemManager.mapping().removeFileMapping(entry.fileSystemPath, entry.urlPrefix, entry.pathPrefix);
    },
    _addFileMapping: function (urlPrefix, pathPrefix) {
        var normalizedURLPrefix = this._normalizePrefix(urlPrefix);
        var normalizedPathPrefix = this._normalizePrefix(pathPrefix);
        WebInspector.isolatedFileSystemManager.mapping().addFileMapping(this._fileSystemPath, normalizedURLPrefix, normalizedPathPrefix);
        this._fileMappingsList.selectItem(normalizedURLPrefix);
        return true;
    },
    _normalizePrefix: function (prefix) {
        if (!prefix)
            return "";
        return prefix + (prefix[prefix.length - 1] === "/" ? "" : "/");
    },
    _addMappingRow: function (entry) {
        var fileSystemPath = entry.fileSystemPath;
        var urlPrefix = entry.urlPrefix;
        if (!this._fileSystemPath || this._fileSystemPath !== fileSystemPath)
            return;
        this._entries[urlPrefix] = entry;
        var fileMappingListItem = this._fileMappingsList.addItem(urlPrefix, null);
        this._resize();
    },
    _excludedFolderAdded: function (event) {
        var entry = (event.data);
        this._addExcludedFolderRow(entry);
    },
    _excludedFolderRemoved: function (event) {
        var entry = (event.data);
        var fileSystemPath = entry.fileSystemPath;
        if (!fileSystemPath || this._fileSystemPath !== fileSystemPath)
            return;
        delete this._excludedFolderEntries[entry.path];
        if (this._excludedFolderList.itemForId(entry.path))
            this._excludedFolderList.removeItem(entry.path);
    },
    _excludedFolderValueProvider: function (itemId, columnId) {
        return itemId;
    },
    _excludedFolderValidate: function (itemId, data) {
        var fileSystemPath = this._fileSystemPath;
        var columns = [];
        if (!this._validateExcludedFolder(data["path"], itemId))
            columns.push("path");
        return columns;
    },
    _validateExcludedFolder: function (path, allowedPath) {
        return !!path && (path === allowedPath || !this._excludedFolderEntries.contains(path));
    },
    _excludedFolderEdit: function (itemId, data) {
        var fileSystemPath = this._fileSystemPath;
        if (itemId)
            WebInspector.isolatedFileSystemManager.mapping().removeExcludedFolder(fileSystemPath, itemId);
        var excludedFolderPath = data["path"];
        WebInspector.isolatedFileSystemManager.mapping().addExcludedFolder(fileSystemPath, excludedFolderPath);
    },
    _excludedFolderRemovedfromList: function (event) {
        var itemId = (event.data);
        if (!itemId)
            return;
        WebInspector.isolatedFileSystemManager.mapping().removeExcludedFolder(this._fileSystemPath, itemId);
    },
    _addExcludedFolderRow: function (entry) {
        var fileSystemPath = entry.fileSystemPath;
        if (!fileSystemPath || this._fileSystemPath !== fileSystemPath)
            return;
        var path = entry.path;
        this._excludedFolderEntries.put(path, entry);
        this._excludedFolderList.addItem(path, null);
        this._resize();
    },
    _checkURLPrefix: function (value, allowedPrefix) {
        var prefix = this._normalizePrefix(value);
        return !!prefix && (prefix === allowedPrefix || !this._entries[prefix]);
    },
    _checkPathPrefix: function (value, allowedPrefix) {
        var prefix = this._normalizePrefix(value);
        if (!prefix)
            return false;
        if (prefix === allowedPrefix)
            return true;
        for (var urlPrefix in this._entries) {
            var entry = this._entries[urlPrefix];
            if (urlPrefix && entry.pathPrefix === prefix)
                return false;
        }
        return true;
    },
    focus: function () {
        WebInspector.setCurrentFocusElement(this.element);
    },
    _onDoneClick: function () {
        WebInspector.Dialog.hide();
    },
    onEnter: function () {},
    __proto__: WebInspector.DialogDelegate.prototype
}
WebInspector.ShortcutsScreen = function () {
    this._sections = {};
}
WebInspector.ShortcutsScreen.prototype = {
    section: function (name) {
        var section = this._sections[name];
        if (!section)
            this._sections[name] = section = new WebInspector.ShortcutsSection(name);
        return section;
    },
    createShortcutsTabView: function () {
        var orderedSections = [];
        for (var section in this._sections)
            orderedSections.push(this._sections[section]);

        function compareSections(a, b) {
            return a.order - b.order;
        }
        orderedSections.sort(compareSections);
        var view = new WebInspector.View();
        view.element.className = "settings-tab-container";
        view.element.createChild("header").createChild("h3").appendChild(document.createTextNode(WebInspector.UIString("Shortcuts")));
        var scrollPane = view.element.createChild("div", "help-container-wrapper");
        var container = scrollPane.createChild("div");
        container.className = "help-content help-container";
        for (var i = 0; i < orderedSections.length; ++i)
            orderedSections[i].renderSection(container);
        var note = scrollPane.createChild("p", "help-footnote");
        var noteLink = note.createChild("a");
        noteLink.href = "https://developers.google.com/chrome-developer-tools/docs/shortcuts";
        noteLink.target = "_blank";
        noteLink.createTextChild(WebInspector.UIString("Full list of keyboard shortcuts and gestures"));
        return view;
    }
}
WebInspector.shortcutsScreen;
WebInspector.ShortcutsSection = function (name) {
    this.name = name;
    this._lines = ([]);
    this.order = ++WebInspector.ShortcutsSection._sequenceNumber;
};
WebInspector.ShortcutsSection._sequenceNumber = 0;
WebInspector.ShortcutsSection.prototype = {
    addKey: function (key, description) {
        this._addLine(this._renderKey(key), description);
    },
    addRelatedKeys: function (keys, description) {
        this._addLine(this._renderSequence(keys, "/"), description);
    },
    addAlternateKeys: function (keys, description) {
        this._addLine(this._renderSequence(keys, WebInspector.UIString("or")), description);
    },
    _addLine: function (keyElement, description) {
        this._lines.push({
            key: keyElement,
            text: description
        })
    },
    renderSection: function (container) {
        var parent = container.createChild("div", "help-block");
        var headLine = parent.createChild("div", "help-line");
        headLine.createChild("div", "help-key-cell");
        headLine.createChild("div", "help-section-title help-cell").textContent = this.name;
        for (var i = 0; i < this._lines.length; ++i) {
            var line = parent.createChild("div", "help-line");
            var keyCell = line.createChild("div", "help-key-cell");
            keyCell.appendChild(this._lines[i].key);
            keyCell.appendChild(this._createSpan("help-key-delimiter", ":"));
            line.createChild("div", "help-cell").textContent = this._lines[i].text;
        }
    },
    _renderSequence: function (sequence, delimiter) {
        var delimiterSpan = this._createSpan("help-key-delimiter", delimiter);
        return this._joinNodes(sequence.map(this._renderKey.bind(this)), delimiterSpan);
    },
    _renderKey: function (key) {
        var keyName = key.name;
        var plus = this._createSpan("help-combine-keys", "+");
        return this._joinNodes(keyName.split(" + ").map(this._createSpan.bind(this, "help-key")), plus);
    },
    _createSpan: function (className, textContent) {
        var node = document.createElement("span");
        node.className = className;
        node.textContent = textContent;
        return node;
    },
    _joinNodes: function (nodes, delimiter) {
        var result = document.createDocumentFragment();
        for (var i = 0; i < nodes.length; ++i) {
            if (i > 0)
                result.appendChild(delimiter.cloneNode(true));
            result.appendChild(nodes[i]);
        }
        return result;
    }
}
WebInspector.ShortcutsScreen.registerShortcuts = function () {
    var elementsSection = WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));
    var navigate = WebInspector.ShortcutsScreen.ElementsPanelShortcuts.NavigateUp.concat(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.NavigateDown);
    elementsSection.addRelatedKeys(navigate, WebInspector.UIString("Navigate elements"));
    var expandCollapse = WebInspector.ShortcutsScreen.ElementsPanelShortcuts.Expand.concat(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.Collapse);
    elementsSection.addRelatedKeys(expandCollapse, WebInspector.UIString("Expand/collapse"));
    elementsSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.EditAttribute, WebInspector.UIString("Edit attribute"));
    elementsSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.HideElement, WebInspector.UIString("Hide element"));
    elementsSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.ToggleEditAsHTML, WebInspector.UIString("Toggle edit as HTML"));
    var stylesPaneSection = WebInspector.shortcutsScreen.section(WebInspector.UIString("Styles Pane"));
    var nextPreviousProperty = WebInspector.ShortcutsScreen.ElementsPanelShortcuts.NextProperty.concat(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.PreviousProperty);
    stylesPaneSection.addRelatedKeys(nextPreviousProperty, WebInspector.UIString("Next/previous property"));
    stylesPaneSection.addRelatedKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.IncrementValue, WebInspector.UIString("Increment value"));
    stylesPaneSection.addRelatedKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.DecrementValue, WebInspector.UIString("Decrement value"));
    stylesPaneSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.IncrementBy10, WebInspector.UIString("Increment by %f", 10));
    stylesPaneSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.DecrementBy10, WebInspector.UIString("Decrement by %f", 10));
    stylesPaneSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.IncrementBy100, WebInspector.UIString("Increment by %f", 100));
    stylesPaneSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.DecrementBy100, WebInspector.UIString("Decrement by %f", 100));
    stylesPaneSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.IncrementBy01, WebInspector.UIString("Increment by %f", 0.1));
    stylesPaneSection.addAlternateKeys(WebInspector.ShortcutsScreen.ElementsPanelShortcuts.DecrementBy01, WebInspector.UIString("Decrement by %f", 0.1));
    var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("Sources Panel"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PauseContinue, WebInspector.UIString("Pause/Continue"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepOver, WebInspector.UIString("Step over"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepInto, WebInspector.UIString("Step into"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.StepOut, WebInspector.UIString("Step out"));
    var nextAndPrevFrameKeys = WebInspector.ShortcutsScreen.SourcesPanelShortcuts.NextCallFrame.concat(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.PrevCallFrame);
    section.addRelatedKeys(nextAndPrevFrameKeys, WebInspector.UIString("Next/previous call frame"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.EvaluateSelectionInConsole, WebInspector.UIString("Evaluate selection in console"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.AddSelectionToWatch, WebInspector.UIString("Add selection to watch"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToMember, WebInspector.UIString("Go to member"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToLine, WebInspector.UIString("Go to line"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint, WebInspector.UIString("Toggle breakpoint"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.ToggleComment, WebInspector.UIString("Toggle comment"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab, WebInspector.UIString("Close editor tab"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.IncreaseCSSUnitByOne, WebInspector.UIString("Increment CSS unit by 1"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.DecreaseCSSUnitByOne, WebInspector.UIString("Decrement CSS unit by 1"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.IncreaseCSSUnitByTen, WebInspector.UIString("Increment CSS unit by 10"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.DecreaseCSSUnitByTen, WebInspector.UIString("Decrement CSS unit by 10"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation, WebInspector.UIString("Jump to previous editing location"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation, WebInspector.UIString("Jump to next editing location"));
    section = WebInspector.shortcutsScreen.section(WebInspector.UIString("Timeline Panel"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.StartStopRecording, WebInspector.UIString("Start/stop recording"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.SaveToFile, WebInspector.UIString("Save timeline data"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.LoadFromFile, WebInspector.UIString("Load timeline data"));
    section = WebInspector.shortcutsScreen.section(WebInspector.UIString("Profiles Panel"));
    section.addAlternateKeys(WebInspector.ShortcutsScreen.ProfilesPanelShortcuts.StartStopRecording, WebInspector.UIString("Start/stop recording"));
}
WebInspector.ShortcutsScreen.ElementsPanelShortcuts = {
    NavigateUp: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Up)],
    NavigateDown: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Down)],
    Expand: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Right)],
    Collapse: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Left)],
    EditAttribute: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Enter)],
    HideElement: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.H)],
    ToggleEditAsHTML: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F2)],
    NextProperty: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Tab)],
    PreviousProperty: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Tab, WebInspector.KeyboardShortcut.Modifiers.Shift)],
    IncrementValue: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Up)],
    DecrementValue: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Down)],
    IncrementBy10: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageUp), WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Up, WebInspector.KeyboardShortcut.Modifiers.Shift)],
    DecrementBy10: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageDown), WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Down, WebInspector.KeyboardShortcut.Modifiers.Shift)],
    IncrementBy100: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageUp, WebInspector.KeyboardShortcut.Modifiers.Shift)],
    DecrementBy100: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageDown, WebInspector.KeyboardShortcut.Modifiers.Shift)],
    IncrementBy01: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageUp, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    DecrementBy01: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageDown, WebInspector.KeyboardShortcut.Modifiers.Alt)]
};
WebInspector.ShortcutsScreen.SourcesPanelShortcuts = {
    IncreaseCSSUnitByOne: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Up, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    DecreaseCSSUnitByOne: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Down, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    IncreaseCSSUnitByTen: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageUp, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    DecreaseCSSUnitByTen: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.PageDown, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    RunSnippet: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Enter, WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    PauseContinue: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F8), WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Backslash, WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    StepOver: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F10), WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.SingleQuote, WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    StepInto: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F11), WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Semicolon, WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    StepOut: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F11, WebInspector.KeyboardShortcut.Modifiers.Shift), WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Semicolon, WebInspector.KeyboardShortcut.Modifiers.Shift | WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    EvaluateSelectionInConsole: [WebInspector.KeyboardShortcut.makeDescriptor("e", WebInspector.KeyboardShortcut.Modifiers.Shift | WebInspector.KeyboardShortcut.Modifiers.Ctrl)],
    AddSelectionToWatch: [WebInspector.KeyboardShortcut.makeDescriptor("a", WebInspector.KeyboardShortcut.Modifiers.Shift | WebInspector.KeyboardShortcut.Modifiers.Ctrl)],
    GoToMember: [WebInspector.KeyboardShortcut.makeDescriptor("o", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta | WebInspector.KeyboardShortcut.Modifiers.Shift)],
    GoToLine: [WebInspector.KeyboardShortcut.makeDescriptor("g", WebInspector.KeyboardShortcut.Modifiers.Ctrl)],
    ToggleBreakpoint: [WebInspector.KeyboardShortcut.makeDescriptor("b", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    NextCallFrame: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Period, WebInspector.KeyboardShortcut.Modifiers.Ctrl)],
    PrevCallFrame: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Comma, WebInspector.KeyboardShortcut.Modifiers.Ctrl)],
    ToggleComment: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Slash, WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    JumpToPreviousLocation: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Minus, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    JumpToNextLocation: [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Plus, WebInspector.KeyboardShortcut.Modifiers.Alt)],
    CloseEditorTab: [WebInspector.KeyboardShortcut.makeDescriptor("w", WebInspector.KeyboardShortcut.Modifiers.Alt)],
    Save: [WebInspector.KeyboardShortcut.makeDescriptor("s", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
};
WebInspector.ShortcutsScreen.TimelinePanelShortcuts = {
    StartStopRecording: [WebInspector.KeyboardShortcut.makeDescriptor("e", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    SaveToFile: [WebInspector.KeyboardShortcut.makeDescriptor("s", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)],
    LoadFromFile: [WebInspector.KeyboardShortcut.makeDescriptor("o", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)]
};
WebInspector.ShortcutsScreen.ProfilesPanelShortcuts = {
    StartStopRecording: [WebInspector.KeyboardShortcut.makeDescriptor("e", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)]
}
WebInspector.HAREntry = function (request) {
    this._request = request;
}
WebInspector.HAREntry.prototype = {
    build: function () {
        var entry = {
            startedDateTime: new Date(this._request.startTime * 1000),
            time: this._request.timing ? WebInspector.HAREntry._toMilliseconds(this._request.duration) : 0,
            request: this._buildRequest(),
            response: this._buildResponse(),
            cache: {},
            timings: this._buildTimings()
        };
        if (this._request.connectionId)
            entry.connection = String(this._request.connectionId);
        var page = WebInspector.networkLog.pageLoadForRequest(this._request);
        if (page)
            entry.pageref = "page_" + page.id;
        return entry;
    },
    _buildRequest: function () {
        var headersText = this._request.requestHeadersText();
        var res = {
            method: this._request.requestMethod,
            url: this._buildRequestURL(this._request.url),
            httpVersion: this._request.requestHttpVersion(),
            headers: this._request.requestHeaders(),
            queryString: this._buildParameters(this._request.queryParameters || []),
            cookies: this._buildCookies(this._request.requestCookies || []),
            headersSize: headersText ? headersText.length : -1,
            bodySize: this.requestBodySize
        };
        if (this._request.requestFormData)
            res.postData = this._buildPostData();
        return res;
    },
    _buildResponse: function () {
        var headersText = this._request.responseHeadersText;
        return {
            status: this._request.statusCode,
            statusText: this._request.statusText,
            httpVersion: this._request.responseHttpVersion,
            headers: this._request.responseHeaders,
            cookies: this._buildCookies(this._request.responseCookies || []),
            content: this._buildContent(),
            redirectURL: this._request.responseHeaderValue("Location") || "",
            headersSize: headersText ? headersText.length : -1,
            bodySize: this.responseBodySize,
            _error: this._request.localizedFailDescription
        };
    },
    _buildContent: function () {
        var content = {
            size: this._request.resourceSize,
            mimeType: this._request.mimeType || "x-unknown",
        };
        var compression = this.responseCompression;
        if (typeof compression === "number")
            content.compression = compression;
        return content;
    },
    _buildTimings: function () {
        var timing = this._request.timing;
        if (!timing)
            return {
                blocked: -1,
                dns: -1,
                connect: -1,
                send: 0,
                wait: 0,
                receive: 0,
                ssl: -1
            };

        function firstNonNegative(values) {
            for (var i = 0; i < values.length; ++i) {
                if (values[i] >= 0)
                    return values[i];
            }
            console.assert(false, "Incomplete requet timing information.");
        }
        var blocked = firstNonNegative([timing.dnsStart, timing.connectStart, timing.sendStart]);
        var dns = -1;
        if (timing.dnsStart >= 0)
            dns = firstNonNegative([timing.connectStart, timing.sendStart]) - timing.dnsStart;
        var connect = -1;
        if (timing.connectStart >= 0)
            connect = timing.sendStart - timing.connectStart;
        var send = timing.sendEnd - timing.sendStart;
        var wait = timing.receiveHeadersEnd - timing.sendEnd;
        var receive = WebInspector.HAREntry._toMilliseconds(this._request.duration) - timing.receiveHeadersEnd;
        var ssl = -1;
        if (timing.sslStart >= 0 && timing.sslEnd >= 0)
            ssl = timing.sslEnd - timing.sslStart;
        return {
            blocked: blocked,
            dns: dns,
            connect: connect,
            send: send,
            wait: wait,
            receive: receive,
            ssl: ssl
        };
    },
    _buildPostData: function () {
        var res = {
            mimeType: this._request.requestContentType(),
            text: this._request.requestFormData
        };
        if (this._request.formParameters)
            res.params = this._buildParameters(this._request.formParameters);
        return res;
    },
    _buildParameters: function (parameters) {
        return parameters.slice();
    },
    _buildRequestURL: function (url) {
        return url.split("#", 2)[0];
    },
    _buildCookies: function (cookies) {
        return cookies.map(this._buildCookie.bind(this));
    },
    _buildCookie: function (cookie) {
        return {
            name: cookie.name(),
            value: cookie.value(),
            path: cookie.path(),
            domain: cookie.domain(),
            expires: cookie.expiresDate(new Date(this._request.startTime * 1000)),
            httpOnly: cookie.httpOnly(),
            secure: cookie.secure()
        };
    },
    get requestBodySize() {
        return !this._request.requestFormData ? 0 : this._request.requestFormData.length;
    },
    get responseBodySize() {
        if (this._request.cached || this._request.statusCode === 304)
            return 0;
        if (!this._request.responseHeadersText)
            return -1;
        return this._request.transferSize - this._request.responseHeadersText.length;
    },
    get responseCompression() {
        if (this._request.cached || this._request.statusCode === 304 || this._request.statusCode === 206)
            return;
        if (!this._request.responseHeadersText)
            return;
        return this._request.resourceSize - this.responseBodySize;
    }
}
WebInspector.HAREntry._toMilliseconds = function (time) {
    return time === -1 ? -1 : time * 1000;
}
WebInspector.HARLog = function (requests) {
    this._requests = requests;
}
WebInspector.HARLog.prototype = {
    build: function () {
        return {
            version: "1.2",
            creator: this._creator(),
            pages: this._buildPages(),
            entries: this._requests.map(this._convertResource.bind(this))
        }
    },
    _creator: function () {
        var webKitVersion = /AppleWebKit\/([^ ]+)/.exec(window.navigator.userAgent);
        return {
            name: "WebInspector",
            version: webKitVersion ? webKitVersion[1] : "n/a"
        };
    },
    _buildPages: function () {
        var seenIdentifiers = {};
        var pages = [];
        for (var i = 0; i < this._requests.length; ++i) {
            var page = WebInspector.networkLog.pageLoadForRequest(this._requests[i]);
            if (!page || seenIdentifiers[page.id])
                continue;
            seenIdentifiers[page.id] = true;
            pages.push(this._convertPage(page));
        }
        return pages;
    },
    _convertPage: function (page) {
        return {
            startedDateTime: new Date(page.startTime * 1000),
            id: "page_" + page.id,
            title: page.url,
            pageTimings: {
                onContentLoad: this._pageEventTime(page, page.contentLoadTime),
                onLoad: this._pageEventTime(page, page.loadTime)
            }
        }
    },
    _convertResource: function (request) {
        return (new WebInspector.HAREntry(request)).build();
    },
    _pageEventTime: function (page, time) {
        var startTime = page.startTime;
        if (time === -1 || startTime === -1)
            return -1;
        return WebInspector.HAREntry._toMilliseconds(time - startTime);
    }
}
WebInspector.HARWriter = function () {}
WebInspector.HARWriter.prototype = {
    write: function (stream, requests, progress) {
        this._stream = stream;
        this._harLog = (new WebInspector.HARLog(requests)).build();
        this._pendingRequests = 1;
        var entries = this._harLog.entries;
        for (var i = 0; i < entries.length; ++i) {
            var content = requests[i].content;
            if (typeof content === "undefined" && requests[i].finished) {
                ++this._pendingRequests;
                requests[i].requestContent(this._onContentAvailable.bind(this, entries[i]));
            } else if (content !== null)
                entries[i].response.content.text = content;
        }
        var compositeProgress = new WebInspector.CompositeProgress(progress);
        this._writeProgress = compositeProgress.createSubProgress();
        if (--this._pendingRequests) {
            this._requestsProgress = compositeProgress.createSubProgress();
            this._requestsProgress.setTitle(WebInspector.UIString("Collecting content…"));
            this._requestsProgress.setTotalWork(this._pendingRequests);
        } else
            this._beginWrite();
    },
    _onContentAvailable: function (entry, content) {
        if (content !== null)
            entry.response.content.text = content;
        if (this._requestsProgress)
            this._requestsProgress.worked();
        if (!--this._pendingRequests) {
            this._requestsProgress.done();
            this._beginWrite();
        }
    },
    _beginWrite: function () {
        const jsonIndent = 2;
        this._text = JSON.stringify({
            log: this._harLog
        }, null, jsonIndent);
        this._writeProgress.setTitle(WebInspector.UIString("Writing file…"));
        this._writeProgress.setTotalWork(this._text.length);
        this._bytesWritten = 0;
        this._writeNextChunk(this._stream);
    },
    _writeNextChunk: function (stream, error) {
        if (this._bytesWritten >= this._text.length || error) {
            stream.close();
            this._writeProgress.done();
            return;
        }
        const chunkSize = 100000;
        var text = this._text.substring(this._bytesWritten, this._bytesWritten + chunkSize);
        this._bytesWritten += text.length;
        stream.write(text, this._writeNextChunk.bind(this));
        this._writeProgress.setWorked(this._bytesWritten);
    }
}
WebInspector.CookieParser = function () {}
WebInspector.CookieParser.KeyValue = function (key, value, position) {
    this.key = key;
    this.value = value;
    this.position = position;
}
WebInspector.CookieParser.prototype = {
    cookies: function () {
        return this._cookies;
    },
    parseCookie: function (cookieHeader) {
        if (!this._initialize(cookieHeader))
            return null;
        for (var kv = this._extractKeyValue(); kv; kv = this._extractKeyValue()) {
            if (kv.key.charAt(0) === "$" && this._lastCookie)
                this._lastCookie.addAttribute(kv.key.slice(1), kv.value);
            else if (kv.key.toLowerCase() !== "$version" && typeof kv.value === "string")
                this._addCookie(kv, WebInspector.Cookie.Type.Request);
            this._advanceAndCheckCookieDelimiter();
        }
        this._flushCookie();
        return this._cookies;
    },
    parseSetCookie: function (setCookieHeader) {
        if (!this._initialize(setCookieHeader))
            return null;
        for (var kv = this._extractKeyValue(); kv; kv = this._extractKeyValue()) {
            if (this._lastCookie)
                this._lastCookie.addAttribute(kv.key, kv.value);
            else
                this._addCookie(kv, WebInspector.Cookie.Type.Response);
            if (this._advanceAndCheckCookieDelimiter())
                this._flushCookie();
        }
        this._flushCookie();
        return this._cookies;
    },
    _initialize: function (headerValue) {
        this._input = headerValue;
        if (typeof headerValue !== "string")
            return false;
        this._cookies = [];
        this._lastCookie = null;
        this._originalInputLength = this._input.length;
        return true;
    },
    _flushCookie: function () {
        if (this._lastCookie)
            this._lastCookie.setSize(this._originalInputLength - this._input.length - this._lastCookiePosition);
        this._lastCookie = null;
    },
    _extractKeyValue: function () {
        if (!this._input || !this._input.length)
            return null;
        var keyValueMatch = /^[ \t]*([^\s=;]+)[ \t]*(?:=[ \t]*([^;\n]*))?/.exec(this._input);
        if (!keyValueMatch) {
            console.log("Failed parsing cookie header before: " + this._input);
            return null;
        }
        var result = new WebInspector.CookieParser.KeyValue(keyValueMatch[1], keyValueMatch[2] && keyValueMatch[2].trim(), this._originalInputLength - this._input.length);
        this._input = this._input.slice(keyValueMatch[0].length);
        return result;
    },
    _advanceAndCheckCookieDelimiter: function () {
        var match = /^\s*[\n;]\s*/.exec(this._input);
        if (!match)
            return false;
        this._input = this._input.slice(match[0].length);
        return match[0].match("\n") !== null;
    },
    _addCookie: function (keyValue, type) {
        if (this._lastCookie)
            this._lastCookie.setSize(keyValue.position - this._lastCookiePosition);
        this._lastCookie = typeof keyValue.value === "string" ? new WebInspector.Cookie(keyValue.key, keyValue.value, type) : new WebInspector.Cookie("", keyValue.key, type);
        this._lastCookiePosition = keyValue.position;
        this._cookies.push(this._lastCookie);
    }
};
WebInspector.CookieParser.parseCookie = function (header) {
    return (new WebInspector.CookieParser()).parseCookie(header);
}
WebInspector.CookieParser.parseSetCookie = function (header) {
    return (new WebInspector.CookieParser()).parseSetCookie(header);
}
WebInspector.Cookie = function (name, value, type) {
    this._name = name;
    this._value = value;
    this._type = type;
    this._attributes = {};
}
WebInspector.Cookie.prototype = {
    name: function () {
        return this._name;
    },
    value: function () {
        return this._value;
    },
    type: function () {
        return this._type;
    },
    httpOnly: function () {
        return "httponly" in this._attributes;
    },
    secure: function () {
        return "secure" in this._attributes;
    },
    session: function () {
        return !("expires" in this._attributes || "max-age" in this._attributes);
    },
    path: function () {
        return this._attributes["path"];
    },
    port: function () {
        return this._attributes["port"];
    },
    domain: function () {
        return this._attributes["domain"];
    },
    expires: function () {
        return this._attributes["expires"];
    },
    maxAge: function () {
        return this._attributes["max-age"];
    },
    size: function () {
        return this._size;
    },
    setSize: function (size) {
        this._size = size;
    },
    expiresDate: function (requestDate) {
        if (this.maxAge()) {
            var targetDate = requestDate === null ? new Date() : requestDate;
            return new Date(targetDate.getTime() + 1000 * this.maxAge());
        }
        if (this.expires())
            return new Date(this.expires());
        return null;
    },
    attributes: function () {
        return this._attributes;
    },
    addAttribute: function (key, value) {
        this._attributes[key.toLowerCase()] = value;
    },
    remove: function (callback) {
        PageAgent.deleteCookie(this.name(), (this.secure() ? "https://" : "http://") + this.domain() + this.path(), callback);
    }
}
WebInspector.Cookie.Type = {
    Request: 0,
    Response: 1
};
WebInspector.Cookies = {}
WebInspector.Cookies.getCookiesAsync = function (callback) {
    function mycallback(error, cookies) {
        if (error)
            return;
        callback(cookies.map(WebInspector.Cookies.buildCookieProtocolObject));
    }
    PageAgent.getCookies(mycallback);
}
WebInspector.Cookies.buildCookieProtocolObject = function (protocolCookie) {
    var cookie = new WebInspector.Cookie(protocolCookie.name, protocolCookie.value, null);
    cookie.addAttribute("domain", protocolCookie["domain"]);
    cookie.addAttribute("path", protocolCookie["path"]);
    cookie.addAttribute("port", protocolCookie["port"]);
    if (protocolCookie["expires"])
        cookie.addAttribute("expires", protocolCookie["expires"]);
    if (protocolCookie["httpOnly"])
        cookie.addAttribute("httpOnly");
    if (protocolCookie["secure"])
        cookie.addAttribute("secure");
    cookie.setSize(protocolCookie["size"]);
    return cookie;
}
WebInspector.Cookies.cookieMatchesResourceURL = function (cookie, resourceURL) {
    var url = resourceURL.asParsedURL();
    if (!url || !WebInspector.Cookies.cookieDomainMatchesResourceDomain(cookie.domain(), url.host))
        return false;
    return (url.path.startsWith(cookie.path()) && (!cookie.port() || url.port == cookie.port()) && (!cookie.secure() || url.scheme === "https"));
}
WebInspector.Cookies.cookieDomainMatchesResourceDomain = function (cookieDomain, resourceDomain) {
    if (cookieDomain.charAt(0) !== '.')
        return resourceDomain === cookieDomain;
    return !!resourceDomain.match(new RegExp("^([^\\.]+\\.)*" + cookieDomain.substring(1).escapeForRegExp() + "$", "i"));
}
WebInspector.SearchableView = function (searchable) {
    WebInspector.VBox.call(this);
    this._searchProvider = searchable;
    this.element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this._footerElementContainer = this.element.createChild("div", "search-bar status-bar hidden");
    this._footerElementContainer.style.order = 100;
    this._footerElement = this._footerElementContainer.createChild("table", "toolbar-search");
    this._footerElement.cellSpacing = 0;
    this._firstRowElement = this._footerElement.createChild("tr");
    this._secondRowElement = this._footerElement.createChild("tr", "hidden");
    var searchControlElementColumn = this._firstRowElement.createChild("td");
    this._searchControlElement = searchControlElementColumn.createChild("span", "toolbar-search-control");
    this._searchInputElement = this._searchControlElement.createChild("input", "search-replace");
    this._searchInputElement.id = "search-input-field";
    this._searchInputElement.placeholder = WebInspector.UIString("Find");
    this._matchesElement = this._searchControlElement.createChild("label", "search-results-matches");
    this._matchesElement.setAttribute("for", "search-input-field");
    this._searchNavigationElement = this._searchControlElement.createChild("div", "toolbar-search-navigation-controls");
    this._searchNavigationPrevElement = this._searchNavigationElement.createChild("div", "toolbar-search-navigation toolbar-search-navigation-prev");
    this._searchNavigationPrevElement.addEventListener("click", this._onPrevButtonSearch.bind(this), false);
    this._searchNavigationPrevElement.title = WebInspector.UIString("Search Previous");
    this._searchNavigationNextElement = this._searchNavigationElement.createChild("div", "toolbar-search-navigation toolbar-search-navigation-next");
    this._searchNavigationNextElement.addEventListener("click", this._onNextButtonSearch.bind(this), false);
    this._searchNavigationNextElement.title = WebInspector.UIString("Search Next");
    this._searchInputElement.addEventListener("mousedown", this._onSearchFieldManualFocus.bind(this), false);
    this._searchInputElement.addEventListener("keydown", this._onSearchKeyDown.bind(this), true);
    this._searchInputElement.addEventListener("input", this._onInput.bind(this), false);
    this._replaceInputElement = this._secondRowElement.createChild("td").createChild("input", "search-replace toolbar-replace-control");
    this._replaceInputElement.addEventListener("keydown", this._onReplaceKeyDown.bind(this), true);
    this._replaceInputElement.placeholder = WebInspector.UIString("Replace");
    this._findButtonElement = this._firstRowElement.createChild("td").createChild("button", "hidden");
    this._findButtonElement.textContent = WebInspector.UIString("Find");
    this._findButtonElement.tabIndex = -1;
    this._findButtonElement.addEventListener("click", this._onNextButtonSearch.bind(this), false);
    this._replaceButtonElement = this._secondRowElement.createChild("td").createChild("button");
    this._replaceButtonElement.textContent = WebInspector.UIString("Replace");
    this._replaceButtonElement.disabled = true;
    this._replaceButtonElement.tabIndex = -1;
    this._replaceButtonElement.addEventListener("click", this._replace.bind(this), false);
    this._prevButtonElement = this._firstRowElement.createChild("td").createChild("button", "hidden");
    this._prevButtonElement.textContent = WebInspector.UIString("Previous");
    this._prevButtonElement.disabled = true;
    this._prevButtonElement.tabIndex = -1;
    this._prevButtonElement.addEventListener("click", this._onPrevButtonSearch.bind(this), false);
    this._replaceAllButtonElement = this._secondRowElement.createChild("td").createChild("button");
    this._replaceAllButtonElement.textContent = WebInspector.UIString("Replace All");
    this._replaceAllButtonElement.addEventListener("click", this._replaceAll.bind(this), false);
    this._replaceElement = this._firstRowElement.createChild("td").createChild("span");
    this._replaceCheckboxElement = this._replaceElement.createChild("input");
    this._replaceCheckboxElement.type = "checkbox";
    this._replaceCheckboxElement.id = "search-replace-trigger";
    this._replaceCheckboxElement.addEventListener("change", this._updateSecondRowVisibility.bind(this), false);
    this._replaceLabelElement = this._replaceElement.createChild("label");
    this._replaceLabelElement.textContent = WebInspector.UIString("Replace");
    this._replaceLabelElement.setAttribute("for", "search-replace-trigger");
    var cancelButtonElement = this._firstRowElement.createChild("td").createChild("button");
    cancelButtonElement.textContent = WebInspector.UIString("Cancel");
    cancelButtonElement.tabIndex = -1;
    cancelButtonElement.addEventListener("click", this.closeSearch.bind(this), false);
    this._minimalSearchQuerySize = 3;
    this._registerShortcuts();
}
WebInspector.SearchableView.findShortcuts = function () {
    if (WebInspector.SearchableView._findShortcuts)
        return WebInspector.SearchableView._findShortcuts;
    WebInspector.SearchableView._findShortcuts = [WebInspector.KeyboardShortcut.makeDescriptor("f", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta)];
    if (!WebInspector.isMac())
        WebInspector.SearchableView._findShortcuts.push(WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.F3));
    return WebInspector.SearchableView._findShortcuts;
}
WebInspector.SearchableView.cancelSearchShortcuts = function () {
    if (WebInspector.SearchableView._cancelSearchShortcuts)
        return WebInspector.SearchableView._cancelSearchShortcuts;
    WebInspector.SearchableView._cancelSearchShortcuts = [WebInspector.KeyboardShortcut.makeDescriptor(WebInspector.KeyboardShortcut.Keys.Esc)];
    return WebInspector.SearchableView._cancelSearchShortcuts;
}
WebInspector.SearchableView.findNextShortcut = function () {
    if (WebInspector.SearchableView._findNextShortcut)
        return WebInspector.SearchableView._findNextShortcut;
    WebInspector.SearchableView._findNextShortcut = [];
    if (WebInspector.isMac())
        WebInspector.SearchableView._findNextShortcut.push(WebInspector.KeyboardShortcut.makeDescriptor("g", WebInspector.KeyboardShortcut.Modifiers.Meta));
    return WebInspector.SearchableView._findNextShortcut;
}
WebInspector.SearchableView.findPreviousShortcuts = function () {
    if (WebInspector.SearchableView._findPreviousShortcuts)
        return WebInspector.SearchableView._findPreviousShortcuts;
    WebInspector.SearchableView._findPreviousShortcuts = [];
    if (WebInspector.isMac())
        WebInspector.SearchableView._findPreviousShortcuts.push(WebInspector.KeyboardShortcut.makeDescriptor("g", WebInspector.KeyboardShortcut.Modifiers.Meta | WebInspector.KeyboardShortcut.Modifiers.Shift));
    return WebInspector.SearchableView._findPreviousShortcuts;
}
WebInspector.SearchableView.prototype = {
    _onKeyDown: function (event) {
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler(event))
            event.consume(true);
    },
    _registerShortcuts: function () {
        this._shortcuts = {};

        function register(shortcuts, handler) {
            for (var i = 0; i < shortcuts.length; ++i)
                this._shortcuts[shortcuts[i].key] = handler;
        }
        register.call(this, WebInspector.SearchableView.findShortcuts(), this.handleFindShortcut.bind(this));
        register.call(this, WebInspector.SearchableView.cancelSearchShortcuts(), this.handleCancelSearchShortcut.bind(this));
        register.call(this, WebInspector.SearchableView.findNextShortcut(), this.handleFindNextShortcut.bind(this));
        register.call(this, WebInspector.SearchableView.findPreviousShortcuts(), this.handleFindPreviousShortcut.bind(this));
    },
    setMinimalSearchQuerySize: function (minimalSearchQuerySize) {
        this._minimalSearchQuerySize = minimalSearchQuerySize;
    },
    setReplaceable: function (replaceable) {
        this._replaceable = replaceable;
    },
    updateSearchMatchesCount: function (matches) {
        this._searchProvider.currentSearchMatches = matches;
        this._updateSearchMatchesCountAndCurrentMatchIndex(this._searchProvider.currentQuery ? matches : 0, -1);
    },
    updateCurrentMatchIndex: function (currentMatchIndex) {
        this._updateSearchMatchesCountAndCurrentMatchIndex(this._searchProvider.currentSearchMatches, currentMatchIndex);
    },
    isSearchVisible: function () {
        return this._searchIsVisible;
    },
    closeSearch: function () {
        this.cancelSearch();
        if (WebInspector.currentFocusElement().isDescendant(this._footerElementContainer))
            WebInspector.setCurrentFocusElement(WebInspector.previousFocusElement());
    },
    _toggleSearchBar: function (toggled) {
        this._footerElementContainer.classList.toggle("hidden", !toggled);
        this.doResize();
    },
    cancelSearch: function () {
        if (!this._searchIsVisible)
            return;
        this.resetSearch();
        delete this._searchIsVisible;
        this._toggleSearchBar(false);
    },
    resetSearch: function () {
        this._clearSearch();
        this._updateReplaceVisibility();
        this._matchesElement.textContent = "";
    },
    handleFindNextShortcut: function () {
        if (!this._searchIsVisible)
            return false;
        this._searchProvider.jumpToNextSearchResult();
        return true;
    },
    handleFindPreviousShortcut: function () {
        if (!this._searchIsVisible)
            return false;
        this._searchProvider.jumpToPreviousSearchResult();
        return true;
    },
    handleFindShortcut: function () {
        this.showSearchField();
        return true;
    },
    handleCancelSearchShortcut: function () {
        if (!this._searchIsVisible)
            return false;
        this.closeSearch();
        return true;
    },
    _updateSearchNavigationButtonState: function (enabled) {
        this._replaceButtonElement.disabled = !enabled;
        this._prevButtonElement.disabled = !enabled;
        if (enabled) {
            this._searchNavigationPrevElement.classList.add("enabled");
            this._searchNavigationNextElement.classList.add("enabled");
        } else {
            this._searchNavigationPrevElement.classList.remove("enabled");
            this._searchNavigationNextElement.classList.remove("enabled");
        }
    },
    _updateSearchMatchesCountAndCurrentMatchIndex: function (matches, currentMatchIndex) {
        if (!this._currentQuery)
            this._matchesElement.textContent = "";
        else if (matches === 0 || currentMatchIndex >= 0)
            this._matchesElement.textContent = WebInspector.UIString("%d of %d", currentMatchIndex + 1, matches);
        else if (matches === 1)
            this._matchesElement.textContent = WebInspector.UIString("1 match");
        else
            this._matchesElement.textContent = WebInspector.UIString("%d matches", matches);
        this._updateSearchNavigationButtonState(matches > 0);
    },
    showSearchField: function () {
        if (this._searchIsVisible)
            this.cancelSearch();
        this._toggleSearchBar(true);
        this._updateReplaceVisibility();
        if (WebInspector.currentFocusElement() !== this._searchInputElement) {
            var selection = window.getSelection();
            if (selection.rangeCount) {
                var queryCandidate = selection.toString().replace(/\r?\n.*/, "");
                if (queryCandidate)
                    this._searchInputElement.value = queryCandidate;
            }
        }
        this._performSearch(false, false);
        this._searchInputElement.focus();
        this._searchInputElement.select();
        this._searchIsVisible = true;
    },
    _updateReplaceVisibility: function () {
        this._replaceElement.classList.toggle("hidden", !this._replaceable);
        if (!this._replaceable) {
            this._replaceCheckboxElement.checked = false;
            this._updateSecondRowVisibility();
        }
    },
    _onSearchFieldManualFocus: function (event) {
        WebInspector.setCurrentFocusElement(event.target);
    },
    _onSearchKeyDown: function (event) {
        if (isEnterKey(event)) {
            if (!this._currentQuery)
                this._performSearch(true, true);
            else
                this._jumpToNextSearchResult(event.shiftKey);
        }
    },
    _onReplaceKeyDown: function (event) {
        if (isEnterKey(event))
            this._replace();
    },
    _jumpToNextSearchResult: function (isBackwardSearch) {
        if (!this._currentQuery || !this._searchNavigationPrevElement.classList.contains("enabled"))
            return;
        if (isBackwardSearch)
            this._searchProvider.jumpToPreviousSearchResult();
        else
            this._searchProvider.jumpToNextSearchResult();
    },
    _onNextButtonSearch: function (event) {
        if (!this._searchNavigationNextElement.classList.contains("enabled"))
            return;
        this._jumpToNextSearchResult();
        this._searchInputElement.focus();
    },
    _onPrevButtonSearch: function (event) {
        if (!this._searchNavigationPrevElement.classList.contains("enabled"))
            return;
        this._jumpToNextSearchResult(true);
        this._searchInputElement.focus();
    },
    _clearSearch: function () {
        delete this._currentQuery;
        if (!!this._searchProvider.currentQuery) {
            delete this._searchProvider.currentQuery;
            this._searchProvider.searchCanceled();
        }
        this._updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
    },
    _performSearch: function (forceSearch, shouldJump) {
        var query = this._searchInputElement.value;
        if (!query || (!forceSearch && query.length < this._minimalSearchQuerySize && !this._currentQuery)) {
            this._clearSearch();
            return;
        }
        this._currentQuery = query;
        this._searchProvider.currentQuery = query;
        this._searchProvider.performSearch(query, shouldJump);
    },
    _updateSecondRowVisibility: function () {
        var secondRowVisible = this._replaceCheckboxElement.checked;
        this._footerElementContainer.classList.toggle("replaceable", secondRowVisible);
        this._footerElement.classList.toggle("toolbar-search-replace", secondRowVisible);
        this._secondRowElement.classList.toggle("hidden", !secondRowVisible);
        this._prevButtonElement.classList.toggle("hidden", !secondRowVisible);
        this._findButtonElement.classList.toggle("hidden", !secondRowVisible);
        this._replaceCheckboxElement.tabIndex = secondRowVisible ? -1 : 0;
        if (secondRowVisible)
            this._replaceInputElement.focus();
        else
            this._searchInputElement.focus();
        this.doResize();
    },
    _replace: function () {
        (this._searchProvider).replaceSelectionWith(this._replaceInputElement.value);
        delete this._currentQuery;
        this._performSearch(true, true);
    },
    _replaceAll: function () {
        (this._searchProvider).replaceAllWith(this._searchInputElement.value, this._replaceInputElement.value);
    },
    _onInput: function (event) {
        this._onValueChanged();
    },
    _onValueChanged: function () {
        this._performSearch(false, true);
    },
    __proto__: WebInspector.VBox.prototype
}
WebInspector.Searchable = function () {}
WebInspector.Searchable.prototype = {
    searchCanceled: function () {},
    performSearch: function (query, shouldJump) {},
    jumpToNextSearchResult: function () {},
    jumpToPreviousSearchResult: function () {}
}
WebInspector.Replaceable = function () {}
WebInspector.Replaceable.prototype = {
    replaceSelectionWith: function (text) {},
    replaceAllWith: function (query, replacement) {}
}
WebInspector.FilterBar = function () {
    this._filtersShown = false;
    this._element = document.createElement("div");
    this._element.className = "hbox";
    this._filterButton = new WebInspector.StatusBarButton(WebInspector.UIString("Filter"), "filters-toggle", 3);
    this._filterButton.element.addEventListener("click", this._handleFilterButtonClick.bind(this), false);
    this._filters = [];
}
WebInspector.FilterBar.Events = {
    FiltersToggled: "FiltersToggled"
}
WebInspector.FilterBar.FilterBarState = {
    Inactive: "inactive",
    Active: "active",
    Shown: "shown"
};
WebInspector.FilterBar.prototype = {
    setName: function (name) {
        this._stateSetting = WebInspector.settings.createSetting("filterBar-" + name + "-toggled", false);
        this._setState(this._stateSetting.get());
    },
    filterButton: function () {
        return this._filterButton;
    },
    filtersElement: function () {
        return this._element;
    },
    filtersToggled: function () {
        return this._filtersShown;
    },
    addFilter: function (filter) {
        this._filters.push(filter);
        this._element.appendChild(filter.element());
        filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged, this);
        this._updateFilterButton();
    },
    _filterChanged: function (event) {
        this._updateFilterButton();
    },
    _filterBarState: function () {
        if (this._filtersShown)
            return WebInspector.FilterBar.FilterBarState.Shown;
        var isActive = false;
        for (var i = 0; i < this._filters.length; ++i) {
            if (this._filters[i].isActive())
                return WebInspector.FilterBar.FilterBarState.Active;
        }
        return WebInspector.FilterBar.FilterBarState.Inactive;
    },
    _updateFilterButton: function () {
        this._filterButton.state = this._filterBarState();
    },
    _handleFilterButtonClick: function (event) {
        this._setState(!this._filtersShown);
    },
    _setState: function (filtersShown) {
        if (this._filtersShown === filtersShown)
            return;
        this._filtersShown = filtersShown;
        if (this._stateSetting)
            this._stateSetting.set(filtersShown);
        this._updateFilterButton();
        this.dispatchEventToListeners(WebInspector.FilterBar.Events.FiltersToggled, this._filtersShown);
        if (this._filtersShown) {
            for (var i = 0; i < this._filters.length; ++i) {
                if (this._filters[i] instanceof WebInspector.TextFilterUI) {
                    var textFilterUI = (this._filters[i]);
                    textFilterUI.focus();
                }
            }
        }
    },
    clear: function () {
        this._element.removeChildren();
        this._filters = [];
        this._updateFilterButton();
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.FilterUI = function () {}
WebInspector.FilterUI.Events = {
    FilterChanged: "FilterChanged"
}
WebInspector.FilterUI.prototype = {
    isActive: function () {},
    element: function () {}
}
WebInspector.TextFilterUI = function (supportRegex) {
    this._supportRegex = !!supportRegex;
    this._regex = null;
    this._filterElement = document.createElement("div");
    this._filterElement.className = "filter-text-filter";
    this._filterInputElement = this._filterElement.createChild("input", "search-replace toolbar-replace-control");
    this._filterInputElement.placeholder = WebInspector.UIString("Filter");
    this._filterInputElement.id = "filter-input-field";
    this._filterInputElement.addEventListener("mousedown", this._onFilterFieldManualFocus.bind(this), false);
    this._filterInputElement.addEventListener("input", this._onInput.bind(this), false);
    this._filterInputElement.addEventListener("change", this._onChange.bind(this), false);
    this._filterInputElement.addEventListener("keydown", this._onInputKeyDown.bind(this), true);
    this._filterInputElement.addEventListener("blur", this._onBlur.bind(this), true);
    this._suggestionBuilder = null;
    this._suggestBox = new WebInspector.SuggestBox(this, this._filterElement);
    if (this._supportRegex) {
        this._filterElement.classList.add("supports-regex");
        this._regexCheckBox = this._filterElement.createChild("input");
        this._regexCheckBox.type = "checkbox";
        this._regexCheckBox.id = "text-filter-regex";
        this._regexCheckBox.addEventListener("change", this._onInput.bind(this), false);
        this._regexLabel = this._filterElement.createChild("label");
        this._regexLabel.htmlFor = "text-filter-regex";
        this._regexLabel.textContent = WebInspector.UIString("Regex");
    }
}
WebInspector.TextFilterUI.prototype = {
    isActive: function () {
        return !!this._filterInputElement.value;
    },
    element: function () {
        return this._filterElement;
    },
    value: function () {
        return this._filterInputElement.value;
    },
    setValue: function (value) {
        this._filterInputElement.value = value;
        this._valueChanged(false);
    },
    regex: function () {
        return this._regex;
    },
    _onFilterFieldManualFocus: function (event) {
        WebInspector.setCurrentFocusElement(event.target);
    },
    _onBlur: function (event) {
        this._cancelSuggestion();
    },
    _cancelSuggestion: function () {
        if (this._suggestionBuilder && this._suggestBox.visible) {
            this._suggestionBuilder.unapplySuggestion(this._filterInputElement);
            this._suggestBox.hide();
        }
    },
    _onInput: function (event) {
        this._valueChanged(true);
    },
    _onChange: function (event) {
        this._valueChanged(false);
    },
    focus: function () {
        this._filterInputElement.focus();
    },
    setSuggestionBuilder: function (suggestionBuilder) {
        this._cancelSuggestion();
        this._suggestionBuilder = suggestionBuilder;
    },
    _updateSuggestions: function () {
        if (!this._suggestionBuilder)
            return;
        var suggestions = this._suggestionBuilder.buildSuggestions(this._filterInputElement);
        if (suggestions && suggestions.length) {
            if (this._suppressSuggestion)
                delete this._suppressSuggestion;
            else
                this._suggestionBuilder.applySuggestion(this._filterInputElement, suggestions[0], true);
            this._suggestBox.updateSuggestions(null, suggestions, 0, true, "");
        } else {
            this._suggestBox.hide();
        }
    },
    _valueChanged: function (showSuggestions) {
        if (showSuggestions)
            this._updateSuggestions();
        else
            this._suggestBox.hide();
        var filterQuery = this.value();
        this._regex = null;
        this._filterInputElement.classList.remove("filter-text-invalid");
        if (filterQuery) {
            if (this._supportRegex && this._regexCheckBox.checked) {
                try {
                    this._regex = new RegExp(filterQuery, "i");
                } catch (e) {
                    this._filterInputElement.classList.add("filter-text-invalid");
                }
            } else {
                this._regex = createPlainTextSearchRegex(filterQuery, "i");
            }
        }
        this._dispatchFilterChanged();
    },
    _dispatchFilterChanged: function () {
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },
    _onInputKeyDown: function (event) {
        var handled = false;
        if (event.keyIdentifier === "U+0008") {
            this._suppressSuggestion = true;
        } else if (this._suggestBox.visible()) {
            if (event.keyIdentifier === "U+001B") {
                this._cancelSuggestion();
                handled = true;
            } else if (event.keyIdentifier === "U+0009") {
                this._suggestBox.acceptSuggestion();
                this._valueChanged(true);
                handled = true;
            } else {
                handled = this._suggestBox.keyPressed(event);
            }
        }
        if (handled)
            event.consume(true);
        return handled;
    },
    applySuggestion: function (suggestion, isIntermediateSuggestion) {
        if (!this._suggestionBuilder)
            return;
        this._suggestionBuilder.applySuggestion(this._filterInputElement, suggestion, !!isIntermediateSuggestion);
        if (isIntermediateSuggestion)
            this._dispatchFilterChanged();
    },
    acceptSuggestion: function () {
        this._filterInputElement.scrollLeft = this._filterInputElement.scrollWidth;
        this._valueChanged(true);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.TextFilterUI.SuggestionBuilder = function () {}
WebInspector.TextFilterUI.SuggestionBuilder.prototype = {
    buildSuggestions: function (input) {},
    applySuggestion: function (input, suggestion, isIntermediate) {},
    unapplySuggestion: function (input) {}
}
WebInspector.NamedBitSetFilterUI = function (items, setting) {
    this._filtersElement = document.createElement("div");
    this._filtersElement.className = "filter-bitset-filter status-bar-item";
    this._filtersElement.title = WebInspector.UIString("Use %s Click to select multiple types.", WebInspector.KeyboardShortcut.shortcutToString("", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta));
    this._allowedTypes = {};
    this._typeFilterElements = {};
    this._addBit(WebInspector.NamedBitSetFilterUI.ALL_TYPES, WebInspector.UIString("All"));
    this._filtersElement.createChild("div", "filter-bitset-filter-divider");
    for (var i = 0; i < items.length; ++i)
        this._addBit(items[i].name, items[i].label);
    if (setting) {
        this._setting = setting;
        setting.addChangeListener(this._settingChanged.bind(this));
        this._settingChanged();
    } else {
        this._toggleTypeFilter(WebInspector.NamedBitSetFilterUI.ALL_TYPES, false);
    }
}
WebInspector.NamedBitSetFilterUI.Item;
WebInspector.NamedBitSetFilterUI.ALL_TYPES = "all";
WebInspector.NamedBitSetFilterUI.prototype = {
    isActive: function () {
        return !this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES];
    },
    element: function () {
        return this._filtersElement;
    },
    accept: function (typeName) {
        return !!this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES] || !!this._allowedTypes[typeName];
    },
    _settingChanged: function () {
        var allowedTypes = this._setting.get();
        this._allowedTypes = {};
        for (var typeName in this._typeFilterElements) {
            if (allowedTypes[typeName])
                this._allowedTypes[typeName] = true;
        }
        this._update();
    },
    _update: function () {
        if ((Object.keys(this._allowedTypes).length === 0) || this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES]) {
            this._allowedTypes = {};
            this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES] = true;
        }
        for (var typeName in this._typeFilterElements)
            this._typeFilterElements[typeName].classList.toggle("selected", this._allowedTypes[typeName]);
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },
    _addBit: function (name, label) {
        var typeFilterElement = this._filtersElement.createChild("li", name);
        typeFilterElement.typeName = name;
        typeFilterElement.createTextChild(label);
        typeFilterElement.addEventListener("click", this._onTypeFilterClicked.bind(this), false);
        this._typeFilterElements[name] = typeFilterElement;
    },
    _onTypeFilterClicked: function (e) {
        var toggle;
        if (WebInspector.isMac())
            toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
        else
            toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
        this._toggleTypeFilter(e.target.typeName, toggle);
    },
    _toggleTypeFilter: function (typeName, allowMultiSelect) {
        if (allowMultiSelect && typeName !== WebInspector.NamedBitSetFilterUI.ALL_TYPES)
            this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES] = false;
        else
            this._allowedTypes = {};
        this._allowedTypes[typeName] = !this._allowedTypes[typeName];
        if (this._setting)
            this._setting.set(this._allowedTypes);
        else
            this._update();
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.ComboBoxFilterUI = function (options) {
    this._filterElement = document.createElement("div");
    this._filterElement.className = "filter-combobox-filter";
    this._options = options;
    this._filterComboBox = new WebInspector.StatusBarComboBox(this._filterChanged.bind(this));
    for (var i = 0; i < options.length; ++i) {
        var filterOption = options[i];
        var option = document.createElement("option");
        option.text = filterOption.label;
        option.title = filterOption.title;
        this._filterComboBox.addOption(option);
        this._filterComboBox.element.title = this._filterComboBox.selectedOption().title;
    }
    this._filterElement.appendChild(this._filterComboBox.element);
}
WebInspector.ComboBoxFilterUI.prototype = {
    isActive: function () {
        return this._filterComboBox.selectedIndex() !== 0;
    },
    element: function () {
        return this._filterElement;
    },
    value: function (typeName) {
        var option = this._options[this._filterComboBox.selectedIndex()];
        return option.value;
    },
    setSelectedIndex: function (index) {
        this._filterComboBox.setSelectedIndex(index);
    },
    selectedIndex: function (index) {
        return this._filterComboBox.selectedIndex();
    },
    _filterChanged: function (event) {
        var option = this._options[this._filterComboBox.selectedIndex()];
        this._filterComboBox.element.title = option.title;
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.CheckboxFilterUI = function (className, title, activeWhenChecked, setting) {
    this._filterElement = document.createElement("div");
    this._filterElement.classList.add("filter-checkbox-filter", "filter-checkbox-filter-" + className);
    this._activeWhenChecked = !!activeWhenChecked;
    this._createCheckbox(title);
    if (setting) {
        this._setting = setting;
        setting.addChangeListener(this._settingChanged.bind(this));
        this._settingChanged();
    } else {
        this._checked = !this._activeWhenChecked;
        this._update();
    }
}
WebInspector.CheckboxFilterUI.prototype = {
    isActive: function () {
        return this._activeWhenChecked === this._checked;
    },
    element: function () {
        return this._filterElement;
    },
    checked: function () {
        return this._checked;
    },
    setState: function (state) {
        this._checked = state;
        this._update();
    },
    _update: function () {
        this._checkElement.classList.toggle("checkbox-filter-checkbox-checked", this._checked);
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },
    _settingChanged: function () {
        this._checked = this._setting.get();
        this._update();
    },
    _onClick: function (event) {
        this._checked = !this._checked;
        if (this._setting)
            this._setting.set(this._checked);
        else
            this._update();
    },
    _createCheckbox: function (title) {
        var label = this._filterElement.createChild("label");
        var checkBorder = label.createChild("div", "checkbox-filter-checkbox");
        this._checkElement = checkBorder.createChild("div", "checkbox-filter-checkbox-check");
        this._filterElement.addEventListener("click", this._onClick.bind(this), false);
        var typeElement = label.createChild("span", "type");
        typeElement.textContent = title;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.FilterSuggestionBuilder = function (keys) {
    this._keys = keys;
    this._valueSets = {};
    this._valueLists = {};
}
WebInspector.FilterSuggestionBuilder.prototype = {
    buildSuggestions: function (input) {
        var text = input.value;
        var end = input.selectionEnd;
        if (end != text.length)
            return null;
        var start = input.selectionStart;
        text = text.substring(0, start);
        var prefixIndex = text.lastIndexOf(" ") + 1;
        var prefix = text.substring(prefixIndex);
        if (!prefix)
            return [];
        var valueDelimiterIndex = prefix.indexOf(":");
        var suggestions = [];
        if (valueDelimiterIndex === -1) {
            for (var j = 0; j < this._keys.length; ++j) {
                if (this._keys[j].startsWith(prefix))
                    suggestions.push(this._keys[j] + ":");
            }
        } else {
            var key = prefix.substring(0, valueDelimiterIndex);
            var value = prefix.substring(valueDelimiterIndex + 1);
            var items = this._values(key);
            for (var i = 0; i < items.length; ++i) {
                if (items[i].startsWith(value) && (items[i] !== value))
                    suggestions.push(key + ":" + items[i]);
            }
        }
        return suggestions;
    },
    applySuggestion: function (input, suggestion, isIntermediate) {
        var text = input.value;
        var start = input.selectionStart;
        text = text.substring(0, start);
        var prefixIndex = text.lastIndexOf(" ") + 1;
        text = text.substring(0, prefixIndex) + suggestion;
        input.value = text;
        if (!isIntermediate)
            start = text.length;
        input.setSelectionRange(start, text.length);
    },
    unapplySuggestion: function (input) {
        var start = input.selectionStart;
        var end = input.selectionEnd;
        var text = input.value;
        if (start !== end && end === text.length)
            input.value = text.substring(0, start);
    },
    _values: function (key) {
        var result = this._valueLists[key];
        if (!result)
            return [];
        result.sort();
        return result;
    },
    addItem: function (key, value) {
        if (!value)
            return;
        var set = this._valueSets[key];
        var list = this._valueLists[key];
        if (!set) {
            set = {};
            this._valueSets[key] = set;
            list = [];
            this._valueLists[key] = list;
        }
        if (set [value])
            return;
        set [value] = true;
        list.push(value);
    },
    parseQuery: function (query) {
        var filters = {};
        var text = [];
        var i = 0;
        var j = 0;
        var part;
        while (true) {
            var colonIndex = query.indexOf(":", i);
            if (colonIndex == -1) {
                part = query.substring(j);
                if (part)
                    text.push(part);
                break;
            }
            var spaceIndex = query.lastIndexOf(" ", colonIndex);
            var key = query.substring(spaceIndex + 1, colonIndex);
            if (this._keys.indexOf(key) == -1) {
                i = colonIndex + 1;
                continue;
            }
            part = spaceIndex > j ? query.substring(j, spaceIndex) : "";
            if (part)
                text.push(part);
            var nextSpace = query.indexOf(" ", colonIndex + 1);
            if (nextSpace == -1) {
                filters[key] = query.substring(colonIndex + 1);
                break;
            }
            filters[key] = query.substring(colonIndex + 1, nextSpace);
            i = nextSpace + 1;
            j = i;
        }
        return {
            text: text,
            filters: filters
        };
    }
};
WebInspector.InspectElementModeController = function () {
    this.toggleSearchButton = new WebInspector.StatusBarButton(WebInspector.UIString("Select an element in the page to inspect it."), "node-search-status-bar-item");
    this.toggleSearchButton.addEventListener("click", this.toggleSearch, this);
    this._shortcut = WebInspector.InspectElementModeController.createShortcut();
}
WebInspector.InspectElementModeController.createShortcut = function () {
    return WebInspector.KeyboardShortcut.makeDescriptor("c", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta | WebInspector.KeyboardShortcut.Modifiers.Shift);
}
WebInspector.InspectElementModeController.prototype = {
    enabled: function () {
        return this.toggleSearchButton.toggled;
    },
    disable: function () {
        if (this.enabled())
            this.toggleSearch();
    },
    toggleSearch: function () {
        var enabled = !this.enabled();

        function callback(error) {
            if (!error)
                this.toggleSearchButton.toggled = enabled;
        }
        WebInspector.domModel.setInspectModeEnabled(enabled, WebInspector.settings.showUAShadowDOM.get(), callback.bind(this));
    },
    handleShortcut: function (event) {
        if (WebInspector.KeyboardShortcut.makeKeyFromEvent(event) !== this._shortcut.key)
            return false;
        this.toggleSearch();
        event.consume(true);
        return true;
    }
}
WebInspector.inspectElementModeController;
WebInspector.WorkerManager = function (target, isMainFrontend) {
    return;
    this._reset();
    target.registerWorkerDispatcher(new WebInspector.WorkerDispatcher(this));
    if (isMainFrontend) {
        WorkerAgent.enable();
        WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._mainFrameNavigated, this);
    }
}
WebInspector.WorkerManager.Events = {
    WorkerAdded: "WorkerAdded",
    WorkerRemoved: "WorkerRemoved",
    WorkersCleared: "WorkersCleared",
    WorkerSelectionChanged: "WorkerSelectionChanged",
    WorkerDisconnected: "WorkerDisconnected",
    MessageFromWorker: "MessageFromWorker",
}
WebInspector.WorkerManager.MainThreadId = 0;
WebInspector.WorkerManager.prototype = {
    _reset: function () {
        this._threadUrlByThreadId = {};
        this._threadUrlByThreadId[WebInspector.WorkerManager.MainThreadId] = WebInspector.UIString("Thread: Main");
        this._threadsList = [WebInspector.WorkerManager.MainThreadId];
        this._selectedThreadId = WebInspector.WorkerManager.MainThreadId;
    },
    _workerCreated: function (workerId, url, inspectorConnected) {
        this._threadsList.push(workerId);
        this._threadUrlByThreadId[workerId] = url;
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerAdded, {
            workerId: workerId,
            url: url,
            inspectorConnected: inspectorConnected
        });
    },
    _workerTerminated: function (workerId) {
        this._threadsList.remove(workerId);
        delete this._threadUrlByThreadId[workerId];
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerRemoved, workerId);
    },
    _dispatchMessageFromWorker: function (workerId, message) {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.MessageFromWorker, {
            workerId: workerId,
            message: message
        })
    },
    _disconnectedFromWorker: function () {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerDisconnected)
    },
    _mainFrameNavigated: function (event) {
        this._reset();
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkersCleared);
    },
    threadsList: function () {
        return this._threadsList;
    },
    threadUrl: function (threadId) {
        return this._threadUrlByThreadId[threadId];
    },
    setSelectedThreadId: function (threadId) {
        this._selectedThreadId = threadId;
    },
    selectedThreadId: function () {
        return this._selectedThreadId;
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.WorkerDispatcher = function (workerManager) {
    this._workerManager = workerManager;
}
WebInspector.WorkerDispatcher.prototype = {
    workerCreated: function (workerId, url, inspectorConnected) {
        this._workerManager._workerCreated(workerId, url, inspectorConnected);
    },
    workerTerminated: function (workerId) {
        this._workerManager._workerTerminated(workerId);
    },
    dispatchMessageFromWorker: function (workerId, message) {
        this._workerManager._dispatchMessageFromWorker(workerId, message);
    },
    disconnectedFromWorker: function () {
        this._workerManager._disconnectedFromWorker();
    }
}
WebInspector.workerManager;
WebInspector.ExternalWorkerConnection = function (workerId, onConnectionReady) {
    InspectorBackendClass.Connection.call(this);
    this._workerId = workerId;
    window.addEventListener("message", this._processMessage.bind(this), true);
    onConnectionReady(this);
}
WebInspector.ExternalWorkerConnection.prototype = {
    _processMessage: function (event) {
        if (!event)
            return;
        var message = event.data;
        this.dispatch(message);
    },
    sendMessage: function (messageObject) {
        window.opener.postMessage({
            workerId: this._workerId,
            command: "sendMessageToBackend",
            message: messageObject
        }, "*");
    },
    __proto__: InspectorBackendClass.Connection.prototype
}

WebInspector.UserMetrics = function () {
    for (var actionName in WebInspector.UserMetrics._ActionCodes) {
        var actionCode = WebInspector.UserMetrics._ActionCodes[actionName];
        this[actionName] = new WebInspector.UserMetrics._Recorder(actionCode);
    }
}
WebInspector.UserMetrics._ActionCodes = {
    WindowDocked: 1,
    WindowUndocked: 2,
    ScriptsBreakpointSet: 3,
    TimelineStarted: 4,
    ProfilesCPUProfileTaken: 5,
    ProfilesHeapProfileTaken: 6,
    AuditsStarted: 7,
    ConsoleEvaluated: 8
}
WebInspector.UserMetrics._PanelCodes = {
    elements: 1,
    resources: 2,
    network: 3,
    scripts: 4,
    timeline: 5,
    profiles: 6,
    audits: 7,
    console: 8
}
WebInspector.UserMetrics.UserAction = "UserAction";
WebInspector.UserMetrics.UserActionNames = {
    ForcedElementState: "forcedElementState",
    FileSaved: "fileSaved",
    RevertRevision: "revertRevision",
    ApplyOriginalContent: "applyOriginalContent",
    TogglePrettyPrint: "togglePrettyPrint",
    SetBreakpoint: "setBreakpoint",
    OpenSourceLink: "openSourceLink",
    NetworkSort: "networkSort",
    NetworkRequestSelected: "networkRequestSelected",
    NetworkRequestTabSelected: "networkRequestTabSelected",
    HeapSnapshotFilterChanged: "heapSnapshotFilterChanged"
};
WebInspector.UserMetrics.prototype = {
    panelShown: function (panelName) {
        InspectorFrontendHost.recordPanelShown(WebInspector.UserMetrics._PanelCodes[panelName] || 0);
    }
}
WebInspector.UserMetrics._Recorder = function (actionCode) {
    this._actionCode = actionCode;
}
WebInspector.UserMetrics._Recorder.prototype = {
    record: function () {
        InspectorFrontendHost.recordActionTaken(this._actionCode);
    }
}
WebInspector.userMetrics = new WebInspector.UserMetrics();
WebInspector.RuntimeModel = function (target) {
    this._target = target;
    this._debuggerModel = target.debuggerModel;
    this._agent = target.runtimeAgent();
    this._contextListById = {};
}
WebInspector.RuntimeModel.Events = {
    ExecutionContextListAdded: "ExecutionContextListAdded",
    ExecutionContextListRemoved: "ExecutionContextListRemoved",
}
WebInspector.RuntimeModel.prototype = {
    addWorkerContextList: function (url) {
        console.assert(this._target.isWorkerTarget(), "Worker context list was added in a non-worker target");
        var fakeContextList = new WebInspector.WorkerExecutionContextList("worker", url);
        this._addContextList(fakeContextList);
        var fakeExecutionContext = new WebInspector.ExecutionContext(undefined, url, true);
        fakeContextList._addExecutionContext(fakeExecutionContext);
    },
    setCurrentExecutionContext: function (executionContext) {
        this._currentExecutionContext = executionContext;
    },
    currentExecutionContext: function () {
        return this._currentExecutionContext;
    },
    contextLists: function () {
        return Object.values(this._contextListById);
    },
    contextListByFrame: function (frame) {
        return this._contextListById[frame.id];
    },
    _frameAdded: function (event) {
        console.assert(!this._target.isWorkerTarget(), "Frame was added in a worker target.t");
        var frame = (event.data);
        var contextList = new WebInspector.FrameExecutionContextList(frame);
        this._addContextList(contextList);
    },
    _addContextList: function (executionContextList) {
        this._contextListById[executionContextList.id()] = executionContextList;
        this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextListAdded, executionContextList);
    },
    _frameNavigated: function (event) {
        console.assert(!this._target.isWorkerTarget(), "Frame was navigated in worker's target");
        var frame = (event.data);
        var context = this._contextListById[frame.id];
        if (context)
            context._frameNavigated(frame);
    },
    _frameDetached: function (event) {
        console.assert(!this._target.isWorkerTarget(), "Frame was detached in worker's target");
        var frame = (event.data);
        var context = this._contextListById[frame.id];
        if (!context)
            return;
        this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextListRemoved, context);
        delete this._contextListById[frame.id];
    },
    _didLoadCachedResources: function () {
        this._target.registerRuntimeDispatcher(new WebInspector.RuntimeDispatcher(this));
        this._agent.enable();
    },
    _executionContextCreated: function (context) {
        var contextList = this._contextListById[context.frameId];
        console.assert(contextList);
        contextList._addExecutionContext(new WebInspector.ExecutionContext(context.id, context.name, context.isPageContext));
    },
    // zirak
    evaluate: function (expression, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, callback) {
        if (this._debuggerModel.selectedCallFrame()) {
            this._debuggerModel.evaluateOnSelectedCallFrame(expression, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, callback);
            return;
        }
        if (!expression) {
            expression = "this";
        }

        function evalCallback(error, result, wasThrown) {
            if (error) {
                callback(null, false);
                return;
            }
            if (returnByValue)
                callback(null, !!wasThrown, wasThrown ? null : result);
            else
                callback(WebInspector.RemoteObject.fromPayload(result, this._target), !!wasThrown);
        }
        // this actuall dispatches Runtime.evaluate
        // ...which does a sendMessage to SOMETHING
        // AAAGGGHHHHH
        // FOUND IT! InspectorBackendClass.MainConnection
        console.info('just before agent.evaluate');
        this._agent.evaluate(expression, objectGroup, includeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, this._currentExecutionContext ? this._currentExecutionContext.id : undefined, returnByValue, generatePreview, evalCallback.bind(this));
    },
    completionsForTextPrompt: function (proxyElement, wordRange, force, completionsReadyCallback) {
        var expressionRange = wordRange.startContainer.rangeOfWord(wordRange.startOffset, " =:[({;,!+-*/&|^<>", proxyElement, "backward");
        var expressionString = expressionRange.toString();
        var prefix = wordRange.toString();
        this._completionsForExpression(expressionString, prefix, force, completionsReadyCallback);
    },
    _completionsForExpression: function (expressionString, prefix, force, completionsReadyCallback) {
        var lastIndex = expressionString.length - 1;
        var dotNotation = (expressionString[lastIndex] === ".");
        var bracketNotation = (expressionString[lastIndex] === "[");
        if (dotNotation || bracketNotation)
            expressionString = expressionString.substr(0, lastIndex);
        if (expressionString && parseInt(expressionString, 10) == expressionString) {
            completionsReadyCallback([]);
            return;
        }
        if (!prefix && !expressionString && !force) {
            completionsReadyCallback([]);
            return;
        }
        if (!expressionString && this._debuggerModel.selectedCallFrame())
            this._debuggerModel.getSelectedCallFrameVariables(receivedPropertyNames.bind(this));
        else
            this.evaluate(expressionString, "completion", true, true, false, false, evaluated.bind(this));

        function evaluated(result, wasThrown) {
            if (!result || wasThrown) {
                completionsReadyCallback([]);
                return;
            }

            function getCompletions(primitiveType) {
                var object;
                if (primitiveType === "string")
                    object = new String("");
                else if (primitiveType === "number")
                    object = new Number(0);
                else if (primitiveType === "boolean")
                    object = new Boolean(false);
                else
                    object = this;
                var resultSet = {};
                for (var o = object; o; o = o.__proto__) {
                    try {
                        var names = Object.getOwnPropertyNames(o);
                        for (var i = 0; i < names.length; ++i)
                            resultSet[names[i]] = true;
                    } catch (e) {}
                }
                return resultSet;
            }
            if (result.type === "object" || result.type === "function")
                result.callFunctionJSON(getCompletions, undefined, receivedPropertyNames.bind(this));
            else if (result.type === "string" || result.type === "number" || result.type === "boolean")
                this.evaluate("(" + getCompletions + ")(\"" + result.type + "\")", "completion", false, true, true, false, receivedPropertyNamesFromEval.bind(this));
        }

        function receivedPropertyNamesFromEval(notRelevant, wasThrown, result) {
            if (result && !wasThrown)
                receivedPropertyNames.call(this, result.value);
            else
                completionsReadyCallback([]);
        }

        function receivedPropertyNames(propertyNames) {
            this._agent.releaseObjectGroup("completion");
            if (!propertyNames) {
                completionsReadyCallback([]);
                return;
            }
            var includeCommandLineAPI = (!dotNotation && !bracketNotation);
            if (includeCommandLineAPI) {
                const commandLineAPI = ["dir", "dirxml", "keys", "values", "profile", "profileEnd", "monitorEvents", "unmonitorEvents", "inspect", "copy", "clear", "getEventListeners", "debug", "undebug", "monitor", "unmonitor", "table", "$", "$$", "$x"];
                for (var i = 0; i < commandLineAPI.length; ++i)
                    propertyNames[commandLineAPI[i]] = true;
            }
            this._reportCompletions(completionsReadyCallback, dotNotation, bracketNotation, expressionString, prefix, Object.keys(propertyNames));
        }
    },
    _reportCompletions: function (completionsReadyCallback, dotNotation, bracketNotation, expressionString, prefix, properties) {
        if (bracketNotation) {
            if (prefix.length && prefix[0] === "'")
                var quoteUsed = "'";
            else
                var quoteUsed = "\"";
        }
        var results = [];
        if (!expressionString) {
            const keywords = ["break", "case", "catch", "continue", "default", "delete", "do", "else", "finally", "for", "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with"];
            properties = properties.concat(keywords);
        }
        properties.sort();
        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];
            if (dotNotation && !/^[a-zA-Z_$\u008F-\uFFFF][a-zA-Z0-9_$\u008F-\uFFFF]*$/.test(property))
                continue;
            if (bracketNotation) {
                if (!/^[0-9]+$/.test(property))
                    property = quoteUsed + property.escapeCharacters(quoteUsed + "\\") + quoteUsed;
                property += "]";
            }
            if (property.length < prefix.length)
                continue;
            if (prefix.length && !property.startsWith(prefix))
                continue;
            results.push(property);
        }
        completionsReadyCallback(results);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.runtimeModel;
WebInspector.RuntimeDispatcher = function (runtimeModel) {
    this._runtimeModel = runtimeModel;
}
WebInspector.RuntimeDispatcher.prototype = {
    executionContextCreated: function (context) {
        this._runtimeModel._executionContextCreated(context);
    }
}
WebInspector.ExecutionContext = function (id, name, isPageContext) {
    this.id = id;
    this.name = (isPageContext && !name) ? "<page context>" : name;
    this.isMainWorldContext = isPageContext;
}
WebInspector.ExecutionContext.comparator = function (a, b) {
    if (a.isMainWorldContext)
        return -1;
    if (b.isMainWorldContext)
        return +1;
    return a.name.localeCompare(b.name);
}
WebInspector.ExecutionContextList = function () {
    this._executionContexts = [];
}
WebInspector.ExecutionContextList.EventTypes = {
    Reset: "Reset",
    ContextAdded: "ContextAdded"
}
WebInspector.ExecutionContextList.prototype = {
    _reset: function () {
        this._executionContexts = [];
        this.dispatchEventToListeners(WebInspector.ExecutionContextList.EventTypes.Reset, this);
    },
    _addExecutionContext: function (context) {
        var insertAt = insertionIndexForObjectInListSortedByFunction(context, this._executionContexts, WebInspector.ExecutionContext.comparator);
        this._executionContexts.splice(insertAt, 0, context);
        this.dispatchEventToListeners(WebInspector.ExecutionContextList.EventTypes.ContextAdded, this);
    },
    executionContexts: function () {
        return this._executionContexts;
    },
    mainWorldContext: function () {
        return this._executionContexts[0];
    },
    contextBySecurityOrigin: function (securityOrigin) {
        for (var i = 0; i < this._executionContexts.length; ++i) {
            var context = this._executionContexts[i];
            if (!context.isMainWorldContext && context.name === securityOrigin)
                return context;
        }
        return null;
    },
    id: function () {
        throw "Not implemented";
    },
    url: function () {
        throw "Not implemented";
    },
    displayName: function () {
        throw "Not implemented";
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.FrameExecutionContextList = function (frame) {
    WebInspector.ExecutionContextList.call(this);
    this._frame = frame;
}
WebInspector.FrameExecutionContextList.prototype = {
    _frameNavigated: function (frame) {
        this._frame = frame;
        this._reset();
    },
    id: function () {
        return this._frame.id;
    },
    url: function () {
        return this._frame.url;
    },
    displayName: function () {
        return this._frame.displayName();
    },
    __proto__: WebInspector.ExecutionContextList.prototype
}
WebInspector.WorkerExecutionContextList = function (id, url) {
    WebInspector.ExecutionContextList.call(this);
    this._url = url;
    this._id = id;
}
WebInspector.WorkerExecutionContextList.prototype = {
    id: function () {
        return this._id;
    },
    url: function () {
        return this._url;
    },
    displayName: function () {
        return this._url;
    },
    __proto__: WebInspector.ExecutionContextList.prototype
}
WebInspector.HandlerRegistry = function (setting) {
    WebInspector.Object.call(this);
    this._handlers = {};
    this._setting = setting;
    this._activeHandler = this._setting.get();
    WebInspector.moduleManager.registerModule("handler-registry");
}
WebInspector.HandlerRegistry.prototype = {
    get handlerNames() {
        return Object.getOwnPropertyNames(this._handlers);
    }, get activeHandler() {
        return this._activeHandler;
    }, set activeHandler(value) {
        this._activeHandler = value;
        this._setting.set(value);
    }, dispatch: function (data) {
        return this.dispatchToHandler(this._activeHandler, data);
    }, dispatchToHandler: function (name, data) {
        var handler = this._handlers[name];
        var result = handler && handler(data);
        return !!result;
    }, registerHandler: function (name, handler) {
        this._handlers[name] = handler;
        this.dispatchEventToListeners(WebInspector.HandlerRegistry.EventTypes.HandlersUpdated);
    }, unregisterHandler: function (name) {
        delete this._handlers[name];
        this.dispatchEventToListeners(WebInspector.HandlerRegistry.EventTypes.HandlersUpdated);
    }, _openInNewTab: function (url) {
        InspectorFrontendHost.openInNewTab(url);
    }, _appendContentProviderItems: function (contextMenu, target) {
        if (!(target instanceof WebInspector.UISourceCode || target instanceof WebInspector.Resource || target instanceof WebInspector.NetworkRequest))
            return;
        var contentProvider = (target);
        if (!contentProvider.contentURL())
            return;
        contextMenu.appendItem(WebInspector.openLinkExternallyLabel(), this._openInNewTab.bind(this, contentProvider.contentURL()));
        for (var i = 1; i < this.handlerNames.length; ++i) {
            var handler = this.handlerNames[i];
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Open using %s" : "Open Using %s", handler), this.dispatchToHandler.bind(this, handler, {
                url: contentProvider.contentURL()
            }));
        }
        contextMenu.appendItem(WebInspector.copyLinkAddressLabel(), InspectorFrontendHost.copyText.bind(InspectorFrontendHost, contentProvider.contentURL()));
        if (!contentProvider.contentURL())
            return;
        var contentType = contentProvider.contentType();
        if (contentType !== WebInspector.resourceTypes.Document && contentType !== WebInspector.resourceTypes.Stylesheet && contentType !== WebInspector.resourceTypes.Script)
            return;

        function doSave(forceSaveAs, content) {
            var url = contentProvider.contentURL();
            WebInspector.fileManager.save(url, (content), forceSaveAs);
            WebInspector.fileManager.close(url);
        }

        function save(forceSaveAs) {
            if (contentProvider instanceof WebInspector.UISourceCode) {
                var uiSourceCode = (contentProvider);
                uiSourceCode.saveToFileSystem(forceSaveAs);
                return;
            }
            contentProvider.requestContent(doSave.bind(null, forceSaveAs));
        }
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString("Save"), save.bind(null, false));
        contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Save as..." : "Save As..."), save.bind(null, true));
    }, _appendHrefItems: function (contextMenu, target) {
        if (!(target instanceof Node))
            return;
        var targetNode = (target);
        var anchorElement = targetNode.enclosingNodeOrSelfWithClass("webkit-html-resource-link") || targetNode.enclosingNodeOrSelfWithClass("webkit-html-external-link");
        if (!anchorElement)
            return;
        var resourceURL = anchorElement.href;
        if (!resourceURL)
            return;
        contextMenu.appendItem(WebInspector.openLinkExternallyLabel(), this._openInNewTab.bind(this, resourceURL));

        function openInResourcesPanel(resourceURL) {
            var resource = WebInspector.resourceForURL(resourceURL);
            if (resource)
                WebInspector.Revealer.reveal(resource);
            else
                InspectorFrontendHost.openInNewTab(resourceURL);
        }
        if (WebInspector.resourceForURL(resourceURL))
            contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Open link in Resources panel" : "Open Link in Resources Panel"), openInResourcesPanel.bind(null, resourceURL));
        contextMenu.appendItem(WebInspector.copyLinkAddressLabel(), InspectorFrontendHost.copyText.bind(InspectorFrontendHost, resourceURL));
    }, __proto__: WebInspector.Object.prototype
}
WebInspector.HandlerRegistry.EventTypes = {
    HandlersUpdated: "HandlersUpdated"
}
WebInspector.HandlerSelector = function (handlerRegistry) {
    this._handlerRegistry = handlerRegistry;
    this.element = document.createElement("select");
    this.element.addEventListener("change", this._onChange.bind(this), false);
    this._update();
    this._handlerRegistry.addEventListener(WebInspector.HandlerRegistry.EventTypes.HandlersUpdated, this._update.bind(this));
}
WebInspector.HandlerSelector.prototype = {
    _update: function () {
        this.element.removeChildren();
        var names = this._handlerRegistry.handlerNames;
        var activeHandler = this._handlerRegistry.activeHandler;
        for (var i = 0; i < names.length; ++i) {
            var option = document.createElement("option");
            option.textContent = names[i];
            option.selected = activeHandler === names[i];
            this.element.appendChild(option);
        }
        this.element.disabled = names.length <= 1;
    },
    _onChange: function (event) {
        var value = event.target.value;
        this._handlerRegistry.activeHandler = value;
    }
}
WebInspector.HandlerRegistry.ContextMenuProvider = function () {}
WebInspector.HandlerRegistry.ContextMenuProvider.prototype = {
    appendApplicableItems: function (event, contextMenu, target) {
        WebInspector.openAnchorLocationRegistry._appendContentProviderItems(contextMenu, target);
        WebInspector.openAnchorLocationRegistry._appendHrefItems(contextMenu, target);
    }
}
WebInspector.HandlerRegistry.LinkHandler = function () {}
WebInspector.HandlerRegistry.LinkHandler.prototype = {
    handleLink: function (url, lineNumber) {
        return WebInspector.openAnchorLocationRegistry.dispatch({
            url: url,
            lineNumber: lineNumber
        });
    }
}
WebInspector.openAnchorLocationRegistry;

WebInspector.Progress = function () {}
WebInspector.Progress.Events = {
    Canceled: "Canceled"
}
WebInspector.Progress.prototype = {
    setTotalWork: function (totalWork) {},
    setTitle: function (title) {},
    setWorked: function (worked, title) {},
    worked: function (worked) {},
    done: function () {},
    isCanceled: function () {
        return false;
    },
    addEventListener: function (eventType, listener, thisObject) {}
}
WebInspector.CompositeProgress = function (parent) {
    this._parent = parent;
    this._children = [];
    this._childrenDone = 0;
    this._parent.setTotalWork(1);
    this._parent.setWorked(0);
    parent.addEventListener(WebInspector.Progress.Events.Canceled, this._parentCanceled.bind(this));
}
WebInspector.CompositeProgress.prototype = {
    _childDone: function () {
        if (++this._childrenDone === this._children.length)
            this._parent.done();
    },
    _parentCanceled: function () {
        this.dispatchEventToListeners(WebInspector.Progress.Events.Canceled);
        for (var i = 0; i < this._children.length; ++i) {
            this._children[i].dispatchEventToListeners(WebInspector.Progress.Events.Canceled);
        }
    },
    createSubProgress: function (weight) {
        var child = new WebInspector.SubProgress(this, weight);
        this._children.push(child);
        return child;
    },
    _update: function () {
        var totalWeights = 0;
        var done = 0;
        for (var i = 0; i < this._children.length; ++i) {
            var child = this._children[i];
            if (child._totalWork)
                done += child._weight * child._worked / child._totalWork;
            totalWeights += child._weight;
        }
        this._parent.setWorked(done / totalWeights);
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.SubProgress = function (composite, weight) {
    this._composite = composite;
    this._weight = weight || 1;
    this._worked = 0;
}
WebInspector.SubProgress.prototype = {
    isCanceled: function () {
        return this._composite._parent.isCanceled();
    },
    setTitle: function (title) {
        this._composite._parent.setTitle(title);
    },
    done: function () {
        this.setWorked(this._totalWork);
        this._composite._childDone();
    },
    setTotalWork: function (totalWork) {
        this._totalWork = totalWork;
        this._composite._update();
    },
    setWorked: function (worked, title) {
        this._worked = worked;
        if (typeof title !== "undefined")
            this.setTitle(title);
        this._composite._update();
    },
    worked: function (worked) {
        this.setWorked(this._worked + (worked || 1));
    },
    __proto__: WebInspector.Object.prototype
}
WebInspector.ProgressIndicator = function () {
    this.element = document.createElement("div");
    this.element.className = "progress-bar-container";
    this._labelElement = this.element.createChild("span");
    this._progressElement = this.element.createChild("progress");
    this._stopButton = new WebInspector.StatusBarButton(WebInspector.UIString("Cancel"), "progress-bar-stop-button");
    this._stopButton.addEventListener("click", this.cancel, this);
    this.element.appendChild(this._stopButton.element);
    this._isCanceled = false;
    this._worked = 0;
}
WebInspector.ProgressIndicator.Events = {
    Done: "Done"
}
WebInspector.ProgressIndicator.prototype = {
    show: function (parent) {
        parent.appendChild(this.element);
    },
    hide: function () {
        var parent = this.element.parentElement;
        if (parent)
            parent.removeChild(this.element);
    },
    done: function () {
        if (this._isDone)
            return;
        this._isDone = true;
        this.hide();
        this.dispatchEventToListeners(WebInspector.ProgressIndicator.Events.Done);
    },
    cancel: function () {
        this._isCanceled = true;
        this.dispatchEventToListeners(WebInspector.Progress.Events.Canceled);
    },
    isCanceled: function () {
        return this._isCanceled;
    },
    setTitle: function (title) {
        this._labelElement.textContent = title;
    },
    setTotalWork: function (totalWork) {
        this._progressElement.max = totalWork;
    },
    setWorked: function (worked, title) {
        this._worked = worked;
        this._progressElement.value = worked;
        if (title)
            this.setTitle(title);
    },
    worked: function (worked) {
        this.setWorked(this._worked + (worked || 1));
    },
    __proto__: WebInspector.Object.prototype
}

WebInspector.DockController = function (canDock) {
    this._canDock = canDock;
    if (!canDock) {
        this._dockSide = WebInspector.DockController.State.Undocked;
        this._updateUI();
        return;
    }
    WebInspector.settings.currentDockState = WebInspector.settings.createSetting("currentDockState", "");
    WebInspector.settings.lastDockState = WebInspector.settings.createSetting("lastDockState", "");
    var states = [WebInspector.DockController.State.DockedToBottom, WebInspector.DockController.State.Undocked, WebInspector.DockController.State.DockedToRight];
    var titles = [WebInspector.UIString("Dock to main window."), WebInspector.UIString("Undock into separate window."), WebInspector.UIString("Dock to main window.")];
    if (WebInspector.experimentsSettings.dockToLeft.isEnabled()) {
        states.push(WebInspector.DockController.State.DockedToLeft);
        titles.push(WebInspector.UIString("Dock to main window."));
    }
    this._dockToggleButton = new WebInspector.StatusBarStatesSettingButton("dock-status-bar-item", states, titles, WebInspector.settings.currentDockState, WebInspector.settings.lastDockState, this._dockSideChanged.bind(this));
}
WebInspector.DockController.State = {
    DockedToBottom: "bottom",
    DockedToRight: "right",
    DockedToLeft: "left",
    Undocked: "undocked"
}
WebInspector.DockController.Events = {
    DockSideChanged: "DockSideChanged"
}
WebInspector.DockController.prototype = {
    get element() {
        return this._canDock ? this._dockToggleButton.element : null;
    }, dockSide: function () {
        return this._dockSide;
    }, canDock: function () {
        return this._canDock;
    }, isVertical: function () {
        return this._dockSide === WebInspector.DockController.State.DockedToRight || this._dockSide === WebInspector.DockController.State.DockedToLeft;
    }, _dockSideChanged: function (dockSide) {
        if (this._dockSide === dockSide)
            return;
        this._dockSide = dockSide;
        this._updateUI();
        this.dispatchEventToListeners(WebInspector.DockController.Events.DockSideChanged, this._dockSide);
        if (this._canDock)
            InspectorFrontendHost.setIsDocked(dockSide !== WebInspector.DockController.State.Undocked);
    }, _updateUI: function () {
        var body = document.body;
        switch (this._dockSide) {
        case WebInspector.DockController.State.DockedToBottom:
            body.classList.remove("undocked");
            body.classList.remove("dock-to-right");
            body.classList.remove("dock-to-left");
            body.classList.add("dock-to-bottom");
            break;
        case WebInspector.DockController.State.DockedToRight:
            body.classList.remove("undocked");
            body.classList.add("dock-to-right");
            body.classList.remove("dock-to-left");
            body.classList.remove("dock-to-bottom");
            break;
        case WebInspector.DockController.State.DockedToLeft:
            body.classList.remove("undocked");
            body.classList.remove("dock-to-right");
            body.classList.add("dock-to-left");
            body.classList.remove("dock-to-bottom");
            break;
        case WebInspector.DockController.State.Undocked:
            body.classList.add("undocked");
            body.classList.remove("dock-to-right");
            body.classList.remove("dock-to-left");
            body.classList.remove("dock-to-bottom");
            break;
        }
    }, __proto__: WebInspector.Object.prototype
}
WebInspector.dockController;
