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
module TrivialComponents {

    export class TrivialTreeBox {

        private config: any;

        public readonly onSelectedEntryChanged = new TrivialEvent();
        public readonly onNodeExpansionStateChanged = new TrivialEvent();

        private $componentWrapper: JQuery;
        private $tree: JQuery;

        private entries: any[];
        private selectedEntryId: number;
        private highlightedEntry: any;

        constructor($container: JQuery|Element|string, options: any = {} /*TODO config type*/) {
            this.config = $.extend({
                valueFunction: (entry:any) => entry ? entry.id : null,
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                lazyChildrenQueryFunction: function (node: any, resultCallback: Function) {
                    resultCallback(node.children || []);
                },
                expandedProperty: 'expanded',
                entryRenderingFunction: function (entry: any, depth: number) {
                    var defaultTemplates = [DEFAULT_TEMPLATES.icon2LinesTemplate, DEFAULT_TEMPLATES.iconSingleLineTemplate];
                    var template = entry.template || defaultTemplates[Math.min(depth, defaultTemplates.length - 1)];
                    return Mustache.render(template, entry);
                },
                spinnerTemplate: DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
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
            }, options);

            this.entries = this.config.entries;

            this.$componentWrapper = $('<div class="tr-treebox"/>').appendTo($container);
            this.$componentWrapper.toggleClass("hide-expanders", !this.config.showExpanders);
            this.$tree = $('<div class="tr-tree-entryTree"></div>').appendTo(this.$componentWrapper);

            if (this.entries) { // if this.config.entries was set...
                this.updateEntries(this.entries);
            }

            this.setSelectedEntry((this.config.selectedEntryId !== undefined && this.config.selectedEntryId !== null) ? this.findEntryById(this.config.selectedEntryId) : null);
        }


        private isLeaf(entry: any) {
            return (entry[this.config.childrenProperty] == null || entry[this.config.childrenProperty].length == 0) && !entry[this.config.lazyChildrenFlagProperty];
        }

        private createEntryElement(entry: any, depth: number) {
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
                .mousedown((e) =>  {
                    this.$componentWrapper.trigger("mousedown", e);
                    this.setSelectedEntry(entry);
                }).mouseup((e) =>  {
                this.$componentWrapper.trigger("mouseup", e);
            }).mouseenter(() =>  {
                this.setHighlightedEntry(entry);
            }).mouseleave((e) =>  {
                if (!$((e as any).toElement).is('.tr-tree-entry-outer-wrapper')) {
                    this.setHighlightedEntry(null);
                }
            });

            if (!leaf) {
                var $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
                    .appendTo($outerEntryWrapper);
                $expander.mousedown((e) =>  {
                    return false;
                }).click((e) =>  {
                    this.setNodeExpanded(entry, !entry[this.config.expandedProperty], true);
                });
                if (entry[this.config.childrenProperty]) {
                    if (entry[this.config.expandedProperty]) {
                        for (var i = 0; i < entry[this.config.childrenProperty].length; i++) {
                            this.createEntryElement(entry[this.config.childrenProperty][i], depth + 1).appendTo($childrenWrapper);
                        }
                    }
                } else if (entry[this.config.lazyChildrenFlagProperty]) {
                    $childrenWrapper.hide().append(this.config.spinnerTemplate).fadeIn();
                }
                this.setNodeExpanded(entry, entry[this.config.expandedProperty], false);
            }
            return $outerEntryWrapper;
        }

        private updateTreeEntryElements(entries: any[]) {
            this.$tree.detach();
            this.$tree = $('<div class="tr-tree-entryTree"></div>');

            if (this.entries.length > 0) {
                for (var i = 0; i < this.entries.length; i++) {
                    this.createEntryElement(this.entries[i], 0).appendTo(this.$tree);
                }
            } else {
                this.$tree.append(this.config.noEntriesTemplate);
            }
            this.$tree.appendTo(this.$componentWrapper);
        }


        private setNodeExpanded(node: any, expanded: boolean, animate: boolean) {
            var wasExpanded = node[this.config.expandedProperty];

            if (expanded && this.config.enforceSingleExpandedPath) {
                var currentlyExpandedNodes = this.findEntries((n) =>  {
                    return !!(n[this.config.expandedProperty]);
                });
                var newExpandedPath = this.findPathToFirstMatchingNode((n) =>  {
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

            let nodeHasUnrenderedChildren = (node: any) => {
                return node[this.config.childrenProperty] && node[this.config.childrenProperty].some((child: any) =>  {
                        return !child._trEntryElement || !jQuery.contains(document.documentElement, child._trEntryElement[0]);
                    });
            };

            if (expanded && node[this.config.lazyChildrenFlagProperty] && !node[this.config.childrenProperty]) {
                this.config.lazyChildrenQueryFunction(node, (children: any[]) =>  {
                    this.setChildren(node, children);
                });
            } else if (expanded && nodeHasUnrenderedChildren(node)) {
                this.renderChildren(node);
            }
            if (expanded) {
                this.minimallyScrollTo(node._trEntryElement);
            }

            var childrenWrapper = node._trEntryElement.find("> .tr-tree-entry-children-wrapper");
            if (expanded) {
                if (animate) {
                    childrenWrapper.slideDown(this.config.animationDuration);
                } else {
                    childrenWrapper.css("display", "block"); // show() does not do this if the node is not attached
                }
            } else {
                if (animate) {
                    childrenWrapper.slideUp(this.config.animationDuration);
                } else {
                    childrenWrapper.hide();
                }
            }

            if (!!wasExpanded != !!expanded) {
                this.onNodeExpansionStateChanged.fire(node);
            }
        }

        private nodeDepth(node: any) {
            return node ? parseInt(node._trEntryElement.attr('data-depth')) : 0;
        }

        private setChildren(node: any, children: any[]) {
            node[this.config.childrenProperty] = children;
            node[this.config.lazyChildrenFlagProperty] = false;
            this.renderChildren(node);
        }

        private renderChildren(node: any) {
            var $childrenWrapper = node._trEntryElement.find('> .tr-tree-entry-children-wrapper');
            $childrenWrapper.empty();
            var children = node[this.config.childrenProperty];
            if (children && children.length > 0) {
                var depth = this.nodeDepth(node);
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    this.createEntryElement(child, depth + 1).appendTo($childrenWrapper);
                }
            } else {
                node._trEntryElement.removeClass('has-children expanded');
            }
        }

        public updateEntries(newEntries: any[]) {
            this.highlightedEntry = null;
            this.entries = newEntries;

            this.updateTreeEntryElements(this.entries);

            var selectedEntry = this.findEntryById(this.selectedEntryId);
            if (selectedEntry) {
                // selected entry in filtered tree? then mark it as selected!
                this.markSelectedEntry(selectedEntry);
            }
        }

        private findEntries(filterFunction: ((node: any)=>boolean)) {
            let findEntriesInSubTree = (node: any, listOfFoundEntries: any[]) => {
                if (filterFunction.call(this, node)) {
                    listOfFoundEntries.push(node);
                }
                if (node[this.config.childrenProperty]) {
                    for (var i = 0; i < node[this.config.childrenProperty].length; i++) {
                        var child = node[this.config.childrenProperty][i];
                        findEntriesInSubTree(child, listOfFoundEntries);
                    }
                }
            };

            var matchingEntries: any[] = [];
            for (var i = 0; i < this.entries.length; i++) {
                var rootEntry = this.entries[i];
                findEntriesInSubTree(rootEntry, matchingEntries);
            }
            return matchingEntries;
        }

        private findPathToFirstMatchingNode(predicateFunction: ((node: any, path: any[]) => boolean)) {
            let searchInSubTree = (node: any, path: any[]): any => {
                if (predicateFunction.call(this, node, path)) {
                    path.push(node);
                    return path;
                }
                if (node[this.config.childrenProperty]) {
                    var newPath = path.slice();
                    newPath.push(node);
                    for (var i = 0; i < node[this.config.childrenProperty].length; i++) {
                        var child = node[this.config.childrenProperty][i];
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
        }

        private findEntryById(id: number) {
            return this.findEntries((entry) =>  {
                return this.config.valueFunction(entry) == id
            })[0];
        }

        private findParentNode(childNode: any) {
            return this.findEntries((entry) =>  {
                return entry[this.config.childrenProperty] && entry[this.config.childrenProperty].indexOf(childNode) != -1;
            })[0];
        }

        public setSelectedEntry(entry: any) {
            this.selectedEntryId = entry ? this.config.valueFunction(entry) : null;
            this.markSelectedEntry(entry);
            this.setHighlightedEntry(entry); // it makes no sense to select an entry and have another one still highlighted.
            this.fireChangeEvents(entry);
            if (entry && this.config.openOnSelection) {
                this.setNodeExpanded(entry, true, true);
            }
        }

        public setSelectedEntryById(nodeId: any) {
            this.setSelectedEntry(this.findEntryById(nodeId));
        }

        private minimallyScrollTo($entryWrapper: JQuery) {
            this.$componentWrapper.parent().minimallyScrollTo($entryWrapper);
        }

        private markSelectedEntry(entry: any) {
            this.$tree.find(".tr-selected-entry").removeClass("tr-selected-entry");
            if (entry && entry._trEntryElement) {
                var $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                $entryWrapper.addClass("tr-selected-entry");
            }
        }

        private fireChangeEvents(entry: any) {
            this.$componentWrapper.trigger("change");
            this.onSelectedEntryChanged.fire(entry);
        }

        public selectNextEntry(direction: HighlightDirection) {
            var nextVisibleEntry = this.getNextVisibleEntry(this.getSelectedEntry(), direction);
            if (nextVisibleEntry != null) {
                this.setSelectedEntry(nextVisibleEntry);
            }
        }

        public setHighlightedEntry(entry: any) {
            if (entry !== this.highlightedEntry) {
                this.highlightedEntry = entry;
                this.$tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                if (entry != null && entry._trEntryElement) {
                    var $entry = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entry.addClass('tr-highlighted-entry');
                    this.minimallyScrollTo($entry);
                } else {
                    var selectedEntry = this.getSelectedEntry();
                    if (selectedEntry) {
                        this.highlightedEntry = selectedEntry;
                    }
                }
            }
        }

        private getNextVisibleEntry(currentEntry: any, direction: HighlightDirection, onlyEntriesWithTextMatches: boolean = false) {
            var newSelectedElementIndex: number;
            var visibleEntriesAsList = this.findEntries((entry) =>  {
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

        public highlightTextMatches(searchString: string) {
            this.$tree.detach();
            for (var i = 0; i < this.entries.length; i++) {
                var entry = this.entries[i];
                var $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                $entryElement.trivialHighlight(searchString, this.config.matchingOptions);
            }
            this.$tree.appendTo(this.$componentWrapper);
        }

        public getSelectedEntry() {
            return (this.selectedEntryId !== undefined && this.selectedEntryId !== null) ? this.findEntryById(this.selectedEntryId) : null;
        }


        public revealSelectedEntry(animate: boolean = false) {
            var selectedEntry = this.getSelectedEntry();
            if (!selectedEntry) {
                return;
            }
            var currentEntry = selectedEntry;
            while (currentEntry = this.findParentNode(currentEntry)) {
                this.setNodeExpanded(currentEntry, true, animate);
            }
            this.minimallyScrollTo(selectedEntry._trEntryElement);
        }

        public highlightNextEntry(direction: HighlightDirection) {
            var nextVisibleEntry = this.getNextVisibleEntry(this.highlightedEntry || this.getSelectedEntry(), direction);
            if (nextVisibleEntry != null) {
                this.setHighlightedEntry(nextVisibleEntry);
            }
        }

        public highlightNextMatchingEntry(direction: HighlightDirection) {
            var nextMatchingEntry = this.getNextVisibleEntry(this.highlightedEntry || this.getSelectedEntry(), direction, true);
            if (nextMatchingEntry != null) {
                this.setHighlightedEntry(nextMatchingEntry);
            }
        }

        public selectNextMatchingEntry(direction: HighlightDirection) {
            var nextMatchingEntry = this.getNextVisibleEntry(this.highlightedEntry, direction, true);
            if (nextMatchingEntry != null) {
                this.setSelectedEntry(nextMatchingEntry);
            }
        }

        public getHighlightedEntry() {
            return this.highlightedEntry
        }

        public setHighlightedNodeExpanded(expanded: boolean) {
            if (!this.highlightedEntry || this.isLeaf(this.highlightedEntry)) {
                return false;
            } else {
                var wasExpanded = this.highlightedEntry[this.config.expandedProperty];
                this.setNodeExpanded(this.highlightedEntry, expanded, true);
                return !wasExpanded != !expanded;
            }
        }

        public updateChildren(parentNodeId: any, children: any[]) {
            var node = this.findEntryById(parentNodeId);
            if (node) {
                this.setChildren(node, children);
            } else {
                console.error("Could not set the children of unknown node with id " + parentNodeId);
            }
        };

        public updateNode(node: any) {
            var oldNode = this.findEntryById(this.config.valueFunction(node));
            var parent = this.findParentNode(oldNode);
            if (parent) {
                parent[this.config.childrenProperty][parent[this.config.childrenProperty].indexOf(oldNode)] = node;
            } else {
                this.entries[this.entries.indexOf(oldNode)] = node;
            }
            this.createEntryElement(node, this.nodeDepth(oldNode)).insertAfter(oldNode._trEntryElement);
            oldNode._trEntryElement.remove();
        };

        public removeNode(nodeId: number) {
            var childNode = this.findEntryById(nodeId);
            if (childNode) {
                var parentNode = this.findParentNode(childNode);
                if (parentNode) {
                    parentNode[this.config.childrenProperty].splice(parentNode[this.config.childrenProperty].indexOf(childNode), 1);
                } else {
                    this.entries.splice(this.entries.indexOf(childNode), 1);
                }
                childNode._trEntryElement.remove();
            }
        };

        public addNode(parentNodeId: number, node: any) {
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
    }
}
