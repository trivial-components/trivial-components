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
        } else if (jQuery && !jQuery.fn.Trivialtree) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            window.TrivialTree = factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var keyCodes = TrivialComponents.keyCodes;

        function TrivialTree(originalInput, options) {

            options = options || {};
            var defaultOptions = {
                valueProperty: 'id',
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                lazyChildrenQueryFunction: function (node, resultCallback) {
                    resultCallback([])
                },
                expandedProperty: 'expanded',
                templates: [TrivialComponents.iconSingleLineTemplate],
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                entries: null,
                selectedEntryId: null,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                }
            };
            var config = $.extend(defaultOptions, options);

            config.queryFunction = config.queryFunction || TrivialComponents.defaultTreeQueryFunctionFactory(config.entries || [], config.matchingOptions, config.childrenProperty, config.expandedProperty);

            var treeBox;
            var entries = config.entries;
            var selectedEntryId;
            var highlightedEntry = null;
            var blurCausedByClickInsideComponent = false;

            var $spinners = $();
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
                        treeBox.setHighlightedEntry(null);
                    }
                })
                .keydown(function (e) {
                    if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                        return; // tab or modifier key was pressed...
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        // expand the currently highlighted node.
                        var changedExpandedState = treeBox.setHighlightedNodeExpanded(e.which == keyCodes.right_arrow);
                        if (changedExpandedState) {
                            return false;
                        } else {
                            return; // let the user navigate freely left and right...
                        }
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (entries != null) {
                            treeBox.highlightNextEntry(direction);
                            return false; // some browsers move the caret to the beginning on up key
                        }
                    } else if (e.which == keyCodes.enter) {
                        treeBox.selectEntry(treeBox.getHighlightedEntry());
                        $editor.select();
                    } else if (e.which == keyCodes.escape) {
                        $editor.val("");
                        query();
                    } else {
                        query(1);
                    }
                });

            treeBox = $tree.TrivialTreeBox(config);
            treeBox.$.change(function () {
                var selectedTreeBoxEntry = treeBox.getSelectedEntry();
                if (selectedTreeBoxEntry) {
                    selectEntry(selectedTreeBoxEntry);
                }
            });

            $componentWrapper.mousedown(function () {
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

            $tree.mouseout(function () {
                treeBox.setHighlightedEntry(null);
            }).click(function() {
                $editor.focus();
            });

            selectEntry(config.selectedEntryId ? findEntryById(config.selectedEntryId) : null);

            function updateEntries(newEntries) {
                entries = newEntries;
                $spinners.remove();
                $spinners = $();
                treeBox.updateEntries(newEntries);
            }

            function query(highlightDirection) {
                var $spinner = $(config.spinnerTemplate).appendTo($tree);
                $spinners = $spinners.add($spinner);

                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    config.queryFunction($editor.val(), function (newEntries) {
                        updateEntries(newEntries);
                        if ($editor.val().length > 0) {
                            treeBox.highlightTextMatches($editor.val());
                            treeBox.highlightNextMatchingEntry(highlightDirection);
                        } else {
                            treeBox.highlightNextEntry(highlightDirection);
                        }
                    });
                }, 0);
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
                    if (node[config.childrenProperty]) {
                        for (var i = 0; i < node[config.childrenProperty].length; i++) {
                            var child = node[config.childrenProperty][i];
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
                    return entry[config.valueProperty] == id
                })[0];
            }

            function selectEntry(entry) {
                selectedEntryId = entry ? entry[config.valueProperty] : null;
                $originalInput.val(entry ? entry[config.valueProperty] : null);
                fireChangeEvents();
            }

            function fireChangeEvents() {
                $originalInput.trigger("change");
                $componentWrapper.trigger("change");
            }

            this.$ = $componentWrapper;
            $componentWrapper[0].trivialTree = this;

            this.updateEntries = updateEntries;
            this.getSelectedEntry = treeBox.getSelectedEntry;
            this.updateChildren = treeBox.updateChildren;
            this.updateNode = treeBox.updateNode;
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
