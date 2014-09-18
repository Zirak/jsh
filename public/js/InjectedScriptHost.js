// InjectedScript depends on some native methods. This is their simulation.
var InjectedScriptHost = {
    eval : function (code) {
        return eval(code);
    },

    isHTMLAllCollection : function (suspect) {
        return suspect === document.all;
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
};// InjectedScript depends on some native methods. This is their simulation.
var InjectedScriptHost = {
    eval : function (code) {
        return eval(code);
    },

    isHTMLAllCollection : function (suspect) {
        return suspect === document.all;
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
