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
(function (factory) {
    "use strict";

    if (typeof define === 'function' && define.amd) {
        // Define as an AMD module if possible
        define('trivial-tree', ['jquery', 'mustache'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery', 'mustache'));
    } else if (jQuery && !jQuery.fn.trivialtree) {
        // Define using browser globals otherwise
        // Prevent multiple instantiations if the script is loaded twice
        factory(jQuery, Mustache);
    }
}(function ($, Mustache) {

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
    var defaultTemplate = icon2LinesTemplate;
    var defaultSpinnerTemplate = '<div class="tr-default-spinner"><div>Fetching data...</div></div>';
    var defaultNoEntriesTemplate = '<div class="tr-default-no-data-display"><div>No matching entries...</div></div>';
    var defaultQueryFunctionFactory = function (entries) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trEntryElement;
                if ($entryElement.is(':containsIgnoreCase(' + queryString + ')')) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        return function (queryString, resultCallback) {
            resultCallback(filterElements(queryString));
        }
    };

    function isModifierKey(e) {
        return [keyCodes.shift, keyCodes.caps_lock, keyCodes.alt, keyCodes.ctrl, keyCodes.left_window_key, keyCodes.right_window_key]
                .indexOf(e.which) != -1;
    }

    function TrivialTree(originalInput, options) {

        /*
        TODO
         - possibility to specify multiple templates (depending on depth)
         -
         */

        options = options || {};
        var config = $.extend({
            valueProperty: null,
            templates: [defaultTemplate],
            spinnerTemplate: defaultSpinnerTemplate,
            noEntriesTemplate: defaultNoEntriesTemplate,
            entries: null,
            selectedEntry: undefined,
            queryFunction: defaultQueryFunctionFactory(options.entries || [])
        }, options);

        var entries = config.entries;
        var selectedEntry;
        var highlightedEntry = null;
        var blurCausedByClickInsideComponent = false;

        var $originalInput = $(originalInput).addClass("tr-original-input");
        var $componentWrapper = $('<div class="tr-tree"/>').insertAfter($originalInput);
        var $entryTree = $('<div class="tr-tree-entryTree"></div>').appendTo($componentWrapper);
        var $editor = $('<input type="text" class="tr-tree-edit-input"/>')
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
                if (e.which == keyCodes.tab || isModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    return; // let the user navigate freely left and right...
                }

                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                    var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                    if (entries != null) {
                        highlightNextEntry(direction);
                        e.preventDefault(); // some browsers move the caret to the beginning on up key
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

        $componentWrapper.add($entryTree).mousedown(function () {
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

        $entryTree.mouseout(function() {
            setHighlightedEntry(null);
        });

        if (entries) { // if config.entries was set...
            updateTreeEntryElements(entries);
        }

        selectEntry(config.selectedEntry || null);

        function updateTreeEntryElements(entries) {
            $entryTree.empty();

            function createEntryElement(entry, $parentElement, depth) {
                var $outerEntryWrapper = $('<div class="tr-tree-entry-outer-wrapper isLeaf-'+ !!(entry.isLeaf) +'"></div>')
                    .appendTo($parentElement);
                var $entryAndExpanderWrapper = $('<div class="tr-tree-entry-and-expander-wrapper"></div>')
                    .appendTo($outerEntryWrapper);
                var $expander = $('<div class="tr-tree-expander"></div>')
                    .appendTo($entryAndExpanderWrapper);
                var html = Mustache.render(config.templates[Math.min(config.templates.length - 1, depth)], entry);
                var $entry = $(html).addClass("tr-tree-entry filterable-item")
                    .appendTo($entryAndExpanderWrapper);
                entry._trEntryElement = $entry;
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


                if (entry.children && entry.children.length > 0) {
                    var $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
                        .appendTo($outerEntryWrapper);
                    $expander.click(function() {
                        $childrenWrapper.slideToggle(100);
                        $outerEntryWrapper.toggleClass("expanded");
                    });
                    for (var i = 0; i<entry.children.length; i++) {
                        createEntryElement(entry.children[i], $childrenWrapper, depth + 1);
                    }
                }
            }

            if (entries.length > 0) {
                for (var i = 0; i < entries.length; i++) {
                    createEntryElement(entries[i], $entryTree, 0);
                }
            } else {
                $entryTree.append(config.noEntriesTemplate);
            }
        }

        function updateEntries(newEntries, highlightDirection) {
            highlightedEntry = null;
            entries = newEntries;
            updateTreeEntryElements(entries);

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
            $entryTree.append(config.spinnerTemplate);

            // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
            setTimeout(function () {
                config.queryFunction($editor.val(), function (newEntries) {
                    updateEntries(newEntries, highlightDirection);
                });
            });
        }

        function setHighlightedEntry(entry) {
            highlightedEntry = entry;
            $entryTree.find('.tr-tree-entry').removeClass('tr-highlighted-entry');
            if (entry != null) {
                entry._trEntryElement.addClass('tr-highlighted-entry');
                $entryTree.minimallyScrollTo(entry._trEntryElement);
            }
        }

        function selectEntry(entry) {
            $entryTree.find(".tr-selected-entry").removeClass("tr-selected-entry");
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
                $entryElement.trivialHighlight($editor.val());
            }
        }

        this.$ = $componentWrapper;
        $componentWrapper[0].trivialTree = this;

        this.updateEntries = updateEntries;
        this.getSelectedEntry = function() {
            return selectedEntry;
        }
    }

    $.fn.trivialtree = function (options) {
        var $trees = [];
        this.each(function () {
            var existingTreeWrapper = $(this).parents('.tr-tree').addBack('.tr-tree');
            if (existingTreeWrapper.length > 0 && existingTreeWrapper[0].trivialTree) {
                $trees.push(existingTreeWrapper[0].trivialTree.$);
            } else {
                var tree = new TrivialTree(this, options);
                $trees.push(tree.$);
            }
        });
        return $($trees);
    };
    $.fn.TrivialTree = function (options) {
        var trees = [];
        this.each(function () {
            var existingTreeWrapper = $(this).parents('.tr-tree').addBack('.tr-tree');
            if (existingTreeWrapper.length > 0 && existingTreeWrapper[0].trivialTree) {
                trees.push(existingTreeWrapper[0].trivialTree);
            } else {
                var tree = new TrivialTree(this, options);
                trees.push(tree);
            }
        });
        return trees.length == 1 ? trees[0] : trees;
    };

    $.fn.trivialtree.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.TrivialTree.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.trivialtree.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.TrivialTree.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.trivialtree.singleLineTemplate = singleLineTemplate;
    $.fn.TrivialTree.singleLineTemplate = singleLineTemplate;

    return $.fn.TrivialTree;
})
);
