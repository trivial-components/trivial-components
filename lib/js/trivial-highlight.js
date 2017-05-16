/*!
Trivial Components (https://github.com/trivial-components/trivial-components)

Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors

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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "jquery", "./TrivialCore"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var jQuery = require("jquery");
    var TrivialCore_1 = require("./TrivialCore");
    (function ($) {
        $.expr[":"].containsIgnoreCase = $.expr.createPseudo(function (arg) {
            return function (elem) {
                return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
            };
        });
    })(jQuery);
    (function ($) {
        var isIE11 = !(window.ActiveXObject) && "ActiveXObject" in window;
        function normalizeForIE11(node) {
            if (!node) {
                return;
            }
            if (node.nodeType == 3) {
                while (node.nextSibling && node.nextSibling.nodeType == 3) {
                    node.nodeValue += node.nextSibling.nodeValue;
                    node.parentNode.removeChild(node.nextSibling);
                }
            }
            else {
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
                if (isIE11) {
                    normalizeForIE11(this);
                }
                else {
                    this.normalize();
                }
                if (searchString && searchString !== '') {
                    $this.contents().filter(function () {
                        return this.nodeType == 3 && TrivialCore_1.trivialMatch(this.nodeValue, searchString, options).length > 0;
                    }).replaceWith(function () {
                        var oldNodeValue = (this.nodeValue || "");
                        var newNodeValue = "";
                        var matches = TrivialCore_1.trivialMatch(this.nodeValue, searchString, options);
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
});

//# sourceMappingURL=trivial-highlight.js.map
