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
        define(["require", "exports", "jquery", "mustache", "./TrivialListBox", "./TrivialCore", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return window.jQuery;    } else if (name === "levenshtein") {      return window.Levenshtein;    } else if (name === "moment") {      return window.moment;    } else if (name === "mustache") {      return window.Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialListBox_1 = require("./TrivialListBox");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialTagComboBox = (function () {
        function TrivialTagComboBox(originalInput, options) {
            if (options === void 0) { options = {}; }
            var _this = this;
            this.$spinners = $();
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.onFocus = new TrivialEvent_1.TrivialEvent(this);
            this.onBlur = new TrivialEvent_1.TrivialEvent(this);
            this.isDropDownOpen = false;
            this.lastQueryString = null;
            this.lastCompleteInputQueryString = null;
            this.selectedEntries = [];
            this.blurCausedByClickInsideComponent = false;
            this.autoCompleteTimeoutId = -1;
            this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            this.listBoxDirty = true;
            this.repositionDropDownScheduler = null;
            this.config = $.extend({
                valueFunction: function (entries) { return entries.map(function (e) { return e._isFreeTextEntry ? e.displayValue : e.id; }).join(','); },
                entryRenderingFunction: function (entry) {
                    return Mustache.render(TrivialCore_1.DEFAULT_TEMPLATES.image2LinesTemplate, entry);
                },
                selectedEntryRenderingFunction: function (entry) {
                    return TrivialCore_1.wrapWithDefaultTagWrapper(_this.config.entryRenderingFunction(entry));
                },
                spinnerTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
                textHighlightingEntryLimit: 100,
                entries: null,
                selectedEntries: [],
                maxSelectedEntries: null,
                queryFunction: null,
                autoComplete: true,
                autoCompleteDelay: 0,
                autoCompleteFunction: function (editorText, entry) {
                    if (editorText) {
                        for (var propertyName in entry) {
                            if (entry.hasOwnProperty(propertyName)) {
                                var propertyValue = entry[propertyName];
                                if (propertyValue && ("" + propertyValue).toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                                    return "" + propertyValue;
                                }
                            }
                        }
                        return null;
                    }
                    else {
                        return null;
                    }
                },
                allowFreeText: false,
                freeTextSeparators: [',', ';'],
                freeTextEntryFactory: function (freeText) {
                    return {
                        displayValue: freeText,
                        _isFreeTextEntry: true
                    };
                },
                tagCompleteDecider: function (mergedEntry) {
                    return true;
                },
                entryMerger: function (partialEntry, newEntry) {
                    return newEntry;
                },
                removePartialTagOnBlur: true,
                showTrigger: true,
                distinct: true,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                editingMode: "editable",
                showDropDownOnResultsOnly: false,
                selectionAcceptor: function (e) { return true; }
            }, options);
            if (!this.config.queryFunction) {
                this.config.queryFunction = TrivialCore_1.defaultListQueryFunctionFactory(this.config.entries || [], this.config.matchingOptions);
                this.usingDefaultQueryFunction = true;
            }
            this.entries = this.config.entries;
            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$tagComboBox = $('<div class="tr-tagbox tr-input-wrapper"/>')
                .insertAfter(this.$originalInput);
            this.$originalInput.appendTo(this.$tagComboBox);
            this.$tagArea = $('<div class="tr-tagbox-tagarea"/>').appendTo(this.$tagComboBox);
            if (this.config.showTrigger) {
                this.$trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$tagComboBox);
                this.$trigger.mousedown(function () {
                    _this.focusEditor();
                    if (_this.isDropDownOpen) {
                        _this.closeDropDown();
                    }
                    else {
                        _this.$editor.select();
                        _this.openDropDown();
                        _this.query();
                    }
                });
            }
            this.$dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(function () {
                return false;
            });
            this.$dropDownTargetElement = $("body");
            this.setEditingMode(this.config.editingMode);
            this.$editor = $('<span contenteditable="true" class="tagbox-editor" autocomplete="off"></span>');
            this.$editor.appendTo(this.$tagArea).addClass("tr-tagbox-editor tr-editor")
                .focus(function () {
                if (_this.blurCausedByClickInsideComponent) {
                }
                else {
                    _this.$originalInput.triggerHandler('focus');
                    _this.onFocus.fire();
                    _this.$tagComboBox.addClass('focus');
                }
                setTimeout(function () {
                    TrivialCore_1.minimallyScrollTo(_this.$tagArea, _this.$editor);
                });
            })
                .blur(function (e) {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                }
                else {
                    _this.$originalInput.triggerHandler('blur');
                    _this.onBlur.fire();
                    _this.$tagComboBox.removeClass('focus');
                    _this.entries = null;
                    _this.closeDropDown();
                    if (_this.config.allowFreeText && _this.$editor.text().trim().length > 0) {
                        _this.setSelectedEntry(_this.config.freeTextEntryFactory(_this.$editor.text()), true, e);
                    }
                    if (_this.config.removePartialTagOnBlur && _this.currentPartialTag != null) {
                        _this.cancelPartialTag();
                    }
                    _this.$editor.text("");
                }
            })
                .keydown(function (e) {
                if (TrivialCore_1.keyCodes.isModifierKey(e)) {
                    return;
                }
                else if (e.which == TrivialCore_1.keyCodes.tab || e.which == TrivialCore_1.keyCodes.enter) {
                    var highlightedEntry = _this.listBox.getHighlightedEntry();
                    if (_this.isDropDownOpen && highlightedEntry != null) {
                        _this.setSelectedEntry(highlightedEntry, true, e);
                        e.preventDefault();
                    }
                    else if (_this.config.allowFreeText && _this.$editor.text().trim().length > 0) {
                        _this.setSelectedEntry(_this.config.freeTextEntryFactory(_this.$editor.text()), true, e);
                        e.preventDefault();
                    }
                    else if (_this.currentPartialTag) {
                        if (e.shiftKey) {
                            _this.doIgnoringBlurEvents(function () { return _this.$editor.insertAfter(_this.currentPartialTag._trEntryElement); });
                        }
                        else {
                            _this.doIgnoringBlurEvents(function () { return _this.$editor.insertBefore(_this.currentPartialTag._trEntryElement); });
                        }
                        _this.currentPartialTag._trEntryElement.remove();
                        _this.currentPartialTag = null;
                    }
                    _this.closeDropDown();
                    console.log("closing dropdown!");
                    if (e.which == TrivialCore_1.keyCodes.enter) {
                        e.preventDefault();
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    if (e.which == TrivialCore_1.keyCodes.left_arrow && _this.$editor.text().length === 0 && window.getSelection().anchorOffset === 0) {
                        if (_this.$editor.prev()) {
                            _this.doIgnoringBlurEvents(function () { return _this.$editor.insertBefore(_this.$editor.prev()); });
                            _this.focusEditor();
                        }
                    }
                    else if (e.which == TrivialCore_1.keyCodes.right_arrow && _this.$editor.text().length === 0 && window.getSelection().anchorOffset === 0) {
                        if (_this.$editor.next()) {
                            _this.doIgnoringBlurEvents(function () { return _this.$editor.insertAfter(_this.$editor.next()); });
                            _this.focusEditor();
                        }
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.backspace || e.which == TrivialCore_1.keyCodes.delete) {
                    if (_this.$editor.text() == "") {
                        if (_this.currentPartialTag != null) {
                            _this.cancelPartialTag();
                            _this.focusEditor();
                        }
                        else {
                            var tagToBeRemoved = _this.selectedEntries[_this.$editor.index() + (e.which == TrivialCore_1.keyCodes.backspace ? -1 : 0)];
                            if (tagToBeRemoved) {
                                _this.removeTag(tagToBeRemoved, e);
                                _this.closeDropDown();
                            }
                        }
                    }
                    else {
                        _this.doNoAutoCompleteBecauseBackspaceWasPressed = true;
                        setTimeout(function () { return _this.query(1); });
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.up_arrow || e.which == TrivialCore_1.keyCodes.down_arrow) {
                    _this.openDropDown();
                    var direction_1 = e.which == TrivialCore_1.keyCodes.up_arrow ? -1 : 1;
                    if (!_this.isDropDownOpen) {
                        setTimeout(function () { return _this.query(direction_1); });
                        if (!_this.config.showDropDownOnResultsOnly) {
                            _this.openDropDown();
                        }
                    }
                    else {
                        _this.listBox.highlightNextEntry(direction_1);
                        _this.autoCompleteIfPossible(_this.config.autoCompleteDelay);
                    }
                    return false;
                }
                else if (e.which == TrivialCore_1.keyCodes.escape) {
                    _this.closeDropDown();
                    if (_this.$editor.text().length > 0) {
                        _this.$editor.text("");
                    }
                    else if (_this.currentPartialTag != null) {
                        _this.cancelPartialTag();
                        _this.focusEditor();
                    }
                }
                else {
                    if (!_this.config.showDropDownOnResultsOnly) {
                        _this.openDropDown();
                    }
                    setTimeout(function () { return _this.query(1); });
                }
            })
                .keyup(function (e) {
                function splitStringBySeparatorChars(s, separatorChars) {
                    return s.split(new RegExp("[" + TrivialCore_1.escapeSpecialRegexCharacter(separatorChars.join()) + "]"));
                }
                if (_this.$editor.find('*').length > 0) {
                    _this.$editor.text(_this.$editor.text());
                }
                if (_this.config.allowFreeText) {
                    var editorValueBeforeCursor = _this.getNonSelectedEditorValue();
                    if (editorValueBeforeCursor.length > 0) {
                        var tagValuesEnteredByUser = splitStringBySeparatorChars(editorValueBeforeCursor, _this.config.freeTextSeparators);
                        for (var i = 0; i < tagValuesEnteredByUser.length - 1; i++) {
                            var value = tagValuesEnteredByUser[i].trim();
                            if (value.length > 0) {
                                _this.setSelectedEntry(_this.config.freeTextEntryFactory(value), true, e);
                            }
                            _this.$editor.text(tagValuesEnteredByUser[tagValuesEnteredByUser.length - 1]);
                            TrivialCore_1.selectElementContents(_this.$editor[0], _this.$editor.text().length, _this.$editor.text().length);
                            _this.entries = null;
                            _this.closeDropDown();
                        }
                    }
                }
            })
                .mousedown(function () {
                if (!_this.config.showDropDownOnResultsOnly) {
                    _this.openDropDown();
                }
                _this.query();
            });
            if (this.$originalInput.attr("placeholder")) {
                this.$editor.attr("placeholder", this.$originalInput.attr("placeholder"));
            }
            if (this.$originalInput.attr("tabindex")) {
                this.$editor.attr("tabindex", this.$originalInput.attr("tabindex"));
            }
            if (this.$originalInput.attr("autofocus")) {
                this.$editor.focus();
            }
            this.$tagComboBox.add(this.$dropDown).mousedown(function () {
                if (_this.$editor.is(":focus")) {
                    _this.blurCausedByClickInsideComponent = true;
                }
            }).mouseup(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.focusEditor();
                    setTimeout(function () { return _this.blurCausedByClickInsideComponent = false; });
                }
            }).mouseout(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.focusEditor();
                    setTimeout(function () { return _this.blurCausedByClickInsideComponent = false; });
                }
            });
            var configWithoutEntries = $.extend({}, this.config);
            configWithoutEntries.entries = [];
            this.listBox = new TrivialListBox_1.TrivialListBox(this.$dropDown, configWithoutEntries);
            this.listBox.onSelectedEntryChanged.addListener(function (selectedEntry, eventSource, originalEvent) {
                if (selectedEntry) {
                    _this.setSelectedEntry(selectedEntry, true, originalEvent);
                    _this.listBox.setSelectedEntry(null);
                    _this.closeDropDown();
                }
            });
            this.$tagArea.mousedown(function (e) {
                if (_this.currentPartialTag == null) {
                    var $nearestTag_1 = _this.findNearestTag(e);
                    if ($nearestTag_1) {
                        var tagBoundingRect = $nearestTag_1[0].getBoundingClientRect();
                        var isRightSide = e.clientX > (tagBoundingRect.left + tagBoundingRect.right) / 2;
                        if (isRightSide) {
                            _this.doIgnoringBlurEvents(function () { return _this.$editor.insertAfter($nearestTag_1); });
                        }
                        else {
                            _this.doIgnoringBlurEvents(function () { return _this.$editor.insertBefore($nearestTag_1); });
                        }
                    }
                }
                _this.$editor.focus();
            }).click(function (e) {
                if (!_this.config.showDropDownOnResultsOnly) {
                    _this.openDropDown();
                }
                _this.query();
            });
            this.setSelectedEntries(this.config.selectedEntries);
            this.$tagComboBox.data("trivialTagComboBox", this);
        }
        TrivialTagComboBox.prototype.cancelPartialTag = function () {
            var _this = this;
            this.doIgnoringBlurEvents(function () { return _this.$editor.insertBefore(_this.currentPartialTag._trEntryElement); });
            this.currentPartialTag._trEntryElement.remove();
            this.currentPartialTag = null;
        };
        TrivialTagComboBox.prototype.findNearestTag = function (mouseEvent) {
            var $nearestTag = null;
            var smallestDistanceX = 1000000;
            for (var i = 0; i < this.selectedEntries.length; i++) {
                var selectedEntry = this.selectedEntries[i];
                var $tag = selectedEntry._trEntryElement;
                var tagBoundingRect = $tag[0].getBoundingClientRect();
                var sameRow = mouseEvent.clientY >= tagBoundingRect.top && mouseEvent.clientY < tagBoundingRect.bottom;
                var sameCol = mouseEvent.clientX >= tagBoundingRect.left && mouseEvent.clientX < tagBoundingRect.right;
                var distanceX = sameCol ? 0 : Math.min(Math.abs(mouseEvent.clientX - tagBoundingRect.left), Math.abs(mouseEvent.clientX - tagBoundingRect.right));
                if (sameRow && distanceX < smallestDistanceX) {
                    $nearestTag = $tag;
                    smallestDistanceX = distanceX;
                    if (distanceX === 0) {
                        break;
                    }
                }
            }
            return $nearestTag;
        };
        TrivialTagComboBox.prototype.updateListBoxEntries = function () {
            this.blurCausedByClickInsideComponent = false;
            this.listBox.updateEntries(this.entries);
            this.listBoxDirty = false;
        };
        TrivialTagComboBox.prototype.updateEntries = function (newEntries, highlightDirection) {
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
            if (highlightDirection) {
                this.listBox.highlightNextEntry(highlightDirection);
            }
            else {
                this.listBox.setHighlightedEntry(null);
            }
            this.autoCompleteIfPossible(this.config.autoCompleteDelay);
            if (this.isDropDownOpen) {
                this.openDropDown();
            }
        };
        TrivialTagComboBox.prototype.removeTag = function (tagToBeRemoved, originalEvent) {
            var index = this.selectedEntries.indexOf(tagToBeRemoved);
            if (index > -1) {
                this.selectedEntries.splice(index, 1);
            }
            tagToBeRemoved._trEntryElement.remove();
            this.$originalInput.val(this.config.valueFunction(this.getSelectedEntries()));
            this.fireChangeEvents(this.getSelectedEntries(), originalEvent);
        };
        TrivialTagComboBox.prototype.query = function (highlightDirection) {
            var _this = this;
            var queryString = this.getNonSelectedEditorValue();
            var completeInputString = this.$editor.text().replace(String.fromCharCode(160), " ");
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
        };
        TrivialTagComboBox.prototype.fireChangeEvents = function (entries, originalEvent) {
            this.$originalInput.trigger("change");
            this.onSelectedEntryChanged.fire(entries, originalEvent);
        };
        TrivialTagComboBox.prototype.setSelectedEntry = function (entry, fireEvent, originalEvent) {
            var _this = this;
            if (fireEvent === void 0) { fireEvent = false; }
            if (entry == null) {
                return;
            }
            if (!this.config.selectionAcceptor(entry)) {
                return;
            }
            var wasPartial = !!this.currentPartialTag;
            var editorIndex = wasPartial ? this.currentPartialTag._trEntryElement.index() : this.$editor.index();
            if (wasPartial) {
                this.doIgnoringBlurEvents(function () { return _this.$editor.appendTo(_this.$tagArea); });
                this.currentPartialTag._trEntryElement.remove();
                entry = this.config.entryMerger(this.currentPartialTag, entry);
            }
            var tag = $.extend({}, entry);
            if (this.config.tagCompleteDecider(entry)) {
                this.selectedEntries.splice(editorIndex, 0, tag);
                this.$originalInput.val(this.config.valueFunction(this.getSelectedEntries()));
                this.currentPartialTag = null;
            }
            else {
                this.currentPartialTag = tag;
            }
            var $entry = $(this.config.selectedEntryRenderingFunction(tag));
            var $tagWrapper = $('<div class="tr-tagbox-tag"></div>')
                .append($entry);
            this.doIgnoringBlurEvents(function () { return _this.insertAtIndex($tagWrapper, editorIndex); });
            tag._trEntryElement = $tagWrapper;
            $entry.find('.tr-remove-button').click(function (e) {
                _this.removeTag(tag);
                return false;
            });
            if (this.config.tagCompleteDecider(entry)) {
                this.doIgnoringBlurEvents(function () { return _this.insertAtIndex(_this.$editor, editorIndex + 1); });
            }
            else {
                this.doIgnoringBlurEvents(function () { return _this.$editor.appendTo($entry.find('.tr-editor')); });
            }
            this.$editor.text("");
            this.focusEditor();
            if (this.config.tagCompleteDecider(entry) && fireEvent) {
                this.fireChangeEvents(this.getSelectedEntries(), originalEvent);
            }
        };
        TrivialTagComboBox.prototype.focusEditor = function () {
            TrivialCore_1.selectElementContents(this.$editor[0], 0, 0);
            this.$editor.focus();
        };
        TrivialTagComboBox.prototype.repositionDropDown = function () {
            var _this = this;
            this.$dropDown.position({
                my: "left top",
                at: "left bottom",
                of: this.$tagComboBox,
                collision: "flip",
                using: function (calculatedPosition, info) {
                    if (info.vertical === "top") {
                        _this.$tagComboBox.removeClass("dropdown-flipped");
                        _this.$dropDown.removeClass("flipped");
                    }
                    else {
                        _this.$tagComboBox.addClass("dropdown-flipped");
                        _this.$dropDown.addClass("flipped");
                    }
                    _this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            }).width(this.$tagComboBox.width());
        };
        TrivialTagComboBox.prototype.openDropDown = function () {
            var _this = this;
            if (this.isDropDownNeeded()) {
                if (this.listBoxDirty) {
                    this.updateListBoxEntries();
                }
                this.$tagComboBox.addClass("open");
                this.$dropDown.show();
                this.repositionDropDown();
                this.isDropDownOpen = true;
            }
            if (this.repositionDropDownScheduler == null) {
                this.repositionDropDownScheduler = window.setInterval(function () { return _this.repositionDropDown(); }, 300);
            }
        };
        TrivialTagComboBox.prototype.closeDropDown = function () {
            this.$tagComboBox.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
            if (this.repositionDropDownScheduler != null) {
                clearInterval(this.repositionDropDownScheduler);
                this.repositionDropDownScheduler = null;
            }
        };
        TrivialTagComboBox.prototype.getNonSelectedEditorValue = function () {
            var editorText = this.$editor.text().replace(String.fromCharCode(160), " ");
            var selection = window.getSelection();
            if (selection.anchorOffset != selection.focusOffset) {
                return editorText.substring(0, Math.min(window.getSelection().baseOffset, window.getSelection().focusOffset));
            }
            else {
                return editorText;
            }
        };
        TrivialTagComboBox.prototype.autoCompleteIfPossible = function (delay) {
            var _this = this;
            if (this.config.autoComplete) {
                clearTimeout(this.autoCompleteTimeoutId);
                var highlightedEntry_1 = this.listBox.getHighlightedEntry();
                if (highlightedEntry_1 && !this.doNoAutoCompleteBecauseBackspaceWasPressed) {
                    this.autoCompleteTimeoutId = window.setTimeout(function () {
                        var currentEditorValue = _this.getNonSelectedEditorValue();
                        var autoCompleteString = _this.config.autoCompleteFunction(currentEditorValue, highlightedEntry_1) || currentEditorValue;
                        _this.$editor.text(currentEditorValue + autoCompleteString.replace(' ', String.fromCharCode(160)).substr(currentEditorValue.length));
                        _this.repositionDropDown();
                        if (_this.$editor.is(":focus")) {
                            TrivialCore_1.selectElementContents(_this.$editor[0], currentEditorValue.length, autoCompleteString.length);
                        }
                    }, delay || 0);
                }
                this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            }
        };
        TrivialTagComboBox.prototype.isDropDownNeeded = function () {
            return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
        };
        TrivialTagComboBox.prototype.insertAtIndex = function ($element, index) {
            var lastIndex = this.$tagArea.children().length;
            if (index < lastIndex) {
                this.$tagArea.children().eq(index).before($element);
            }
            else {
                this.$tagArea.append($element);
            }
        };
        TrivialTagComboBox.prototype.doIgnoringBlurEvents = function (f) {
            var oldValueOfBlurCausedByClickInsideComponent = this.blurCausedByClickInsideComponent;
            this.blurCausedByClickInsideComponent = true;
            try {
                return f.call(this);
            }
            finally {
                this.blurCausedByClickInsideComponent = oldValueOfBlurCausedByClickInsideComponent;
            }
        };
        TrivialTagComboBox.prototype.setEditingMode = function (newEditingMode) {
            this.editingMode = newEditingMode;
            this.$tagComboBox.removeClass("editable readonly disabled").addClass(this.editingMode);
            if (this.isDropDownNeeded()) {
                this.$dropDown.appendTo(this.$dropDownTargetElement);
            }
        };
        TrivialTagComboBox.prototype.setSelectedEntries = function (entries) {
            var _this = this;
            this.selectedEntries
                .slice()
                .forEach(function (e) { return _this.removeTag(e); });
            if (entries) {
                for (var i = 0; i < entries.length; i++) {
                    this.setSelectedEntry(entries[i]);
                }
            }
        };
        TrivialTagComboBox.prototype.getSelectedEntries = function () {
            var selectedEntriesToReturn = [];
            for (var i = 0; i < this.selectedEntries.length; i++) {
                var selectedEntryToReturn = $.extend({}, this.selectedEntries[i]);
                delete selectedEntryToReturn._trEntryElement;
                selectedEntriesToReturn.push(selectedEntryToReturn);
            }
            return selectedEntriesToReturn;
        };
        ;
        TrivialTagComboBox.prototype.getCurrentPartialTag = function () {
            return this.currentPartialTag;
        };
        TrivialTagComboBox.prototype.focus = function () {
            this.$editor.focus();
            TrivialCore_1.selectElementContents(this.$editor[0], 0, this.$editor.text().length);
        };
        ;
        TrivialTagComboBox.prototype.getEditor = function () {
            return this.$editor[0];
        };
        TrivialTagComboBox.prototype.destroy = function () {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$tagComboBox);
            this.$tagComboBox.remove();
            this.$dropDown.remove();
        };
        ;
        TrivialTagComboBox.prototype.getMainDomElement = function () {
            return this.$tagComboBox[0];
        };
        return TrivialTagComboBox;
    }());
    exports.TrivialTagComboBox = TrivialTagComboBox;
});

//# sourceMappingURL=TrivialTagComboBox.js.map
