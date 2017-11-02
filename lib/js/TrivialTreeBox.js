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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "jquery", "mustache", "./TrivialCore", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return window.jQuery;    } else if (name === "levenshtein") {      return window.Levenshtein;    } else if (name === "moment") {      return window.moment;    } else if (name === "mustache") {      return window.Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialTreeBox = (function () {
        function TrivialTreeBox($container, options) {
            if (options === void 0) { options = {}; }
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.onNodeExpansionStateChanged = new TrivialEvent_1.TrivialEvent(this);
            this.config = $.extend({
                valueFunction: function (entry) { return entry ? "" + entry.id : null; },
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                lazyChildrenQueryFunction: function (node, resultCallback) {
                    resultCallback(node.children || []);
                },
                expandedProperty: 'expanded',
                entryRenderingFunction: function (entry, depth) {
                    var defaultTemplates = [TrivialCore_1.DEFAULT_TEMPLATES.icon2LinesTemplate, TrivialCore_1.DEFAULT_TEMPLATES.iconSingleLineTemplate];
                    var template = entry.template || defaultTemplates[Math.min(depth, defaultTemplates.length - 1)];
                    return Mustache.render(template, entry);
                },
                spinnerTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
                entries: null,
                selectedEntryId: null,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                animationDuration: 70,
                showExpanders: true,
                openOnSelection: false,
                enforceSingleExpandedPath: false
            }, options);
            this.entries = this.config.entries;
            this.$componentWrapper = $('<div class="tr-treebox"/>').appendTo($container);
            this.$componentWrapper.toggleClass("hide-expanders", !this.config.showExpanders);
            this.$tree = $('<div class="tr-tree-entryTree"></div>').appendTo(this.$componentWrapper);
            if (this.entries) {
                this.updateEntries(this.entries);
            }
            this.setSelectedEntry((this.config.selectedEntryId !== undefined && this.config.selectedEntryId !== null) ? this.findEntryById(this.config.selectedEntryId) : null);
        }
        TrivialTreeBox.prototype.isLeaf = function (entry) {
            return (entry[this.config.childrenProperty] == null || entry[this.config.childrenProperty].length == 0) && !entry[this.config.lazyChildrenFlagProperty];
        };
        TrivialTreeBox.prototype.createEntryElement = function (entry, depth) {
            var _this = this;
            var leaf = this.isLeaf(entry);
            var $outerEntryWrapper = $('<div class="tr-tree-entry-outer-wrapper ' + (leaf ? '' : 'has-children') + '" data-depth="' + depth + '"></div>');
            entry._trEntryElement = $outerEntryWrapper;
            var $entryAndExpanderWrapper = $('<div class="tr-tree-entry-and-expander-wrapper"></div>')
                .appendTo($outerEntryWrapper);
            for (var k = 0; k < depth; k++) {
                $entryAndExpanderWrapper.append('<div class="tr-indent-spacer"/>');
            }
            var $expander = $('<div class="tr-tree-expander"></div>')
                .appendTo($entryAndExpanderWrapper);
            var $entry = $(this.config.entryRenderingFunction(entry, depth));
            $entry.addClass("tr-tree-entry filterable-item").appendTo($entryAndExpanderWrapper);
            if (this.config.valueFunction(entry) === this.selectedEntryId) {
                $entryAndExpanderWrapper.addClass("tr-selected-entry");
            }
            $entryAndExpanderWrapper
                .mousedown(function (e) {
                _this.$componentWrapper.trigger("mousedown", e);
                _this.setSelectedEntry(entry);
            }).mouseup(function (e) {
                _this.$componentWrapper.trigger("mouseup", e);
            }).mouseenter(function () {
                _this.setHighlightedEntry(entry);
            }).mouseleave(function (e) {
                if (!$(e.toElement).is('.tr-tree-entry-outer-wrapper')) {
                    _this.setHighlightedEntry(null);
                }
            });
            if (!leaf) {
                var $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
                    .appendTo($outerEntryWrapper);
                $expander.mousedown(function () {
                    return false;
                }).click(function (e) {
                    _this.setNodeExpanded(entry, !entry[_this.config.expandedProperty], true);
                });
                if (entry[this.config.childrenProperty]) {
                    if (entry[this.config.expandedProperty]) {
                        for (var i = 0; i < entry[this.config.childrenProperty].length; i++) {
                            this.createEntryElement(entry[this.config.childrenProperty][i], depth + 1).appendTo($childrenWrapper);
                        }
                    }
                }
                else if (entry[this.config.lazyChildrenFlagProperty]) {
                    $childrenWrapper.hide().append(this.config.spinnerTemplate).fadeIn();
                }
                this.setNodeExpanded(entry, entry[this.config.expandedProperty], false);
            }
            return $outerEntryWrapper;
        };
        TrivialTreeBox.prototype.updateTreeEntryElements = function () {
            this.$tree.detach();
            this.$tree = $('<div class="tr-tree-entryTree"></div>');
            if (this.entries.length > 0) {
                for (var i = 0; i < this.entries.length; i++) {
                    this.createEntryElement(this.entries[i], 0).appendTo(this.$tree);
                }
            }
            else {
                this.$tree.append(this.config.noEntriesTemplate);
            }
            this.$tree.appendTo(this.$componentWrapper);
        };
        TrivialTreeBox.prototype.setNodeExpanded = function (node, expanded, animate) {
            var _this = this;
            var wasExpanded = node[this.config.expandedProperty];
            if (expanded && this.config.enforceSingleExpandedPath) {
                var currentlyExpandedNodes = this.findEntries(function (n) {
                    return !!(n[_this.config.expandedProperty]);
                });
                var newExpandedPath = this.findPathToFirstMatchingNode(function (n) {
                    return n === node;
                });
                for (var i = 0; i < currentlyExpandedNodes.length; i++) {
                    var currentlyExpandedNode = currentlyExpandedNodes[i];
                    if (newExpandedPath.indexOf(currentlyExpandedNode) === -1) {
                        this.setNodeExpanded(currentlyExpandedNode, false, true);
                    }
                }
            }
            node[this.config.expandedProperty] = !!expanded;
            node._trEntryElement.toggleClass("expanded", !!expanded);
            var nodeHasUnrenderedChildren = function (node) {
                return node[_this.config.childrenProperty] && node[_this.config.childrenProperty].some(function (child) {
                    return !child._trEntryElement || !$.contains(document.documentElement, child._trEntryElement[0]);
                });
            };
            if (expanded && node[this.config.lazyChildrenFlagProperty] && !node[this.config.childrenProperty]) {
                this.config.lazyChildrenQueryFunction(node, function (children) {
                    _this.setChildren(node, children);
                });
            }
            else if (expanded && nodeHasUnrenderedChildren(node)) {
                this.renderChildren(node);
            }
            if (expanded) {
                this.minimallyScrollTo(node._trEntryElement);
            }
            var childrenWrapper = node._trEntryElement.find("> .tr-tree-entry-children-wrapper");
            if (expanded) {
                if (animate) {
                    childrenWrapper.slideDown(this.config.animationDuration);
                }
                else {
                    childrenWrapper.css("display", "block");
                }
            }
            else {
                if (animate) {
                    childrenWrapper.slideUp(this.config.animationDuration);
                }
                else {
                    childrenWrapper.hide();
                }
            }
            if (!!wasExpanded != !!expanded) {
                this.onNodeExpansionStateChanged.fire(node);
            }
        };
        TrivialTreeBox.prototype.nodeDepth = function (node) {
            return node ? parseInt(node._trEntryElement.attr('data-depth')) : 0;
        };
        TrivialTreeBox.prototype.setChildren = function (node, children) {
            node[this.config.childrenProperty] = children;
            node[this.config.lazyChildrenFlagProperty] = false;
            this.renderChildren(node);
        };
        TrivialTreeBox.prototype.renderChildren = function (node) {
            var $childrenWrapper = node._trEntryElement.find('> .tr-tree-entry-children-wrapper');
            $childrenWrapper.empty();
            var children = node[this.config.childrenProperty];
            if (children && children.length > 0) {
                var depth = this.nodeDepth(node);
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    this.createEntryElement(child, depth + 1).appendTo($childrenWrapper);
                }
            }
            else {
                node._trEntryElement.removeClass('has-children expanded');
            }
        };
        TrivialTreeBox.prototype.updateEntries = function (newEntries) {
            this.highlightedEntry = null;
            this.entries = newEntries;
            this.updateTreeEntryElements();
            var selectedEntry = this.findEntryById(this.selectedEntryId);
            if (selectedEntry) {
                this.markSelectedEntry(selectedEntry);
            }
        };
        TrivialTreeBox.prototype.findEntries = function (filterFunction) {
            var _this = this;
            var findEntriesInSubTree = function (node, listOfFoundEntries) {
                if (filterFunction.call(_this, node)) {
                    listOfFoundEntries.push(node);
                }
                if (node[_this.config.childrenProperty]) {
                    for (var i = 0; i < node[_this.config.childrenProperty].length; i++) {
                        var child = node[_this.config.childrenProperty][i];
                        findEntriesInSubTree(child, listOfFoundEntries);
                    }
                }
            };
            var matchingEntries = [];
            for (var i = 0; i < this.entries.length; i++) {
                var rootEntry = this.entries[i];
                findEntriesInSubTree(rootEntry, matchingEntries);
            }
            return matchingEntries;
        };
        TrivialTreeBox.prototype.findPathToFirstMatchingNode = function (predicateFunction) {
            var _this = this;
            var searchInSubTree = function (node, path) {
                if (predicateFunction.call(_this, node, path)) {
                    path.push(node);
                    return path;
                }
                if (node[_this.config.childrenProperty]) {
                    var newPath = path.slice();
                    newPath.push(node);
                    for (var i = 0; i < node[_this.config.childrenProperty].length; i++) {
                        var child = node[_this.config.childrenProperty][i];
                        var result = searchInSubTree(child, newPath);
                        if (result) {
                            return result;
                        }
                    }
                }
            };
            for (var i = 0; i < this.entries.length; i++) {
                var rootEntry = this.entries[i];
                var path = searchInSubTree(rootEntry, []);
                if (path) {
                    return path;
                }
            }
        };
        TrivialTreeBox.prototype.findEntryById = function (id) {
            var _this = this;
            return this.findEntries(function (entry) {
                return _this.config.valueFunction(entry) === id;
            })[0];
        };
        TrivialTreeBox.prototype.findParentNode = function (childNode) {
            var _this = this;
            return this.findEntries(function (entry) {
                return entry[_this.config.childrenProperty] && entry[_this.config.childrenProperty].indexOf(childNode) != -1;
            })[0];
        };
        TrivialTreeBox.prototype.setSelectedEntry = function (entry, originalEvent) {
            this.selectedEntryId = entry ? this.config.valueFunction(entry) : null;
            this.markSelectedEntry(entry);
            this.setHighlightedEntry(entry);
            this.fireChangeEvents(entry, originalEvent);
            if (entry && this.config.openOnSelection) {
                this.setNodeExpanded(entry, true, true);
            }
        };
        TrivialTreeBox.prototype.setSelectedEntryById = function (nodeId) {
            this.setSelectedEntry(this.findEntryById(nodeId), null);
        };
        TrivialTreeBox.prototype.minimallyScrollTo = function ($entryWrapper) {
            TrivialCore_1.minimallyScrollTo(this.$componentWrapper.parent(), $entryWrapper);
        };
        TrivialTreeBox.prototype.markSelectedEntry = function (entry) {
            this.$tree.find(".tr-selected-entry").removeClass("tr-selected-entry");
            if (entry && entry._trEntryElement) {
                var $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                $entryWrapper.addClass("tr-selected-entry");
            }
        };
        TrivialTreeBox.prototype.fireChangeEvents = function (entry, originalEvent) {
            this.$componentWrapper.trigger("change");
            this.onSelectedEntryChanged.fire(entry);
        };
        TrivialTreeBox.prototype.selectNextEntry = function (direction, originalEvent) {
            var nextVisibleEntry = this.getNextVisibleEntry(this.getSelectedEntry(), direction);
            if (nextVisibleEntry != null) {
                this.setSelectedEntry(nextVisibleEntry, originalEvent);
            }
        };
        TrivialTreeBox.prototype.setHighlightedEntry = function (entry) {
            if (entry !== this.highlightedEntry) {
                this.highlightedEntry = entry;
                this.$tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                if (entry != null && entry._trEntryElement) {
                    var $entry = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entry.addClass('tr-highlighted-entry');
                    this.minimallyScrollTo($entry);
                }
                else {
                    var selectedEntry = this.getSelectedEntry();
                    if (selectedEntry) {
                        this.highlightedEntry = selectedEntry;
                    }
                }
            }
        };
        TrivialTreeBox.prototype.getNextVisibleEntry = function (currentEntry, direction, onlyEntriesWithTextMatches) {
            if (onlyEntriesWithTextMatches === void 0) { onlyEntriesWithTextMatches = false; }
            var newSelectedElementIndex;
            var visibleEntriesAsList = this.findEntries(function (entry) {
                if (!entry._trEntryElement) {
                    return false;
                }
                else {
                    if (onlyEntriesWithTextMatches) {
                        return entry._trEntryElement.is(':visible') && entry._trEntryElement.has('>.tr-tree-entry-and-expander-wrapper .tr-highlighted-text').length > 0;
                    }
                    else {
                        return entry._trEntryElement.is(':visible') || entry === currentEntry;
                    }
                }
            });
            if (visibleEntriesAsList == null || visibleEntriesAsList.length == 0) {
                return null;
            }
            else if (currentEntry == null && direction > 0) {
                newSelectedElementIndex = -1 + direction;
            }
            else if (currentEntry == null && direction < 0) {
                newSelectedElementIndex = visibleEntriesAsList.length + direction;
            }
            else {
                var currentSelectedElementIndex = visibleEntriesAsList.indexOf(currentEntry);
                newSelectedElementIndex = (currentSelectedElementIndex + visibleEntriesAsList.length + direction) % visibleEntriesAsList.length;
            }
            return visibleEntriesAsList[newSelectedElementIndex];
        };
        TrivialTreeBox.prototype.highlightTextMatches = function (searchString) {
            this.$tree.detach();
            for (var i = 0; i < this.entries.length; i++) {
                var entry = this.entries[i];
                var $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                $entryElement.trivialHighlight(searchString, this.config.matchingOptions);
            }
            this.$tree.appendTo(this.$componentWrapper);
        };
        TrivialTreeBox.prototype.getSelectedEntry = function () {
            return (this.selectedEntryId !== undefined && this.selectedEntryId !== null) ? this.findEntryById(this.selectedEntryId) : null;
        };
        TrivialTreeBox.prototype.revealSelectedEntry = function (animate) {
            if (animate === void 0) { animate = false; }
            var selectedEntry = this.getSelectedEntry();
            if (!selectedEntry) {
                return;
            }
            var currentEntry = selectedEntry;
            while (currentEntry = this.findParentNode(currentEntry)) {
                this.setNodeExpanded(currentEntry, true, animate);
            }
            this.minimallyScrollTo(selectedEntry._trEntryElement);
        };
        TrivialTreeBox.prototype.highlightNextEntry = function (direction) {
            var nextVisibleEntry = this.getNextVisibleEntry(this.highlightedEntry || this.getSelectedEntry(), direction);
            if (nextVisibleEntry != null) {
                this.setHighlightedEntry(nextVisibleEntry);
            }
        };
        TrivialTreeBox.prototype.highlightNextMatchingEntry = function (direction) {
            var nextMatchingEntry = this.getNextVisibleEntry(this.highlightedEntry || this.getSelectedEntry(), direction, true);
            if (nextMatchingEntry != null) {
                this.setHighlightedEntry(nextMatchingEntry);
            }
        };
        TrivialTreeBox.prototype.selectNextMatchingEntry = function (direction) {
            var nextMatchingEntry = this.getNextVisibleEntry(this.highlightedEntry, direction, true);
            if (nextMatchingEntry != null) {
                this.setSelectedEntry(nextMatchingEntry);
            }
        };
        TrivialTreeBox.prototype.getHighlightedEntry = function () {
            return this.highlightedEntry;
        };
        TrivialTreeBox.prototype.setHighlightedNodeExpanded = function (expanded) {
            if (!this.highlightedEntry || this.isLeaf(this.highlightedEntry)) {
                return false;
            }
            else {
                var wasExpanded = this.highlightedEntry[this.config.expandedProperty];
                this.setNodeExpanded(this.highlightedEntry, expanded, true);
                return !wasExpanded != !expanded;
            }
        };
        TrivialTreeBox.prototype.updateChildren = function (parentNodeId, children) {
            var node = this.findEntryById(parentNodeId);
            if (node) {
                this.setChildren(node, children);
            }
            else {
                console.error("Could not set the children of unknown node with id " + parentNodeId);
            }
        };
        ;
        TrivialTreeBox.prototype.updateNode = function (node) {
            var oldNode = this.findEntryById(this.config.valueFunction(node));
            var parent = this.findParentNode(oldNode);
            if (parent) {
                parent[this.config.childrenProperty][parent[this.config.childrenProperty].indexOf(oldNode)] = node;
            }
            else {
                this.entries[this.entries.indexOf(oldNode)] = node;
            }
            this.createEntryElement(node, this.nodeDepth(oldNode)).insertAfter(oldNode._trEntryElement);
            oldNode._trEntryElement.remove();
        };
        ;
        TrivialTreeBox.prototype.removeNode = function (nodeId) {
            var childNode = this.findEntryById(nodeId);
            if (childNode) {
                var parentNode = this.findParentNode(childNode);
                if (parentNode) {
                    parentNode[this.config.childrenProperty].splice(parentNode[this.config.childrenProperty].indexOf(childNode), 1);
                }
                else {
                    this.entries.splice(this.entries.indexOf(childNode), 1);
                }
                childNode._trEntryElement.remove();
            }
        };
        ;
        TrivialTreeBox.prototype.addNode = function (parentNodeId, node) {
            var parentNode = this.findEntryById(parentNodeId);
            if (this.isLeaf(parentNode)) {
                console.error('The parent node is a leaf node, so you cannot add children to it!');
            }
            if (!parentNode[this.config.childrenProperty]) {
                parentNode[this.config.childrenProperty] = [];
            }
            parentNode[this.config.childrenProperty].push(node);
            var entryElement = this.createEntryElement(node, this.nodeDepth(parentNode) + 1);
            entryElement
                .appendTo(parentNode._trEntryElement.find('>.tr-tree-entry-children-wrapper'));
            parentNode._trEntryElement.addClass('has-children');
        };
        ;
        TrivialTreeBox.prototype.destroy = function () {
            this.$componentWrapper.remove();
        };
        ;
        TrivialTreeBox.prototype.getMainDomElement = function () {
            return this.$componentWrapper[0];
        };
        return TrivialTreeBox;
    }());
    exports.TrivialTreeBox = TrivialTreeBox;
});

//# sourceMappingURL=TrivialTreeBox.js.map
