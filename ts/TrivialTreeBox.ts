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

    export interface TrivialTreeBoxConfig<E> {
        valueFunction?: (entry: E) => string,
        entryRenderingFunction?: (entry: E, depth: number) => string,
        selectedEntry?: E,
        spinnerTemplate?: string,
        noEntriesTemplate?: string,
        entries?: E[],
        matchingOptions?: MatchingOptions,
        childrenProperty?: "children", // TODO replace by getChildrenFunction: (entry: E) => E[]
        lazyChildrenFlagProperty?: "hasLazyChildren",  // TODO replace by hasChildrenFunction: (entry: E) => boolean
        lazyChildrenQueryFunction?: (node: E, resultCallback: ResultCallback<E>) => void, // TODO unify with getter/setter
        expandedProperty?: 'expanded', // TODO replace by expandedPropertyGetter: (entry: E) => boolean, expandedPropertySetter: (entry: E, expanded: boolean) => void
        selectedEntryId?: any,
        animationDuration?: number,
        showExpanders?: boolean,
        openOnSelection?: boolean, // open expandable nodes when they are selected
        enforceSingleExpandedPath?: boolean // only one path is expanded at any time
    }

    export class TrivialTreeBox<E> implements TrivialComponent {

        private config: TrivialTreeBoxConfig<E>;

        public readonly onSelectedEntryChanged = new TrivialEvent<E>(this);
        public readonly onNodeExpansionStateChanged = new TrivialEvent<E>(this);

        private $componentWrapper: JQuery;
        private $tree: JQuery;

        private entries: E[];
        private selectedEntryId: number;
        private highlightedEntry: E;

        constructor($container: JQuery|Element|string, options: TrivialTreeBoxConfig<E> = {}) {
            this.config = $.extend(<TrivialTreeBoxConfig<E>> {
                valueFunction: (entry:E) => entry ? entry.id : null,
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                lazyChildrenQueryFunction: function (node: E, resultCallback: Function) {
                    resultCallback(node.children || []);
                },
                expandedProperty: 'expanded',
                entryRenderingFunction: function (entry: E, depth: number) {
                    const defaultTemplates = [DEFAULT_TEMPLATES.icon2LinesTemplate, DEFAULT_TEMPLATES.iconSingleLineTemplate];
                    const template = entry.template || defaultTemplates[Math.min(depth, defaultTemplates.length - 1)];
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


        private isLeaf(entry: E) {
            return (entry[this.config.childrenProperty] == null || entry[this.config.childrenProperty].length == 0) && !entry[this.config.lazyChildrenFlagProperty];
        }

        private createEntryElement(entry: E, depth: number) {
            let leaf = this.isLeaf(entry);
            const $outerEntryWrapper = $('<div class="tr-tree-entry-outer-wrapper ' + (leaf ? '' : 'has-children') + '" data-depth="' + depth + '"></div>');
            entry._trEntryElement = $outerEntryWrapper;
            const $entryAndExpanderWrapper = $('<div class="tr-tree-entry-and-expander-wrapper"></div>')
	            .appendTo($outerEntryWrapper);
            for (let k = 0; k < depth; k++) {
                $entryAndExpanderWrapper.append('<div class="tr-indent-spacer"/>');
            }
            const $expander = $('<div class="tr-tree-expander"></div>')
	            .appendTo($entryAndExpanderWrapper);
            const $entry = $(this.config.entryRenderingFunction(entry, depth));
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
                const $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
	                .appendTo($outerEntryWrapper);
                $expander.mousedown(() =>  {
                    return false;
                }).click((e) =>  {
                    this.setNodeExpanded(entry, !entry[this.config.expandedProperty], true);
                });
                if (entry[this.config.childrenProperty]) {
                    if (entry[this.config.expandedProperty]) {
                        for (let i = 0; i < entry[this.config.childrenProperty].length; i++) {
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

        private updateTreeEntryElements() {
            this.$tree.detach();
            this.$tree = $('<div class="tr-tree-entryTree"></div>');

            if (this.entries.length > 0) {
                for (let i = 0; i < this.entries.length; i++) {
                    this.createEntryElement(this.entries[i], 0).appendTo(this.$tree);
                }
            } else {
                this.$tree.append(this.config.noEntriesTemplate);
            }
            this.$tree.appendTo(this.$componentWrapper);
        }


        private setNodeExpanded(node: E, expanded: boolean, animate: boolean) {
            let wasExpanded = node[this.config.expandedProperty];

            if (expanded && this.config.enforceSingleExpandedPath) {
                const currentlyExpandedNodes = this.findEntries((n) => {
                    return !!(n[this.config.expandedProperty]);
                });
                const newExpandedPath = this.findPathToFirstMatchingNode((n) => {
                    return n === node;
                });
                for (let i = 0; i < currentlyExpandedNodes.length; i++) {
                    const currentlyExpandedNode = currentlyExpandedNodes[i];
                    if (newExpandedPath.indexOf(currentlyExpandedNode) === -1) {
                        this.setNodeExpanded(currentlyExpandedNode, false, true);
                    }
                }
            }

            node[this.config.expandedProperty] = !!expanded;
            node._trEntryElement.toggleClass("expanded", !!expanded);

            let nodeHasUnrenderedChildren = (node: E) => {
                return node[this.config.childrenProperty] && node[this.config.childrenProperty].some((child: E) =>  {
                        return !child._trEntryElement || !jQuery.contains(document.documentElement, child._trEntryElement[0]);
                    });
            };

            if (expanded && node[this.config.lazyChildrenFlagProperty] && !node[this.config.childrenProperty]) {
                this.config.lazyChildrenQueryFunction(node, (children: E[]) =>  {
                    this.setChildren(node, children);
                });
            } else if (expanded && nodeHasUnrenderedChildren(node)) {
                this.renderChildren(node);
            }
            if (expanded) {
                this.minimallyScrollTo(node._trEntryElement);
            }

            const childrenWrapper = node._trEntryElement.find("> .tr-tree-entry-children-wrapper");
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

        private nodeDepth(node: E) {
            return node ? parseInt(node._trEntryElement.attr('data-depth')) : 0;
        }

        private setChildren(node: E, children: E[]) {
            node[this.config.childrenProperty] = children;
            node[this.config.lazyChildrenFlagProperty] = false;
            this.renderChildren(node);
        }

        private renderChildren(node: E) {
            const $childrenWrapper = node._trEntryElement.find('> .tr-tree-entry-children-wrapper');
            $childrenWrapper.empty();
            const children = node[this.config.childrenProperty];
            if (children && children.length > 0) {
                const depth = this.nodeDepth(node);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    this.createEntryElement(child, depth + 1).appendTo($childrenWrapper);
                }
            } else {
                node._trEntryElement.removeClass('has-children expanded');
            }
        }

        public updateEntries(newEntries: E[]) {
            this.highlightedEntry = null;
            this.entries = newEntries;

            this.updateTreeEntryElements();

            const selectedEntry = this.findEntryById(this.selectedEntryId);
            if (selectedEntry) {
                // selected entry in filtered tree? then mark it as selected!
                this.markSelectedEntry(selectedEntry);
            }
        }

        private findEntries(filterFunction: ((node: E)=>boolean)) {
            let findEntriesInSubTree = (node: E, listOfFoundEntries: E[]) => {
                if (filterFunction.call(this, node)) {
                    listOfFoundEntries.push(node);
                }
                if (node[this.config.childrenProperty]) {
                    for (let i = 0; i < node[this.config.childrenProperty].length; i++) {
                        const child = node[this.config.childrenProperty][i];
                        findEntriesInSubTree(child, listOfFoundEntries);
                    }
                }
            };

            const matchingEntries: E[] = [];
            for (let i = 0; i < this.entries.length; i++) {
                const rootEntry = this.entries[i];
                findEntriesInSubTree(rootEntry, matchingEntries);
            }
            return matchingEntries;
        }

        private findPathToFirstMatchingNode(predicateFunction: ((node: E, path: any[]) => boolean)) {
            let searchInSubTree = (node: E, path: any[]): E => {
                if (predicateFunction.call(this, node, path)) {
                    path.push(node);
                    return path;
                }
                if (node[this.config.childrenProperty]) {
                    const newPath = path.slice();
                    newPath.push(node);
                    for (let i = 0; i < node[this.config.childrenProperty].length; i++) {
                        const child = node[this.config.childrenProperty][i];
                        const result = searchInSubTree(child, newPath);
                        if (result) {
                            return result;
                        }
                    }
                }
            };

            for (let i = 0; i < this.entries.length; i++) {
                const rootEntry = this.entries[i];
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

        private findParentNode(childNode: E) {
            return this.findEntries((entry) =>  {
                return entry[this.config.childrenProperty] && entry[this.config.childrenProperty].indexOf(childNode) != -1;
            })[0];
        }

        public setSelectedEntry(entry: E) {
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

        private markSelectedEntry(entry: E) {
            this.$tree.find(".tr-selected-entry").removeClass("tr-selected-entry");
            if (entry && entry._trEntryElement) {
                const $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                $entryWrapper.addClass("tr-selected-entry");
            }
        }

        private fireChangeEvents(entry: E) {
            this.$componentWrapper.trigger("change");
            this.onSelectedEntryChanged.fire(entry);
        }

        public selectNextEntry(direction: HighlightDirection) {
            const nextVisibleEntry = this.getNextVisibleEntry(this.getSelectedEntry(), direction);
            if (nextVisibleEntry != null) {
                this.setSelectedEntry(nextVisibleEntry);
            }
        }

        public setHighlightedEntry(entry: E) {
            if (entry !== this.highlightedEntry) {
                this.highlightedEntry = entry;
                this.$tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                if (entry != null && entry._trEntryElement) {
                    const $entry = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                    $entry.addClass('tr-highlighted-entry');
                    this.minimallyScrollTo($entry);
                } else {
                    const selectedEntry = this.getSelectedEntry();
                    if (selectedEntry) {
                        this.highlightedEntry = selectedEntry;
                    }
                }
            }
        }

        private getNextVisibleEntry(currentEntry: E, direction: HighlightDirection, onlyEntriesWithTextMatches: boolean = false) {
            let newSelectedElementIndex: number;
            const visibleEntriesAsList = this.findEntries((entry) => {
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
                const currentSelectedElementIndex = visibleEntriesAsList.indexOf(currentEntry);
                newSelectedElementIndex = (currentSelectedElementIndex + visibleEntriesAsList.length + direction) % visibleEntriesAsList.length;
            }
            return visibleEntriesAsList[newSelectedElementIndex];
        }

        public highlightTextMatches(searchString: string) {
            this.$tree.detach();
            for (let i = 0; i < this.entries.length; i++) {
                const entry = this.entries[i];
                const $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                $entryElement.trivialHighlight(searchString, this.config.matchingOptions);
            }
            this.$tree.appendTo(this.$componentWrapper);
        }

        public getSelectedEntry() {
            return (this.selectedEntryId !== undefined && this.selectedEntryId !== null) ? this.findEntryById(this.selectedEntryId) : null;
        }


        public revealSelectedEntry(animate: boolean = false) {
            let selectedEntry = this.getSelectedEntry();
            if (!selectedEntry) {
                return;
            }
            let currentEntry = selectedEntry;
            while (currentEntry = this.findParentNode(currentEntry)) {
                this.setNodeExpanded(currentEntry, true, animate);
            }
            this.minimallyScrollTo(selectedEntry._trEntryElement);
        }

        public highlightNextEntry(direction: HighlightDirection) {
            const nextVisibleEntry = this.getNextVisibleEntry(this.highlightedEntry || this.getSelectedEntry(), direction);
            if (nextVisibleEntry != null) {
                this.setHighlightedEntry(nextVisibleEntry);
            }
        }

        public highlightNextMatchingEntry(direction: HighlightDirection) {
            const nextMatchingEntry = this.getNextVisibleEntry(this.highlightedEntry || this.getSelectedEntry(), direction, true);
            if (nextMatchingEntry != null) {
                this.setHighlightedEntry(nextMatchingEntry);
            }
        }

        public selectNextMatchingEntry(direction: HighlightDirection) {
            const nextMatchingEntry = this.getNextVisibleEntry(this.highlightedEntry, direction, true);
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
                let wasExpanded = this.highlightedEntry[this.config.expandedProperty];
                this.setNodeExpanded(this.highlightedEntry, expanded, true);
                return !wasExpanded != !expanded;
            }
        }

        public updateChildren(parentNodeId: E, children: E[]) {
            const node = this.findEntryById(parentNodeId);
            if (node) {
                this.setChildren(node, children);
            } else {
                console.error("Could not set the children of unknown node with id " + parentNodeId);
            }
        };

        public updateNode(node: E) {
            const oldNode = this.findEntryById(this.config.valueFunction(node));
            const parent = this.findParentNode(oldNode);
            if (parent) {
                parent[this.config.childrenProperty][parent[this.config.childrenProperty].indexOf(oldNode)] = node;
            } else {
                this.entries[this.entries.indexOf(oldNode)] = node;
            }
            this.createEntryElement(node, this.nodeDepth(oldNode)).insertAfter(oldNode._trEntryElement);
            oldNode._trEntryElement.remove();
        };

        public removeNode(nodeId: number) {
            const childNode = this.findEntryById(nodeId);
            if (childNode) {
                const parentNode = this.findParentNode(childNode);
                if (parentNode) {
                    parentNode[this.config.childrenProperty].splice(parentNode[this.config.childrenProperty].indexOf(childNode), 1);
                } else {
                    this.entries.splice(this.entries.indexOf(childNode), 1);
                }
                childNode._trEntryElement.remove();
            }
        };

        public addNode(parentNodeId: any, node: E) {
            const parentNode = this.findEntryById(parentNodeId);
            if (this.isLeaf(parentNode)) {
                console.error('The parent node is a leaf node, so you cannot add children to it!');
            }
            if (!parentNode[this.config.childrenProperty]) {
                parentNode[this.config.childrenProperty] = [];
            }
            parentNode[this.config.childrenProperty].push(node);
            const entryElement = this.createEntryElement(node, this.nodeDepth(parentNode) + 1);
            entryElement
                .appendTo(parentNode._trEntryElement.find('>.tr-tree-entry-children-wrapper'));
            parentNode._trEntryElement.addClass('has-children');
        };

        getMainDomElement(): Element {
            return this.$componentWrapper[0];
        }
    }
}
