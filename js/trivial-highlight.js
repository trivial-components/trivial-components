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
(function ($) {
    $.expr[":"].containsIgnoreCase = $.expr.createPseudo(function (arg) {
        return function (elem) {
            return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
    });
})(jQuery);


(function ($) {
    /**
     * @param text
     * @param searchString
     * @param options matchingMode: 'prefix', 'prefix-word', 'contain', 'prefix-levenshtein', 'levenshtein';
     *        ignoreCase: boolean
     *        maxLevenshteinDistance: integer (number) - only for levenshtein
     * @returns array of matchers {start, length, distance}
     */
    $.trivialMatch = function (text, searchString, options) {

        if (!searchString) {
            return [{
                start: 0,
                length: text.length
            }];
        }

        var options = $.extend({
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
}(jQuery));

(function ($) {
    var isIE11 = !(window.ActiveXObject) && "ActiveXObject" in window;
    function normalizeForIE11 (node) {
        if (!node) { return; }
        if (node.nodeType == 3) {
            while (node.nextSibling && node.nextSibling.nodeType == 3) {
                node.nodeValue += node.nextSibling.nodeValue;
                node.parentNode.removeChild(node.nextSibling);
            }
        } else {
            normalizeForIE11(node.firstChild);
        }
        normalizeForIE11(node.nextSibling);
    }

    $.fn.trivialHighlight = function (searchString, options) {
        options = $.extend({
            highlightClassName: 'tr-highlighted-text',
            matchingMode: 'contains',
            ignoreCase: true,
            maxLevenshteinDistance: 3
        }, options);

        return this.find('*').each(function () {
            var $this = $(this);

            $this.find('.' + options.highlightClassName).contents().unwrap();
            if (isIE11) { // this is ie11
                normalizeForIE11(this);
            } else {
                this.normalize();
            }

            if (searchString && searchString !== '') {
                $this.contents().filter(function () {
                    return this.nodeType == 3 && $.trivialMatch(this.nodeValue, searchString, options).length > 0;
                }).replaceWith(function () {
                    var oldNodeValue = (this.nodeValue || "");
                    var newNodeValue = "";
                    var matches = $.trivialMatch(this.nodeValue, searchString, options);
                    var oldMatchEnd = 0;
                    for (var i = 0; i < matches.length; i++) {
                        var match = matches[i];
                        newNodeValue += this.nodeValue.substring(oldMatchEnd, match.start);
                        newNodeValue += "<span class=\"" + options.highlightClassName + "\">" + oldNodeValue.substr(match.start, match.length) + "</span>";
                        oldMatchEnd = match.start + match.length;
                    }
                    newNodeValue += oldNodeValue.substring(oldMatchEnd, oldNodeValue.length);
                    return newNodeValue;
                });
            }
        });
    };
}(jQuery));