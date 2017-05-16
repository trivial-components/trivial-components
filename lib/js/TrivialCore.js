(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "jquery", "levenshtein"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Levenshtein = require("levenshtein");
    exports.keyCodes = {
        backspace: 8,
        tab: 9,
        enter: 13,
        shift: 16,
        ctrl: 17,
        alt: 18,
        pause: 19,
        caps_lock: 20,
        escape: 27,
        space: 32,
        page_up: 33,
        page_down: 34,
        end: 35,
        home: 36,
        left_arrow: 37,
        up_arrow: 38,
        right_arrow: 39,
        down_arrow: 40,
        insert: 45,
        "delete": 46,
        left_window_key: 91,
        right_window_key: 92,
        select_key: 93,
        num_lock: 144,
        scroll_lock: 145,
        specialKeys: [8, 9, 13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46, 91, 92, 93, 144, 145],
        numberKeys: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105],
        isSpecialKey: function (keyCode) {
            return this.specialKeys.indexOf(keyCode) != -1;
        },
        isDigitKey: function (keyCode) {
            return this.numberKeys.indexOf(keyCode) != -1;
        },
        isModifierKey: function (e) {
            return [exports.keyCodes.shift, exports.keyCodes.caps_lock, exports.keyCodes.alt, exports.keyCodes.ctrl, exports.keyCodes.left_window_key, exports.keyCodes.right_window_key]
                .indexOf(e.which) != -1;
        }
    };
    exports.DEFAULT_TEMPLATES = {
        image2LinesTemplate: '<div class="tr-template-image-2-lines">' +
            '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">{{displayValue}}</div> ' +
            '    <div class="additional-info">{{additionalInfo}}</div>' +
            '  </div>' +
            '</div>',
        roundImage2LinesColorBubbleTemplate: '<div class="tr-template-round-image-2-lines-color-bubble">' +
            '  {{#imageUrl}}<div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>{{/imageUrl}}' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">{{displayValue}}</div> ' +
            '    <div class="additional-info">{{#statusColor}}<span class="status-bubble" style="background-color: {{statusColor}}"></span>{{/statusColor}}{{additionalInfo}}</div>' +
            '  </div>' +
            '</div>',
        icon2LinesTemplate: '<div class="tr-template-icon-2-lines">' +
            '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">{{displayValue}}</div> ' +
            '    <div class="additional-info">{{additionalInfo}}</div>' +
            '  </div>' +
            '</div>',
        iconSingleLineTemplate: '<div class="tr-template-icon-single-line">' +
            '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
            '  <div class="content-wrapper tr-editor-area">{{displayValue}}</div>' +
            '</div>',
        singleLineTemplate: '<div class="tr-template-single-line">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div>{{displayValue}}</div> ' +
            '  </div>' +
            '</div>',
        currencySingleLineShortTemplate: '<div class="tr-template-currency-single-line-short">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div>{{#symbol}}<span class="currency-symbol">{{symbol}}</span>{{/symbol}} {{#code}}<span class="currency-code">{{code}}</span>{{/code}}</div> ' +
            '  </div>' +
            '</div>',
        currencySingleLineLongTemplate: '<div class="tr-template-currency-single-line-long">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="symbol-and-code">{{#code}}<span class="currency-code">{{code}}</span>{{/code}} {{#symbol}}<span class="currency-symbol">{{symbol}}</span>{{/symbol}}</div>' +
            '    <div class="currency-name">{{name}}</div>' +
            '  </div>' +
            '</div>',
        currency2LineTemplate: '<div class="tr-template-currency-2-lines">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">' +
            '      <span class="currency-code">{{code}}</span>' +
            '      <span class="currency-name">{{name}}</span>' +
            '    </div> ' +
            '    <div class="additional-info">' +
            '      <span class="currency-symbol">{{symbol}}</span>&nbsp;' +
            '      {{#exchangeRate}}' +
            '      <div class="exchange">' +
            '        = ' +
            '        <span class="exchange-rate">{{exchangeRate}}</span>' +
            '        <span class="exchange-rate-base">{{exchangeRateBase}}</span>' +
            '      </div>' +
            '      {{/exchangeRate}}' +
            '    </div>' +
            '  </div>' +
            '</div>',
        defaultSpinnerTemplate: '<div class="tr-default-spinner"><div class="spinner"></div><div>Fetching data...</div></div>',
        defaultNoEntriesTemplate: '<div class="tr-default-no-data-display"><div>No matching entries...</div></div>'
    };
    function wrapWithDefaultTagWrapper(entryHtml) {
        return ('<div class="tr-tagbox-default-wrapper-template">' +
            '<div class="tr-tagbox-tag-content">##entryHtml##</div>' +
            '<div class="tr-remove-button"></div>' +
            '</div>').replace("##entryHtml##", entryHtml);
    }
    exports.wrapWithDefaultTagWrapper = wrapWithDefaultTagWrapper;
    function defaultListQueryFunctionFactory(entries, matchingOptions) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trEntryElement;
                if (!queryString || trivialMatch($entryElement.text().trim().replace(/\s{2,}/g, ' '), queryString, matchingOptions).length > 0) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }
        return function (queryString, resultCallback) {
            resultCallback(filterElements(queryString));
        };
    }
    exports.defaultListQueryFunctionFactory = defaultListQueryFunctionFactory;
    function createProxy(delegate) {
        var proxyConstructor = function () {
        };
        proxyConstructor.prototype = delegate;
        var proxyConstructorTypescriptHack = proxyConstructor;
        return new proxyConstructorTypescriptHack();
    }
    exports.createProxy = createProxy;
    function defaultEntryMatchingFunctionFactory(searchedPropertyNames, matchingOptions) {
        return function (entry, queryString, depth) {
            return searchedPropertyNames
                .some(function (propertyName) {
                var value = entry[propertyName];
                return value != null && trivialMatch(value.toString(), queryString, matchingOptions).length > 0;
            });
        };
    }
    exports.defaultEntryMatchingFunctionFactory = defaultEntryMatchingFunctionFactory;
    function defaultTreeQueryFunctionFactory(topLevelEntries, entryMatchingFunction, childrenPropertyName, expandedPropertyName) {
        function findMatchingEntriesAndTheirAncestors(entry, queryString, nodeDepth) {
            var entryProxy = createProxy(entry);
            entryProxy[childrenPropertyName] = [];
            entryProxy[expandedPropertyName] = false;
            if (entry[childrenPropertyName]) {
                for (var i = 0; i < entry[childrenPropertyName].length; i++) {
                    var child = entry[childrenPropertyName][i];
                    var childProxy = findMatchingEntriesAndTheirAncestors(child, queryString, nodeDepth + 1);
                    if (childProxy) {
                        entryProxy[childrenPropertyName].push(childProxy);
                        entryProxy[expandedPropertyName] = true;
                    }
                }
            }
            var hasMatchingChildren = entryProxy[childrenPropertyName].length > 0;
            var matchesItself = entryMatchingFunction(entry, queryString, nodeDepth);
            if (matchesItself && !hasMatchingChildren) {
                entryProxy[childrenPropertyName] = entry[childrenPropertyName];
            }
            return matchesItself || hasMatchingChildren ? entryProxy : null;
        }
        return function (queryString, resultCallback) {
            if (!queryString) {
                resultCallback(topLevelEntries);
            }
            else {
                var matchingEntries = [];
                for (var i = 0; i < topLevelEntries.length; i++) {
                    var topLevelEntry = topLevelEntries[i];
                    var entryProxy = findMatchingEntriesAndTheirAncestors(topLevelEntry, queryString, 0);
                    if (entryProxy) {
                        matchingEntries.push(entryProxy);
                    }
                }
                resultCallback(matchingEntries);
            }
        };
    }
    exports.defaultTreeQueryFunctionFactory = defaultTreeQueryFunctionFactory;
    function customTreeQueryFunctionFactory(topLevelEntries, childrenPropertyName, expandedPropertyName, customNodeMatchingFunction) {
        function findMatchingEntriesAndTheirAncestors(entry, queryString, nodeDepth) {
            var entryProxy = createProxy(entry);
            entryProxy[childrenPropertyName] = [];
            entryProxy[expandedPropertyName] = false;
            if (entry[childrenPropertyName]) {
                for (var i = 0; i < entry[childrenPropertyName].length; i++) {
                    var child = entry[childrenPropertyName][i];
                    var childProxy = findMatchingEntriesAndTheirAncestors(child, queryString, nodeDepth + 1);
                    if (childProxy) {
                        entryProxy[childrenPropertyName].push(childProxy);
                        entryProxy[expandedPropertyName] = true;
                    }
                }
            }
            var hasMatchingChildren = entryProxy[childrenPropertyName].length > 0;
            var matchesItself = customNodeMatchingFunction(entry, queryString, nodeDepth);
            if (matchesItself && !hasMatchingChildren) {
                entryProxy[childrenPropertyName] = entry[childrenPropertyName];
            }
            return matchesItself || hasMatchingChildren ? entryProxy : null;
        }
        return function (queryString, resultCallback) {
            if (!queryString) {
                resultCallback(topLevelEntries);
            }
            else {
                var matchingEntries = [];
                for (var i = 0; i < topLevelEntries.length; i++) {
                    var topLevelEntry = topLevelEntries[i];
                    var entryProxy = findMatchingEntriesAndTheirAncestors(topLevelEntry, queryString, 0);
                    if (entryProxy) {
                        matchingEntries.push(entryProxy);
                    }
                }
                resultCallback(matchingEntries);
            }
        };
    }
    exports.customTreeQueryFunctionFactory = customTreeQueryFunctionFactory;
    function selectElementContents(domElement, start, end) {
        domElement = domElement.firstChild || domElement;
        end = end || start;
        var range = document.createRange();
        range.setStart(domElement, start);
        range.setEnd(domElement, end);
        var sel = window.getSelection();
        try {
            sel.removeAllRanges();
        }
        catch (e) {
        }
        sel.addRange(range);
    }
    exports.selectElementContents = selectElementContents;
    exports.escapeSpecialRegexCharacter = function (s) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };
    function objectEquals(x, y) {
        'use strict';
        if (x === null || x === undefined || y === null || y === undefined) {
            return x === y;
        }
        if (x.constructor !== y.constructor) {
            return false;
        }
        if (x instanceof Function) {
            return x === y;
        }
        if (x instanceof RegExp) {
            return x === y;
        }
        if (x === y || x.valueOf() === y.valueOf()) {
            return true;
        }
        if (Array.isArray(x) && x.length !== y.length) {
            return false;
        }
        if (x instanceof Date) {
            return false;
        }
        if (!(x instanceof Object)) {
            return false;
        }
        if (!(y instanceof Object)) {
            return false;
        }
        var p = Object.keys(x);
        return Object.keys(y).every(function (i) {
            return p.indexOf(i) !== -1;
        }) &&
            p.every(function (i) {
                return objectEquals(x[i], y[i]);
            });
    }
    exports.objectEquals = objectEquals;
    function trivialMatch(text, searchString, options) {
        if (!searchString) {
            return [{
                    start: 0,
                    length: text.length
                }];
        }
        options = $.extend({
            matchingMode: 'contains',
            ignoreCase: true,
            maxLevenshteinDistance: 3
        }, options || null);
        if (options.ignoreCase) {
            text = text.toLowerCase();
            searchString = searchString.toLowerCase();
        }
        function findRegexMatches(regex) {
            var matches = [];
            var match;
            while (match = regex.exec(text)) {
                matches.push({
                    start: match.index,
                    length: match[0].length
                });
            }
            return matches;
        }
        function findLevenshteinMatches(text, searchString) {
            var levenshtein = new Levenshtein(text, searchString);
            if (levenshtein.distance <= options.maxLevenshteinDistance) {
                return [{
                        start: 0,
                        length: searchString.length,
                        distance: levenshtein.distance
                    }];
            }
            else {
                return [];
            }
        }
        if (options.matchingMode == 'contains') {
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            return findRegexMatches(new RegExp(searchString, "g"));
        }
        else if (options.matchingMode == 'prefix') {
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            return findRegexMatches(new RegExp('^' + searchString, "g"));
        }
        else if (options.matchingMode == 'prefix-word') {
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            if (searchString.charAt(0).match(/^\w/)) {
                return findRegexMatches(new RegExp('\\b' + searchString, "g"));
            }
            else {
                return findRegexMatches(new RegExp(searchString, "g"));
            }
        }
        else if (options.matchingMode == 'prefix-levenshtein') {
            return findLevenshteinMatches(text.substr(0, Math.min(searchString.length, text.length)), searchString);
        }
        else if (options.matchingMode == 'levenshtein') {
            return findLevenshteinMatches(text, searchString);
        }
        else {
            throw "unknown matchingMode: " + options.matchingMode;
        }
    }
    exports.trivialMatch = trivialMatch;
    function minimallyScrollTo(element, target) {
        var $target = $(target);
        $(element).each(function () {
            var $this = $(this);
            var viewPortMinY = $this.scrollTop();
            var viewPortMaxY = viewPortMinY + $this.innerHeight();
            var targetMinY = $($target).offset().top - $(this).offset().top + $this.scrollTop();
            var targetMaxY = targetMinY + $target.height();
            if (targetMinY < viewPortMinY) {
                $this.scrollTop(targetMinY);
            }
            else if (targetMaxY > viewPortMaxY) {
                $this.scrollTop(Math.min(targetMinY, targetMaxY - $this.innerHeight()));
            }
            var viewPortMinX = $this.scrollLeft();
            var viewPortMaxX = viewPortMinX + $this.innerWidth();
            var targetMinX = $($target).offset().left - $(this).offset().left + $this.scrollLeft();
            var targetMaxX = targetMinX + $target.width();
            if (targetMinX < viewPortMinX) {
                $this.scrollLeft(targetMinX);
            }
            else if (targetMaxX > viewPortMaxX) {
                $this.scrollLeft(Math.min(targetMinX, targetMaxX - $this.innerWidth()));
            }
        });
    }
    exports.minimallyScrollTo = minimallyScrollTo;
    function setTimeoutOrDoImmediately(f, delay) {
        if (delay != null) {
            return window.setTimeout(f(), delay);
        }
        else {
            return void f();
        }
    }
    exports.setTimeoutOrDoImmediately = setTimeoutOrDoImmediately;
});

//# sourceMappingURL=TrivialCore.js.map
