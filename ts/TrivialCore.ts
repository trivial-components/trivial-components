///<reference path="customDefinitions.d.ts"/>
/*
 Trivial Components (https://github.com/trivial-components/trivial-components)

 Copyright 2015 Yann Massard (https://github.com/yamass) and other contributors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
module TrivialComponents {

    export type EditingMode = 'editable' | 'disabled' | 'readonly';

    export type MatchingOptions = {
        matchingMode: 'contains' |'prefix' |'prefix-word' |'prefix-levenshtein' |'levenshtein',
        ignoreCase: boolean,
        maxLevenshteinDistance: number
    };

    export type Match = {
        start: number,
        length: number,
        distance?: number
    };

    export type HighlightDirection = number|null|undefined;

    export type NavigationDirection = "up" | "left" | "down" | "right";

    export const DEFAULT_TEMPLATES = {
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

    export function wrapWithDefaultTagWrapper(entryTemplate: string) {
        return ('<div class="tr-tagbox-default-wrapper-template">' +
        '<div class="tr-tagbox-tag-content">##entryHtml##</div>' +
        '<div class="tr-remove-button"></div>' +
        '</div>').replace("##entryHtml##", entryTemplate);
    }

    export function defaultListQueryFunctionFactory(entries: any[], matchingOptions: MatchingOptions) {
        function filterElements(queryString: string) {
            var visibleEntries: any[] = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trEntryElement;
                if (!queryString || trivialMatch($entryElement.text().trim().replace(/\s{2,}/g, ' '), queryString, matchingOptions).length > 0) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        return function (queryString: string, resultCallback: Function) {
            resultCallback(filterElements(queryString));
        }
    }

    export function createProxy(delegate: any): any {
        var proxyConstructor = function () {
        };
        proxyConstructor.prototype = delegate;
        let proxyConstructorTypescriptHack = proxyConstructor as any;
        return new proxyConstructorTypescriptHack();
    }

    export function defaultEntryMatchingFunctionFactory(searchedPropertyNames: string[], matchingOptions: MatchingOptions) {
        return function (entry: any, queryString: string, depth: number) {
            return searchedPropertyNames
                .some((propertyName: string) => {
                    var value = entry[propertyName];
                    return value != null && trivialMatch(value.toString(), queryString, matchingOptions).length > 0
                });
        };
    }

    export function defaultTreeQueryFunctionFactory(topLevelEntries: any[], entryMatchingFunction: Function, childrenPropertyName: string, expandedPropertyName: string) {

        function findMatchingEntriesAndTheirAncestors(entry: any, queryString: string, nodeDepth: number) {
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
                // still make it expandable!
                entryProxy[childrenPropertyName] = entry[childrenPropertyName];
            }
            return matchesItself || hasMatchingChildren ? entryProxy : null;
        }

        return function (queryString: string, resultCallback: Function) {
            if (!queryString) {
                resultCallback(topLevelEntries);
            } else {
                var matchingEntries: any[] = [];
                for (var i = 0; i < topLevelEntries.length; i++) {
                    var topLevelEntry = topLevelEntries[i];
                    var entryProxy = findMatchingEntriesAndTheirAncestors(topLevelEntry, queryString, 0);
                    if (entryProxy) {
                        matchingEntries.push(entryProxy);
                    }
                }
                resultCallback(matchingEntries);
            }
        }
    }

    export function customTreeQueryFunctionFactory(topLevelEntries: any[], childrenPropertyName: string, expandedPropertyName: string, customNodeMatchingFunction: (entry: any, queryString: string, nodeDepth: number) => boolean) {

        function findMatchingEntriesAndTheirAncestors(entry: any, queryString: string, nodeDepth: number) {
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
                // still make it expandable!
                entryProxy[childrenPropertyName] = entry[childrenPropertyName];
            }
            return matchesItself || hasMatchingChildren ? entryProxy : null;
        }

        return function (queryString: string, resultCallback: (entries: any[]) => void) {
            if (!queryString) {
                resultCallback(topLevelEntries);
            } else {
                var matchingEntries: any[] = [];
                for (var i = 0; i < topLevelEntries.length; i++) {
                    var topLevelEntry = topLevelEntries[i];
                    var entryProxy = findMatchingEntriesAndTheirAncestors(topLevelEntry, queryString, 0);
                    if (entryProxy) {
                        matchingEntries.push(entryProxy);
                    }
                }
                resultCallback(matchingEntries);
            }
        }
    }

    export function selectElementContents(domElement: Node, start: number, end: number) {
        domElement = domElement.firstChild || domElement;
        end = end || start;
        var range = document.createRange();
        //range.selectNodeContents(el);
        range.setStart(domElement, start);
        range.setEnd(domElement, end);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    export const escapeSpecialRegexCharacter = function (s: string) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    // see http://stackoverflow.com/a/27014537/524913
    export function objectEquals(x: any, y: any): boolean {
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

    /**
     * @param text
     * @param searchString
     * @param options matchingMode: 'prefix', 'prefix-word', 'contain', 'prefix-levenshtein', 'levenshtein';
     *        ignoreCase: boolean
     *        maxLevenshteinDistance: integer (number) - only for levenshtein
     * @returns array of matchers {start, length, distance}
     */
    export function trivialMatch(text: string, searchString: string, options: MatchingOptions) {

        if (!searchString) {
            return [{
                start: 0,
                length: text.length
            }];
        }

        var options = <MatchingOptions>$.extend({
            matchingMode: 'contains',
            ignoreCase: true,
            maxLevenshteinDistance: 3
        }, options || null);

        if (options.ignoreCase) {
            text = text.toLowerCase();
            searchString = searchString.toLowerCase();
        }

        function findRegexMatches(regex: RegExp) {
            var matches: Match[] = [];
            var match: RegExpExecArray;
            while (match = regex.exec(text)) {
                matches.push({
                    start: match.index,
                    length: match[0].length
                });
            }
            return matches;
        }

        function findLevenshteinMatches(text: string, searchString: string) {
            var levenshtein = new Levenshtein(text, searchString);
            //console.log('distance between "' + text + '" and "' + searchString + '" is ' + levenshtein.distance);
            if (levenshtein.distance <= options.maxLevenshteinDistance) {
                return [{
                    start: 0,
                    length: searchString.length,
                    distance: levenshtein.distance
                }];
            } else {
                return [];
            }
        }

        if (options.matchingMode == 'contains') {
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); // escape all regex special chars
            return findRegexMatches(new RegExp(searchString, "g"));
        } else if (options.matchingMode == 'prefix') {
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); // escape all regex special chars
            return findRegexMatches(new RegExp('^' + searchString, "g"));
        } else if (options.matchingMode == 'prefix-word') {
            // ATTENTION: IF YOU CHANGE THIS, MAKE SURE TO EXECUTE THE UNIT TESTS!!
            searchString = searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); // escape all regex special chars
            if (searchString.charAt(0).match(/^\w/)) {
                return findRegexMatches(new RegExp('\\b' + searchString, "g"));
            } else {
                // search string starts with a non-word character, so \b will possibly not match!
                // After all, we cannot really decide, what is meant to be a word boundary in this context
                // (e.g.: "12€" with searchString "€"), so we fall back to "contains" mode.
                return findRegexMatches(new RegExp(searchString, "g"));
            }
        } else if (options.matchingMode == 'prefix-levenshtein') {
            return findLevenshteinMatches(text.substr(0, Math.min(searchString.length, text.length)), searchString);
        } else if (options.matchingMode == 'levenshtein') {
            return findLevenshteinMatches(text, searchString);
        } else {
            throw "unknown matchingMode: " + options.matchingMode;
        }
    }
}