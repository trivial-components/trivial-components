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
            define('trivial-treebox', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.TrivialTreeBox) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            window.TrivialTreeBox = factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        function TrivialTreeBox($container, options) {

            options = options || {};
            var defaultOptions = {
                valueProperty: 'id',
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                lazyChildrenQueryFunction: function (node, resultCallback) {
                    resultCallback(node.children || []);
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

            var entries = config.entries;
            var selectedEntryId;
            var highlightedEntry = null;

            var $componentWrapper = $('<div class="tr-treebox"/>').appendTo($container);
            var $tree = $('<div class="tr-tree-entryTree"></div>').appendTo($componentWrapper);

            $tree.mouseout(function () {
                setHighlightedEntry(null);
            });

            if (entries) { // if config.entries was set...
                updateTreeEntryElements(entries);
            }

            selectNode(config.selectedEntryId ? findEntryById(config.selectedEntryId) : null);

            function isLeaf(entry) {
                return (entry[config.childrenProperty] == null || entry[config.childrenProperty].length == 0) && !entry[config.lazyChildrenFlagProperty];
            }

            function createEntryDisplay(entry, depth) {
                return $(Mustache.render(config.templates[Math.min(config.templates.length - 1, depth)], entry));
            }

            function createEntryElement(entry, depth) {
                var leaf = isLeaf(entry);
                var $outerEntryWrapper = $('<div class="tr-tree-entry-outer-wrapper ' + (leaf ? '' : 'has-children') + '" data-depth="' + depth + '"></div>');
                entry._trEntryElement = $outerEntryWrapper;
                var $entryAndExpanderWrapper = $('<div class="tr-tree-entry-and-expander-wrapper"></div>')
                    .appendTo($outerEntryWrapper);
                for (var k = 0; k < depth; k++) {
                    $entryAndExpanderWrapper.append('<div class="tr-indent-spacer"/>');
                }
                var $expander = $('<div class="tr-tree-expander"></div>')
                    .appendTo($entryAndExpanderWrapper);
                var $entry = createEntryDisplay(entry, depth);
                $entry.addClass("tr-tree-entry filterable-item").appendTo($entryAndExpanderWrapper);

                $entryAndExpanderWrapper
                    .mousedown(function (e) {
                        $componentWrapper.trigger("mousedown", e);
                        selectNode(entry);
                    }).mouseup(function (e) {
                        $componentWrapper.trigger("mouseup", e);
                    }).mouseout(function (e) {
                        $componentWrapper.trigger("mouseout", e);
                    }).mouseover(function () {
                        setHighlightedEntry(entry);
                    });

                if (!leaf) {
                    var $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
                        .appendTo($outerEntryWrapper);
                    $expander.mousedown(function (e) {
                        return false;
                    }).click(function (e) {
                        setNodeExpanded(entry, !entry[config.expandedProperty]);
                    });
                    if (entry[config.childrenProperty]) {
                        for (var i = 0; i < entry[config.childrenProperty].length; i++) {
                            createEntryElement(entry[config.childrenProperty][i], depth + 1).appendTo($childrenWrapper);
                        }
                    } else if (entry[config.lazyChildrenFlagProperty]) {
                        $childrenWrapper.append(config.spinnerTemplate);
                    }
                    setNodeExpanded(entry, entry[config.expandedProperty]);
                }
                return $outerEntryWrapper;
            }

            function updateTreeEntryElements(entries) {
                $tree.empty();

                if (entries.length > 0) {
                    for (var i = 0; i < entries.length; i++) {
                        createEntryElement(entries[i], 0).appendTo($tree);
                    }
                } else {
                    $tree.append(config.noEntriesTemplate);
                }
            }


            function setNodeExpanded(node, expanded) {
                node[config.expandedProperty] = !!expanded;
                node._trEntryElement.toggleClass("expanded", !!expanded);

                if (expanded && node[config.lazyChildrenFlagProperty] && !node[config.childrenProperty]) {
                    config.lazyChildrenQueryFunction(node, function (children) {
                        setChildren(node, children);
                    });
                }
                if (expanded) {
                    minimallyScrollTo(node._trEntryElement);
                }
            }

            function nodeDepth(node) {
                return node ? parseInt(node._trEntryElement.attr('data-depth')) : 0;
            }

            function setChildren(node, children) {
                node[config.childrenProperty] = children;
                node[config.lazyChildrenFlagProperty] = false;

                var $childrenWrapper = node._trEntryElement.find('.tr-tree-entry-children-wrapper');
                $childrenWrapper.empty();
                if (children && children.length > 0) {
                    var depth = nodeDepth(node);
                    for (var i = 0; i < children.length; i++) {
                        var child = children[i];
                        createEntryElement(child, depth + 1).appendTo($childrenWrapper);
                    }
                } else {
                    node._trEntryElement.removeClass('has-children expanded');
                }
            }

            function updateEntries(newEntries, highlightDirection) {  // TODO remove hightlightDirection - no more needed!
                highlightedEntry = null;
                entries = newEntries;
                updateTreeEntryElements(entries);

                var selectedEntry = findEntryById(selectedEntryId);
                if (selectedEntry) {
                    // selected entry in filtered tree? then mark it as selected!
                    markSelectedEntry(selectedEntry);
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

            function findParentNode(childNode) {
                return findEntries(function (entry) {
                    return entry[config.childrenProperty] && entry[config.childrenProperty].indexOf(childNode) != -1;
                })[0];
            }

            function selectNode(entry) {
                selectedEntryId = entry ? entry[config.valueProperty] : null;
                markSelectedEntry(entry);
                fireChangeEvents();
            }

            function minimallyScrollTo($entryWrapper) {
                $componentWrapper.parent().minimallyScrollTo($entryWrapper);
            }

            function markSelectedEntry(entry) {
                $tree.find(".tr-selected-entry").removeClass("tr-selected-entry");
                if (entry) {
                    var $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entryWrapper.addClass("tr-selected-entry");
                    minimallyScrollTo($entryWrapper);
                }
            }

            function fireChangeEvents() {
                $componentWrapper.trigger("change");
            }

            function selectNextEntry(direction) {
                var nextVisibleEntry = getNextVisibleEntry(getSelectedEntry(), direction);
                if (nextVisibleEntry != null) {
                    selectNode(nextVisibleEntry);
                }
            }

            function setHighlightedEntry(entry) {
                highlightedEntry = entry;
                $tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                if (entry != null) {
                    var $entry = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entry.addClass('tr-highlighted-entry');
                    minimallyScrollTo($entry);
                } else {
                    var selectedEntry = getSelectedEntry();
                    if (selectedEntry) {
                        highlightedEntry = selectedEntry;
                    }
                }
            }

            function highlightNextEntry(direction) {
                var nextVisibleEntry = getNextVisibleEntry(highlightedEntry, direction);
                if (nextVisibleEntry != null) {
                    setHighlightedEntry(nextVisibleEntry);
                }
            }

            function getNextVisibleEntry(currentEntry, direction, onlyEntriesWithTextMatches) {
                var newSelectedElementIndex;
                var visibleEntriesAsList = findEntries(function (entry) {
                    if (onlyEntriesWithTextMatches) {
                        return entry._trEntryElement.is(':visible') && entry._trEntryElement.has('>.tr-tree-entry-and-expander-wrapper .tr-highlighted-text').length > 0;
                    } else {
                        return entry._trEntryElement.is(':visible') || entry === currentEntry;
                    }
                });
                if (visibleEntriesAsList == null || visibleEntriesAsList.length == 0) {
                    return null;
                } else if (currentEntry == null && direction > 0) {
                    newSelectedElementIndex = -1 + direction;
                } else if (currentEntry == null && direction < 0) {
                    newSelectedElementIndex = visibleEntriesAsList.length + direction;
                } else {
                    var currentSelectedElementIndex = visibleEntriesAsList.indexOf(currentEntry);
                    newSelectedElementIndex = (currentSelectedElementIndex + visibleEntriesAsList.length + direction) % visibleEntriesAsList.length;
                }
                return visibleEntriesAsList[newSelectedElementIndex];
            }

            function highlightTextMatches(searchString) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                    $entryElement.trivialHighlight(searchString, config.matchingOptions);
                }
            }

            function getSelectedEntry() {
                return selectedEntryId ? findEntryById(selectedEntryId) : null;
            }

            this.$ = $componentWrapper;
            $componentWrapper[0].trivialTreeBox = this;

            this.updateEntries = updateEntries;
            this.getSelectedEntry = getSelectedEntry;
            this.selectNode = function(nodeId) {
                selectNode(findEntryById(nodeId));
            };
            this.setHighlightedEntry = setHighlightedEntry;
            this.highlightNextEntry = highlightNextEntry;
            this.highlightNextMatchingEntry = function (direction) {
                var nextMatchingEntry = getNextVisibleEntry(highlightedEntry, direction, true);
                if (nextMatchingEntry != null) {
                    setHighlightedEntry(nextMatchingEntry);
                }
            };
            this.getHighlightedEntry = function () {
                return highlightedEntry
            };
            this.highlightTextMatches = function (searchString) {
                highlightTextMatches(searchString);
            };
            this.setHighlightedNodeExpanded = function (expanded) {
                if (!highlightedEntry || isLeaf(highlightedEntry)) {
                    return false;
                } else {
                    var wasExpanded = highlightedEntry[config.expandedProperty];
                    setNodeExpanded(highlightedEntry, expanded);
                    return !wasExpanded != !expanded;
                }
            };
            this.updateChildren = function updateChildren(parentNodeId, children) {
                var node = findEntryById(parentNodeId);
                if (node) {
                    setChildren(node, children);
                } else {
                    console.error("Could not set the children of unknown node with id " + parentNodeId);
                }
            };
            this.updateNode = function (node) {
                var oldNode = findEntryById(node.id);
                var parent = findParentNode(oldNode);
                if (parent) {
                    parent[config.childrenProperty][parent[config.childrenProperty].indexOf(oldNode)] = node;
                } else {
                    entries[entries.indexOf(oldNode)] = node;
                }
                createEntryElement(node, nodeDepth(oldNode)).insertAfter(oldNode._trEntryElement);
                oldNode._trEntryElement.remove();
            };
            this.removeNode = function (nodeId) {
                var childNode = findEntryById(nodeId);
                if (childNode) {
                    var parentNode = findParentNode(childNode);
                    if (parentNode) {
                        parentNode[config.childrenProperty].splice(parentNode[config.childrenProperty].indexOf(childNode), 1);
                    } else {
                        entries.splice(entries.indexOf(childNode), 1);
                    }
                    childNode._trEntryElement.remove();
                }
            };
            this.addNode = function (parentNodeId, node) {
                var parentNode = findEntryById(parentNodeId);
                if (isLeaf(parentNode)) {
                    console.error('The parent node is a leaf node, so you cannot add children to it!');
                }
                if (!parentNode[config.childrenProperty]) {
                    parentNode[config.childrenProperty] = [];
                }
                parentNode[config.childrenProperty].push(node);
                var entryElement = createEntryElement(node, nodeDepth(parentNode) + 1);
                entryElement
                    .appendTo(parentNode._trEntryElement.find('>.tr-tree-entry-children-wrapper'));
                parentNode._trEntryElement.addClass('has-children');
            }
        }

        $.fn.trivialtreebox = function (options) {
            var $trees = [];
            this.each(function () {
                var existingTreeWrapper = $(this).parents('.tr-tree').addBack('.tr-tree');
                if (existingTreeWrapper.length > 0 && existingTreeWrapper[0].trivialTreeBox) {
                    $trees.push(existingTreeWrapper[0].trivialTreeBox.$);
                } else {
                    var tree = new TrivialTreeBox(this, options);
                    $trees.push(tree.$);
                }
            });
            return $($trees);
        };
        $.fn.TrivialTreeBox = function (options) {
            var trees = [];
            this.each(function () {
                var existingTreeWrapper = $(this).parents('.tr-treebox').addBack('.tr-treebox');
                if (existingTreeWrapper.length > 0 && existingTreeWrapper[0].trivialTreeBox) {
                    trees.push(existingTreeWrapper[0].trivialTreeBox);
                } else {
                    var tree = new TrivialTreeBox(this, options);
                    trees.push(tree);
                }
            });
            return trees.length == 1 ? trees[0] : trees;
        };

        return $.fn.TrivialTreeBox;
    })
);
