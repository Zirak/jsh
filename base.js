// this has to be prettier...
function handleDependencies (deps) {
    function injectScript (src) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');

            script.onload  = resolve;
            script.onerror = reject;

            script.src = src;
            document.head.appendChild(script);
        });
    }

    function wasHandled (src) {
        if (handleDependencies._loaded[src]) {
            return Promise.resolve();
        }
        if (handleDependencies._loading[src]) {
            return handleDependencies._loading[src];
        }
    }

    if (!Array.isArray(deps)) {
        deps = [deps];
    }
    if (!deps.length) {
        return Promise.resolve();
    }

    // break this function into several.
    var ret = deps.map(function (spec) {
        if (spec.charAt) {
            spec = { url : spec };
        }

        var src = spec.url,
            handled = wasHandled(src);

        if (handled) {
            return handled;
        }

        // the .then chain could be done better.
        return handleDependencies._loading[src] = handleDependencies(spec.depends || [])
        .then(function () {
            var scriptPromise = injectScript(src);
            handleDependencies._loading[src] = scriptPromise;

            return scriptPromise;
        })
        .then(function () {
            delete handleDependencies._loading[src];
            handleDependencies._loaded[src] = true;
        })
        .catch(function (err) {
            console.error(err);
            console.error(
                'failed loading script',
                spec.url,
                '. Dependencies will not be loaded');
        });
    });

    return Promise.all(ret);
}

handleDependencies._loaded = Object.create(null);
handleDependencies._loading = Object.create(null);

var common = [
    'Platform.js',
    'common/utilities.js', 'common/Object.js', 'common/Settings.js',
    'common/Geometry.js', 'common/UIString.js', 'common/Console.js',
    'common/Throttler.js', 'common/ParsedURL.js'
];

var uiCommon = common.concat(
    'ui/DOMExtension.js', 'ui/UIUtils.js', 'ui/ZoomManager.js',
    'ui/KeyboardShortcut.js'
);

var panel = {
    url : 'ui/Panel.js',
    depends : [
        {
            url : 'View.js',
            depends : uiCommon
        }
    ]
};

var target = {
    url : 'sdk/Target.js',
    depends : [
        {
            url : 'sdk/InspectorBackend.js',
            depends : common
        }
    ]
};

var deps = [
'main/ModuleManager.js',
'main/modules.js',

{
    url : 'components/SearchableView.js',
    depends : panel
},

'ui/ViewportControl.js',
'ui/TextPrompt.js',
'ui/SuggestBox.js',
'ui/Context.js',

'sdk/Linkifier.js',
'components/ExecutionContextSelector.js',

{
    url : 'InspectorFrontendHost.js',
    depends : common
},

{
    url : 'ui/InspectorView.js',
    depends : [
        {
            url : 'ui/SplitView.js',
            depends : [
                {
                    url : 'ui/ResizerWidget.js',
                    depends : [panel]
                }
            ]
        },
        {
            url : 'ui/TabbedPane.js',
            depends : [
                {
                    url : 'ui/DropDownMenu.js',
                    depends : [panel]
                }
            ]
        },
        {
            url : 'components/Drawer.js',
            depends : ['ui/StatusBarButton.js', panel]
        }
    ]
},

'components/DockController.js',

{
    url : 'main/SimpleApp.js',
    depends : ['main/App.js']
},

{
    url : 'sdk/ConsoleModel.js',
    depends : [
        target,
        {
            url : 'sdk/RuntimeModel.js',
            depends : [target]
        }
    ]
}]

var main = {
    url : 'main/Main.js',
    depends : deps
};

handleDependencies(main).then(function () {
    console.info('loaded dependencies');
    // some stuff rely on DOMContentLoaded. the people asketh, the people shall
    //receive.

    var evt = document.createEvent('Event');
    evt.initEvent('DOMContentLoaded', true, true);
    window.dispatchEvent(evt);
});
