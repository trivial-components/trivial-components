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

    export class TrivialCore {

        public static readonly image2LinesTemplate = '<div class="tr-template-image-2-lines">' +
            '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">{{displayValue}}</div> ' +
            '    <div class="additional-info">{{additionalInfo}}</div>' +
            '  </div>' +
            '</div>';
        public static readonly roundImage2LinesColorBubbleTemplate = '<div class="tr-template-round-image-2-lines-color-bubble">' +
            '  {{#imageUrl}}<div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>{{/imageUrl}}' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">{{displayValue}}</div> ' +
            '    <div class="additional-info">{{#statusColor}}<span class="status-bubble" style="background-color: {{statusColor}}"></span>{{/statusColor}}{{additionalInfo}}</div>' +
            '  </div>' +
            '</div>';
        public static readonly icon2LinesTemplate = '<div class="tr-template-icon-2-lines">' +
            '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="main-line">{{displayValue}}</div> ' +
            '    <div class="additional-info">{{additionalInfo}}</div>' +
            '  </div>' +
            '</div>';
        public static readonly iconSingleLineTemplate = '<div class="tr-template-icon-single-line">' +
            '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
            '  <div class="content-wrapper tr-editor-area">{{displayValue}}</div>' +
            '</div>';
        public static readonly singleLineTemplate = '<div class="tr-template-single-line">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div>{{displayValue}}</div> ' +
            '  </div>' +
            '</div>';
        public static readonly currencySingleLineShortTemplate = '<div class="tr-template-currency-single-line-short">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div>{{#symbol}}<span class="currency-symbol">{{symbol}}</span>{{/symbol}} {{#code}}<span class="currency-code">{{code}}</span>{{/code}}</div> ' +
            '  </div>' +
            '</div>';
        public static readonly currencySingleLineLongTemplate = '<div class="tr-template-currency-single-line-long">' +
            '  <div class="content-wrapper tr-editor-area"> ' +
            '    <div class="symbol-and-code">{{#code}}<span class="currency-code">{{code}}</span>{{/code}} {{#symbol}}<span class="currency-symbol">{{symbol}}</span>{{/symbol}}</div>' +
            '    <div class="currency-name">{{name}}</div>' +
            '  </div>' +
            '</div>';
        public static readonly currency2LineTemplate = '<div class="tr-template-currency-2-lines">' +
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
            '</div>';
        public static readonly defaultSpinnerTemplate = '<div class="tr-default-spinner"><div class="spinner"></div><div>Fetching data...</div></div>';
        public static readonly defaultNoEntriesTemplate = '<div class="tr-default-no-data-display"><div>No matching entries...</div></div>';

        public static wrapWithDefaultTagWrapper = function (entryTemplate: string) {
            return ('<div class="tr-tagbox-default-wrapper-template">' +
            '<div class="tr-tagbox-tag-content">##entryHtml##</div>' +
            '<div class="tr-remove-button"></div>' +
            '</div>').replace("##entryHtml##", entryTemplate);
        };

        public static readonly defaultListQueryFunctionFactory = function (entries: any[], matchingOptions:MatchingOptions) {
            function filterElements(queryString:string) {
                var visibleEntries:any[] = [];
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var $entryElement = entry._trEntryElement;
                    if (!queryString || TrivialCore.trivialMatch($entryElement.text().trim().replace(/\s{2,}/g, ' '), queryString, matchingOptions).length > 0) {
                        visibleEntries.push(entry);
                    }
                }
                return visibleEntries;
            }

            return function (queryString:string, resultCallback:Function) {
                resultCallback(filterElements(queryString));
            }
        };

        public static readonly createProxy = function (delegate:any):any {
            var proxyConstructor = function () {
            };
            proxyConstructor.prototype = delegate;
            let proxyConstructorTypescriptHack = proxyConstructor as any;
            return new proxyConstructorTypescriptHack();
        };

        public static readonly defaultEntryMatchingFunctionFactory = function (searchedPropertyNames:string[], matchingOptions:MatchingOptions) {
            return function (entry:any, queryString:string, depth:number) {
                return searchedPropertyNames
                    .some( (propertyName:string) => {
                        var value = entry[propertyName];
                        return value != null && TrivialCore.trivialMatch(value.toString(), queryString, matchingOptions).length > 0
                    });
            };
        };

        public static readonly defaultTreeQueryFunctionFactory = function (topLevelEntries:any[], entryMatchingFunction:Function, childrenPropertyName:string, expandedPropertyName:string) {

            function findMatchingEntriesAndTheirAncestors(entry:any, queryString:string, nodeDepth:number) {
                var entryProxy = TrivialCore.createProxy(entry);
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

            return function (queryString:string, resultCallback:Function) {
                if (!queryString) {
                    resultCallback(topLevelEntries);
                } else {
                    var matchingEntries:any[] = [];
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
        };

        public static readonly customTreeQueryFunctionFactory = function (topLevelEntries:any[], childrenPropertyName:string, expandedPropertyName:string, customNodeMatchingFunction:(entry:any, queryString:string, nodeDepth:number) => boolean) {

            function findMatchingEntriesAndTheirAncestors(entry:any, queryString:string, nodeDepth:number) {
                var entryProxy = TrivialCore.createProxy(entry);
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

            return function (queryString:string, resultCallback:(entries:any[]) => void) {
                if (!queryString) {
                    resultCallback(topLevelEntries);
                } else {
                    var matchingEntries:any[] = [];
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
        };

        // public static readonly registerJqueryPlugin = function (componentConstructor, componentName, cssClass) {
        //     var jsApiName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
        //     var plainJqueryName = componentName.toLowerCase();
        //     var domToJsObjectReferenceName = componentName.charAt(0).toLocaleLowerCase() + componentName.slice(1);
        //
        //     $.fn[plainJqueryName] = function (options) {
        //         var $comboBoxes = [];
        //         this.each(function () {
        //             var existingComboBoxWrapper = $(this).parents('.' + cssClass).addBack('.' + cssClass);
        //             if (existingComboBoxWrapper.length > 0 && existingComboBoxWrapper[0][domToJsObjectReferenceName]) {
        //                 $comboBoxes.push(existingComboBoxWrapper[0][domToJsObjectReferenceName].$);
        //             } else {
        //                 var comboBox = new componentConstructor(this, options);
        //                 $comboBoxes.push(comboBox.$);
        //             }
        //         });
        //         return $($comboBoxes);
        //     };
        //     $.fn[jsApiName] = function (options) {
        //         var comboBoxes = [];
        //         this.each(function () {
        //             var existingComboBoxWrapper = $(this).parents('.' + cssClass).addBack('.' + cssClass);
        //             if (existingComboBoxWrapper.length > 0 && existingComboBoxWrapper[0][domToJsObjectReferenceName]) {
        //                 comboBoxes.push(existingComboBoxWrapper[0][domToJsObjectReferenceName]);
        //             } else {
        //                 var comboBox = new componentConstructor(this, options);
        //                 comboBoxes.push(comboBox);
        //             }
        //         });
        //         return comboBoxes.length == 1 ? comboBoxes[0] : comboBoxes;
        //     };
        // };

        public static readonly selectElementContents = function (domElement:Node, start:number, end:number) {
            domElement = domElement.firstChild || domElement;
            end = end || start;
            var range = document.createRange();
            //range.selectNodeContents(el);
            range.setStart(domElement, start);
            range.setEnd(domElement, end);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };

        public static readonly escapeSpecialRegexCharacter = function (s:string) {
            return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        };

        // see http://stackoverflow.com/a/27014537/524913
        public static readonly objectEquals = function (x:any, y:any):boolean {
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
                    return TrivialCore.objectEquals(x[i], y[i]);
                });
        };

        /**
         * @param text
         * @param searchString
         * @param options matchingMode: 'prefix', 'prefix-word', 'contain', 'prefix-levenshtein', 'levenshtein';
         *        ignoreCase: boolean
         *        maxLevenshteinDistance: integer (number) - only for levenshtein
         * @returns array of matchers {start, length, distance}
         */
        public static readonly trivialMatch = function (text:string, searchString:string, options:MatchingOptions) {

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

            function findRegexMatches(regex:RegExp) {
                var matches:Match[] = [];
                var match:RegExpExecArray;
                while (match = regex.exec(text)) {
                    matches.push({
                        start: match.index,
                        length: match[0].length
                    });
                }
                return matches;
            }

            function findLevenshteinMatches(text:string, searchString:string) {
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
        };
    }
}