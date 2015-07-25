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
(function (factory) {
    "use strict";

    if (typeof define === 'function' && define.amd) {
        // Define as an AMD module if possible
        define('trivial-core', ['jquery', 'mustache'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery'), require('mustache'));
    } else if (jQuery && !jQuery.fn.trivialcombobox) {
        // Define using browser globals otherwise
        // Prevent multiple instantiations if the script is loaded twice
        window.TrivialComponents = factory();
    }
}(function () {

    var image2LinesTemplate = '<div class="tr-template-image-2-lines">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div class="main-line">{{displayValue}}</div> ' +
        '    <div class="additional-info">{{additionalInfo}}</div>' +
        '  </div>' +
        '</div>';
    var roundImage2LinesColorBubbleTemplate = '<div class="tr-template-round-image-2-lines-color-bubble">' +
        '  {{#imageUrl}}<div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>{{/imageUrl}}' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div class="main-line">{{displayValue}}</div> ' +
        '    <div class="additional-info">{{#statusColor}}<span class="status-bubble" style="background-color: {{statusColor}}"></span>{{/statusColor}}{{additionalInfo}}</div>' +
        '  </div>' +
        '</div>';
    var icon2LinesTemplate = '<div class="tr-template-icon-2-lines">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div class="main-line">{{displayValue}}</div> ' +
        '    <div class="additional-info">{{additionalInfo}}</div>' +
        '  </div>' +
        '</div>';
    var iconSingleLineTemplate = '<div class="tr-template-icon-single-line">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area">{{displayValue}}</div>' +
        '</div>';
    var singleLineTemplate = '<div class="tr-template-single-line">' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div>{{displayValue}}</div> ' +
        '  </div>' +
        '</div>';

    function wrapEntryTemplateWithDefaultTagWrapperTemplate(entryTemplate) {
        return ('<div class="tr-tagbox-default-wrapper-template">' +
        '<div class="tr-tagbox-tag-content">##entryTemplate##</div>' +
        '<div class="tr-tagbox-tag-remove-button"></div>' +
        '</div>').replace("##entryTemplate##", entryTemplate);
    }

    var keyCodes = {
        backspace: 8,
        tab: 9,
        enter: 13,
        shift: 16,
        ctrl: 17,
        alt: 18,
        pause: 19,
        caps_lock: 20,
        escape: 27,
        page_up: 33,
        page_down: 34,
        end: 35,
        home: 36,
        left_arrow: 37,
        up_arrow: 38,
        right_arrow: 39,
        down_arrow: 40,
        insert: 45,
        delete: 46,
        left_window_key: 91,
        right_window_key: 92,
        select_key: 93,
        num_lock: 144,
        scroll_lock: 145
    };

    function isModifierKey(e) {
        return [keyCodes.shift, keyCodes.caps_lock, keyCodes.alt, keyCodes.ctrl, keyCodes.left_window_key, keyCodes.right_window_key]
                .indexOf(e.which) != -1;
    }

    var defaultListQueryFunctionFactory = function (entries, matchingOptions) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trEntryElement;
                if (!queryString || $.trivialMatch($entryElement.text().trim().replace(/\s{2,}/g, ' '), queryString, matchingOptions).length > 0) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        return function (queryString, resultCallback) {
            resultCallback(filterElements(queryString));
        }
    };

        var defaultTreeQueryFunctionFactory = function (topLevelEntries, matchingOptions, childrenPropertyName, expandedPropertyName) {

            function createProxy(delegate) {
                var proxyConstructor = function(){};
                proxyConstructor.prototype = delegate;
                return new proxyConstructor();
            }

            function findMatchingEntriesAndTheirAncestors(entry, queryString) {
                var entryProxy = createProxy(entry);
                entryProxy[childrenPropertyName] = [];
                entryProxy[expandedPropertyName] = false;
                if (entry[childrenPropertyName]) {
                    for (var i = 0; i < entry[childrenPropertyName].length; i++) {
                        var child = entry[childrenPropertyName][i];
                        var childProxy = findMatchingEntriesAndTheirAncestors(child, queryString);
                        if (childProxy){
                            entryProxy[childrenPropertyName].push(childProxy);
                            entryProxy[expandedPropertyName] = true;
                        }
                    }
                }
                var hasMatchingChildren = entryProxy[childrenPropertyName].length > 0;
                var matchesItself = entryMatches(entry, queryString);
                if (matchesItself && !hasMatchingChildren) {
                    // still make it expandable!
                    entryProxy[childrenPropertyName] = entry[childrenPropertyName];
                }
                return matchesItself || hasMatchingChildren ? entryProxy : null;
            }

            function entryMatches(entry, queryString) {
                var $entryElement = entry._trEntryElement;
                return !queryString || $.trivialMatch($entryElement.text().trim().replace(/\s{2,}/g, ' '), queryString, matchingOptions).length > 0;
            }


            return function (queryString, resultCallback) {
                if (!queryString) {
                    resultCallback(topLevelEntries);
                } else {
                    var matchingEntries = [];
                    for (var i = 0; i < topLevelEntries.length; i++) {
                        var topLevelEntry = topLevelEntries[i];
                        var entryProxy = findMatchingEntriesAndTheirAncestors(topLevelEntry, queryString);
                        if (entryProxy) {
                            matchingEntries.push(entryProxy);
                        }
                    }
                    resultCallback(matchingEntries);
                }
            }
        };


        var TrivialComponents = {
        image2LinesTemplate: image2LinesTemplate,
        roundImage2LinesColorBubbleTemplate: roundImage2LinesColorBubbleTemplate,
        icon2LinesTemplate: icon2LinesTemplate,
        iconSingleLineTemplate: iconSingleLineTemplate,
        singleLineTemplate: singleLineTemplate,
        defaultSpinnerTemplate: '<div class="tr-default-spinner"><div class="spinner"></div><div>Fetching data...</div></div>',
        defaultNoEntriesTemplate: '<div class="tr-default-no-data-display"><div>No matching entries...</div></div>',
        wrapEntryTemplateWithDefaultTagWrapperTemplate: wrapEntryTemplateWithDefaultTagWrapperTemplate,
        keyCodes: keyCodes,
        defaultListQueryFunctionFactory: defaultListQueryFunctionFactory,
        defaultTreeQueryFunctionFactory: defaultTreeQueryFunctionFactory,
        isModifierKey: isModifierKey
    };
    return TrivialComponents;
})
);