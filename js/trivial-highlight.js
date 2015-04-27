/*
 Copyright 2015 Yann Massard (Trivial Components)

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
    $.fn.highlight = function (searchString, highlightClassName) {
        var regex = new RegExp(searchString, "gi");
        return this.find('*').each(function () {
            var $this = $(this);

            $this.find('.' + highlightClassName).contents().unwrap();
            this.normalize();

            if (searchString && searchString !== '') {
                $this.contents().filter(function () {
                    return this.nodeType == 3 && regex.test(this.nodeValue);
                }).replaceWith(function () {
                    return (this.nodeValue || "").replace(regex, function (match) {
                        return "<span class=\"" + highlightClassName + "\">" + match + "</span>";
                    });
                });
            }
        });
    };
}(jQuery));