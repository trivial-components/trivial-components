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
        define(["require", "exports", "jquery", "mustache", "./TrivialCore", "./TrivialListBox", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return window.jQuery;    } else if (name === "levenshtein") {      return window.Levenshtein;    } else if (name === "moment") {      return window.moment;    } else if (name === "mustache") {      return window.Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialListBox_1 = require("./TrivialListBox");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialComboBox = (function () {
        function TrivialComboBox(originalInput, options) {
            if (options === void 0) { options = {}; }
            var _this = this;
            this.$spinners = $();
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.onFocus = new TrivialEvent_1.TrivialEvent(this);
            this.onBlur = new TrivialEvent_1.TrivialEvent(this);
            this.isDropDownOpen = false;
            this.isEditorVisible = false;
            this.lastQueryString = null;
            this.lastCompleteInputQueryString = null;
            this.selectedEntry = null;
            this.lastCommittedValue = null;
            this.blurCausedByClickInsideComponent = false;
            this.autoCompleteTimeoutId = -1;
            this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            this.listBoxDirty = true;
            this.usingDefaultQueryFunction = false;
            this.config = $.extend({
                valueFunction: function (entry) { return entry ? "" + entry.id : null; },
                entryRenderingFunction: function (entry) {
                    return Mustache.render(TrivialCore_1.DEFAULT_TEMPLATES.image2LinesTemplate, entry);
                },
                selectedEntryRenderingFunction: function (entry) {
                    return _this.config.entryRenderingFunction(entry);
                },
                selectedEntry: undefined,
                spinnerTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
                textHighlightingEntryLimit: 100,
                entries: null,
                queryFunction: null,
                autoComplete: true,
                autoCompleteDelay: 0,
                entryToEditorTextFunction: function (entry) {
                    return entry["displayValue"];
                },
                autoCompleteFunction: function (editorText, entry) {
                    if (editorText) {
                        for (var propertyName in entry) {
                            if (entry.hasOwnProperty(propertyName)) {
                                var propertyValue = entry[propertyName];
                                if (propertyValue && propertyValue.toString().toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                                    return propertyValue.toString();
                                }
                            }
                        }
                        return null;
                    }
                    else {
                        return entry ? _this.config.entryToEditorTextFunction(entry) : null;
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
                editingMode: 'editable',
                showDropDownOnResultsOnly: false
            }, options);
            if (!this.config.queryFunction) {
                this.config.queryFunction = TrivialCore_1.defaultListQueryFunctionFactory(this.config.entries || [], this.config.matchingOptions);
                this.usingDefaultQueryFunction = true;
            }
            this.entries = this.config.entries;
            this.$originalInput = $(originalInput);
            this.$comboBox = $('<div class="tr-combobox tr-input-wrapper"/>')
                .insertAfter(this.$originalInput);
            this.$selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo(this.$comboBox);
            if (this.config.showClearButton) {
                this.$clearButton = $('<div class="tr-remove-button">').appendTo(this.$comboBox);
                this.$clearButton.mousedown(function (e) {
                    _this.$editor.val("");
                    _this.setSelectedEntry(null, true, true, e);
                });
            }
            if (this.config.showTrigger) {
                this.$trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$comboBox);
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
            this.$editor.prependTo(this.$comboBox).addClass("tr-combobox-editor tr-editor")
                .focus(function () {
                if (_this.blurCausedByClickInsideComponent) {
                }
                else {
                    _this.$originalInput.triggerHandler('focus');
                    _this.onFocus.fire();
                    _this.$comboBox.addClass('focus');
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
                    _this.$comboBox.removeClass('focus');
                    if (_this.editorContainsFreeText()) {
                        if (!TrivialCore_1.objectEquals(_this.getSelectedEntry(), _this.lastCommittedValue)) {
                            _this.setSelectedEntry(_this.getSelectedEntry(), true, true, e);
                        }
                    }
                    else {
                        _this.$editor.val("");
                        _this.setSelectedEntry(_this.lastCommittedValue, false, true, e);
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
                    var highlightedEntry = _this.listBox.getHighlightedEntry();
                    if (_this.isDropDownOpen && highlightedEntry) {
                        _this.setSelectedEntry(highlightedEntry, true, true, e);
                    }
                    else if (!_this.$editor.val()) {
                        _this.setSelectedEntry(null, true, true);
                    }
                    else if (_this.config.allowFreeText) {
                        _this.setSelectedEntry(_this.getSelectedEntry(), true, true, e);
                    }
                    return;
                }
                else if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    _this.showEditor();
                    return;
                }
                setTimeout(function () {
                    var isNonIgnoredKey = !TrivialCore_1.keyCodes.isModifierKey(e) && [TrivialCore_1.keyCodes.enter, TrivialCore_1.keyCodes.escape, TrivialCore_1.keyCodes.tab].indexOf(e.which) === -1;
                    var editorValueDoesNotCorrespondToSelectedValue = _this.isEntrySelected() && _this.$editor.val() !== _this.config.entryToEditorTextFunction(_this.selectedEntry);
                    if (isNonIgnoredKey && (editorValueDoesNotCorrespondToSelectedValue || _this.config.valueFunction(_this.listBox.getHighlightedEntry())) !== _this.config.valueFunction(_this.getSelectedEntry())) {
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
                        _this.listBox.highlightNextEntry(direction);
                        _this.autoCompleteIfPossible();
                    }
                    return false;
                }
                else if (e.which == TrivialCore_1.keyCodes.enter) {
                    if (_this.isEditorVisible || _this.editorContainsFreeText()) {
                        e.preventDefault();
                        var highlightedEntry = _this.listBox.getHighlightedEntry();
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
                        _this.entries = null;
                        _this.setSelectedEntry(_this.lastCommittedValue, false, true, e);
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
                            _this.listBox.setHighlightedEntry(null);
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
            this.$comboBox.add(this.$dropDown).mousedown(function () {
                if (_this.$editor.is(":focus")) {
                    _this.blurCausedByClickInsideComponent = true;
                }
            }).mouseup(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                    _this.blurCausedByClickInsideComponent = false;
                }
            }).mouseout(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                    _this.blurCausedByClickInsideComponent = false;
                }
            });
            var configWithoutEntries = $.extend({}, this.config);
            configWithoutEntries.entries = [];
            this.listBox = new TrivialListBox_1.TrivialListBox(this.$dropDown, configWithoutEntries);
            this.listBox.onSelectedEntryChanged.addListener(function (selectedEntry, eventSource, originalEvent) {
                if (selectedEntry) {
                    _this.setSelectedEntry(selectedEntry, true, !TrivialCore_1.objectEquals(selectedEntry, _this.lastCommittedValue), originalEvent);
                    _this.listBox.setSelectedEntry(null);
                    _this.closeDropDown();
                }
                _this.hideEditor();
            });
            this.setSelectedEntry(this.config.selectedEntry, true, false);
            this.$selectedEntryWrapper.click(function () {
                _this.showEditor();
                _this.$editor.select();
                if (!_this.config.showDropDownOnResultsOnly) {
                    _this.openDropDown();
                }
                _this.query();
            });
        }
        TrivialComboBox.prototype.query = function (highlightDirection) {
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
        TrivialComboBox.prototype.fireChangeEvents = function (entry, originalEvent) {
            this.$originalInput.trigger("change");
            this.onSelectedEntryChanged.fire(entry, originalEvent);
        };
        TrivialComboBox.prototype.setSelectedEntry = function (entry, commit, fireEvent, originalEvent) {
            if (commit === void 0) { commit = true; }
            if (fireEvent === void 0) { fireEvent = false; }
            this.$originalInput.val(this.config.valueFunction(entry));
            this.selectedEntry = entry;
            var $selectedEntry = $(this.config.selectedEntryRenderingFunction(entry))
                .addClass("tr-combobox-entry");
            this.$selectedEntryWrapper.empty().append($selectedEntry);
            if (entry != null) {
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
        TrivialComboBox.prototype.isEntrySelected = function () {
            return this.selectedEntry != null;
        };
        TrivialComboBox.prototype.showEditor = function () {
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
        TrivialComboBox.prototype.editorContainsFreeText = function () {
            return this.config.allowFreeText && this.$editor.val().length > 0 && !this.isEntrySelected();
        };
        ;
        TrivialComboBox.prototype.hideEditor = function () {
            this.$editor.width(0).height(0);
            this.isEditorVisible = false;
        };
        TrivialComboBox.prototype.repositionDropDown = function () {
            var _this = this;
            this.$dropDown
                .show()
                .position({
                my: "left top",
                at: "left bottom",
                of: this.$comboBox,
                collision: "flip",
                using: function (calculatedPosition, info) {
                    if (info.vertical === "top") {
                        _this.$comboBox.removeClass("dropdown-flipped");
                        _this.$dropDown.removeClass("flipped");
                    }
                    else {
                        _this.$comboBox.addClass("dropdown-flipped");
                        _this.$dropDown.addClass("flipped");
                    }
                    _this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            })
                .width(this.$comboBox.width());
        };
        ;
        TrivialComboBox.prototype.openDropDown = function () {
            console.log("openDropDown");
            if (this.isDropDownNeeded()) {
                if (this.listBoxDirty) {
                    this.updateListBoxEntries();
                }
                this.$comboBox.addClass("open");
                this.repositionDropDown();
                this.isDropDownOpen = true;
            }
        };
        TrivialComboBox.prototype.closeDropDown = function () {
            this.$comboBox.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
        };
        TrivialComboBox.prototype.getNonSelectedEditorValue = function () {
            return this.$editor.val().substring(0, this.$editor[0].selectionStart);
        };
        TrivialComboBox.prototype.autoCompleteIfPossible = function (delay) {
            var _this = this;
            if (this.config.autoComplete) {
                clearTimeout(this.autoCompleteTimeoutId);
                var highlightedEntry_1 = this.listBox.getHighlightedEntry();
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
        TrivialComboBox.prototype.updateListBoxEntries = function () {
            this.blurCausedByClickInsideComponent = false;
            this.listBox.updateEntries(this.entries);
            this.listBoxDirty = false;
        };
        TrivialComboBox.prototype.updateEntries = function (newEntries, highlightDirection) {
            this.entries = newEntries;
            this.$spinners.remove();
            this.$spinners = $();
            if (this.isDropDownOpen) {
                this.updateListBoxEntries();
            }
            else {
                this.listBoxDirty = true;
            }
            var nonSelectedEditorValue = this.getNonSelectedEditorValue();
            this.listBox.highlightTextMatches(newEntries.length <= this.config.textHighlightingEntryLimit ? nonSelectedEditorValue : null);
            if (highlightDirection == null) {
                if (this.selectedEntry) {
                    this.listBox.setHighlightedEntry(null);
                }
                else {
                    this.listBox.highlightNextEntry(1);
                }
            }
            else if (highlightDirection === 0) {
                this.listBox.setHighlightedEntry(null);
            }
            else {
                this.listBox.highlightNextEntry(highlightDirection);
            }
            this.autoCompleteIfPossible(this.config.autoCompleteDelay);
            if (this.isDropDownOpen) {
                this.openDropDown();
            }
        };
        TrivialComboBox.prototype.isDropDownNeeded = function () {
            return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
        };
        TrivialComboBox.prototype.setEditingMode = function (newEditingMode) {
            this.editingMode = newEditingMode;
            this.$comboBox.removeClass("editable readonly disabled").addClass(this.editingMode);
            if (this.isDropDownNeeded()) {
                this.$dropDown.appendTo(this.$dropDownTargetElement);
            }
        };
        TrivialComboBox.prototype.getSelectedEntry = function () {
            if (this.selectedEntry == null && (!this.config.allowFreeText || !this.$editor.val())) {
                return null;
            }
            else if (this.selectedEntry == null && this.config.allowFreeText) {
                return this.config.freeTextEntryFactory(this.$editor.val());
            }
            else {
                var selectedEntryToReturn = $.extend({}, this.selectedEntry);
                delete selectedEntryToReturn._trEntryElement;
                return selectedEntryToReturn;
            }
        };
        ;
        TrivialComboBox.prototype.focus = function () {
            this.showEditor();
            this.$editor.select();
        };
        ;
        TrivialComboBox.prototype.getEditor = function () {
            return this.$editor[0];
        };
        TrivialComboBox.prototype.getDropDown = function () {
            return this.$dropDown;
        };
        ;
        TrivialComboBox.prototype.destroy = function () {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$comboBox);
            this.$comboBox.remove();
            this.$dropDown.remove();
        };
        ;
        TrivialComboBox.prototype.getMainDomElement = function () {
            return this.$comboBox[0];
        };
        return TrivialComboBox;
    }());
    exports.TrivialComboBox = TrivialComboBox;
});

//# sourceMappingURL=TrivialComboBox.js.map
