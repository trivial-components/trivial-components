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
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialListBox_1 = require("./TrivialListBox");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialUnitBox = (function () {
        function TrivialUnitBox(originalInput, options) {
            if (options === void 0) { options = {}; }
            var _this = this;
            this.onChange = new TrivialEvent_1.TrivialEvent(this);
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.onFocus = new TrivialEvent_1.TrivialEvent(this);
            this.onBlur = new TrivialEvent_1.TrivialEvent(this);
            this.isDropDownOpen = false;
            this.blurCausedByClickInsideComponent = false;
            this.$spinners = $();
            this.config = $.extend({
                unitValueProperty: 'code',
                unitIdProperty: 'code',
                decimalPrecision: 2,
                decimalSeparator: '.',
                thousandsSeparator: ',',
                unitDisplayPosition: 'right',
                allowNullAmount: true,
                entryRenderingFunction: function (entry) {
                    var template = entry.template || TrivialCore_1.DEFAULT_TEMPLATES.currency2LineTemplate;
                    return Mustache.render(template, entry);
                },
                selectedEntryRenderingFunction: function (entry) {
                    var template = entry.selectedEntryTemplate || TrivialCore_1.DEFAULT_TEMPLATES.currencySingleLineShortTemplate;
                    return Mustache.render(template, entry);
                },
                amount: null,
                selectedEntry: undefined,
                spinnerTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
                entries: null,
                emptyEntry: {
                    code: '...'
                },
                queryFunction: null,
                queryOnNonNumberCharacters: true,
                openDropdownOnEditorClick: false,
                showTrigger: true,
                matchingOptions: {
                    matchingMode: 'prefix-word',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                editingMode: 'editable',
            }, options);
            if (!this.config.queryFunction) {
                this.config.queryFunction = TrivialCore_1.defaultListQueryFunctionFactory(this.config.entries || [], this.config.matchingOptions);
                this.usingDefaultQueryFunction = true;
            }
            this.entries = this.config.entries;
            this.numberRegex = new RegExp('\\d*\\' + this.config.decimalSeparator + '?\\d*', 'g');
            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$editor = $('<input type="text"/>');
            this.$unitBox = $('<div class="tr-unitbox tr-input-wrapper"/>').insertAfter(this.$originalInput)
                .addClass(this.config.unitDisplayPosition === 'left' ? 'unit-display-left' : 'unit-display-right');
            this.$originalInput.appendTo(this.$unitBox);
            this.$selectedEntryAndTriggerWrapper = $('<div class="tr-unitbox-selected-entry-and-trigger-wrapper"/>').appendTo(this.$unitBox);
            this.$selectedEntryWrapper = $('<div class="tr-unitbox-selected-entry-wrapper"/>').appendTo(this.$selectedEntryAndTriggerWrapper);
            if (this.config.showTrigger) {
                $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$selectedEntryAndTriggerWrapper);
            }
            this.$selectedEntryAndTriggerWrapper.mousedown(function () {
                if (_this.isDropDownOpen) {
                    _this.closeDropDown();
                }
                else if (_this.editingMode === "editable") {
                    setTimeout(function () {
                        _this.openDropDown();
                        _this.query();
                    });
                }
            });
            this.$dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(function () {
                return false;
            });
            this.$dropDownTargetElement = $("body");
            this.setEditingMode(this.config.editingMode);
            this.$editor.prependTo(this.$unitBox).addClass("tr-unitbox-editor tr-editor")
                .focus(function () {
                if (_this.editingMode !== "editable") {
                    _this.$editor.blur();
                    return false;
                }
                if (_this.blurCausedByClickInsideComponent) {
                }
                else {
                    _this.onFocus.fire();
                    _this.$unitBox.addClass('focus');
                    _this.cleanupEditorValue();
                    _this.$editor.select();
                }
            })
                .blur(function () {
                if (_this.blurCausedByClickInsideComponent) {
                    _this.$editor.focus();
                }
                else {
                    _this.onBlur.fire();
                    _this.$unitBox.removeClass('focus');
                    _this.formatEditorValue();
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
                        _this.setSelectedEntry(highlightedEntry, true, e);
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    return;
                }
                if (e.which == TrivialCore_1.keyCodes.up_arrow || e.which == TrivialCore_1.keyCodes.down_arrow) {
                    var direction = e.which == TrivialCore_1.keyCodes.up_arrow ? -1 : 1;
                    if (_this.isDropDownOpen) {
                        _this.listBox.highlightNextEntry(direction);
                    }
                    else {
                        _this.openDropDown();
                        _this.query(direction);
                    }
                    return false;
                }
                else if (_this.isDropDownOpen && e.which == TrivialCore_1.keyCodes.enter) {
                    e.preventDefault();
                    _this.setSelectedEntry(_this.listBox.getHighlightedEntry(), true, e);
                    _this.closeDropDown();
                }
                else if (e.which == TrivialCore_1.keyCodes.escape) {
                    _this.closeDropDown();
                    _this.cleanupEditorValue();
                }
                else if (!e.shiftKey && TrivialCore_1.keyCodes.numberKeys.indexOf(e.which) != -1) {
                    var numberPart = _this.getEditorValueNumberPart();
                    var numberPartDecimalSeparatorIndex = numberPart.indexOf(_this.config.decimalSeparator);
                    var maxDecimalDigitsReached = numberPartDecimalSeparatorIndex != -1 && numberPart.length - (numberPartDecimalSeparatorIndex + 1) >= _this.config.decimalPrecision;
                    var editorValue = _this.$editor.val();
                    var decimalSeparatorIndex = editorValue.indexOf(_this.config.decimalSeparator);
                    var selectionStart = _this.$editor[0].selectionStart;
                    var selectionEnd = _this.$editor[0].selectionEnd;
                    var wouldAddAnotherDigit = decimalSeparatorIndex !== -1 && selectionEnd > decimalSeparatorIndex && selectionStart === selectionEnd;
                    if (maxDecimalDigitsReached && wouldAddAnotherDigit) {
                        if (/^\d$/.test(editorValue[selectionEnd])) {
                            _this.$editor.val(editorValue.substring(0, selectionEnd) + editorValue.substring(selectionEnd + 1));
                            _this.$editor[0].setSelectionRange(selectionEnd, selectionEnd);
                        }
                        else {
                            return false;
                        }
                    }
                }
            })
                .keyup(function (e) {
                if (TrivialCore_1.keyCodes.specialKeys.indexOf(e.which) != -1
                    && e.which != TrivialCore_1.keyCodes.backspace
                    && e.which != TrivialCore_1.keyCodes.delete) {
                    return;
                }
                var hasDoubleDecimalSeparator = new RegExp("(?:\\" + _this.config.decimalSeparator + ".*)" + "\\" + _this.config.decimalSeparator, "g").test(_this.$editor.val());
                if (hasDoubleDecimalSeparator) {
                    _this.cleanupEditorValue();
                    _this.$editor[0].setSelectionRange(_this.$editor.val().length - _this.config.decimalPrecision, _this.$editor.val().length - _this.config.decimalPrecision);
                }
                if (_this.config.queryOnNonNumberCharacters) {
                    if (_this.getQueryString().length > 0) {
                        _this.openDropDown();
                        _this.query(1);
                    }
                    else {
                        _this.closeDropDown();
                    }
                }
                else {
                    _this.ensureDecimalInput();
                }
            })
                .mousedown(function () {
                if (_this.config.openDropdownOnEditorClick) {
                    _this.openDropDown();
                    if (_this.entries == null) {
                        _this.query();
                    }
                }
            }).change(function (e) {
                _this.updateOriginalInputValue();
                _this.fireChangeEvents(e);
            });
            this.$unitBox.add(this.$dropDown).mousedown(function () {
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
            this.listBox = new TrivialListBox_1.TrivialListBox(this.$dropDown, this.config);
            this.listBox.onSelectedEntryChanged.addListener(function (selectedEntry, eventSource, originalEvent) {
                if (selectedEntry) {
                    _this.setSelectedEntry(selectedEntry, true, originalEvent);
                    _this.listBox.setSelectedEntry(null);
                    _this.closeDropDown();
                }
            });
            this.$editor.val(this.config.amount || this.$originalInput.val());
            this.formatEditorValue();
            this.setSelectedEntry(this.config.selectedEntry || null, false, null);
        }
        TrivialUnitBox.prototype.ensureDecimalInput = function () {
            var cursorPosition = this.$editor[0].selectionEnd;
            var oldValue = this.$editor.val();
            var newValue = oldValue.replace(new RegExp('[^\-0-9' + this.config.decimalSeparator + this.config.thousandsSeparator + ']', 'g'), '');
            newValue = newValue.replace(/(\d*\.\d*)\./g, '$1');
            newValue = newValue.replace(/(.)-*/g, '$1');
            var decimalSeparatorIndex = newValue.indexOf(this.config.decimalSeparator);
            if (decimalSeparatorIndex != -1 && newValue.length - decimalSeparatorIndex - 1 > this.config.decimalPrecision) {
                newValue = newValue.substring(0, decimalSeparatorIndex + 1 + this.config.decimalPrecision);
            }
            if (oldValue !== newValue) {
                this.$editor.val(newValue);
                var newCursorPosition = Math.min(this.$editor.val().length, cursorPosition);
                try {
                    this.$editor[0].setSelectionRange(newCursorPosition, newCursorPosition);
                }
                catch (e) {
                }
            }
        };
        TrivialUnitBox.prototype.getQueryString = function () {
            return this.$editor.val().replace(this.numberRegex, '');
        };
        TrivialUnitBox.prototype.getEditorValueNumberPart = function (fillupDecimals) {
            var rawNumber = this.$editor.val().match(this.numberRegex).join('');
            var decimalDeparatorIndex = rawNumber.indexOf(this.config.decimalSeparator);
            var integerPart;
            var fractionalPart;
            if (decimalDeparatorIndex !== -1) {
                integerPart = rawNumber.substring(0, decimalDeparatorIndex);
                fractionalPart = rawNumber.substring(decimalDeparatorIndex + 1, rawNumber.length).replace(/\D/g, '');
            }
            else {
                integerPart = rawNumber;
                fractionalPart = "";
            }
            if (integerPart.length == 0 && fractionalPart.length == 0) {
                return "";
            }
            else {
                if (fillupDecimals) {
                    fractionalPart = (fractionalPart + new Array(this.config.decimalPrecision + 1).join("0")).substr(0, this.config.decimalPrecision);
                }
                return integerPart + this.config.decimalSeparator + fractionalPart;
            }
        };
        TrivialUnitBox.prototype.query = function (highlightDirection) {
            var _this = this;
            var $spinner = $(this.config.spinnerTemplate).appendTo(this.$dropDown);
            this.$spinners = this.$spinners.add($spinner);
            setTimeout(function () {
                _this.config.queryFunction(_this.getQueryString(), function (newEntries) {
                    _this.updateEntries(newEntries);
                    var queryString = _this.getQueryString();
                    if (queryString.length > 0) {
                        _this.listBox.highlightTextMatches(queryString);
                    }
                    _this.listBox.highlightNextEntry(highlightDirection);
                    if (_this.isDropDownOpen) {
                        _this.openDropDown();
                    }
                });
            });
        };
        TrivialUnitBox.prototype.fireSelectedEntryChangedEvent = function () {
            this.onSelectedEntryChanged.fire(this.selectedEntry);
        };
        TrivialUnitBox.prototype.fireChangeEvents = function (originalEvent) {
            this.$originalInput.trigger("change");
            this.onChange.fire({
                unit: this.selectedEntry != null ? this.selectedEntry[this.config.unitValueProperty] : null,
                unitEntry: this.selectedEntry,
                amount: this.getAmount(),
                amountAsFloatingPointNumber: parseFloat(this.formatAmount(this.getAmount(), this.config.decimalPrecision, this.config.decimalSeparator, this.config.thousandsSeparator))
            }, originalEvent);
        };
        TrivialUnitBox.prototype.setSelectedEntry = function (entry, fireEvent, originalEvent) {
            if (entry == null) {
                this.selectedEntry = null;
                var $selectedEntry = $(this.config.selectedEntryRenderingFunction(this.config.emptyEntry))
                    .addClass("tr-combobox-entry")
                    .addClass("empty");
                this.$selectedEntryWrapper.empty().append($selectedEntry);
            }
            else {
                this.selectedEntry = entry;
                var $selectedEntry = $(this.config.selectedEntryRenderingFunction(entry))
                    .addClass("tr-combobox-entry");
                this.$selectedEntryWrapper.empty().append($selectedEntry);
            }
            this.cleanupEditorValue();
            this.updateOriginalInputValue();
            if (!this.$editor.is(":focus")) {
                this.formatEditorValue();
            }
            if (fireEvent) {
                this.fireSelectedEntryChangedEvent();
                this.fireChangeEvents(originalEvent);
            }
        };
        TrivialUnitBox.prototype.formatEditorValue = function () {
            this.$editor.val(this.formatAmount(this.getAmount(), this.config.decimalPrecision, this.config.decimalSeparator, this.config.thousandsSeparator));
        };
        TrivialUnitBox.prototype.cleanupEditorValue = function () {
            if (this.$editor.val()) {
                this.$editor.val(this.getEditorValueNumberPart(true));
            }
        };
        TrivialUnitBox.prototype.formatAmount = function (integerNumber, precision, decimalSeparator, thousandsSeparator) {
            if (integerNumber == null || isNaN(integerNumber)) {
                return "";
            }
            var amountAsString = "" + integerNumber;
            if (amountAsString.length <= precision) {
                return 0 + decimalSeparator + new Array(precision - amountAsString.length + 1).join("0") + amountAsString;
            }
            else {
                var integerPart = amountAsString.substring(0, amountAsString.length - precision);
                var formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
                var fractionalPart = amountAsString.substr(amountAsString.length - precision, precision);
                return formattedIntegerPart + decimalSeparator + fractionalPart;
            }
        };
        TrivialUnitBox.prototype.repositionDropDown = function () {
            var _this = this;
            this.$dropDown
                .show()
                .position({
                my: "left top",
                at: "left bottom",
                of: this.$unitBox,
                collision: "flip",
                using: function (calculatedPosition, info) {
                    if (info.vertical === "top") {
                        _this.$unitBox.removeClass("dropdown-flipped");
                        _this.$dropDown.removeClass("flipped");
                    }
                    else {
                        _this.$unitBox.addClass("dropdown-flipped");
                        _this.$dropDown.addClass("flipped");
                    }
                    _this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            })
                .width(this.$unitBox.width());
        };
        ;
        TrivialUnitBox.prototype.openDropDown = function () {
            this.$unitBox.addClass("open");
            this.repositionDropDown();
            this.isDropDownOpen = true;
        };
        TrivialUnitBox.prototype.closeDropDown = function () {
            this.$unitBox.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
        };
        TrivialUnitBox.prototype.updateOriginalInputValue = function () {
            if (this.config.unitDisplayPosition === 'left') {
                this.$originalInput.val((this.selectedEntry ? this.selectedEntry[this.config.unitValueProperty] : '') + this.formatAmount(this.getAmount(), this.config.decimalPrecision, this.config.decimalSeparator, ''));
            }
            else {
                this.$originalInput.val(this.formatAmount(this.getAmount(), this.config.decimalPrecision, this.config.decimalSeparator, '') + (this.selectedEntry ? this.selectedEntry[this.config.unitValueProperty] : ''));
            }
        };
        TrivialUnitBox.prototype.getAmount = function () {
            var editorValueNumberPart = this.getEditorValueNumberPart(false);
            if (editorValueNumberPart.length === 0 && this.config.allowNullAmount) {
                return null;
            }
            else if (editorValueNumberPart.length === 0) {
                return 0;
            }
            else {
                return parseInt(this.getEditorValueNumberPart(true).replace(/\D/g, ""));
            }
        };
        TrivialUnitBox.prototype.isDropDownNeeded = function () {
            return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
        };
        TrivialUnitBox.prototype.setEditingMode = function (newEditingMode) {
            this.editingMode = newEditingMode;
            this.$unitBox.removeClass("editable readonly disabled").addClass(this.editingMode);
            this.$editor.prop("readonly", newEditingMode !== "editable");
            this.$editor.attr("tabindex", newEditingMode === "editable" ? this.$originalInput.attr("tabindex") : "-1");
            if (this.isDropDownNeeded()) {
                this.$dropDown.appendTo(this.$dropDownTargetElement);
            }
        };
        TrivialUnitBox.prototype.selectUnit = function (unitIdentifier) {
            var _this = this;
            this.setSelectedEntry(this.entries.filter(function (entry) {
                return entry[_this.config.unitIdProperty] === unitIdentifier;
            })[0], false, null);
        };
        TrivialUnitBox.prototype.updateEntries = function (newEntries) {
            this.entries = newEntries;
            this.$spinners.remove();
            this.$spinners = $();
            this.listBox.updateEntries(newEntries);
        };
        TrivialUnitBox.prototype.getSelectedEntry = function () {
            if (this.selectedEntry == null) {
                return null;
            }
            else {
                var selectedEntryToReturn = $.extend({}, this.selectedEntry);
                selectedEntryToReturn._trEntryElement = undefined;
                return selectedEntryToReturn;
            }
        };
        TrivialUnitBox.prototype.setAmount = function (amount) {
            if (amount != null && amount !== Math.floor(amount)) {
                throw "TrivialUnitBox: You must specify an integer amount!";
            }
            if (amount == null) {
                if (this.config.allowNullAmount) {
                    this.$editor.val("");
                }
                else {
                    this.$editor.val(this.formatAmount(0, this.config.decimalPrecision, this.config.decimalSeparator, ''));
                }
            }
            else if (this.$editor.is(":focus")) {
                this.$editor.val(this.formatAmount(amount, this.config.decimalPrecision, this.config.decimalSeparator, ''));
            }
            else {
                this.$editor.val(this.formatAmount(amount, this.config.decimalPrecision, this.config.decimalSeparator, this.config.thousandsSeparator));
            }
        };
        ;
        TrivialUnitBox.prototype.focus = function () {
            this.$editor.select();
        };
        TrivialUnitBox.prototype.getEditor = function () {
            return this.$editor[0];
        };
        TrivialUnitBox.prototype.destroy = function () {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$unitBox);
            this.$unitBox.remove();
            this.$dropDown.remove();
        };
        TrivialUnitBox.prototype.getMainDomElement = function () {
            return this.$unitBox[0];
        };
        return TrivialUnitBox;
    }());
    exports.TrivialUnitBox = TrivialUnitBox;
});

//# sourceMappingURL=TrivialUnitBox.js.map
