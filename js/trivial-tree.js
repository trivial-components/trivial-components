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
            var me = this;

            options = options || {};
            var defaultOptions = {
                valueProperty: 'id',
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                searchBarMode: 'show-if-filled', // none, show-if-filled, always-visible
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
                },
                directSelectionViaArrowKeys: false,
                performanceOptimizationSettings: {
                    toManyVisibleItemsRenderDelay: 750,
                    toManyVisibleItemsThreshold: 75
                }
            };
            var config = $.extend(defaultOptions, options);
            config.queryFunction = config.queryFunction || TrivialComponents.defaultTreeQueryFunctionFactory(config.entries || [], config.templates, config.matchingOptions, config.childrenProperty, config.expandedProperty);

            this.onSelectedEntryChanged = new TrivialComponents.Event();
            this.onNodeExpansionStateChanged = new TrivialComponents.Event();

            var treeBox;
            var entries = config.entries;
            var selectedEntryId;

            var $spinners = $();
            var $originalInput = $(originalInput).addClass("tr-original-input");
            var $componentWrapper = $('<div class="tr-tree" tabindex="0"/>').insertAfter($originalInput);
            if (config.searchBarMode !== 'always-visible') {
                $componentWrapper.addClass(config.showSearchField ? "" : "hide-searchfield");
            }
            $componentWrapper.keydown(function (e) {
                if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                }
                if ($editor.is(':visible') && keyCodes.specialKeys.indexOf(e.which) === -1) {
                    $editor.focus();
                }
                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                    var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                    if (entries != null) {
                        if (config.directSelectionViaArrowKeys) {
                            treeBox.selectNextEntry(direction)
                        } else {
                            treeBox.highlightNextEntry(direction);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    }
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    treeBox.setHighlightedNodeExpanded(e.which == keyCodes.right_arrow);
                } else if (e.which == keyCodes.enter) {
                    treeBox.setSelectedEntry(treeBox.getHighlightedEntry()[config.valueProperty]);
                } else if (e.which == keyCodes.escape) {
                    $editor.val("");
                    query();
                    $componentWrapper.focus();
                } else {
                    query(1);
                }
            });
            var $tree = $('<div class="tr-tree-entryTree"></div>').appendTo($componentWrapper);
            var $editor = $('<input type="text" class="tr-tree-editor tr-editor"/>')
                .prependTo($componentWrapper)
                .attr("tabindex", $originalInput.attr("-1"))
                .focus(function () {
                    $componentWrapper.addClass('focus');
                })
                .blur(function () {
                    $componentWrapper.removeClass('focus');
                })
                .keydown(function (e) {
                    if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        // expand the currently highlighted node.
                        var changedExpandedState = treeBox.setHighlightedNodeExpanded(e.which == keyCodes.right_arrow);
                        if (changedExpandedState) {
                            return false;
                        } else {
                            return; // let the user navigate freely left and right...
                        }
                    }
                })
                .on('keyup change', function () {
                    if (config.searchBarMode === 'show-if-filled') {
                        if ($editor.val()) {
                            $componentWrapper.removeClass('hide-searchfield');
                        } else {
                            $componentWrapper.addClass('hide-searchfield');
                        }
                    }
                });
            if (config.searchBarMode === 'none') {
                $editor.css("display", "none");
            }

            if ($originalInput.attr("placeholder")) {
                $editor.attr("placeholder", $originalInput.attr("placeholder"));
            }
            if ($originalInput.attr("tabindex")) {
                $componentWrapper.attr("tabindex", $originalInput.attr("tabindex"));
            }
            if ($originalInput.attr("autofocus")) {
                $componentWrapper.focus();
            }

            treeBox = $tree.TrivialTreeBox(config);
            treeBox.onNodeExpansionStateChanged.addListener(function (node) {
                me.onNodeExpansionStateChanged.fire(node);
            });
            treeBox.$.change(function () {
                var selectedTreeBoxEntry = treeBox.getSelectedEntry();
                if (selectedTreeBoxEntry) {
                    selectEntry(selectedTreeBoxEntry);
                }
            });

            selectEntry((config.selectedEntryId !== undefined && config.selectedEntryId !== null) ? findEntryById(config.selectedEntryId) : null);

            function updateEntries(newEntries) {
                entries = newEntries;
                $spinners.remove();
                $spinners = $();
                treeBox.updateEntries(newEntries);
            }

            var processUpdateTimer;

            function query(highlightDirection) {
                if (config.searchBarMode === 'always-visible' || config.searchBarMode === 'show-if-filled') {
                    var $spinner = $(config.spinnerTemplate).appendTo($tree);
                    $spinners = $spinners.add($spinner);

                    // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                    setTimeout(function () {
                        config.queryFunction($editor.val(), {
                            completeInputString: $editor.val(),
                            currentlySelectedEntry: findEntryById(selectedEntryId)
                        }, function (newEntries) {
                            function processUpdate() {
                                updateEntries(newEntries);
                                if ($editor.val().length > 0) {
                                    treeBox.highlightTextMatches($editor.val());
                                    if (!config.directSelectionViaArrowKeys) {
                                        treeBox.highlightNextMatchingEntry(highlightDirection);
                                    }
                                }
                                treeBox.revealSelectedEntry();
                            }

                            clearTimeout(processUpdateTimer);
                            if (countVisibleEntries(newEntries) < config.performanceOptimizationSettings.toManyVisibleItemsThreshold) {
                                processUpdate();
                            } else {
                                processUpdateTimer = setTimeout(processUpdate, config.performanceOptimizationSettings.toManyVisibleItemsRenderDelay);
                            }
                        });
                    }, 0);
                }
            }

            function countVisibleEntries(entries) {
                function countVisibleChildrenAndSelf(node) {
                    if (node[config.expandedProperty] && node[config.childrenProperty]) {
                        return node[config.childrenProperty].map(function (entry) {
                            return countVisibleChildrenAndSelf(entry);
                        }).reduce(function (a, b) {
                            return a + b;
                        }, 0) + 1;
                    } else {
                        return 1;
                    }
                }

                return entries.map(function (entry) {
                    return countVisibleChildrenAndSelf(entry);
                }).reduce(function (a, b) {
                    return a + b;
                }, 0);
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
                fireChangeEvents(entry);
            }

            function fireChangeEvents(entry) {
                $originalInput.trigger("change");
                $componentWrapper.trigger("change");
                me.onSelectedEntryChanged.fire(entry);
            }

            this.$ = $componentWrapper;
            $componentWrapper[0].trivialTree = this;

            this.updateEntries = updateEntries;
            this.getSelectedEntry = treeBox.getSelectedEntry;
            this.updateChildren = treeBox.updateChildren;
            this.updateNode = treeBox.updateNode;
            this.removeNode = treeBox.removeNode;
            this.addNode = treeBox.addNode;
            this.destroy = function() {
                $originalInput.removeClass('tr-original-input').insertBefore($componentWrapper);
                $componentWrapper.remove();
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialTree, "TrivialTree", "tr-tree");

        return $.fn.TrivialTree;
    })
);
