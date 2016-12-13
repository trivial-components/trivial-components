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
module TrivialComponents {

    export class TrivialTree {

        private config: any;

        public readonly onSelectedEntryChanged = new TrivialEvent();
        public readonly onNodeExpansionStateChanged = new TrivialEvent();

        private treeBox: TrivialTreeBox;
        private entries: any[];
        private selectedEntryId: number;

        private $:JQuery;
        private $spinners = $();
        private $originalInput: JQuery;
        private $componentWrapper: JQuery;
        private $tree: JQuery;
        private $editor: JQuery;
        private processUpdateTimer: number;

        constructor(originalInput: JQuery|Element|string, options: any = {}/*TODO config type*/) {
            this.config = $.extend({
                valueProperty: 'id',
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                searchBarMode: 'show-if-filled', // none, show-if-filled, always-visible
                lazyChildrenQueryFunction: (node: any, resultCallback: Function) => {
                    resultCallback([])
                },
                expandedProperty: 'expanded',
                entryRenderingFunction: (entry: any, depth: number) => {
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
                directSelectionViaArrowKeys: false,
                performanceOptimizationSettings: {
                    toManyVisibleItemsRenderDelay: 750,
                    toManyVisibleItemsThreshold: 75
                }
            }, options);
            this.config.queryFunction = this.config.queryFunction || defaultTreeQueryFunctionFactory(this.config.entries
                    || [], defaultEntryMatchingFunctionFactory(["displayValue", "additionalInfo"], this.config.matchingOptions), this.config.childrenProperty, this.config.expandedProperty);

            this.onSelectedEntryChanged = new TrivialEvent();
            this.onNodeExpansionStateChanged = new TrivialEvent();

            this.entries = this.config.entries;

            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$componentWrapper = $('<div class="tr-tree" tabindex="0"/>').insertAfter(this.$originalInput);
            if (this.config.searchBarMode !== 'always-visible') {
                this.$componentWrapper.addClass(this.config.showSearchField ? "" : "hide-searchfield");
            }
            this.$componentWrapper.keydown((e:KeyboardEvent) => {
                if (e.which == keyCodes.tab || keyCodes.isModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                }
                if (this.$editor.is(':visible') && keyCodes.specialKeys.indexOf(e.which) === -1) {
                    this.$editor.focus();
                }
                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                    var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                    if (this.entries != null) {
                        if (this.config.directSelectionViaArrowKeys) {
                            this.treeBox.selectNextEntry(direction)
                        } else {
                            this.treeBox.highlightNextEntry(direction);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    }
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    this.treeBox.setHighlightedNodeExpanded(e.which == keyCodes.right_arrow);
                } else if (e.which == keyCodes.enter) {
                    this.treeBox.setSelectedEntry(this.treeBox.getHighlightedEntry()[this.config.valueProperty]);
                } else if (e.which == keyCodes.escape) {
                    this.$editor.val("");
                    this.query();
                    this.$componentWrapper.focus();
                } else {
                    this.query(1);
                }
            });
            this.$tree = $('<div class="tr-tree-entryTree"></div>').appendTo(this.$componentWrapper);
            this.$editor = $('<input type="text" class="tr-tree-editor tr-editor"/>')
                .prependTo(this.$componentWrapper)
                .attr("tabindex", this.$originalInput.attr("-1"))
                .focus(() => {
                    this.$componentWrapper.addClass('focus');
                })
                .blur(() => {
                    this.$componentWrapper.removeClass('focus');
                })
                .keydown((e) => {
                    if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        // expand the currently highlighted node.
                        var changedExpandedState = this.treeBox.setHighlightedNodeExpanded(e.which == keyCodes.right_arrow);
                        if (changedExpandedState) {
                            return false;
                        } else {
                            return; // let the user navigate freely left and right...
                        }
                    }
                })
                .on('keyup change', () => {
                    if (this.config.searchBarMode === 'show-if-filled') {
                        if (this.$editor.val()) {
                            this.$componentWrapper.removeClass('hide-searchfield');
                        } else {
                            this.$componentWrapper.addClass('hide-searchfield');
                        }
                    }
                });
            if (this.config.searchBarMode === 'none') {
                this.$editor.css("display", "none");
            }

            if (this.$originalInput.attr("placeholder")) {
                this.$editor.attr("placeholder", this.$originalInput.attr("placeholder"));
            }
            if (this.$originalInput.attr("tabindex")) {
                this.$componentWrapper.attr("tabindex", this.$originalInput.attr("tabindex"));
            }
            if (this.$originalInput.attr("autofocus")) {
                this.$componentWrapper.focus();
            }

            this.treeBox = new TrivialComponents.TrivialTreeBox(this.$tree, this.config);
            this.treeBox.onNodeExpansionStateChanged.addListener((node: any)=> {
                this.onNodeExpansionStateChanged.fire(node);
            });
            this.treeBox.onSelectedEntryChanged.addListener(() => {
                var selectedTreeBoxEntry = this.treeBox.getSelectedEntry();
                if (selectedTreeBoxEntry) {
                    this.selectEntry(selectedTreeBoxEntry);
                }
            });

            this.selectEntry((this.config.selectedEntryId !== undefined && this.config.selectedEntryId !== null) ? this.findEntryById(this.config.selectedEntryId) : null);
            this.$ = this.$componentWrapper;
        }

        public updateEntries(newEntries: any[]) {
            this.entries = newEntries;
            this.$spinners.remove();
            this.$spinners = $();
            this.treeBox.updateEntries(newEntries);
        }


        private query(highlightDirection?: HighlightDirection) {
            if (this.config.searchBarMode === 'always-visible' || this.config.searchBarMode === 'show-if-filled') {
                var $spinner = $(this.config.spinnerTemplate).appendTo(this.$tree);
                this.$spinners = this.$spinners.add($spinner);

                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(() => {
                    this.config.queryFunction(this.$editor.val(), (newEntries: any[]) => {
                        let processUpdate = () => {
                            this.updateEntries(newEntries);
                            if (this.$editor.val().length > 0) {
                                this.treeBox.highlightTextMatches(this.$editor.val());
                                if (!this.config.directSelectionViaArrowKeys) {
                                    this.treeBox.highlightNextMatchingEntry(highlightDirection);
                                }
                            }
                            this.treeBox.revealSelectedEntry();
                        };

                        clearTimeout(this.processUpdateTimer);
                        if (this.countVisibleEntries(newEntries) < this.config.performanceOptimizationSettings.toManyVisibleItemsThreshold) {
                            processUpdate();
                        } else {
                            this.processUpdateTimer = setTimeout(processUpdate, this.config.performanceOptimizationSettings.toManyVisibleItemsRenderDelay);
                        }
                    });
                }, 0);
            }
        }

        private countVisibleEntries(entries: any[]) {
            let countVisibleChildrenAndSelf = (node: any) => {
                if (node[this.config.expandedProperty] && node[this.config.childrenProperty]) {
                    return node[this.config.childrenProperty].map((entry: any) => {
                            return countVisibleChildrenAndSelf(entry);
                        }).reduce((a:number, b:number) => {
                            return a + b;
                        }, 0) + 1;
                } else {
                    return 1;
                }
            };

            return entries.map((entry: any) => {
                return countVisibleChildrenAndSelf(entry);
            }).reduce((a, b) => {
                return a + b;
            }, 0);
        }

        private findEntries(filterFunction: ((node: any) => boolean)) {
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

        private findEntryById(id:number) {
            return this.findEntries((entry: any) => {
                return entry[this.config.valueProperty] == id
            })[0];
        }

        private selectEntry(entry: any) {
            this.selectedEntryId = entry ? entry[this.config.valueProperty] : null;
            this.$originalInput.val(entry ? entry[this.config.valueProperty] : null);
            this.fireChangeEvents(entry);
        }

        private fireChangeEvents(entry: any) {
            this.$originalInput.trigger("change");
            this.$componentWrapper.trigger("change");
            this.onSelectedEntryChanged.fire(entry);
        }

        public getSelectedEntry() {
            this.treeBox.getSelectedEntry()
        };

        public updateChildren(parentNodeId: any, children: any[]) {
            this.treeBox.updateChildren(parentNodeId, children)
        };

        public updateNode(node: any) {
            this.treeBox.updateNode(node)
        };

        public removeNode(nodeId: number) {
            this.treeBox.removeNode(nodeId)
        };

        public addNode(parentNodeId: number, node: any) {
            this.treeBox.addNode(parentNodeId, node)
        };

        public selectNode(nodeId: number) {
            this.treeBox.setSelectedEntry(nodeId);
        };

        public destroy() {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$componentWrapper);
            this.$componentWrapper.remove();
        };
    }
}
