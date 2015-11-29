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
            define('trivial-list', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.triviallist) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var keyCodes = TrivialComponents.keyCodes;

        function TrivialList(originalInput, options) {
            options = options || {};
            var config = $.extend({
                valueProperty: null,
                template: TrivialComponents.image2LinesTemplate,
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                entries: null,
                selectedEntryId: null,
                queryFunction: null, // defined below...
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                }
            }, options);

            config.queryFunction = config.queryFunction || TrivialComponents.defaultListQueryFunctionFactory(config.entries || [], config.matchingOptions);

            var entries = config.entries;
            var selectedEntry;
            var highlightedEntry = null;
            var blurCausedByClickInsideComponent = false;

            var $originalInput = $(originalInput).addClass("tr-original-input");
            var $componentWrapper = $('<div class="tr-list"/>').insertAfter($originalInput);
            var $entryList = $('<div class="tr-list-entryList"></div>').appendTo($componentWrapper);
            var $editor = $('<input type="text" class="tr-list-editor tr-editor"/>')
                .prependTo($componentWrapper)
                .focus(function () {
                    $componentWrapper.addClass('focus');
                })
                .blur(function () {
                    if (blurCausedByClickInsideComponent) {
                        $editor.focus();
                    } else {
                        $componentWrapper.removeClass('focus');
                        setHighlightedEntry(null);
                    }
                })
                .keydown(function (e) {
                    if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                        return; // tab or modifier key was pressed...
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        return; // let the user navigate freely left and right...
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (entries != null) {
                            highlightNextEntry(direction);
                            return false; // some browsers move the caret to the beginning on up key
                        } else {
                            query(direction);
                        }
                    } else if (e.which == keyCodes.enter) {
                        selectEntry(highlightedEntry);
                        $editor.select();
                    } else if (e.which == keyCodes.escape) {
                        setHighlightedEntry(null);
                    } else {
                        query(1);
                    }
                })
                .keyup(function (e) {
                })
                .mousedown(function () {
                    if (entries == null) {
                        query();
                    }
                });

            $componentWrapper.add($entryList).mousedown(function () {
                if ($editor.is(":focus")) {
                    blurCausedByClickInsideComponent = true;
                }
            }).mouseup(function () {
                if (blurCausedByClickInsideComponent) {
                    $editor.focus();
                    blurCausedByClickInsideComponent = false;
                }
            }).mouseout(function () {
                if (blurCausedByClickInsideComponent) {
                    $editor.focus();
                    blurCausedByClickInsideComponent = false;
                }
            });

            $entryList.mouseout(function () {
                setHighlightedEntry(null);
            });

            if (entries) { // if config.entries was set...
                updateListEntryElements(entries);
            }

            selectEntry(config.selectedEntryId ? findEntryById(config.selectedEntryId) : null);

            function findEntryById(id) {
                var matchingEntries = entries.filter(function (entry) {
                    return entry[config.valueProperty] == id;
                });
                return matchingEntries && matchingEntries.length > 0 ? matchingEntries[0] : null;
            }

            function updateListEntryElements(entries) {
                $entryList.empty();
                if (entries.length > 0) {
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var html = Mustache.render(config.template, entry);
                        var $entry = $(html).addClass("tr-list-entry filterable-item").appendTo($entryList);
                        entry._trEntryElement = $entry;
                        (function (entry) {
                            $entry
                                .mousedown(function () {
                                    blurCausedByClickInsideComponent = true;
                                    selectEntry(entry);
                                    $editor.select();
                                })
                                .mouseup(function () {
                                    if (blurCausedByClickInsideComponent) {
                                        $editor.focus();
                                        blurCausedByClickInsideComponent = false;
                                    }
                                }).mouseout(function () {
                                    if (blurCausedByClickInsideComponent) {
                                        $editor.focus();
                                        blurCausedByClickInsideComponent = false;
                                    }
                                })
                                .mouseover(function () {
                                    setHighlightedEntry(entry);
                                });
                        })(entry);
                    }
                } else {
                    $entryList.append(config.noEntriesTemplate);
                }
            }

            function updateEntries(newEntries, highlightDirection) {
                highlightedEntry = null;
                entries = newEntries;
                updateListEntryElements(entries);

                if (entries.length > 0) {
                    highlightTextMatches();

                    if (typeof highlightDirection != 'undefined') {
                        highlightNextEntry(highlightDirection);
                    }
                } else {
                    setHighlightedEntry(null);
                }
            }

            function query(highlightDirection) {
                $entryList.append(config.spinnerTemplate);

                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    config.queryFunction($editor.val(), function (newEntries) {
                        updateEntries(newEntries, highlightDirection);
                    });
                });
            }

            function setHighlightedEntry(entry) {
                highlightedEntry = entry;
                $entryList.find('.tr-list-entry').removeClass('tr-highlighted-entry');
                if (entry != null) {
                    entry._trEntryElement.addClass('tr-highlighted-entry');
                    $entryList.minimallyScrollTo(entry._trEntryElement);
                }
            }

            function selectEntry(entry) {
                $entryList.find(".tr-selected-entry").removeClass("tr-selected-entry");
                if (entry == null) {
                    $originalInput.val("");
                } else {
                    $originalInput.val(entry[config.valueProperty]);
                    selectedEntry = entry;
                    selectedEntry._trEntryElement.addClass("tr-selected-entry");
                }
            }

            function isEntrySelected() {
                return selectedEntry != null && selectedEntry !== config.emptyEntry;
            }

            function highlightNextEntry(direction) {
                var newHighlightedEntry = getNextHighlightableEntry(direction);
                if (newHighlightedEntry != null) {
                    setHighlightedEntry(newHighlightedEntry);
                }
            }

            function getNextHighlightableEntry(direction) {
                var newHighlightedElementIndex;
                if (entries == null || entries.length == 0) {
                    return null;
                } else if (highlightedEntry == null && direction > 0) {
                    newHighlightedElementIndex = -1 + direction;
                } else if (highlightedEntry == null && direction < 0) {
                    newHighlightedElementIndex = entries.length + direction;
                } else {
                    var currentHighlightedElementIndex = entries.indexOf(highlightedEntry);
                    newHighlightedElementIndex = (currentHighlightedElementIndex + entries.length + direction) % entries.length;
                }
                return entries[newHighlightedElementIndex];
            }

            function highlightTextMatches() {
                for (var i = 0; i < entries.length; i++) {
                    var $entryElement = entries[i]._trEntryElement;
                    $entryElement.trivialHighlight($editor.val(), config.matchingOptions);
                }
            }

            this.$ = $componentWrapper;
            $componentWrapper[0].trivialList = this;

            this.updateEntries = updateEntries;
            this.getSelectedEntry = function () {
                return selectedEntry;
            };
            this.destroy = function() {
                $originalInput.removeClass('tr-original-input').insertBefore($componentWrapper);
                $componentWrapper.remove();
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialList, "TrivialList", "tr-list");

        return $.fn.TrivialList;
    })
);
