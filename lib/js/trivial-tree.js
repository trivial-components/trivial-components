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
            define('trivial-tree', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.trivialtree) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var keyCodes = TrivialComponents.keyCodes;

        var defaultQueryFunctionFactory = function (topLevelEntries, matchingOptions) {

            function createProxy(delegate) {
                var proxyConstructor = function(){};
                proxyConstructor.prototype = delegate;
                return new proxyConstructor();
            }

            function findMatchingEntriesAndTheirAncestors(entry, queryString) {
                var entryProxy = createProxy(entry);
                entryProxy.children = [];
                entryProxy.expanded = false;
                if (entry.children) {
                    for (var i = 0; i < entry.children.length; i++) {
                        var child = entry.children[i];
                        var childProxy = findMatchingEntriesAndTheirAncestors(child, queryString);
                        if (childProxy){
                            entryProxy.children.push(childProxy);
                            entryProxy.expanded = true;
                        }
                    }
                }
                var matchesOrHasMatchingChild = entryMatches(entry, queryString) || entryProxy.children.length > 0;
                return matchesOrHasMatchingChild ? entryProxy : null;
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

        function TrivialTree(originalInput, options) {

            /*
             TODO
             - up/down key support
             - expand current node if right key is pressed and at end of editor
             - collapse current node if left key is pressed and at start of editor
             */

            options = options || {};
            var config = $.extend({
                valueProperty: null,
                templates: [TrivialComponents.iconSingleLineTemplate],
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                entries: null,
                idProperty: 'id',
                selectedEntryId: undefined,
                // TODO childrenProperty
                expandedAttributeName: 'expanded',
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                }
            }, options);

            config.queryFunction = config.queryFunction || defaultQueryFunctionFactory(config.entries || [], config.matchingOptions);

            var entries = config.entries;
            var selectedEntryId;
            var highlightedEntry = null;
            var blurCausedByClickInsideComponent = false;

            var $originalInput = $(originalInput).addClass("tr-original-input");
            var $componentWrapper = $('<div class="tr-tree"/>').insertAfter($originalInput);
            var $tree = $('<div class="tr-tree-entryTree"></div>').appendTo($componentWrapper);
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
                    if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                        return; // tab or modifier key was pressed...
                    } else if (e.which == keyCodes.left_arrow) {
                        if ($editor[0].selectionStart === $editor[0].selectionEnd && $editor[0].selectionStart === 0) {
                            // if the user is at the beginning of line and presses the left arrow key, collapse the currently selected node
                            var selectedEntry = getSelectedEntry();
                            selectedEntry && selectedEntry._trEntryElement.removeClass('expanded');
                        }
                        return; // let the user navigate freely left and right...
                    } else if (e.which == keyCodes.right_arrow) {
                        if ($editor[0].selectionStart === $editor[0].selectionEnd && $editor.val().length === $editor[0].selectionStart) {
                            // if the user is at the end of line and presses the right arrow key, expand the currently selected node
                            var selectedEntry = getSelectedEntry();
                            selectedEntry && selectedEntry._trEntryElement.addClass('expanded');
                        }
                        return; // let the user navigate freely left and right...
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (entries != null) {
                            selectNextEntry(direction);
                            e.preventDefault(); // some browsers move the caret to the beginning on up key
                        } else {
                            query(direction);
                        }
                    } else if (e.which == keyCodes.enter) {
                        selectEntry(highlightedEntry[config.idProperty]);
                        $editor.select();
                    } else if (e.which == keyCodes.escape) {
                        setHighlightedEntry(null);
                        $editor.val("");
                        query();
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

            $componentWrapper.add($tree).mousedown(function () {
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

            $tree.mouseout(function() {
                setHighlightedEntry(null);
            });

            if (entries) { // if config.entries was set...
                updateTreeEntryElements(entries);
            }

            selectEntry(config.selectedEntryId || null);

            function updateTreeEntryElements(entries) {
                $tree.empty();

                function createEntryElement(entry, $parentElement, depth) {
                    var $outerEntryWrapper = $('<div class="tr-tree-entry-outer-wrapper isLeaf-'+ !!(entry.isLeaf) +'"></div>')
                        .appendTo($parentElement);
                    var $entryAndExpanderWrapper = $('<div class="tr-tree-entry-and-expander-wrapper"></div>')
                        .appendTo($outerEntryWrapper);
                    for (var k = 0; k<depth; k++) {
                        $entryAndExpanderWrapper.append('<div class="tr-indent-spacer"/>');
                    }
                    var $expander = $('<div class="tr-tree-expander"></div>')
                        .appendTo($entryAndExpanderWrapper);
                    var html = Mustache.render(config.templates[Math.min(config.templates.length - 1, depth)], entry);
                    var $entry = $(html).addClass("tr-tree-entry filterable-item")
                        .appendTo($entryAndExpanderWrapper);
                    entry._trEntryElement = $outerEntryWrapper;
                    $entry
                        .mousedown(function () {
                            blurCausedByClickInsideComponent = true;
                            selectEntry(entry[config.idProperty]);
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
                        var toggleExpansion = function () {
                            $childrenWrapper.slideToggle(100);
                            $outerEntryWrapper.toggleClass("expanded");
                        };
                        if (entry[config.expandedAttributeName]) {
                            $outerEntryWrapper.addClass("expanded");
                        }
                        $expander.click(toggleExpansion);
                        for (var i = 0; i<entry.children.length; i++) {
                            createEntryElement(entry.children[i], $childrenWrapper, depth + 1);
                        }
                    }
                }

                if (entries.length > 0) {
                    for (var i = 0; i < entries.length; i++) {
                        createEntryElement(entries[i], $tree, 0);
                    }
                } else {
                    $tree.append(config.noEntriesTemplate);
                }
            }

            function updateEntries(newEntries, highlightDirection) {
                highlightedEntry = null;
                entries = newEntries;
                updateTreeEntryElements(entries);

                if (entries.length > 0) {
                    highlightTextMatches(entries);

                    if (typeof highlightDirection != 'undefined') {
                        selectNextEntry(highlightDirection);
                    }
                } else {
                    setHighlightedEntry(null);
                }
            }

            function query(highlightDirection) {
                $tree.append(config.spinnerTemplate);

                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    config.queryFunction($editor.val(), function (newEntries) {
                        updateEntries(newEntries, highlightDirection);
                    });
                });
            }

            function setHighlightedEntry(entry) {
                highlightedEntry = entry;
                $tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                if (entry != null) {
                    var $entry = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entry.addClass('tr-highlighted-entry');
                    $tree.minimallyScrollTo($entry);
                }
            }

            function findEntries(filterFunction) {
                function findEntriesInSubTree(node, listOfFoundEntries) {
                    if (filterFunction.call(this, node)) {
                        listOfFoundEntries.push(node);
                    }
                    if (node.children) {
                        for (var i = 0; i < node.children.length; i++) {
                            var child = node.children[i];
                            findEntriesInSubTree(child, listOfFoundEntries);
                        }
                    }
                }

                var matchingEntries = [];
                for (var i = 0; i < entries.length; i++) {
                    var rootEntry = entries[i];
                    findEntriesInSubTree(rootEntry, matchingEntries);
                }
                return matchingEntries;
            }

            function findEntryById(id) {
                return findEntries(function (entry) {
                    return entry[config.idProperty] === id
                })[0];
            }

            function selectEntry(entryId) {
                selectedEntryId = entryId;
                $originalInput.val(entryId);

                $tree.find(".tr-selected-entry").removeClass("tr-selected-entry");

                var entry = findEntryById(entryId);
                if (entry) {
                    var $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entryWrapper.addClass("tr-selected-entry");
                    $tree.minimallyScrollTo($entryWrapper);
                }


                fireChangeEvents();
            }

            function fireChangeEvents() {
                $originalInput.trigger("change");
                $componentWrapper.trigger("change");
            }

            function selectNextEntry(direction) {
                var nextVisibleEntry = getNextVisibleEntry(direction);
                if (nextVisibleEntry != null) {
                    selectEntry(nextVisibleEntry[config.idProperty]);
                }
            }

            function getNextVisibleEntry(direction) {
                var newSelectedElementIndex;
                var selectedEntry = getSelectedEntry();
                var visibleEntriesAsList = findEntries(function(entry) {return entry._trEntryElement.is(':visible') || entry === selectedEntry});
                if (visibleEntriesAsList == null || visibleEntriesAsList.length == 0) {
                    return null;
                } else if (selectedEntry == null && direction > 0) {
                    newSelectedElementIndex = -1 + direction;
                } else if (selectedEntry == null && direction < 0) {
                    newSelectedElementIndex = visibleEntriesAsList.length + direction;
                } else {
                    var currentSelectedElementIndex = visibleEntriesAsList.indexOf(selectedEntry);
                    newSelectedElementIndex = (currentSelectedElementIndex + visibleEntriesAsList.length + direction) % visibleEntriesAsList.length;
                }
                return visibleEntriesAsList[newSelectedElementIndex];
            }

            function highlightTextMatches(entries) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                    $entryElement.trivialHighlight($editor.val());
                    if (entry.children) {
                        highlightTextMatches(entry.children);
                    }
                }
            }

            function getSelectedEntry() {
                return selectedEntryId ? findEntryById(selectedEntryId) : null;
            }

            this.$ = $componentWrapper;
            $componentWrapper[0].trivialTree = this;

            this.updateEntries = updateEntries;
            this.getSelectedEntry = getSelectedEntry;
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

        return $.fn.TrivialTree;
    })
);
