Object.isEmpty = function (obj) {
    for (var i in obj)
        return false;
    return true;
}
Object.values = function (obj) {
    var result = Object.keys(obj);
    var length = result.length;
    for (var i = 0; i < length; ++i)
        result[i] = obj[result[i]];
    return result;
}
String.prototype.findAll = function (string) {
    var matches = [];
    var i = this.indexOf(string);
    while (i !== -1) {
        matches.push(i);
        i = this.indexOf(string, i + string.length);
    }
    return matches;
}
String.prototype.lineEndings = function () {
    if (!this._lineEndings) {
        this._lineEndings = this.findAll("\n");
        this._lineEndings.push(this.length);
    }
    return this._lineEndings;
}
String.prototype.lineCount = function () {
    var lineEndings = this.lineEndings();
    return lineEndings.length;
}
String.prototype.lineAt = function (lineNumber) {
    var lineEndings = this.lineEndings();
    var lineStart = lineNumber > 0 ? lineEndings[lineNumber - 1] + 1 : 0;
    var lineEnd = lineEndings[lineNumber];
    var lineContent = this.substring(lineStart, lineEnd);
    if (lineContent.length > 0 && lineContent.charAt(lineContent.length - 1) === "\r")
        lineContent = lineContent.substring(0, lineContent.length - 1);
    return lineContent;
}
String.prototype.escapeCharacters = function (chars) {
    var foundChar = false;
    for (var i = 0; i < chars.length; ++i) {
        if (this.indexOf(chars.charAt(i)) !== -1) {
            foundChar = true;
            break;
        }
    }
    if (!foundChar)
        return String(this);
    var result = "";
    for (var i = 0; i < this.length; ++i) {
        if (chars.indexOf(this.charAt(i)) !== -1)
            result += "\\";
        result += this.charAt(i);
    }
    return result;
}
String.regexSpecialCharacters = function () {
    return "^[]{}()\\.^$*+?|-,";
}
String.prototype.escapeForRegExp = function () {
    return this.escapeCharacters(String.regexSpecialCharacters());
}
String.prototype.escapeHTML = function () {
    return this.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
String.prototype.collapseWhitespace = function () {
    return this.replace(/[\s\xA0]+/g, " ");
}
String.prototype.trimMiddle = function (maxLength) {
    if (this.length <= maxLength)
        return String(this);
    var leftHalf = maxLength >> 1;
    var rightHalf = maxLength - leftHalf - 1;
    return this.substr(0, leftHalf) + "\u2026" + this.substr(this.length - rightHalf, rightHalf);
}
String.prototype.trimEnd = function (maxLength) {
    if (this.length <= maxLength)
        return String(this);
    return this.substr(0, maxLength - 1) + "\u2026";
}
String.prototype.trimURL = function (baseURLDomain) {
    var result = this.replace(/^(https|http|file):\/\//i, "");
    if (baseURLDomain)
        result = result.replace(new RegExp("^" + baseURLDomain.escapeForRegExp(), "i"), "");
    return result;
}
String.prototype.toTitleCase = function () {
    return this.substring(0, 1).toUpperCase() + this.substring(1);
}
String.prototype.compareTo = function (other) {
    if (this > other)
        return 1;
    if (this < other)
        return -1;
    return 0;
}

function sanitizeHref(href) {
    return href && href.trim().toLowerCase().startsWith("javascript:") ? null : href;
}
String.prototype.removeURLFragment = function () {
    var fragmentIndex = this.indexOf("#");
    if (fragmentIndex == -1)
        fragmentIndex = this.length;
    return this.substring(0, fragmentIndex);
}
String.prototype.startsWith = function (substring) {
    return !this.lastIndexOf(substring, 0);
}
String.prototype.endsWith = function (substring) {
    return this.indexOf(substring, this.length - substring.length) !== -1;
}
String.prototype.hashCode = function () {
    var result = 0;
    for (var i = 0; i < this.length; ++i)
        result = result * 3 + this.charCodeAt(i);
    return result;
}
String.naturalOrderComparator = function (a, b) {
    var chunk = /^\d+|^\D+/;
    var chunka, chunkb, anum, bnum;
    while (1) {
        if (a) {
            if (!b)
                return 1;
        } else {
            if (b)
                return -1;
            else
                return 0;
        }
        chunka = a.match(chunk)[0];
        chunkb = b.match(chunk)[0];
        anum = !isNaN(chunka);
        bnum = !isNaN(chunkb);
        if (anum && !bnum)
            return -1;
        if (bnum && !anum)
            return 1;
        if (anum && bnum) {
            var diff = chunka - chunkb;
            if (diff)
                return diff;
            if (chunka.length !== chunkb.length) {
                if (!+chunka && !+chunkb)
                    return chunka.length - chunkb.length;
                else
                    return chunkb.length - chunka.length;
            }
        } else if (chunka !== chunkb)
            return (chunka < chunkb) ? -1 : 1;
        a = a.substring(chunka.length);
        b = b.substring(chunkb.length);
    }
}
Number.constrain = function (num, min, max) {
    if (num < min)
        num = min;
    else if (num > max)
        num = max;
    return num;
}
Number.gcd = function (a, b) {
    if (b === 0)
        return a;
    else
        return Number.gcd(b, a % b);
}
Number.toFixedIfFloating = function (value) {
    if (!value || isNaN(value))
        return value;
    var number = Number(value);
    return number % 1 ? number.toFixed(3) : String(number);
}
Date.prototype.toISO8601Compact = function () {
    function leadZero(x) {
        return (x > 9 ? "" : "0") + x;
    }
    return this.getFullYear() +
        leadZero(this.getMonth() + 1) +
        leadZero(this.getDate()) + "T" +
        leadZero(this.getHours()) +
        leadZero(this.getMinutes()) +
        leadZero(this.getSeconds());
}
Date.prototype.toConsoleTime = function () {
    function leadZero2(x) {
        return (x > 9 ? "" : "0") + x;
    }

    function leadZero3(x) {
        return (Array(4 - x.toString().length)).join('0') + x;
    }
    return this.getFullYear() + "-" +
        leadZero2(this.getMonth() + 1) + "-" +
        leadZero2(this.getDate()) + " " +
        leadZero2(this.getHours()) + ":" +
        leadZero2(this.getMinutes()) + ":" +
        leadZero2(this.getSeconds()) + "." +
        leadZero3(this.getMilliseconds());
}
Object.defineProperty(Array.prototype, "remove", {
    value: function (value, firstOnly) {
        var index = this.indexOf(value);
        if (index === -1)
            return;
        if (firstOnly) {
            this.splice(index, 1);
            return;
        }
        for (var i = index + 1, n = this.length; i < n; ++i) {
            if (this[i] !== value)
                this[index++] = this[i];
        }
        this.length = index;
    }
});
Object.defineProperty(Array.prototype, "keySet", {
    value: function () {
        var keys = {};
        for (var i = 0; i < this.length; ++i)
            keys[this[i]] = true;
        return keys;
    }
});
Object.defineProperty(Array.prototype, "rotate", {
    value: function (index) {
        var result = [];
        for (var i = index; i < index + this.length; ++i)
            result.push(this[i % this.length]);
        return result;
    }
});
Object.defineProperty(Uint32Array.prototype, "sort", {
    value: Array.prototype.sort
});
(function () {
    var partition = {
        value: function (comparator, left, right, pivotIndex) {
            function swap(array, i1, i2) {
                var temp = array[i1];
                array[i1] = array[i2];
                array[i2] = temp;
            }
            var pivotValue = this[pivotIndex];
            swap(this, right, pivotIndex);
            var storeIndex = left;
            for (var i = left; i < right; ++i) {
                if (comparator(this[i], pivotValue) < 0) {
                    swap(this, storeIndex, i);
                    ++storeIndex;
                }
            }
            swap(this, right, storeIndex);
            return storeIndex;
        }
    };
    Object.defineProperty(Array.prototype, "partition", partition);
    Object.defineProperty(Uint32Array.prototype, "partition", partition);
    var sortRange = {
        value: function (comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight) {
            function quickSortRange(array, comparator, left, right, sortWindowLeft, sortWindowRight) {
                if (right <= left)
                    return;
                var pivotIndex = Math.floor(Math.random() * (right - left)) + left;
                var pivotNewIndex = array.partition(comparator, left, right, pivotIndex);
                if (sortWindowLeft < pivotNewIndex)
                    quickSortRange(array, comparator, left, pivotNewIndex - 1, sortWindowLeft, sortWindowRight);
                if (pivotNewIndex < sortWindowRight)
                    quickSortRange(array, comparator, pivotNewIndex + 1, right, sortWindowLeft, sortWindowRight);
            }
            if (leftBound === 0 && rightBound === (this.length - 1) && sortWindowLeft === 0 && sortWindowRight >= rightBound)
                this.sort(comparator);
            else
                quickSortRange(this, comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight);
            return this;
        }
    }
    Object.defineProperty(Array.prototype, "sortRange", sortRange);
    Object.defineProperty(Uint32Array.prototype, "sortRange", sortRange);
})();
Object.defineProperty(Array.prototype, "stableSort", {
    value: function (comparator) {
        function defaultComparator(a, b) {
            return a < b ? -1 : (a > b ? 1 : 0);
        }
        comparator = comparator || defaultComparator;
        var indices = new Array(this.length);
        for (var i = 0; i < this.length; ++i)
            indices[i] = i;
        var self = this;

        function indexComparator(a, b) {
            var result = comparator(self[a], self[b]);
            return result ? result : a - b;
        }
        indices.sort(indexComparator);
        for (var i = 0; i < this.length; ++i) {
            if (indices[i] < 0 || i === indices[i])
                continue;
            var cyclical = i;
            var saved = this[i];
            while (true) {
                var next = indices[cyclical];
                indices[cyclical] = -1;
                if (next === i) {
                    this[cyclical] = saved;
                    break;
                } else {
                    this[cyclical] = this[next];
                    cyclical = next;
                }
            }
        }
        return this;
    }
});
Object.defineProperty(Array.prototype, "qselect", {
    value: function (k, comparator) {
        if (k < 0 || k >= this.length)
            return;
        if (!comparator)
            comparator = function (a, b) {
                return a - b;
            }
        var low = 0;
        var high = this.length - 1;
        for (;;) {
            var pivotPosition = this.partition(comparator, low, high, Math.floor((high + low) / 2));
            if (pivotPosition === k)
                return this[k];
            else if (pivotPosition > k)
                high = pivotPosition - 1;
            else
                low = pivotPosition + 1;
        }
    }
});
Object.defineProperty(Array.prototype, "lowerBound", {
    value: function (object, comparator, left, right) {
        function defaultComparator(a, b) {
            return a < b ? -1 : (a > b ? 1 : 0);
        }
        comparator = comparator || defaultComparator;
        var l = left || 0;
        var r = right !== undefined ? right : this.length;
        while (l < r) {
            var m = (l + r) >> 1;
            if (comparator(object, this[m]) > 0)
                l = m + 1;
            else
                r = m;
        }
        return r;
    }
});
Object.defineProperty(Array.prototype, "upperBound", {
    value: function (object, comparator, left, right) {
        function defaultComparator(a, b) {
            return a < b ? -1 : (a > b ? 1 : 0);
        }
        comparator = comparator || defaultComparator;
        var l = left || 0;
        var r = right !== undefined ? right : this.length;
        while (l < r) {
            var m = (l + r) >> 1;
            if (comparator(object, this[m]) >= 0)
                l = m + 1;
            else
                r = m;
        }
        return r;
    }
});
Object.defineProperty(Array.prototype, "binaryIndexOf", {
    value: function (value, comparator) {
        var index = this.lowerBound(value, comparator);
        return index < this.length && comparator(value, this[index]) === 0 ? index : -1;
    }
});
Object.defineProperty(Array.prototype, "select", {
    value: function (field) {
        var result = new Array(this.length);
        for (var i = 0; i < this.length; ++i)
            result[i] = this[i][field];
        return result;
    }
});
Object.defineProperty(Array.prototype, "peekLast", {
    value: function () {
        return this[this.length - 1];
    }
});
(function () {
    function mergeOrIntersect(array1, array2, comparator, mergeNotIntersect) {
        var result = [];
        var i = 0;
        var j = 0;
        while (i < array1.length && j < array2.length) {
            var compareValue = comparator(array1[i], array2[j]);
            if (mergeNotIntersect || !compareValue)
                result.push(compareValue <= 0 ? array1[i] : array2[j]);
            if (compareValue <= 0)
                i++;
            if (compareValue >= 0)
                j++;
        }
        if (mergeNotIntersect) {
            while (i < array1.length)
                result.push(array1[i++]);
            while (j < array2.length)
                result.push(array2[j++]);
        }
        return result;
    }
    Object.defineProperty(Array.prototype, "intersectOrdered", {
        value: function (array, comparator) {
            return mergeOrIntersect(this, array, comparator, false);
        }
    });
    Object.defineProperty(Array.prototype, "mergeOrdered", {
        value: function (array, comparator) {
            return mergeOrIntersect(this, array, comparator, true);
        }
    });
}());

function insertionIndexForObjectInListSortedByFunction(object, list, comparator, insertionIndexAfter) {
    if (insertionIndexAfter)
        return list.upperBound(object, comparator);
    else
        return list.lowerBound(object, comparator);
}
String.sprintf = function (format, var_arg) {
    return String.vsprintf(format, Array.prototype.slice.call(arguments, 1));
}
String.tokenizeFormatString = function (format, formatters) {
    var tokens = [];
    var substitutionIndex = 0;

    function addStringToken(str) {
        tokens.push({
            type: "string",
            value: str
        });
    }

    function addSpecifierToken(specifier, precision, substitutionIndex) {
        tokens.push({
            type: "specifier",
            specifier: specifier,
            precision: precision,
            substitutionIndex: substitutionIndex
        });
    }

    function isDigit(c) {
        return !!/[0-9]/.exec(c);
    }
    var index = 0;
    for (var precentIndex = format.indexOf("%", index); precentIndex !== -1; precentIndex = format.indexOf("%", index)) {
        addStringToken(format.substring(index, precentIndex));
        index = precentIndex + 1;
        if (isDigit(format[index])) {
            var number = parseInt(format.substring(index), 10);
            while (isDigit(format[index]))
            ++index;
            if (number > 0 && format[index] === "$") {
                substitutionIndex = (number - 1);
                ++index;
            }
        }
        var precision = -1;
        if (format[index] === ".") {
            ++index;
            precision = parseInt(format.substring(index), 10);
            if (isNaN(precision))
                precision = 0;
            while (isDigit(format[index]))
            ++index;
        }
        if (!(format[index] in formatters)) {
            addStringToken(format.substring(precentIndex, index + 1));
            ++index;
            continue;
        }
        addSpecifierToken(format[index], precision, substitutionIndex);
        ++substitutionIndex;
        ++index;
    }
    addStringToken(format.substring(index));
    return tokens;
}
String.standardFormatters = {
    d: function (substitution) {
        return !isNaN(substitution) ? substitution : 0;
    },
    f: function (substitution, token) {
        if (substitution && token.precision > -1)
            substitution = substitution.toFixed(token.precision);
        return !isNaN(substitution) ? substitution : (token.precision > -1 ? Number(0).toFixed(token.precision) : 0);
    },
    s: function (substitution) {
        return substitution;
    }
}
String.vsprintf = function (format, substitutions) {
    return String.format(format, substitutions, String.standardFormatters, "", function (a, b) {
        return a + b;
    }).formattedResult;
}
String.format = function (format, substitutions, formatters, initialValue, append) {
    if (!format || !substitutions || !substitutions.length)
        return {
            formattedResult: append(initialValue, format),
            unusedSubstitutions: substitutions
        };

    function prettyFunctionName() {
        return "String.format(\"" + format + "\", \"" + substitutions.join("\", \"") + "\")";
    }

    function warn(msg) {
        console.warn(prettyFunctionName() + ": " + msg);
    }

    function error(msg) {
        console.error(prettyFunctionName() + ": " + msg);
    }
    var result = initialValue;
    var tokens = String.tokenizeFormatString(format, formatters);
    var usedSubstitutionIndexes = {};
    for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i];
        if (token.type === "string") {
            result = append(result, token.value);
            continue;
        }
        if (token.type !== "specifier") {
            error("Unknown token type \"" + token.type + "\" found.");
            continue;
        }
        if (token.substitutionIndex >= substitutions.length) {
            error("not enough substitution arguments. Had " + substitutions.length + " but needed " + (token.substitutionIndex + 1) + ", so substitution was skipped.");
            result = append(result, "%" + (token.precision > -1 ? token.precision : "") + token.specifier);
            continue;
        }
        usedSubstitutionIndexes[token.substitutionIndex] = true;
        if (!(token.specifier in formatters)) {
            warn("unsupported format character \u201C" + token.specifier + "\u201D. Treating as a string.");
            result = append(result, substitutions[token.substitutionIndex]);
            continue;
        }
        result = append(result, formatters[token.specifier](substitutions[token.substitutionIndex], token));
    }
    var unusedSubstitutions = [];
    for (var i = 0; i < substitutions.length; ++i) {
        if (i in usedSubstitutionIndexes)
            continue;
        unusedSubstitutions.push(substitutions[i]);
    }
    return {
        formattedResult: result,
        unusedSubstitutions: unusedSubstitutions
    };
}

function createSearchRegex(query, caseSensitive, isRegex) {
    var regexFlags = caseSensitive ? "g" : "gi";
    var regexObject;
    if (isRegex) {
        try {
            regexObject = new RegExp(query, regexFlags);
        } catch (e) {}
    }
    if (!regexObject)
        regexObject = createPlainTextSearchRegex(query, regexFlags);
    return regexObject;
}

function createPlainTextSearchRegex(query, flags) {
    var regexSpecialCharacters = String.regexSpecialCharacters();
    var regex = "";
    for (var i = 0; i < query.length; ++i) {
        var c = query.charAt(i);
        if (regexSpecialCharacters.indexOf(c) != -1)
            regex += "\\";
        regex += c;
    }
    return new RegExp(regex, flags || "");
}

function countRegexMatches(regex, content) {
    var text = content;
    var result = 0;
    var match;
    while (text && (match = regex.exec(text))) {
        if (match[0].length > 0)
        ++result;
        text = text.substring(match.index + 1);
    }
    return result;
}

function numberToStringWithSpacesPadding(value, symbolsCount) {
    var numberString = value.toString();
    var paddingLength = Math.max(0, symbolsCount - numberString.length);
    var paddingString = Array(paddingLength + 1).join("\u00a0");
    return paddingString + numberString;
}
var createObjectIdentifier = function () {
    return "_" + ++createObjectIdentifier._last;
}
createObjectIdentifier._last = 0;
var Set = function () {
    this._set = {};
    this._size = 0;
}
Set.prototype = {
    add: function (item) {
        var objectIdentifier = item.__identifier;
        if (!objectIdentifier) {
            objectIdentifier = createObjectIdentifier();
            item.__identifier = objectIdentifier;
        }
        if (!this._set[objectIdentifier])
        ++this._size;
        this._set[objectIdentifier] = item;
    },
    remove: function (item) {
        if (this._set[item.__identifier]) {
            --this._size;
            delete this._set[item.__identifier];
            return true;
        }
        return false;
    },
    items: function () {
        var result = new Array(this._size);
        var i = 0;
        for (var objectIdentifier in this._set)
            result[i++] = this._set[objectIdentifier];
        return result;
    },
    hasItem: function (item) {
        return !!this._set[item.__identifier];
    },
    size: function () {
        return this._size;
    },
    clear: function () {
        this._set = {};
        this._size = 0;
    }
}
var Map = function () {
    this._map = {};
    this._size = 0;
}
Map.prototype = {
    put: function (key, value) {
        var objectIdentifier = key.__identifier;
        if (!objectIdentifier) {
            objectIdentifier = createObjectIdentifier();
            key.__identifier = objectIdentifier;
        }
        if (!this._map[objectIdentifier])
        ++this._size;
        this._map[objectIdentifier] = [key, value];
    },
    remove: function (key) {
        var result = this._map[key.__identifier];
        if (!result)
            return undefined;
        --this._size;
        delete this._map[key.__identifier];
        return result[1];
    },
    keys: function () {
        return this._list(0);
    },
    values: function () {
        return this._list(1);
    },
    _list: function (index) {
        var result = new Array(this._size);
        var i = 0;
        for (var objectIdentifier in this._map)
            result[i++] = this._map[objectIdentifier][index];
        return result;
    },
    get: function (key) {
        var entry = this._map[key.__identifier];
        return entry ? entry[1] : undefined;
    },
    contains: function (key) {
        var entry = this._map[key.__identifier];
        return !!entry;
    },
    size: function () {
        return this._size;
    },
    clear: function () {
        this._map = {};
        this._size = 0;
    }
}
var StringMap = function () {
    this._map = {};
    this._size = 0;
}
StringMap.prototype = {
    put: function (key, value) {
        if (key === "__proto__") {
            if (!this._hasProtoKey) {
                ++this._size;
                this._hasProtoKey = true;
            }
            this._protoValue = value;
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(this._map, key))
        ++this._size;
        this._map[key] = value;
    },
    remove: function (key) {
        var result;
        if (key === "__proto__") {
            if (!this._hasProtoKey)
                return undefined;
            --this._size;
            delete this._hasProtoKey;
            result = this._protoValue;
            delete this._protoValue;
            return result;
        }
        if (!Object.prototype.hasOwnProperty.call(this._map, key))
            return undefined;
        --this._size;
        result = this._map[key];
        delete this._map[key];
        return result;
    },
    keys: function () {
        var result = Object.keys(this._map) || [];
        if (this._hasProtoKey)
            result.push("__proto__");
        return result;
    },
    values: function () {
        var result = Object.values(this._map);
        if (this._hasProtoKey)
            result.push(this._protoValue);
        return result;
    },
    get: function (key) {
        if (key === "__proto__")
            return this._protoValue;
        if (!Object.prototype.hasOwnProperty.call(this._map, key))
            return undefined;
        return this._map[key];
    },
    contains: function (key) {
        var result;
        if (key === "__proto__")
            return this._hasProtoKey;
        return Object.prototype.hasOwnProperty.call(this._map, key);
    },
    size: function () {
        return this._size;
    },
    clear: function () {
        this._map = {};
        this._size = 0;
        delete this._hasProtoKey;
        delete this._protoValue;
    }
}
var StringSet = function () {
    this._map = new StringMap();
}
StringSet.prototype = {
    put: function (value) {
        this._map.put(value, true);
    },
    remove: function (value) {
        return !!this._map.remove(value);
    },
    values: function () {
        return this._map.keys();
    },
    contains: function (value) {
        return this._map.contains(value);
    },
    size: function () {
        return this._map.size();
    },
    clear: function () {
        this._map.clear();
    }
}

function loadXHR(url, async, callback) {
    function onReadyStateChanged() {
        if (xhr.readyState !== XMLHttpRequest.DONE)
            return;
        if (xhr.status === 200) {
            callback(xhr.responseText);
            return;
        }
        callback(null);
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, async);
    if (async)
        xhr.onreadystatechange = onReadyStateChanged;
    xhr.send(null);
    if (!async) {
        if (xhr.status === 200)
            return xhr.responseText;
        return null;
    }
    return null;
}
var _importedScripts = {};

function importScript(scriptName) {
    if (_importedScripts[scriptName])
        return;
    var xhr = new XMLHttpRequest();
    _importedScripts[scriptName] = true;
    xhr.open("GET", scriptName, false);
    xhr.send(null);
    if (!xhr.responseText)
        throw "empty response arrived for script '" + scriptName + "'";
    var baseUrl = location.origin + location.pathname;
    baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf("/"));
    var sourceURL = baseUrl + "/" + scriptName;
    self.eval(xhr.responseText + "\n//# sourceURL=" + sourceURL);
}
var loadScript = importScript;

function CallbackBarrier() {
    this._pendingIncomingCallbacksCount = 0;
}
CallbackBarrier.prototype = {
    createCallback: function (userCallback) {
        console.assert(!this._outgoingCallback, "CallbackBarrier.createCallback() is called after CallbackBarrier.callWhenDone()");
        ++this._pendingIncomingCallbacksCount;
        return this._incomingCallback.bind(this, userCallback);
    },
    callWhenDone: function (callback) {
        console.assert(!this._outgoingCallback, "CallbackBarrier.callWhenDone() is called multiple times");
        this._outgoingCallback = callback;
        if (!this._pendingIncomingCallbacksCount)
            this._outgoingCallback();
    },
    _incomingCallback: function (userCallback) {
        console.assert(this._pendingIncomingCallbacksCount > 0);
        if (userCallback) {
            var args = Array.prototype.slice.call(arguments, 1);
            userCallback.apply(null, args);
        }
        if (!--this._pendingIncomingCallbacksCount && this._outgoingCallback)
            this._outgoingCallback();
    }
}

function suppressUnused(value) {}
__whitespace = {
    " ": true,
    "\t": true,
    "\n": true,
    "\f": true,
    "\r": true
};
difflib = {
    defaultJunkFunction: function (c) {
        return __whitespace.hasOwnProperty(c);
    },
    stripLinebreaks: function (str) {
        return str.replace(/^[\n\r]*|[\n\r]*$/g, "");
    },
    stringAsLines: function (str) {
        var lfpos = str.indexOf("\n");
        var crpos = str.indexOf("\r");
        var linebreak = ((lfpos > -1 && crpos > -1) || crpos < 0) ? "\n" : "\r";
        var lines = str.split(linebreak);
        for (var i = 0; i < lines.length; i++) {
            lines[i] = difflib.stripLinebreaks(lines[i]);
        }
        return lines;
    },
    __reduce: function (func, list, initial) {
        if (initial != null) {
            var value = initial;
            var idx = 0;
        } else if (list) {
            var value = list[0];
            var idx = 1;
        } else {
            return null;
        }
        for (; idx < list.length; idx++) {
            value = func(value, list[idx]);
        }
        return value;
    },
    __ntuplecomp: function (a, b) {
        var mlen = Math.max(a.length, b.length);
        for (var i = 0; i < mlen; i++) {
            if (a[i] < b[i])
                return -1;
            if (a[i] > b[i])
                return 1;
        }
        return a.length == b.length ? 0 : (a.length < b.length ? -1 : 1);
    },
    __calculate_ratio: function (matches, length) {
        return length ? 2.0 * matches / length : 1.0;
    },
    __isindict: function (dict) {
        return function (key) {
            return dict.hasOwnProperty(key);
        };
    },
    __dictget: function (dict, key, defaultValue) {
        return dict.hasOwnProperty(key) ? dict[key] : defaultValue;
    },
    SequenceMatcher: function (a, b, isjunk) {
        this.set_seqs = function (a, b) {
            this.set_seq1(a);
            this.set_seq2(b);
        }
        this.set_seq1 = function (a) {
            if (a == this.a)
                return;
            this.a = a;
            this.matching_blocks = this.opcodes = null;
        }
        this.set_seq2 = function (b) {
            if (b == this.b)
                return;
            this.b = b;
            this.matching_blocks = this.opcodes = this.fullbcount = null;
            this.__chain_b();
        }
        this.__chain_b = function () {
            var b = this.b;
            var n = b.length;
            var b2j = this.b2j = {};
            var populardict = {};
            for (var i = 0; i < b.length; i++) {
                var elt = b[i];
                if (b2j.hasOwnProperty(elt)) {
                    var indices = b2j[elt];
                    if (n >= 200 && indices.length * 100 > n) {
                        populardict[elt] = 1;
                        delete b2j[elt];
                    } else {
                        indices.push(i);
                    }
                } else {
                    b2j[elt] = [i];
                }
            }
            for (var elt in populardict) {
                if (populardict.hasOwnProperty(elt)) {
                    delete b2j[elt];
                }
            }
            var isjunk = this.isjunk;
            var junkdict = {};
            if (isjunk) {
                for (var elt in populardict) {
                    if (populardict.hasOwnProperty(elt) && isjunk(elt)) {
                        junkdict[elt] = 1;
                        delete populardict[elt];
                    }
                }
                for (var elt in b2j) {
                    if (b2j.hasOwnProperty(elt) && isjunk(elt)) {
                        junkdict[elt] = 1;
                        delete b2j[elt];
                    }
                }
            }
            this.isbjunk = difflib.__isindict(junkdict);
            this.isbpopular = difflib.__isindict(populardict);
        }
        this.find_longest_match = function (alo, ahi, blo, bhi) {
            var a = this.a;
            var b = this.b;
            var b2j = this.b2j;
            var isbjunk = this.isbjunk;
            var besti = alo;
            var bestj = blo;
            var bestsize = 0;
            var j = null;
            var j2len = {};
            var nothing = [];
            for (var i = alo; i < ahi; i++) {
                var newj2len = {};
                var jdict = difflib.__dictget(b2j, a[i], nothing);
                for (var jkey in jdict) {
                    if (jdict.hasOwnProperty(jkey)) {
                        j = jdict[jkey];
                        if (j < blo)
                            continue;
                        if (j >= bhi)
                            break;
                        newj2len[j] = k = difflib.__dictget(j2len, j - 1, 0) + 1;
                        if (k > bestsize) {
                            besti = i - k + 1;
                            bestj = j - k + 1;
                            bestsize = k;
                        }
                    }
                }
                j2len = newj2len;
            }
            while (besti > alo && bestj > blo && !isbjunk(b[bestj - 1]) && a[besti - 1] == b[bestj - 1]) {
                besti--;
                bestj--;
                bestsize++;
            }
            while (besti + bestsize < ahi && bestj + bestsize < bhi && !isbjunk(b[bestj + bestsize]) && a[besti + bestsize] == b[bestj + bestsize]) {
                bestsize++;
            }
            while (besti > alo && bestj > blo && isbjunk(b[bestj - 1]) && a[besti - 1] == b[bestj - 1]) {
                besti--;
                bestj--;
                bestsize++;
            }
            while (besti + bestsize < ahi && bestj + bestsize < bhi && isbjunk(b[bestj + bestsize]) && a[besti + bestsize] == b[bestj + bestsize]) {
                bestsize++;
            }
            return [besti, bestj, bestsize];
        }
        this.get_matching_blocks = function () {
            if (this.matching_blocks != null)
                return this.matching_blocks;
            var la = this.a.length;
            var lb = this.b.length;
            var queue = [
                [0, la, 0, lb]
            ];
            var matching_blocks = [];
            var alo, ahi, blo, bhi, qi, i, j, k, x;
            while (queue.length) {
                qi = queue.pop();
                alo = qi[0];
                ahi = qi[1];
                blo = qi[2];
                bhi = qi[3];
                x = this.find_longest_match(alo, ahi, blo, bhi);
                i = x[0];
                j = x[1];
                k = x[2];
                if (k) {
                    matching_blocks.push(x);
                    if (alo < i && blo < j)
                        queue.push([alo, i, blo, j]);
                    if (i + k < ahi && j + k < bhi)
                        queue.push([i + k, ahi, j + k, bhi]);
                }
            }
            matching_blocks.sort(difflib.__ntuplecomp);
            var i1 = j1 = k1 = block = 0;
            var non_adjacent = [];
            for (var idx in matching_blocks) {
                if (matching_blocks.hasOwnProperty(idx)) {
                    block = matching_blocks[idx];
                    i2 = block[0];
                    j2 = block[1];
                    k2 = block[2];
                    if (i1 + k1 == i2 && j1 + k1 == j2) {
                        k1 += k2;
                    } else {
                        if (k1)
                            non_adjacent.push([i1, j1, k1]);
                        i1 = i2;
                        j1 = j2;
                        k1 = k2;
                    }
                }
            }
            if (k1)
                non_adjacent.push([i1, j1, k1]);
            non_adjacent.push([la, lb, 0]);
            this.matching_blocks = non_adjacent;
            return this.matching_blocks;
        }
        this.get_opcodes = function () {
            if (this.opcodes != null)
                return this.opcodes;
            var i = 0;
            var j = 0;
            var answer = [];
            this.opcodes = answer;
            var block, ai, bj, size, tag;
            var blocks = this.get_matching_blocks();
            for (var idx in blocks) {
                if (blocks.hasOwnProperty(idx)) {
                    block = blocks[idx];
                    ai = block[0];
                    bj = block[1];
                    size = block[2];
                    tag = '';
                    if (i < ai && j < bj) {
                        tag = 'replace';
                    } else if (i < ai) {
                        tag = 'delete';
                    } else if (j < bj) {
                        tag = 'insert';
                    }
                    if (tag)
                        answer.push([tag, i, ai, j, bj]);
                    i = ai + size;
                    j = bj + size;
                    if (size)
                        answer.push(['equal', ai, i, bj, j]);
                }
            }
            return answer;
        }
        this.get_grouped_opcodes = function (n) {
            if (!n)
                n = 3;
            var codes = this.get_opcodes();
            if (!codes)
                codes = [
                    ["equal", 0, 1, 0, 1]
                ];
            var code, tag, i1, i2, j1, j2;
            if (codes[0][0] == 'equal') {
                code = codes[0];
                tag = code[0];
                i1 = code[1];
                i2 = code[2];
                j1 = code[3];
                j2 = code[4];
                codes[0] = [tag, Math.max(i1, i2 - n), i2, Math.max(j1, j2 - n), j2];
            }
            if (codes[codes.length - 1][0] == 'equal') {
                code = codes[codes.length - 1];
                tag = code[0];
                i1 = code[1];
                i2 = code[2];
                j1 = code[3];
                j2 = code[4];
                codes[codes.length - 1] = [tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)];
            }
            var nn = n + n;
            var groups = [];
            for (var idx in codes) {
                if (codes.hasOwnProperty(idx)) {
                    code = codes[idx];
                    tag = code[0];
                    i1 = code[1];
                    i2 = code[2];
                    j1 = code[3];
                    j2 = code[4];
                    if (tag == 'equal' && i2 - i1 > nn) {
                        groups.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)]);
                        i1 = Math.max(i1, i2 - n);
                        j1 = Math.max(j1, j2 - n);
                    }
                    groups.push([tag, i1, i2, j1, j2]);
                }
            }
            if (groups && groups[groups.length - 1][0] == 'equal')
                groups.pop();
            return groups;
        }
        this.ratio = function () {
            matches = difflib.__reduce(function (sum, triple) {
                return sum + triple[triple.length - 1];
            }, this.get_matching_blocks(), 0);
            return difflib.__calculate_ratio(matches, this.a.length + this.b.length);
        }
        this.quick_ratio = function () {
            var fullbcount, elt;
            if (this.fullbcount == null) {
                this.fullbcount = fullbcount = {};
                for (var i = 0; i < this.b.length; i++) {
                    elt = this.b[i];
                    fullbcount[elt] = difflib.__dictget(fullbcount, elt, 0) + 1;
                }
            }
            fullbcount = this.fullbcount;
            var avail = {};
            var availhas = difflib.__isindict(avail);
            var matches = numb = 0;
            for (var i = 0; i < this.a.length; i++) {
                elt = this.a[i];
                if (availhas(elt)) {
                    numb = avail[elt];
                } else {
                    numb = difflib.__dictget(fullbcount, elt, 0);
                }
                avail[elt] = numb - 1;
                if (numb > 0)
                    matches++;
            }
            return difflib.__calculate_ratio(matches, this.a.length + this.b.length);
        }
        this.real_quick_ratio = function () {
            var la = this.a.length;
            var lb = this.b.length;
            return _calculate_ratio(Math.min(la, lb), la + lb);
        }
        this.isjunk = isjunk ? isjunk : difflib.defaultJunkFunction;
        this.a = this.b = null;
        this.set_seqs(a, b);
    }
}
Node.prototype.rangeOfWord = function (offset, stopCharacters, stayWithinNode, direction) {
    var startNode;
    var startOffset = 0;
    var endNode;
    var endOffset = 0;
    if (!stayWithinNode)
        stayWithinNode = this;
    if (!direction || direction === "backward" || direction === "both") {
        var node = this;
        while (node) {
            if (node === stayWithinNode) {
                if (!startNode)
                    startNode = stayWithinNode;
                break;
            }
            if (node.nodeType === Node.TEXT_NODE) {
                var start = (node === this ? (offset - 1) : (node.nodeValue.length - 1));
                for (var i = start; i >= 0; --i) {
                    if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
                        startNode = node;
                        startOffset = i + 1;
                        break;
                    }
                }
            }
            if (startNode)
                break;
            node = node.traversePreviousNode(stayWithinNode);
        }
        if (!startNode) {
            startNode = stayWithinNode;
            startOffset = 0;
        }
    } else {
        startNode = this;
        startOffset = offset;
    }
    if (!direction || direction === "forward" || direction === "both") {
        node = this;
        while (node) {
            if (node === stayWithinNode) {
                if (!endNode)
                    endNode = stayWithinNode;
                break;
            }
            if (node.nodeType === Node.TEXT_NODE) {
                var start = (node === this ? offset : 0);
                for (var i = start; i < node.nodeValue.length; ++i) {
                    if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
                        endNode = node;
                        endOffset = i;
                        break;
                    }
                }
            }
            if (endNode)
                break;
            node = node.traverseNextNode(stayWithinNode);
        }
        if (!endNode) {
            endNode = stayWithinNode;
            endOffset = stayWithinNode.nodeType === Node.TEXT_NODE ? stayWithinNode.nodeValue.length : stayWithinNode.childNodes.length;
        }
    } else {
        endNode = this;
        endOffset = offset;
    }
    var result = this.ownerDocument.createRange();
    result.setStart(startNode, startOffset);
    result.setEnd(endNode, endOffset);
    return result;
}
Node.prototype.traverseNextTextNode = function (stayWithin) {
    var node = this.traverseNextNode(stayWithin);
    if (!node)
        return;
    while (node && node.nodeType !== Node.TEXT_NODE)
        node = node.traverseNextNode(stayWithin);
    return node;
}
Node.prototype.rangeBoundaryForOffset = function (offset) {
    var node = this.traverseNextTextNode(this);
    while (node && offset > node.nodeValue.length) {
        offset -= node.nodeValue.length;
        node = node.traverseNextTextNode(this);
    }
    if (!node)
        return {
            container: this,
            offset: 0
        };
    return {
        container: node,
        offset: offset
    };
}
Element.prototype.removeMatchingStyleClasses = function (classNameRegex) {
    var regex = new RegExp("(^|\\s+)" + classNameRegex + "($|\\s+)");
    if (regex.test(this.className))
        this.className = this.className.replace(regex, " ");
}
Element.prototype.positionAt = function (x, y, relativeTo) {
    var shift = {
        x: 0,
        y: 0
    };
    if (relativeTo)
        shift = relativeTo.boxInWindow(this.ownerDocument.defaultView);
    if (typeof x === "number")
        this.style.setProperty("left", (shift.x + x) + "px");
    else
        this.style.removeProperty("left");
    if (typeof y === "number")
        this.style.setProperty("top", (shift.y + y) + "px");
    else
        this.style.removeProperty("top");
}
Element.prototype.isScrolledToBottom = function () {
    return Math.abs(this.scrollTop + this.clientHeight - this.scrollHeight) <= 1;
}

function removeSubsequentNodes(fromNode, toNode) {
    for (var node = fromNode; node && node !== toNode;) {
        var nodeToRemove = node;
        node = node.nextSibling;
        nodeToRemove.remove();
    }
}

function Size(width, height) {
    this.width = width;
    this.height = height;
}
Size.prototype.isEqual = function (size) {
    return !!size && this.width === size.width && this.height === size.height;
};
Element.prototype.measurePreferredSize = function (containerElement) {
    containerElement = containerElement || document.body;
    containerElement.appendChild(this);
    this.positionAt(0, 0);
    var result = new Size(this.offsetWidth, this.offsetHeight);
    this.positionAt(undefined, undefined);
    this.remove();
    return result;
}
Element.prototype.containsEventPoint = function (event) {
    var box = this.getBoundingClientRect();
    return box.left < event.x && event.x < box.right && box.top < event.y && event.y < box.bottom;
}
Node.prototype.enclosingNodeOrSelfWithNodeNameInArray = function (nameArray) {
    for (var node = this; node && node !== this.ownerDocument; node = node.parentNode)
        for (var i = 0; i < nameArray.length; ++i)
            if (node.nodeName.toLowerCase() === nameArray[i].toLowerCase())
                return node;
    return null;
}
Node.prototype.enclosingNodeOrSelfWithNodeName = function (nodeName) {
    return this.enclosingNodeOrSelfWithNodeNameInArray([nodeName]);
}
Node.prototype.enclosingNodeOrSelfWithClass = function (className, stayWithin) {
    for (var node = this; node && node !== stayWithin && node !== this.ownerDocument; node = node.parentNode)
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(className))
            return node;
    return null;
}
Element.prototype.query = function (query) {
    return this.ownerDocument.evaluate(query, this, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}
Element.prototype.removeChildren = function () {
    if (this.firstChild)
        this.textContent = "";
}
Element.prototype.isInsertionCaretInside = function () {
    var selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed)
        return false;
    var selectionRange = selection.getRangeAt(0);
    return selectionRange.startContainer.isSelfOrDescendant(this);
}
Document.prototype.createElementWithClass = function (elementName, className) {
    var element = this.createElement(elementName);
    if (className)
        element.className = className;
    return element;
}
Element.prototype.createChild = function (elementName, className) {
    var element = this.ownerDocument.createElementWithClass(elementName, className);
    this.appendChild(element);
    return element;
}
DocumentFragment.prototype.createChild = Element.prototype.createChild;
Element.prototype.createTextChild = function (text) {
    var element = this.ownerDocument.createTextNode(text);
    this.appendChild(element);
    return element;
}
DocumentFragment.prototype.createTextChild = Element.prototype.createTextChild;
Element.prototype.totalOffsetLeft = function () {
    return this.totalOffset().left;
}
Element.prototype.totalOffsetTop = function () {
    return this.totalOffset().top;
}
Element.prototype.totalOffset = function () {
    var rect = this.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top
    };
}
Element.prototype.scrollOffset = function () {
    var curLeft = 0;
    var curTop = 0;
    for (var element = this; element; element = element.scrollParent) {
        curLeft += element.scrollLeft;
        curTop += element.scrollTop;
    }
    return {
        left: curLeft,
        top: curTop
    };
}

function AnchorBox(x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
}
AnchorBox.prototype.relativeTo = function (box) {
    return new AnchorBox(this.x - box.x, this.y - box.y, this.width, this.height);
};
AnchorBox.prototype.relativeToElement = function (element) {
    return this.relativeTo(element.boxInWindow(element.ownerDocument.defaultView));
};
Element.prototype.offsetRelativeToWindow = function (targetWindow) {
    var elementOffset = new AnchorBox();
    var curElement = this;
    var curWindow = this.ownerDocument.defaultView;
    while (curWindow && curElement) {
        elementOffset.x += curElement.totalOffsetLeft();
        elementOffset.y += curElement.totalOffsetTop();
        if (curWindow === targetWindow)
            break;
        curElement = curWindow.frameElement;
        curWindow = curWindow.parent;
    }
    return elementOffset;
}
Element.prototype.boxInWindow = function (targetWindow) {
    targetWindow = targetWindow || this.ownerDocument.defaultView;
    var anchorBox = this.offsetRelativeToWindow(window);
    anchorBox.width = Math.min(this.offsetWidth, window.innerWidth - anchorBox.x);
    anchorBox.height = Math.min(this.offsetHeight, window.innerHeight - anchorBox.y);
    return anchorBox;
}
Element.prototype.setTextAndTitle = function (text) {
    this.textContent = text;
    this.title = text;
}
KeyboardEvent.prototype.__defineGetter__("data", function () {
    switch (this.type) {
    case "keypress":
        if (!this.ctrlKey && !this.metaKey)
            return String.fromCharCode(this.charCode);
        else
            return "";
    case "keydown":
    case "keyup":
        if (!this.ctrlKey && !this.metaKey && !this.altKey)
            return String.fromCharCode(this.which);
        else
            return "";
    }
});
Event.prototype.consume = function (preventDefault) {
    this.stopImmediatePropagation();
    if (preventDefault)
        this.preventDefault();
    this.handled = true;
}
Text.prototype.select = function (start, end) {
    start = start || 0;
    end = end || this.textContent.length;
    if (start < 0)
        start = end + start;
    var selection = this.ownerDocument.defaultView.getSelection();
    selection.removeAllRanges();
    var range = this.ownerDocument.createRange();
    range.setStart(this, start);
    range.setEnd(this, end);
    selection.addRange(range);
    return this;
}
Element.prototype.selectionLeftOffset = function () {
    var selection = window.getSelection();
    if (!selection.containsNode(this, true))
        return null;
    var leftOffset = selection.anchorOffset;
    var node = selection.anchorNode;
    while (node !== this) {
        while (node.previousSibling) {
            node = node.previousSibling;
            leftOffset += node.textContent.length;
        }
        node = node.parentNode;
    }
    return leftOffset;
}
Node.prototype.isAncestor = function (node) {
    if (!node)
        return false;
    var currentNode = node.parentNode;
    while (currentNode) {
        if (this === currentNode)
            return true;
        currentNode = currentNode.parentNode;
    }
    return false;
}
Node.prototype.isDescendant = function (descendant) {
    return !!descendant && descendant.isAncestor(this);
}
Node.prototype.isSelfOrAncestor = function (node) {
    return !!node && (node === this || this.isAncestor(node));
}
Node.prototype.isSelfOrDescendant = function (node) {
    return !!node && (node === this || this.isDescendant(node));
}
Node.prototype.traverseNextNode = function (stayWithin) {
    var node = this.firstChild;
    if (node)
        return node;
    if (stayWithin && this === stayWithin)
        return null;
    node = this.nextSibling;
    if (node)
        return node;
    node = this;
    while (node && !node.nextSibling && (!stayWithin || !node.parentNode || node.parentNode !== stayWithin))
        node = node.parentNode;
    if (!node)
        return null;
    return node.nextSibling;
}
Node.prototype.traversePreviousNode = function (stayWithin) {
    if (stayWithin && this === stayWithin)
        return null;
    var node = this.previousSibling;
    while (node && node.lastChild)
        node = node.lastChild;
    if (node)
        return node;
    return this.parentNode;
}
Node.prototype.setTextContentTruncatedIfNeeded = function (text, placeholder) {
    const maxTextContentLength = 65535;
    if (typeof text === "string" && text.length > maxTextContentLength) {
        this.textContent = typeof placeholder === "string" ? placeholder : text.trimEnd(maxTextContentLength);
        return true;
    }
    this.textContent = text;
    return false;
}

function isEnterKey(event) {
    return event.keyCode !== 229 && event.keyIdentifier === "Enter";
}

function consumeEvent(e) {
    e.consume();
}

function TreeOutline(listNode, nonFocusable) {
    this.children = [];
    this.selectedTreeElement = null;
    this._childrenListNode = listNode;
    this.childrenListElement = this._childrenListNode;
    this._childrenListNode.removeChildren();
    this.expandTreeElementsWhenArrowing = false;
    this.root = true;
    this.hasChildren = false;
    this.expanded = true;
    this.selected = false;
    this.treeOutline = this;
    this.comparator = null;
    this.setFocusable(!nonFocusable);
    this._childrenListNode.addEventListener("keydown", this._treeKeyDown.bind(this), true);
    this._treeElementsMap = new Map();
    this._expandedStateMap = new Map();
    this.element = listNode;
}
TreeOutline.prototype.setFocusable = function (focusable) {
    if (focusable)
        this._childrenListNode.setAttribute("tabIndex", 0);
    else
        this._childrenListNode.removeAttribute("tabIndex");
}
TreeOutline.prototype.appendChild = function (child) {
    var insertionIndex;
    if (this.treeOutline.comparator)
        insertionIndex = insertionIndexForObjectInListSortedByFunction(child, this.children, this.treeOutline.comparator);
    else
        insertionIndex = this.children.length;
    this.insertChild(child, insertionIndex);
}
TreeOutline.prototype.insertBeforeChild = function (child, beforeChild) {
    if (!child)
        throw ("child can't be undefined or null");
    if (!beforeChild)
        throw ("beforeChild can't be undefined or null");
    var childIndex = this.children.indexOf(beforeChild);
    if (childIndex === -1)
        throw ("beforeChild not found in this node's children");
    this.insertChild(child, childIndex);
}
TreeOutline.prototype.insertChild = function (child, index) {
    if (!child)
        throw ("child can't be undefined or null");
    var previousChild = (index > 0 ? this.children[index - 1] : null);
    if (previousChild) {
        previousChild.nextSibling = child;
        child.previousSibling = previousChild;
    } else {
        child.previousSibling = null;
    }
    var nextChild = this.children[index];
    if (nextChild) {
        nextChild.previousSibling = child;
        child.nextSibling = nextChild;
    } else {
        child.nextSibling = null;
    }
    this.children.splice(index, 0, child);
    this.hasChildren = true;
    child.parent = this;
    child.treeOutline = this.treeOutline;
    child.treeOutline._rememberTreeElement(child);
    var current = child.children[0];
    while (current) {
        current.treeOutline = this.treeOutline;
        current.treeOutline._rememberTreeElement(current);
        current = current.traverseNextTreeElement(false, child, true);
    }
    if (child.hasChildren && typeof (child.treeOutline._expandedStateMap.get(child.representedObject)) !== "undefined")
        child.expanded = child.treeOutline._expandedStateMap.get(child.representedObject);
    if (!this._childrenListNode) {
        this._childrenListNode = this.treeOutline._childrenListNode.ownerDocument.createElement("ol");
        this._childrenListNode.parentTreeElement = this;
        this._childrenListNode.classList.add("children");
        if (this.hidden)
            this._childrenListNode.classList.add("hidden");
    }
    child._attach();
}
TreeOutline.prototype.removeChildAtIndex = function (childIndex) {
    if (childIndex < 0 || childIndex >= this.children.length)
        throw ("childIndex out of range");
    var child = this.children[childIndex];
    this.children.splice(childIndex, 1);
    var parent = child.parent;
    if (child.deselect()) {
        if (child.previousSibling)
            child.previousSibling.select();
        else if (child.nextSibling)
            child.nextSibling.select();
        else
            parent.select();
    }
    if (child.previousSibling)
        child.previousSibling.nextSibling = child.nextSibling;
    if (child.nextSibling)
        child.nextSibling.previousSibling = child.previousSibling;
    if (child.treeOutline) {
        child.treeOutline._forgetTreeElement(child);
        child.treeOutline._forgetChildrenRecursive(child);
    }
    child._detach();
    child.treeOutline = null;
    child.parent = null;
    child.nextSibling = null;
    child.previousSibling = null;
}
TreeOutline.prototype.removeChild = function (child) {
    if (!child)
        throw ("child can't be undefined or null");
    var childIndex = this.children.indexOf(child);
    if (childIndex === -1)
        throw ("child not found in this node's children");
    this.removeChildAtIndex.call(this, childIndex);
}
TreeOutline.prototype.removeChildren = function () {
    for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i];
        child.deselect();
        if (child.treeOutline) {
            child.treeOutline._forgetTreeElement(child);
            child.treeOutline._forgetChildrenRecursive(child);
        }
        child._detach();
        child.treeOutline = null;
        child.parent = null;
        child.nextSibling = null;
        child.previousSibling = null;
    }
    this.children = [];
}
TreeOutline.prototype._rememberTreeElement = function (element) {
    if (!this._treeElementsMap.get(element.representedObject))
        this._treeElementsMap.put(element.representedObject, []);
    var elements = this._treeElementsMap.get(element.representedObject);
    if (elements.indexOf(element) !== -1)
        return;
    elements.push(element);
}
TreeOutline.prototype._forgetTreeElement = function (element) {
    if (this._treeElementsMap.get(element.representedObject)) {
        var elements = this._treeElementsMap.get(element.representedObject);
        elements.remove(element, true);
        if (!elements.length)
            this._treeElementsMap.remove(element.representedObject);
    }
}
TreeOutline.prototype._forgetChildrenRecursive = function (parentElement) {
    var child = parentElement.children[0];
    while (child) {
        this._forgetTreeElement(child);
        child = child.traverseNextTreeElement(false, parentElement, true);
    }
}
TreeOutline.prototype.getCachedTreeElement = function (representedObject) {
    if (!representedObject)
        return null;
    var elements = this._treeElementsMap.get(representedObject);
    if (elements && elements.length)
        return elements[0];
    return null;
}
TreeOutline.prototype.findTreeElement = function (representedObject, isAncestor, getParent) {
    if (!representedObject)
        return null;
    var cachedElement = this.getCachedTreeElement(representedObject);
    if (cachedElement)
        return cachedElement;
    var ancestors = [];
    for (var currentObject = getParent(representedObject); currentObject; currentObject = getParent(currentObject)) {
        ancestors.push(currentObject);
        if (this.getCachedTreeElement(currentObject))
            break;
    }
    if (!currentObject)
        return null;
    for (var i = ancestors.length - 1; i >= 0; --i) {
        var treeElement = this.getCachedTreeElement(ancestors[i]);
        if (treeElement)
            treeElement.onpopulate();
    }
    return this.getCachedTreeElement(representedObject);
}
TreeOutline.prototype.treeElementFromPoint = function (x, y) {
    var node = this._childrenListNode.ownerDocument.elementFromPoint(x, y);
    if (!node)
        return null;
    var listNode = node.enclosingNodeOrSelfWithNodeNameInArray(["ol", "li"]);
    if (listNode)
        return listNode.parentTreeElement || listNode.treeElement;
    return null;
}
TreeOutline.prototype._treeKeyDown = function (event) {
    if (event.target !== this._childrenListNode)
        return;
    if (!this.selectedTreeElement || event.shiftKey || event.metaKey || event.ctrlKey)
        return;
    var handled = false;
    var nextSelectedElement;
    if (event.keyIdentifier === "Up" && !event.altKey) {
        nextSelectedElement = this.selectedTreeElement.traversePreviousTreeElement(true);
        while (nextSelectedElement && !nextSelectedElement.selectable)
            nextSelectedElement = nextSelectedElement.traversePreviousTreeElement(!this.expandTreeElementsWhenArrowing);
        handled = nextSelectedElement ? true : false;
    } else if (event.keyIdentifier === "Down" && !event.altKey) {
        nextSelectedElement = this.selectedTreeElement.traverseNextTreeElement(true);
        while (nextSelectedElement && !nextSelectedElement.selectable)
            nextSelectedElement = nextSelectedElement.traverseNextTreeElement(!this.expandTreeElementsWhenArrowing);
        handled = nextSelectedElement ? true : false;
    } else if (event.keyIdentifier === "Left") {
        if (this.selectedTreeElement.expanded) {
            if (event.altKey)
                this.selectedTreeElement.collapseRecursively();
            else
                this.selectedTreeElement.collapse();
            handled = true;
        } else if (this.selectedTreeElement.parent && !this.selectedTreeElement.parent.root) {
            handled = true;
            if (this.selectedTreeElement.parent.selectable) {
                nextSelectedElement = this.selectedTreeElement.parent;
                while (nextSelectedElement && !nextSelectedElement.selectable)
                    nextSelectedElement = nextSelectedElement.parent;
                handled = nextSelectedElement ? true : false;
            } else if (this.selectedTreeElement.parent)
                this.selectedTreeElement.parent.collapse();
        }
    } else if (event.keyIdentifier === "Right") {
        if (!this.selectedTreeElement.revealed()) {
            this.selectedTreeElement.reveal();
            handled = true;
        } else if (this.selectedTreeElement.hasChildren) {
            handled = true;
            if (this.selectedTreeElement.expanded) {
                nextSelectedElement = this.selectedTreeElement.children[0];
                while (nextSelectedElement && !nextSelectedElement.selectable)
                    nextSelectedElement = nextSelectedElement.nextSibling;
                handled = nextSelectedElement ? true : false;
            } else {
                if (event.altKey)
                    this.selectedTreeElement.expandRecursively();
                else
                    this.selectedTreeElement.expand();
            }
        }
    } else if (event.keyCode === 8 || event.keyCode === 46)
        handled = this.selectedTreeElement.ondelete();
    else if (isEnterKey(event))
        handled = this.selectedTreeElement.onenter();
    else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Space.code)
        handled = this.selectedTreeElement.onspace();
    if (nextSelectedElement) {
        nextSelectedElement.reveal();
        nextSelectedElement.select(false, true);
    }
    if (handled)
        event.consume(true);
}
TreeOutline.prototype.expand = function () {}
TreeOutline.prototype.collapse = function () {}
TreeOutline.prototype.revealed = function () {
    return true;
}
TreeOutline.prototype.reveal = function () {}
TreeOutline.prototype.select = function () {}
TreeOutline.prototype.revealAndSelect = function (omitFocus) {}

function TreeElement(title, representedObject, hasChildren) {
    this._title = title;
    this.representedObject = (representedObject || {});
    this.root = false;
    this._hidden = false;
    this._selectable = true;
    this.expanded = false;
    this.selected = false;
    this.hasChildren = hasChildren;
    this.children = [];
    this.treeOutline = null;
    this.parent = null;
    this.previousSibling = null;
    this.nextSibling = null;
    this._listItemNode = null;
}
TreeElement.prototype = {
    arrowToggleWidth: 10,
    get selectable() {
        if (this._hidden)
            return false;
        return this._selectable;
    },
    set selectable(x) {
        this._selectable = x;
    },
    get listItemElement() {
        return this._listItemNode;
    },
    get childrenListElement() {
        return this._childrenListNode;
    },
    get title() {
        return this._title;
    },
    set title(x) {
        this._title = x;
        this._setListItemNodeContent();
    },
    get tooltip() {
        return this._tooltip;
    },
    set tooltip(x) {
        this._tooltip = x;
        if (this._listItemNode)
            this._listItemNode.title = x ? x : "";
    },
    get hasChildren() {
        return this._hasChildren;
    },
    set hasChildren(x) {
        if (this._hasChildren === x)
            return;
        this._hasChildren = x;
        if (!this._listItemNode)
            return;
        if (x)
            this._listItemNode.classList.add("parent");
        else {
            this._listItemNode.classList.remove("parent");
            this.collapse();
        }
    },
    get hidden() {
        return this._hidden;
    },
    set hidden(x) {
        if (this._hidden === x)
            return;
        this._hidden = x;
        if (x) {
            if (this._listItemNode)
                this._listItemNode.classList.add("hidden");
            if (this._childrenListNode)
                this._childrenListNode.classList.add("hidden");
        } else {
            if (this._listItemNode)
                this._listItemNode.classList.remove("hidden");
            if (this._childrenListNode)
                this._childrenListNode.classList.remove("hidden");
        }
    },
    get shouldRefreshChildren() {
        return this._shouldRefreshChildren;
    },
    set shouldRefreshChildren(x) {
        this._shouldRefreshChildren = x;
        if (x && this.expanded)
            this.expand();
    },
    _setListItemNodeContent: function () {
        if (!this._listItemNode)
            return;
        if (typeof this._title === "string")
            this._listItemNode.textContent = this._title;
        else {
            this._listItemNode.removeChildren();
            if (this._title)
                this._listItemNode.appendChild(this._title);
        }
    }
}
TreeElement.prototype.appendChild = TreeOutline.prototype.appendChild;
TreeElement.prototype.insertChild = TreeOutline.prototype.insertChild;
TreeElement.prototype.insertBeforeChild = TreeOutline.prototype.insertBeforeChild;
TreeElement.prototype.removeChild = TreeOutline.prototype.removeChild;
TreeElement.prototype.removeChildAtIndex = TreeOutline.prototype.removeChildAtIndex;
TreeElement.prototype.removeChildren = TreeOutline.prototype.removeChildren;
TreeElement.prototype._attach = function () {
    if (!this._listItemNode || this.parent._shouldRefreshChildren) {
        if (this._listItemNode && this._listItemNode.parentNode)
            this._listItemNode.parentNode.removeChild(this._listItemNode);
        this._listItemNode = this.treeOutline._childrenListNode.ownerDocument.createElement("li");
        this._listItemNode.treeElement = this;
        this._setListItemNodeContent();
        this._listItemNode.title = this._tooltip ? this._tooltip : "";
        if (this.hidden)
            this._listItemNode.classList.add("hidden");
        if (this.hasChildren)
            this._listItemNode.classList.add("parent");
        if (this.expanded)
            this._listItemNode.classList.add("expanded");
        if (this.selected)
            this._listItemNode.classList.add("selected");
        this._listItemNode.addEventListener("mousedown", TreeElement.treeElementMouseDown, false);
        this._listItemNode.addEventListener("click", TreeElement.treeElementToggled, false);
        this._listItemNode.addEventListener("dblclick", TreeElement.treeElementDoubleClicked, false);
        this.onattach();
    }
    var nextSibling = null;
    if (this.nextSibling && this.nextSibling._listItemNode && this.nextSibling._listItemNode.parentNode === this.parent._childrenListNode)
        nextSibling = this.nextSibling._listItemNode;
    this.parent._childrenListNode.insertBefore(this._listItemNode, nextSibling);
    if (this._childrenListNode)
        this.parent._childrenListNode.insertBefore(this._childrenListNode, this._listItemNode.nextSibling);
    if (this.selected)
        this.select();
    if (this.expanded)
        this.expand();
}
TreeElement.prototype._detach = function () {
    if (this._listItemNode && this._listItemNode.parentNode)
        this._listItemNode.parentNode.removeChild(this._listItemNode);
    if (this._childrenListNode && this._childrenListNode.parentNode)
        this._childrenListNode.parentNode.removeChild(this._childrenListNode);
}
TreeElement.treeElementMouseDown = function (event) {
    var element = event.currentTarget;
    if (!element || !element.treeElement || !element.treeElement.selectable)
        return;
    if (element.treeElement.isEventWithinDisclosureTriangle(event))
        return;
    element.treeElement.selectOnMouseDown(event);
}
TreeElement.treeElementToggled = function (event) {
    var element = event.currentTarget;
    if (!element || !element.treeElement)
        return;
    var toggleOnClick = element.treeElement.toggleOnClick && !element.treeElement.selectable;
    var isInTriangle = element.treeElement.isEventWithinDisclosureTriangle(event);
    if (!toggleOnClick && !isInTriangle)
        return;
    if (element.treeElement.expanded) {
        if (event.altKey)
            element.treeElement.collapseRecursively();
        else
            element.treeElement.collapse();
    } else {
        if (event.altKey)
            element.treeElement.expandRecursively();
        else
            element.treeElement.expand();
    }
    event.consume();
}
TreeElement.treeElementDoubleClicked = function (event) {
    var element = event.currentTarget;
    if (!element || !element.treeElement)
        return;
    var handled = element.treeElement.ondblclick.call(element.treeElement, event);
    if (handled)
        return;
    if (element.treeElement.hasChildren && !element.treeElement.expanded)
        element.treeElement.expand();
}
TreeElement.prototype.collapse = function () {
    if (this._listItemNode)
        this._listItemNode.classList.remove("expanded");
    if (this._childrenListNode)
        this._childrenListNode.classList.remove("expanded");
    this.expanded = false;
    if (this.treeOutline)
        this.treeOutline._expandedStateMap.put(this.representedObject, false);
    this.oncollapse();
}
TreeElement.prototype.collapseRecursively = function () {
    var item = this;
    while (item) {
        if (item.expanded)
            item.collapse();
        item = item.traverseNextTreeElement(false, this, true);
    }
}
TreeElement.prototype.expand = function () {
    if (!this.hasChildren || (this.expanded && !this._shouldRefreshChildren && this._childrenListNode))
        return;
    this.expanded = true;
    if (this.treeOutline)
        this.treeOutline._expandedStateMap.put(this.representedObject, true);
    if (this.treeOutline && (!this._childrenListNode || this._shouldRefreshChildren)) {
        if (this._childrenListNode && this._childrenListNode.parentNode)
            this._childrenListNode.parentNode.removeChild(this._childrenListNode);
        this._childrenListNode = this.treeOutline._childrenListNode.ownerDocument.createElement("ol");
        this._childrenListNode.parentTreeElement = this;
        this._childrenListNode.classList.add("children");
        if (this.hidden)
            this._childrenListNode.classList.add("hidden");
        this.onpopulate();
        for (var i = 0; i < this.children.length; ++i)
            this.children[i]._attach();
        delete this._shouldRefreshChildren;
    }
    if (this._listItemNode) {
        this._listItemNode.classList.add("expanded");
        if (this._childrenListNode && this._childrenListNode.parentNode != this._listItemNode.parentNode)
            this.parent._childrenListNode.insertBefore(this._childrenListNode, this._listItemNode.nextSibling);
    }
    if (this._childrenListNode)
        this._childrenListNode.classList.add("expanded");
    this.onexpand();
}
TreeElement.prototype.expandRecursively = function (maxDepth) {
    var item = this;
    var info = {};
    var depth = 0;
    if (isNaN(maxDepth))
        maxDepth = 3;
    while (item) {
        if (depth < maxDepth)
            item.expand();
        item = item.traverseNextTreeElement(false, this, (depth >= maxDepth), info);
        depth += info.depthChange;
    }
}
TreeElement.prototype.hasAncestor = function (ancestor) {
    if (!ancestor)
        return false;
    var currentNode = this.parent;
    while (currentNode) {
        if (ancestor === currentNode)
            return true;
        currentNode = currentNode.parent;
    }
    return false;
}
TreeElement.prototype.reveal = function () {
    var currentAncestor = this.parent;
    while (currentAncestor && !currentAncestor.root) {
        if (!currentAncestor.expanded)
            currentAncestor.expand();
        currentAncestor = currentAncestor.parent;
    }
    this.onreveal();
}
TreeElement.prototype.revealed = function () {
    var currentAncestor = this.parent;
    while (currentAncestor && !currentAncestor.root) {
        if (!currentAncestor.expanded)
            return false;
        currentAncestor = currentAncestor.parent;
    }
    return true;
}
TreeElement.prototype.selectOnMouseDown = function (event) {
    if (this.select(false, true))
        event.consume(true);
}
TreeElement.prototype.select = function (omitFocus, selectedByUser) {
    if (!this.treeOutline || !this.selectable || this.selected)
        return false;
    if (this.treeOutline.selectedTreeElement)
        this.treeOutline.selectedTreeElement.deselect();
    this.selected = true;
    if (!omitFocus)
        this.treeOutline._childrenListNode.focus();
    if (!this.treeOutline)
        return false;
    this.treeOutline.selectedTreeElement = this;
    if (this._listItemNode)
        this._listItemNode.classList.add("selected");
    return this.onselect(selectedByUser);
}
TreeElement.prototype.revealAndSelect = function (omitFocus) {
    this.reveal();
    this.select(omitFocus);
}
TreeElement.prototype.deselect = function (supressOnDeselect) {
    if (!this.treeOutline || this.treeOutline.selectedTreeElement !== this || !this.selected)
        return false;
    this.selected = false;
    this.treeOutline.selectedTreeElement = null;
    if (this._listItemNode)
        this._listItemNode.classList.remove("selected");
    return true;
}
TreeElement.prototype.onpopulate = function () {}
TreeElement.prototype.onenter = function () {
    return false;
}
TreeElement.prototype.ondelete = function () {
    return false;
}
TreeElement.prototype.onspace = function () {
    return false;
}
TreeElement.prototype.onattach = function () {}
TreeElement.prototype.onexpand = function () {}
TreeElement.prototype.oncollapse = function () {}
TreeElement.prototype.ondblclick = function (e) {
    return false;
}
TreeElement.prototype.onreveal = function () {}
TreeElement.prototype.onselect = function (selectedByUser) {
    return false;
}
TreeElement.prototype.traverseNextTreeElement = function (skipUnrevealed, stayWithin, dontPopulate, info) {
    if (!dontPopulate && this.hasChildren)
        this.onpopulate();
    if (info)
        info.depthChange = 0;
    var element = skipUnrevealed ? (this.revealed() ? this.children[0] : null) : this.children[0];
    if (element && (!skipUnrevealed || (skipUnrevealed && this.expanded))) {
        if (info)
            info.depthChange = 1;
        return element;
    }
    if (this === stayWithin)
        return null;
    element = skipUnrevealed ? (this.revealed() ? this.nextSibling : null) : this.nextSibling;
    if (element)
        return element;
    element = this;
    while (element && !element.root && !(skipUnrevealed ? (element.revealed() ? element.nextSibling : null) : element.nextSibling) && element.parent !== stayWithin) {
        if (info)
            info.depthChange -= 1;
        element = element.parent;
    }
    if (!element)
        return null;
    return (skipUnrevealed ? (element.revealed() ? element.nextSibling : null) : element.nextSibling);
}
TreeElement.prototype.traversePreviousTreeElement = function (skipUnrevealed, dontPopulate) {
    var element = skipUnrevealed ? (this.revealed() ? this.previousSibling : null) : this.previousSibling;
    if (!dontPopulate && element && element.hasChildren)
        element.onpopulate();
    while (element && (skipUnrevealed ? (element.revealed() && element.expanded ? element.children[element.children.length - 1] : null) : element.children[element.children.length - 1])) {
        if (!dontPopulate && element.hasChildren)
            element.onpopulate();
        element = (skipUnrevealed ? (element.revealed() && element.expanded ? element.children[element.children.length - 1] : null) : element.children[element.children.length - 1]);
    }
    if (element)
        return element;
    if (!this.parent || this.parent.root)
        return null;
    return this.parent;
}
TreeElement.prototype.isEventWithinDisclosureTriangle = function (event) {
    var paddingLeftValue = window.getComputedStyle(this._listItemNode).getPropertyCSSValue("padding-left");
    var computedLeftPadding = paddingLeftValue ? paddingLeftValue.getFloatValue(CSSPrimitiveValue.CSS_PX) : 0;
    var left = this._listItemNode.totalOffsetLeft() + computedLeftPadding;
    return event.pageX >= left && event.pageX <= left + this.arrowToggleWidth && this.hasChildren;
}
