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

import * as jQuery from "jquery";
import {MatchingOptions, trivialMatch} from "./TrivialCore";

(function ($) {
    $.expr[":"].containsIgnoreCase = $.expr.createPseudo(function (arg:string) {
        return function (elem:Element) {
            return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
    });
})(jQuery);

export type HighlightOptions = MatchingOptions & {
    highlightClassName: string
};

(function ($) {
    const isIE11 = !((<any>window).ActiveXObject) && "ActiveXObject" in window;
    function normalizeForIE11 (node:Node) {
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

    $.fn.trivialHighlight = function (searchString:string, options:HighlightOptions) {
        options = $.extend({
            highlightClassName: 'tr-highlighted-text',
            matchingMode: 'contains',
            ignoreCase: true,
            maxLevenshteinDistance: 3
        }, options);

        return this.find('*').each(function () {
            const $this = $(this);

            $this.find('.' + options.highlightClassName).contents().unwrap();
            if (isIE11) {
                normalizeForIE11(this);
            } else {
                this.normalize();
            }

            if (searchString && searchString !== '') {
                $this.contents().filter(function () {
                    return this.nodeType == 3 && trivialMatch(this.nodeValue, searchString, options).length > 0;
                }).replaceWith(function () {
                    const oldNodeValue = (this.nodeValue || "");
                    let newNodeValue = "";
                    const matches = trivialMatch(this.nodeValue, searchString, options);
                    let oldMatchEnd = 0;
                    for (let i = 0; i < matches.length; i++) {
                        const match = matches[i];
                        newNodeValue += this.nodeValue.substring(oldMatchEnd, match.start);
                        newNodeValue += "<span class=\"" + options.highlightClassName + "\">" + oldNodeValue.substr(match.start, match.length) + "</span>";
                        oldMatchEnd = match.start + match.length;
                    }
                    newNodeValue += oldNodeValue.substring(oldMatchEnd, oldNodeValue.length);
                    return newNodeValue as any; // type definition does not support string but should...
                });
            }
        });
    };
}(jQuery));

