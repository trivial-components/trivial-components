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
        define(["require", "exports", "jquery", "mustache", "./TrivialTreeBox", "./TrivialCore", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialTreeBox_1 = require("./TrivialTreeBox");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialTree = (function () {
        function TrivialTree(originalInput, options) {
            if (options === void 0) { options = {}; }
            var _this = this;
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.onNodeExpansionStateChanged = new TrivialEvent_1.TrivialEvent(this);
            this.$spinners = $();
            this.config = $.extend({
                valueFunction: function (entry) { return entry ? entry.id : null; },
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                searchBarMode: 'show-if-filled',
                lazyChildrenQueryFunction: function (node, resultCallback) {
                    resultCallback([]);
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
                queryFunction: null,
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
            if (!this.config.queryFunction) {
                this.config.queryFunction = TrivialCore_1.defaultTreeQueryFunctionFactory(this.config.entries || [], TrivialCore_1.defaultEntryMatchingFunctionFactory(["displayValue", "additionalInfo"], this.config.matchingOptions), this.config.childrenProperty, this.config.expandedProperty);
            }
            this.entries = this.config.entries;
            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$componentWrapper = $('<div class="tr-tree" tabindex="0"/>').insertAfter(this.$originalInput);
            if (this.config.searchBarMode !== 'always-visible') {
                this.$componentWrapper.addClass("hide-searchfield");
            }
            this.$componentWrapper.keydown(function (e) {
                if (e.which == TrivialCore_1.keyCodes.tab || TrivialCore_1.keyCodes.isModifierKey(e)) {
                    return;
                }
                if (_this.$editor.is(':visible') && TrivialCore_1.keyCodes.specialKeys.indexOf(e.which) === -1) {
                    _this.$editor.focus();
                }
                if (e.which == TrivialCore_1.keyCodes.up_arrow || e.which == TrivialCore_1.keyCodes.down_arrow) {
                    var direction = e.which == TrivialCore_1.keyCodes.up_arrow ? -1 : 1;
                    if (_this.entries != null) {
                        if (_this.config.directSelectionViaArrowKeys) {
                            _this.treeBox.selectNextEntry(direction, e);
                        }
                        else {
                            _this.treeBox.highlightNextEntry(direction);
                        }
                        return false;
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    _this.treeBox.setHighlightedNodeExpanded(e.which == TrivialCore_1.keyCodes.right_arrow);
                }
                else if (e.which == TrivialCore_1.keyCodes.enter) {
                    _this.treeBox.setSelectedEntry(_this.treeBox.getHighlightedEntry(), e);
                }
                else if (e.which == TrivialCore_1.keyCodes.escape) {
                    _this.$editor.val("");
                    _this.query();
                    _this.$componentWrapper.focus();
                }
                else {
                    _this.query(1);
                }
            });
            this.$editor = $('<input type="text" class="tr-tree-editor tr-editor"/>')
                .prependTo(this.$componentWrapper)
                .attr("tabindex", this.$originalInput.attr("-1"))
                .focus(function () {
                _this.$componentWrapper.addClass('focus');
            })
                .blur(function () {
                _this.$componentWrapper.removeClass('focus');
            })
                .keydown(function (e) {
                if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    var changedExpandedState = _this.treeBox.setHighlightedNodeExpanded(e.which == TrivialCore_1.keyCodes.right_arrow);
                    if (changedExpandedState) {
                        return false;
                    }
                    else {
                        return;
                    }
                }
            })
                .on('keyup change', function () {
                if (_this.config.searchBarMode === 'show-if-filled') {
                    if (_this.$editor.val()) {
                        _this.$componentWrapper.removeClass('hide-searchfield');
                    }
                    else {
                        _this.$componentWrapper.addClass('hide-searchfield');
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
            this.treeBox = new TrivialTreeBox_1.TrivialTreeBox(this.$componentWrapper, this.config);
            this.treeBox.onNodeExpansionStateChanged.addListener(function (node) {
                _this.onNodeExpansionStateChanged.fire(node);
            });
            this.treeBox.onSelectedEntryChanged.addListener(function () {
                var selectedTreeBoxEntry = _this.treeBox.getSelectedEntry();
                if (selectedTreeBoxEntry) {
                    _this.setSelectedEntry(selectedTreeBoxEntry);
                }
            });
            this.setSelectedEntry((this.config.selectedEntryId !== undefined && this.config.selectedEntryId !== null) ? this.findEntryById(this.config.selectedEntryId) : null);
        }
        TrivialTree.prototype.updateEntries = function (newEntries) {
            this.entries = newEntries;
            this.$spinners.remove();
            this.$spinners = $();
            this.treeBox.updateEntries(newEntries);
        };
        TrivialTree.prototype.query = function (highlightDirection) {
            var _this = this;
            if (this.config.searchBarMode === 'always-visible' || this.config.searchBarMode === 'show-if-filled') {
                var $spinner = $(this.config.spinnerTemplate).appendTo(this.treeBox.getMainDomElement());
                this.$spinners = this.$spinners.add($spinner);
                setTimeout(function () {
                    _this.config.queryFunction(_this.$editor.val(), function (newEntries) {
                        var processUpdate = function () {
                            _this.updateEntries(newEntries);
                            if (_this.$editor.val().length > 0) {
                                _this.treeBox.highlightTextMatches(_this.$editor.val());
                                if (!_this.config.directSelectionViaArrowKeys) {
                                    _this.treeBox.highlightNextMatchingEntry(highlightDirection);
                                }
                            }
                            _this.treeBox.revealSelectedEntry();
                        };
                        clearTimeout(_this.processUpdateTimer);
                        if (_this.countVisibleEntries(newEntries) < _this.config.performanceOptimizationSettings.toManyVisibleItemsThreshold) {
                            processUpdate();
                        }
                        else {
                            _this.processUpdateTimer = window.setTimeout(processUpdate, _this.config.performanceOptimizationSettings.toManyVisibleItemsRenderDelay);
                        }
                    });
                }, 0);
            }
        };
        TrivialTree.prototype.countVisibleEntries = function (entries) {
            var _this = this;
            var countVisibleChildrenAndSelf = function (node) {
                if (node[_this.config.expandedProperty] && node[_this.config.childrenProperty]) {
                    return node[_this.config.childrenProperty].map(function (entry) {
                        return countVisibleChildrenAndSelf(entry);
                    }).reduce(function (a, b) {
                        return a + b;
                    }, 0) + 1;
                }
                else {
                    return 1;
                }
            };
            return entries.map(function (entry) {
                return countVisibleChildrenAndSelf(entry);
            }).reduce(function (a, b) {
                return a + b;
            }, 0);
        };
        TrivialTree.prototype.findEntries = function (filterFunction) {
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
        TrivialTree.prototype.findEntryById = function (id) {
            var _this = this;
            return this.findEntries(function (entry) {
                return _this.config.valueFunction(entry) === id.toString();
            })[0];
        };
        TrivialTree.prototype.setSelectedEntry = function (entry) {
            this.selectedEntryId = entry ? this.config.valueFunction(entry) : null;
            this.$originalInput.val(entry ? this.config.valueFunction(entry) : null);
            this.fireChangeEvents(entry);
        };
        TrivialTree.prototype.fireChangeEvents = function (entry) {
            this.$originalInput.trigger("change");
            this.$componentWrapper.trigger("change");
            this.onSelectedEntryChanged.fire(entry);
        };
        TrivialTree.prototype.getSelectedEntry = function () {
            this.treeBox.getSelectedEntry();
        };
        ;
        TrivialTree.prototype.updateChildren = function (parentNodeId, children) {
            this.treeBox.updateChildren(parentNodeId, children);
        };
        ;
        TrivialTree.prototype.updateNode = function (node) {
            this.treeBox.updateNode(node);
        };
        ;
        TrivialTree.prototype.removeNode = function (nodeId) {
            this.treeBox.removeNode(nodeId);
        };
        ;
        TrivialTree.prototype.addNode = function (parentNodeId, node) {
            this.treeBox.addNode(parentNodeId, node);
        };
        ;
        TrivialTree.prototype.selectNodeById = function (nodeId) {
            this.treeBox.setSelectedEntryById(nodeId);
        };
        ;
        TrivialTree.prototype.getEditor = function () {
            return this.$editor[0];
        };
        TrivialTree.prototype.destroy = function () {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$componentWrapper);
            this.$componentWrapper.remove();
        };
        ;
        TrivialTree.prototype.getMainDomElement = function () {
            return this.$componentWrapper[0];
        };
        return TrivialTree;
    }());
    exports.TrivialTree = TrivialTree;
});

//# sourceMappingURL=TrivialTree.js.map
