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
            var me = this;

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
                templateProperty: "template",
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                entries: null,
                selectedEntryId: null,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                animationDuration: 70,
                showExpanders: true,
                openOnSelection: false, // open expandable nodes when they are selected
                enforceSingleExpandedPath: false // only one path is expanded at any time
            };
            var config = $.extend(defaultOptions, options);

            this.onSelectedEntryChanged = new TrivialComponents.Event();
            this.onNodeExpansionStateChanged = new TrivialComponents.Event();

            var entries = config.entries;
            var selectedEntryId;
            var highlightedEntry = null;

            var $componentWrapper = $('<div class="tr-treebox"/>').appendTo($container);
            $componentWrapper.toggleClass("hide-expanders", !config.showExpanders);
            var $tree = $('<div class="tr-tree-entryTree"></div>').appendTo($componentWrapper);

            if (entries) { // if config.entries was set...
                updateEntries(entries);
            }

            setSelectedEntry((config.selectedEntryId !== undefined && config.selectedEntryId !== null) ? findEntryById(config.selectedEntryId) : null);

            function isLeaf(entry) {
                return (entry[config.childrenProperty] == null || entry[config.childrenProperty].length == 0) && !entry[config.lazyChildrenFlagProperty];
            }

            function createEntryDisplay(entry, depth) {
                return $(Mustache.render(entry[config.templateProperty] || config.templates[Math.min(config.templates.length - 1, depth)], entry));
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

                if (entry[config.valueProperty] === selectedEntryId) {
                    $entryAndExpanderWrapper.addClass("tr-selected-entry");
                }

                $entryAndExpanderWrapper
                    .mousedown(function (e) {
                        $componentWrapper.trigger("mousedown", e);
                        setSelectedEntry(entry);
                    }).mouseup(function (e) {
                    $componentWrapper.trigger("mouseup", e);
                }).mouseenter(function () {
                    setHighlightedEntry(entry);
                }).mouseleave(function (e) {
                    if (!$(e.toElement).is('.tr-tree-entry-outer-wrapper')) {
                        setHighlightedEntry(null);
                    }
                });

                if (!leaf) {
                    var $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
                        .appendTo($outerEntryWrapper);
                    $expander.mousedown(function (e) {
                        return false;
                    }).click(function (e) {
                        setNodeExpanded(entry, !entry[config.expandedProperty], true);
                    });
                    if (entry[config.childrenProperty]) {
                        if (entry[config.expandedProperty]) {
                            for (var i = 0; i < entry[config.childrenProperty].length; i++) {
                                createEntryElement(entry[config.childrenProperty][i], depth + 1).appendTo($childrenWrapper);
                            }
                        }
                    } else if (entry[config.lazyChildrenFlagProperty]) {
                        $childrenWrapper.hide().append(config.spinnerTemplate).fadeIn();
                    }
                    setNodeExpanded(entry, entry[config.expandedProperty], false);
                }
                return $outerEntryWrapper;
            }

            function updateTreeEntryElements(entries) {
                $tree.detach();
                $tree = $('<div class="tr-tree-entryTree"></div>');

                if (entries.length > 0) {
                    for (var i = 0; i < entries.length; i++) {
                        createEntryElement(entries[i], 0).appendTo($tree);
                    }
                } else {
                    $tree.append(config.noEntriesTemplate);
                }
                $tree.appendTo($componentWrapper);
            }


            function setNodeExpanded(node, expanded, animate) {
                var wasExpanded = node[config.expandedProperty];

                if (expanded && config.enforceSingleExpandedPath) {
                    var currentlyExpandedNodes = findEntries(function (n) {
                        return !!(n[config.expandedProperty]);
                    });
                    var newExpandedPath = findPathToFirstMatchingNode(function (n) {
                        return n === node;
                    });
                    for (var i = 0; i < currentlyExpandedNodes.length; i++) {
                        var currentlyExpandedNode = currentlyExpandedNodes[i];
                        if (newExpandedPath.indexOf(currentlyExpandedNode) === -1) {
                            setNodeExpanded(currentlyExpandedNode, false, true);
                        }
                    }
                }

                node[config.expandedProperty] = !!expanded;
                node._trEntryElement.toggleClass("expanded", !!expanded);

                function nodeHasUnrenderedChildren(node) {
                    return node[config.childrenProperty] && node[config.childrenProperty].some(function (child) {
                            return !child._trEntryElement || !jQuery.contains(document.documentElement, child._trEntryElement[0]);
                        });
                }

                if (expanded && node[config.lazyChildrenFlagProperty] && !node[config.childrenProperty]) {
                    config.lazyChildrenQueryFunction(node, function (children) {
                        setChildren(node, children);
                    });
                } else if (expanded && nodeHasUnrenderedChildren(node)) {
                    renderChildren(node);
                }
                if (expanded) {
                    minimallyScrollTo(node._trEntryElement);
                }

                var childrenWrapper = node._trEntryElement.find("> .tr-tree-entry-children-wrapper");
                if (expanded) {
                    if (animate) {
                        childrenWrapper.slideDown(config.animationDuration);
                    } else {
                        childrenWrapper.show();
                    }
                } else {
                    if (animate) {
                        childrenWrapper.slideUp(config.animationDuration);
                    } else {
                        childrenWrapper.hide();
                    }
                }

                if (!!wasExpanded != !!expanded) {
                    me.onNodeExpansionStateChanged.fire(node);
                }
            }

            function nodeDepth(node) {
                return node ? parseInt(node._trEntryElement.attr('data-depth')) : 0;
            }

            function setChildren(node, children) {
                node[config.childrenProperty] = children;
                node[config.lazyChildrenFlagProperty] = false;
                renderChildren(node, children);
            }

            function renderChildren(node) {
                var $childrenWrapper = node._trEntryElement.find('> .tr-tree-entry-children-wrapper');
                $childrenWrapper.empty();
                var children = node[config.childrenProperty];
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

            function updateEntries(newEntries) {
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

            function findPathToFirstMatchingNode(predicateFunction) {
                function searchInSubTree(node, path) {
                    if (predicateFunction.call(this, node, path)) {
                        path.push(node);
                        return path;
                    }
                    if (node[config.childrenProperty]) {
                        var newPath = path.slice();
                        newPath.push(node);
                        for (var i = 0; i < node[config.childrenProperty].length; i++) {
                            var child = node[config.childrenProperty][i];
                            var result = searchInSubTree(child, newPath);
                            if (result) {
                                return result;
                            }
                        }
                    }
                }

                for (var i = 0; i < entries.length; i++) {
                    var rootEntry = entries[i];
                    var path = searchInSubTree(rootEntry, []);
                    if (path) {
                        return path;
                    }
                }
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

            function setSelectedEntry(entry) {
                selectedEntryId = entry ? entry[config.valueProperty] : null;
                markSelectedEntry(entry);
                setHighlightedEntry(entry); // it makes no sense to select an entry and have another one still highlighted.
                fireChangeEvents(entry);
                if (entry && config.openOnSelection) {
                    setNodeExpanded(entry, true, true);
                }
            }

            function minimallyScrollTo($entryWrapper) {
                $componentWrapper.parent().minimallyScrollTo($entryWrapper);
            }

            function markSelectedEntry(entry) {
                $tree.find(".tr-selected-entry").removeClass("tr-selected-entry");
                if (entry && entry._trEntryElement) {
                    var $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entryWrapper.addClass("tr-selected-entry");
                }
            }

            function fireChangeEvents(entry) {
                $componentWrapper.trigger("change");
                me.onSelectedEntryChanged.fire(entry);
            }

            function selectNextEntry(direction) {
                var nextVisibleEntry = getNextVisibleEntry(getSelectedEntry(), direction);
                if (nextVisibleEntry != null) {
                    setSelectedEntry(nextVisibleEntry);
                }
            }

            function setHighlightedEntry(entry) {
                if (entry !== highlightedEntry) {
                    highlightedEntry = entry;
                    $tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                    if (entry != null && entry._trEntryElement) {
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
            }

            function getNextVisibleEntry(currentEntry, direction, onlyEntriesWithTextMatches) {
                var newSelectedElementIndex;
                var visibleEntriesAsList = findEntries(function (entry) {
                    if (!entry._trEntryElement) {
                        return false;
                    } else {
                        if (onlyEntriesWithTextMatches) {
                            return entry._trEntryElement.is(':visible') && entry._trEntryElement.has('>.tr-tree-entry-and-expander-wrapper .tr-highlighted-text').length > 0;
                        } else {
                            return entry._trEntryElement.is(':visible') || entry === currentEntry;
                        }
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
                $tree.detach();
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                    $entryElement.trivialHighlight(searchString, config.matchingOptions);
                }
                $tree.appendTo($componentWrapper);
            }

            function getSelectedEntry() {
                return (selectedEntryId !== undefined && selectedEntryId !== null) ? findEntryById(selectedEntryId) : null;
            }

            this.$ = $componentWrapper;
            $componentWrapper[0].trivialTreeBox = this;

            this.updateEntries = updateEntries;
            this.getSelectedEntry = getSelectedEntry;
            this.setSelectedEntry = function (nodeId) {
                setSelectedEntry(findEntryById(nodeId));
            };
            this.selectNextEntry = selectNextEntry;
            this.revealSelectedEntry = function (animate) {
                var selectedEntry = getSelectedEntry();
                if (!selectedEntry) {
                    return;
                }
                var currentEntry = selectedEntry;
                while (currentEntry = findParentNode(currentEntry)) {
                    setNodeExpanded(currentEntry, true, animate);
                }
                minimallyScrollTo(selectedEntry._trEntryElement);
            };
            this.setHighlightedEntry = setHighlightedEntry;
            this.highlightNextEntry = function (direction) {
                var nextVisibleEntry = getNextVisibleEntry(highlightedEntry || getSelectedEntry(), direction);
                if (nextVisibleEntry != null) {
                    setHighlightedEntry(nextVisibleEntry);
                }
            };
            this.highlightNextMatchingEntry = function (direction) {
                var nextMatchingEntry = getNextVisibleEntry(highlightedEntry || getSelectedEntry(), direction, true);
                if (nextMatchingEntry != null) {
                    setHighlightedEntry(nextMatchingEntry);
                }
            };
            this.selectNextMatchingEntry = function (direction) {
                var nextMatchingEntry = getNextVisibleEntry(highlightedEntry, direction, true);
                if (nextMatchingEntry != null) {
                    setSelectedEntry(nextMatchingEntry);
                }
            };
            this.getHighlightedEntry = function () {
                return highlightedEntry
            };
            this.highlightTextMatches = highlightTextMatches;
            this.setHighlightedNodeExpanded = function (expanded) {
                if (!highlightedEntry || isLeaf(highlightedEntry)) {
                    return false;
                } else {
                    var wasExpanded = highlightedEntry[config.expandedProperty];
                    setNodeExpanded(highlightedEntry, expanded, true);
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
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialTreeBox, "TrivialTreeBox", "tr-treebox");

        return $.fn.TrivialTreeBox;
    })
);
