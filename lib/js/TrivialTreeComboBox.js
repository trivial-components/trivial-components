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
        define(["require", "exports", "jquery", "mustache", "./TrivialCore", "./TrivialTreeBox", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialTreeBox_1 = require("./TrivialTreeBox");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialTreeComboBox = (function () {
        function TrivialTreeComboBox(originalInput, options) {
            if (options === void 0) { options = {}; }
            var _this = this;
            this.isDropDownOpen = false;
            this.isEditorVisible = false;
            this.lastQueryString = null;
            this.lastCompleteInputQueryString = null;
            this.selectedEntry = null;
            this.lastCommittedValue = null;
            this.blurCausedByClickInsideComponent = false;
            this.autoCompleteTimeoutId = -1;
            this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            this.usingDefaultQueryFunction = false;
            this.$spinners = $();
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.onFocus = new TrivialEvent_1.TrivialEvent(this);
            this.onBlur = new TrivialEvent_1.TrivialEvent(this);
            this.config = $.extend({
                valueFunction: function (entry) { return entry ? entry.id : null; },
                entryRenderingFunction: function (entry, depth) {
                    var defaultTemplates = [TrivialCore_1.DEFAULT_TEMPLATES.icon2LinesTemplate, TrivialCore_1.DEFAULT_TEMPLATES.iconSingleLineTemplate];
                    var template = entry.template || defaultTemplates[Math.min(depth, defaultTemplates.length - 1)];
                    return Mustache.render(template, entry);
                },
                selectedEntryRenderingFunction: function (entry) {
                    if (entry.selectedEntryTemplate) {
                        return Mustache.render(entry.selectedEntryTemplate, entry);
                    }
                    else {
                        return _this.config.entryRenderingFunction(entry, 0);
                    }
                },
                selectedEntry: null,
                spinnerTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
                textHighlightingEntryLimit: 100,
                entries: null,
                emptyEntry: {
                    _isEmptyEntry: true
                },
                queryFunction: null,
                autoComplete: true,
                autoCompleteDelay: 0,
                entryToEditorTextFunction: function (entry) {
                    return entry["displayValue"];
                },
                autoCompleteFunction: function (editorText, entry) {
                    if (editorText) {
                        for (var propertyName in entry) {
                            var propertyValue = entry[propertyName];
                            if (propertyValue && propertyValue.toString().toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                                return propertyValue.toString();
                            }
                        }
                        return null;
                    }
                    else {
                        return _this.config.entryToEditorTextFunction(entry);
                    }
                },
                allowFreeText: false,
                freeTextEntryFactory: function (freeText) {
                    return {
                        displayValue: freeText,
                        _isFreeTextEntry: true
                    };
                },
                showClearButton: false,
                showTrigger: true,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                childrenProperty: "children",
                lazyChildrenFlagProperty: "hasLazyChildren",
                expandedProperty: 'expanded',
                editingMode: "editable",
                showDropDownOnResultsOnly: false
            }, options);
            if (!this.config.queryFunction) {
                this.config.queryFunction = TrivialCore_1.defaultTreeQueryFunctionFactory(this.config.entries || [], TrivialCore_1.defaultEntryMatchingFunctionFactory(["displayValue", "additionalInfo"], this.config.matchingOptions), this.config.childrenProperty, this.config.expandedProperty);
                this.usingDefaultQueryFunction = true;
            }
            this.$originalInput = $(originalInput);
            this.$treeComboBox = $('<div class="tr-treecombobox tr-combobox tr-input-wrapper"/>')
                .insertAfter(this.$originalInput);
            this.$selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo(this.$treeComboBox);
            if (this.config.showClearButton) {
                this.$clearButton = $('<div class="tr-remove-button">').appendTo(this.$treeComboBox);
                this.$clearButton.mousedown(function (e) {
                    _this.$editor.val("");
                    _this.setSelectedEntry(null, true, true, e);
                });
            }
            if (this.config.showTrigger) {
                this.$trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$treeComboBox);
                this.$trigger.mousedown(function () {
                    if (_this.isDropDownOpen) {
                        _this.showEditor();
                        _this.closeDropDown();
                    }
                    else {
                        setTimeout(function () {
                            _this.showEditor();
                            _this.$editor.select();
                            _this.openDropDown();
                            _this.query();
                        });
                    }
                });
            }
            this.$dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(function () {
                return false;
            });
            this.$dropDownTargetElement = $("body");
            this.setEditingMode(this.config.editingMode);
            this.$originalInput.addClass("tr-original-input");
            this.$editor = $('<input type="text" autocomplete="off"/>');
            this.$editor.prependTo(this.$treeComboBox).addClass("tr-combobox-editor tr-editor")
                .focus(function () {
                if (_this.blurCausedByClickInsideComponent) {
                }
                else {
                    _this.$originalInput.triggerHandler('focus');
                    _this.onFocus.fire();
                    _this.$treeComboBox.addClass('focus');
                    _this.showEditor();
                }
            })
                .blur(function (e) {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                }
                else {
                    _this.$originalInput.triggerHandler('blur');
                    _this.onBlur.fire();
                    _this.$treeComboBox.removeClass('focus');
                    if (_this.editorContainsFreeText()) {
                        if (!TrivialCore_1.objectEquals(_this.getSelectedEntry(), _this.lastCommittedValue)) {
                            _this.setSelectedEntry(_this.getSelectedEntry(), true, true, e);
                        }
                    }
                    else {
                        _this.$editor.val("");
                        _this.setSelectedEntry(_this.lastCommittedValue, false, false, e);
                    }
                    _this.hideEditor();
                    _this.closeDropDown();
                }
            })
                .keydown(function (e) {
                if (TrivialCore_1.keyCodes.isModifierKey(e)) {
                    return;
                }
                else if (e.which == TrivialCore_1.keyCodes.tab) {
                    var highlightedEntry = _this.treeBox.getHighlightedEntry();
                    if (_this.isDropDownOpen && highlightedEntry) {
                        _this.setSelectedEntry(highlightedEntry, true, true, e);
                    }
                    else if (!_this.$editor.val()) {
                        _this.setSelectedEntry(null, true, true, e);
                    }
                    else if (_this.config.allowFreeText) {
                        _this.setSelectedEntry(_this.getSelectedEntry(), true, true, e);
                    }
                    return;
                }
                else if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    if (_this.isDropDownOpen) {
                        var changedExpandedState = _this.treeBox.setHighlightedNodeExpanded(e.which == TrivialCore_1.keyCodes.right_arrow);
                        if (changedExpandedState) {
                            return false;
                        }
                    }
                    _this.showEditor();
                    return;
                }
                setTimeout(function () {
                    var isNonIgnoredKey = !TrivialCore_1.keyCodes.isModifierKey(e) && [TrivialCore_1.keyCodes.enter, TrivialCore_1.keyCodes.escape, TrivialCore_1.keyCodes.tab].indexOf(e.which) === -1;
                    var editorValueDoesNotCorrespondToSelectedValue = _this.isEntrySelected() && _this.$editor.val() !== _this.config.entryToEditorTextFunction(_this.selectedEntry);
                    if (isNonIgnoredKey && (editorValueDoesNotCorrespondToSelectedValue || _this.config.valueFunction(_this.treeBox.getHighlightedEntry())) !== _this.config.valueFunction(_this.getSelectedEntry())) {
                        _this.setSelectedEntry(null, false, false, e);
                    }
                });
                if (e.which == TrivialCore_1.keyCodes.backspace || e.which == TrivialCore_1.keyCodes.delete) {
                    _this.doNoAutoCompleteBecauseBackspaceWasPressed = true;
                }
                if (e.which == TrivialCore_1.keyCodes.up_arrow || e.which == TrivialCore_1.keyCodes.down_arrow) {
                    if (!_this.isEditorVisible) {
                        _this.$editor.select();
                        _this.showEditor();
                    }
                    var direction = e.which == TrivialCore_1.keyCodes.up_arrow ? -1 : 1;
                    if (!_this.isDropDownOpen) {
                        _this.query(direction);
                        if (!_this.config.showDropDownOnResultsOnly) {
                            _this.openDropDown();
                        }
                    }
                    else {
                        _this.treeBox.highlightNextEntry(direction);
                        _this.autoCompleteIfPossible();
                    }
                    return false;
                }
                else if (e.which == TrivialCore_1.keyCodes.enter) {
                    if (_this.isEditorVisible || _this.editorContainsFreeText()) {
                        e.preventDefault();
                        var highlightedEntry = _this.treeBox.getHighlightedEntry();
                        if (_this.isDropDownOpen && highlightedEntry) {
                            _this.setSelectedEntry(highlightedEntry, true, true, e);
                        }
                        else if (!_this.$editor.val()) {
                            _this.setSelectedEntry(null, true, true, e);
                        }
                        else if (_this.config.allowFreeText) {
                            _this.setSelectedEntry(_this.getSelectedEntry(), true, true, e);
                        }
                        _this.closeDropDown();
                        _this.hideEditor();
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.escape) {
                    e.preventDefault();
                    if (!(_this.editorContainsFreeText() && _this.isDropDownOpen)) {
                        _this.hideEditor();
                        _this.$editor.val("");
                        _this.setSelectedEntry(_this.lastCommittedValue, false, false, e);
                    }
                    _this.closeDropDown();
                }
                else {
                    if (!_this.isEditorVisible) {
                        _this.showEditor();
                        _this.$editor.select();
                    }
                    if (!_this.config.showDropDownOnResultsOnly) {
                        _this.openDropDown();
                    }
                    setTimeout(function () {
                        if (_this.$editor.val()) {
                            _this.query(1);
                        }
                        else {
                            _this.query(0);
                            _this.treeBox.setHighlightedEntry(null);
                        }
                    });
                }
            })
                .mousedown(function () {
                if (!_this.config.showDropDownOnResultsOnly) {
                    _this.openDropDown();
                }
                _this.query();
            });
            if (this.$originalInput.attr("tabindex")) {
                this.$editor.attr("tabindex", this.$originalInput.attr("tabindex"));
            }
            if (this.$originalInput.attr("autofocus")) {
                this.$editor.focus();
            }
            this.$treeComboBox.add(this.$dropDown)
                .mousedown(function () {
                if (_this.$editor.is(":focus")) {
                    _this.blurCausedByClickInsideComponent = true;
                }
            })
                .mouseup(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                    _this.blurCausedByClickInsideComponent = false;
                }
            })
                .mouseout(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                    _this.blurCausedByClickInsideComponent = false;
                }
            });
            this.treeBox = new TrivialTreeBox_1.TrivialTreeBox(this.$dropDown, this.config);
            this.treeBox.onSelectedEntryChanged.addListener(function (selectedEntry, eventSource, originalEvent) {
                if (selectedEntry) {
                    _this.setSelectedEntry(selectedEntry, true, !TrivialCore_1.objectEquals(selectedEntry, _this.lastCommittedValue), originalEvent);
                    _this.treeBox.setSelectedEntry(null);
                    _this.closeDropDown();
                }
                _this.hideEditor();
            });
            this.setSelectedEntry(this.config.selectedEntry, true, false, null);
            this.$selectedEntryWrapper.click(function () {
                _this.showEditor();
                _this.$editor.select();
                if (!_this.config.showDropDownOnResultsOnly) {
                    _this.openDropDown();
                }
                _this.query();
            });
        }
        TrivialTreeComboBox.prototype.query = function (highlightDirection) {
            var _this = this;
            var queryString = this.getNonSelectedEditorValue();
            var completeInputString = this.$editor.val();
            if (this.lastQueryString !== queryString || this.lastCompleteInputQueryString !== completeInputString) {
                if (this.$spinners.length === 0) {
                    var $spinner = $(this.config.spinnerTemplate).appendTo(this.$dropDown);
                    this.$spinners = this.$spinners.add($spinner);
                }
                this.config.queryFunction(queryString, function (newEntries) {
                    _this.updateEntries(newEntries, highlightDirection);
                    if (_this.config.showDropDownOnResultsOnly && newEntries && newEntries.length > 0 && _this.$editor.is(":focus")) {
                        _this.openDropDown();
                    }
                });
                this.lastQueryString = queryString;
                this.lastCompleteInputQueryString = completeInputString;
            }
            else {
                this.openDropDown();
            }
        };
        TrivialTreeComboBox.prototype.fireChangeEvents = function (entry, originalEvent) {
            this.$originalInput.trigger("change");
            this.onSelectedEntryChanged.fire(entry, originalEvent);
        };
        TrivialTreeComboBox.prototype.setSelectedEntry = function (entry, commit, fireEvent, originalEvent) {
            if (entry == null) {
                this.$originalInput.val(this.config.valueFunction(null));
                this.selectedEntry = null;
                var $selectedEntry = $(this.config.selectedEntryRenderingFunction(this.config.emptyEntry))
                    .addClass("tr-combobox-entry")
                    .addClass("empty");
                this.$selectedEntryWrapper.empty().append($selectedEntry);
            }
            else {
                this.$originalInput.val(this.config.valueFunction(entry));
                this.selectedEntry = entry;
                var $selectedEntry = $(this.config.selectedEntryRenderingFunction(entry))
                    .addClass("tr-combobox-entry");
                this.$selectedEntryWrapper.empty().append($selectedEntry);
                this.$editor.val(this.config.entryToEditorTextFunction(entry));
            }
            if (commit) {
                this.lastCommittedValue = entry;
                if (fireEvent) {
                    this.fireChangeEvents(entry, originalEvent);
                }
            }
            if (this.$clearButton) {
                this.$clearButton.toggle(entry != null);
            }
            if (this.isEditorVisible) {
                this.showEditor();
            }
            if (this.isDropDownOpen) {
                this.repositionDropDown();
            }
        };
        TrivialTreeComboBox.prototype.isEntrySelected = function () {
            return this.selectedEntry != null && this.selectedEntry !== this.config.emptyEntry;
        };
        TrivialTreeComboBox.prototype.showEditor = function () {
            var $editorArea = this.$selectedEntryWrapper.find(".tr-editor-area");
            if ($editorArea.length === 0) {
                $editorArea = this.$selectedEntryWrapper;
            }
            this.$editor
                .css({
                "width": Math.min($editorArea[0].offsetWidth, this.$trigger ? this.$trigger[0].offsetLeft - $editorArea[0].offsetLeft : 99999999) + "px",
                "height": ($editorArea[0].offsetHeight) + "px"
            })
                .position({
                my: "left top",
                at: "left top",
                of: $editorArea
            });
            this.isEditorVisible = true;
        };
        TrivialTreeComboBox.prototype.editorContainsFreeText = function () {
            return this.config.allowFreeText && this.$editor.val().length > 0 && !this.isEntrySelected();
        };
        ;
        TrivialTreeComboBox.prototype.hideEditor = function () {
            this.$editor.width(0).height(0);
            this.isEditorVisible = false;
        };
        TrivialTreeComboBox.prototype.repositionDropDown = function () {
            var _this = this;
            this.$dropDown
                .show()
                .position({
                my: "left top",
                at: "left bottom",
                of: this.$treeComboBox,
                collision: "flip",
                using: function (calculatedPosition, info) {
                    if (info.vertical === "top") {
                        _this.$treeComboBox.removeClass("dropdown-flipped");
                        _this.$dropDown.removeClass("flipped");
                    }
                    else {
                        _this.$treeComboBox.addClass("dropdown-flipped");
                        _this.$dropDown.addClass("flipped");
                    }
                    _this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            })
                .width(this.$treeComboBox.width());
        };
        ;
        TrivialTreeComboBox.prototype.openDropDown = function () {
            if (this.isDropDownNeeded()) {
                this.$treeComboBox.addClass("open");
                this.repositionDropDown();
                this.isDropDownOpen = true;
            }
        };
        TrivialTreeComboBox.prototype.closeDropDown = function () {
            this.$treeComboBox.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
        };
        TrivialTreeComboBox.prototype.getNonSelectedEditorValue = function () {
            return this.$editor.val().substring(0, this.$editor[0].selectionStart);
        };
        TrivialTreeComboBox.prototype.autoCompleteIfPossible = function (delay) {
            var _this = this;
            if (this.config.autoComplete) {
                clearTimeout(this.autoCompleteTimeoutId);
                var highlightedEntry_1 = this.treeBox.getHighlightedEntry();
                if (highlightedEntry_1 && !this.doNoAutoCompleteBecauseBackspaceWasPressed) {
                    this.autoCompleteTimeoutId = TrivialCore_1.setTimeoutOrDoImmediately(function () {
                        var currentEditorValue = _this.getNonSelectedEditorValue();
                        var autoCompleteString = _this.config.autoCompleteFunction(currentEditorValue, highlightedEntry_1) || currentEditorValue;
                        _this.$editor.val(currentEditorValue + autoCompleteString.substr(currentEditorValue.length));
                        if (_this.$editor.is(":focus")) {
                            _this.$editor[0].setSelectionRange(currentEditorValue.length, autoCompleteString.length);
                        }
                    }, delay);
                }
                this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            }
        };
        TrivialTreeComboBox.prototype.updateEntries = function (newEntries, highlightDirection) {
            this.$spinners.remove();
            this.$spinners = $();
            this.treeBox.updateEntries(newEntries);
            var nonSelectedEditorValue = this.getNonSelectedEditorValue();
            this.treeBox.highlightTextMatches(newEntries.length <= this.config.textHighlightingEntryLimit ? nonSelectedEditorValue : null);
            if (highlightDirection == null) {
                if (this.selectedEntry) {
                    this.treeBox.setHighlightedEntry(null);
                }
                else {
                    if (nonSelectedEditorValue.length > 0) {
                        this.treeBox.highlightNextMatchingEntry(1);
                    }
                    else {
                        this.treeBox.highlightNextEntry(1);
                    }
                }
            }
            else if (highlightDirection === 0) {
                this.treeBox.setHighlightedEntry(null);
            }
            else {
                if (nonSelectedEditorValue.length > 0) {
                    this.treeBox.highlightNextMatchingEntry(1);
                }
                else {
                    this.treeBox.highlightNextEntry(1);
                }
            }
            this.autoCompleteIfPossible(this.config.autoCompleteDelay);
            if (this.isDropDownOpen) {
                this.openDropDown();
            }
        };
        TrivialTreeComboBox.prototype.isDropDownNeeded = function () {
            return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
        };
        TrivialTreeComboBox.prototype.setEditingMode = function (newEditingMode) {
            this.editingMode = newEditingMode;
            this.$treeComboBox.removeClass("editable readonly disabled").addClass(this.editingMode);
            if (this.isDropDownNeeded()) {
                this.$dropDown.appendTo(this.$dropDownTargetElement);
            }
        };
        TrivialTreeComboBox.prototype.getSelectedEntry = function () {
            if (this.selectedEntry == null && (!this.config.allowFreeText || !this.$editor.val())) {
                return null;
            }
            else if (this.selectedEntry == null && this.config.allowFreeText) {
                return this.config.freeTextEntryFactory(this.$editor.val());
            }
            else {
                var selectedEntryToReturn = $.extend({}, this.selectedEntry);
                selectedEntryToReturn._trEntryElement = undefined;
                return selectedEntryToReturn;
            }
        };
        TrivialTreeComboBox.prototype.updateChildren = function (parentNodeId, children) {
            this.treeBox.updateChildren(parentNodeId, children);
        };
        TrivialTreeComboBox.prototype.updateNode = function (node) {
            this.treeBox.updateNode(node);
        };
        TrivialTreeComboBox.prototype.removeNode = function (nodeId) {
            this.treeBox.removeNode(nodeId);
        };
        TrivialTreeComboBox.prototype.focus = function () {
            this.showEditor();
            this.$editor.select();
        };
        ;
        TrivialTreeComboBox.prototype.getEditor = function () {
            return this.$editor[0];
        };
        TrivialTreeComboBox.prototype.getDropDown = function () {
            return this.$dropDown;
        };
        ;
        TrivialTreeComboBox.prototype.destroy = function () {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$treeComboBox);
            this.$treeComboBox.remove();
            this.$dropDown.remove();
        };
        ;
        TrivialTreeComboBox.prototype.getMainDomElement = function () {
            return this.$treeComboBox[0];
        };
        return TrivialTreeComboBox;
    }());
    exports.TrivialTreeComboBox = TrivialTreeComboBox;
});

//# sourceMappingURL=TrivialTreeComboBox.js.map
