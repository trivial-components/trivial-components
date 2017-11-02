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
        define(["require", "exports", "jquery", "moment", "mustache", "./TrivialCore", "./TrivialEvent", "./TrivialListBox", "./TrivialCalendarBox", "./TrivialDateSuggestionEngine", "./TrivialTimeSuggestionEngine"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return window.jQuery;    } else if (name === "levenshtein") {      return window.Levenshtein;    } else if (name === "moment") {      return window.moment;    } else if (name === "mustache") {      return window.Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var moment = require("moment");
    var Mustache = require("mustache");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialListBox_1 = require("./TrivialListBox");
    var TrivialCalendarBox_1 = require("./TrivialCalendarBox");
    var TrivialDateSuggestionEngine_1 = require("./TrivialDateSuggestionEngine");
    var TrivialTimeSuggestionEngine_1 = require("./TrivialTimeSuggestionEngine");
    var Mode;
    (function (Mode) {
        Mode[Mode["MODE_CALENDAR"] = 0] = "MODE_CALENDAR";
        Mode[Mode["MODE_DATE_LIST"] = 1] = "MODE_DATE_LIST";
        Mode[Mode["MODE_TIME_LIST"] = 2] = "MODE_TIME_LIST";
    })(Mode || (Mode = {}));
    var TrivialDateTimeField = (function () {
        function TrivialDateTimeField(originalInput, options) {
            if (options === void 0) { options = {}; }
            var _this = this;
            this.dateIconTemplate = "<svg viewBox=\"0 0 540 540\" width=\"22\" height=\"22\" class=\"calendar-icon\">\n    <defs>\n        <linearGradient id=\"Gradient1\" x1=\"0\" x2=\"0\" y1=\"0\" y2=\"1\">\n            <stop class=\"calendar-symbol-ring-gradient-stop1\" offset=\"0%\"/>\n            <stop class=\"calendar-symbol-ring-gradient-stop2\" offset=\"50%\"/>\n            <stop class=\"calendar-symbol-ring-gradient-stop3\" offset=\"100%\"/>\n        </linearGradient>\n    </defs>        \n    <g id=\"layer1\">\n        <rect class=\"calendar-symbol-page-background\" x=\"90\" y=\"90\" width=\"360\" height=\"400\" ry=\"3.8\"></rect>\n        <rect class=\"calendar-symbol-color\" x=\"90\" y=\"90\" width=\"360\" height=\"100\" ry=\"3.5\"></rect>\n        <rect class=\"calendar-symbol-page\" x=\"90\" y=\"90\" width=\"360\" height=\"395\" ry=\"3.8\"></rect>\n        <rect class=\"calendar-symbol-ring\" fill=\"url(#Gradient2)\" x=\"140\" y=\"30\" width=\"40\" height=\"120\" ry=\"30.8\"></rect>\n        <rect class=\"calendar-symbol-ring\" fill=\"url(#Gradient2)\" x=\"250\" y=\"30\" width=\"40\" height=\"120\" ry=\"30.8\"></rect>\n        <rect class=\"calendar-symbol-ring\" fill=\"url(#Gradient2)\" x=\"360\" y=\"30\" width=\"40\" height=\"120\" ry=\"30.8\"></rect>\n        <text class=\"calendar-symbol-date\" x=\"270\" y=\"415\" text-anchor=\"middle\">{{weekDay}}</text>\n    </g>\n</svg>";
            this.dateTemplate = '<div class="tr-template-icon-single-line">'
                + this.dateIconTemplate
                + '<div class="content-wrapper tr-editor-area">{{displayString}}</div>'
                + '</div>';
            this.timeIconTemplate = '<svg class="clock-icon night-{{isNight}}" viewBox="0 0 110 110" width="22" height="22"> ' +
                '<circle class="clockcircle" cx="55" cy="55" r="45"/>' +
                '<g class="hands">' +
                ' <line class="hourhand" x1="55" y1="55" x2="55" y2="35" {{#hourAngle}}transform="rotate({{hourAngle}},55,55)"{{/hourAngle}}/> ' +
                ' <line class="minutehand" x1="55" y1="55" x2="55" y2="22" {{#minuteAngle}}transform="rotate({{minuteAngle}},55,55)"{{/minuteAngle}}/>' +
                '</g> ' +
                '</svg>';
            this.timeTemplate = '<div class="tr-template-icon-single-line">' +
                this.timeIconTemplate +
                '  <div class="content-wrapper tr-editor-area">{{displayString}}</div>' +
                '</div>';
            this.onChange = new TrivialEvent_1.TrivialEvent(this);
            this.isDropDownOpen = false;
            this.dateValue = null;
            this.timeValue = null;
            this.blurCausedByClickInsideComponent = false;
            this.focusGoesToOtherEditor = false;
            this.autoCompleteTimeoutId = -1;
            this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            this.calendarBoxInitialized = false;
            this.dropDownMode = Mode.MODE_CALENDAR;
            options = options || {};
            this.config = $.extend({
                dateFormat: "MM/DD/YYYY",
                timeFormat: "HH:mm",
                autoComplete: true,
                autoCompleteDelay: 0,
                showTrigger: true,
                editingMode: "editable"
            }, options);
            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$dateTimeField = $('<div class="tr-datetimefield tr-input-wrapper"/>')
                .addClass(this.config.editingMode)
                .insertAfter(this.$originalInput);
            var $editorWrapper = $('<div class="tr-editor-wrapper">').appendTo(this.$dateTimeField);
            this.$dateIconWrapper = $('<div class="tr-date-icon-wrapper"/>').appendTo($editorWrapper);
            this.$dateEditor = $('<div class="tr-date-editor" contenteditable="true"/>').appendTo($editorWrapper);
            this.$timeIconWrapper = $('<div class="tr-time-icon-wrapper"/>').appendTo($editorWrapper);
            this.$timeEditor = $('<div class="tr-time-editor" contenteditable="true"/>').appendTo($editorWrapper);
            this.$dateIconWrapper.click(function () {
                _this.$activeEditor = _this.$dateEditor;
                _this.setDropDownMode(Mode.MODE_CALENDAR);
                _this.openDropDown();
                TrivialCore_1.selectElementContents(_this.$dateEditor[0], 0, _this.$dateEditor.text().length);
            });
            this.$timeIconWrapper.click(function () {
                _this.$activeEditor = _this.$timeEditor;
                _this.setDropDownMode(Mode.MODE_CALENDAR);
                TrivialCore_1.selectElementContents(_this.$timeEditor[0], 0, _this.$timeEditor.text().length);
            });
            this.$dateEditor.focus(function () {
                _this.$activeEditor = _this.$dateEditor;
                if (!_this.blurCausedByClickInsideComponent || _this.focusGoesToOtherEditor) {
                    TrivialCore_1.selectElementContents(_this.$dateEditor[0], 0, _this.$dateEditor.text().length);
                }
            });
            this.$timeEditor.focus(function () {
                _this.$activeEditor = _this.$timeEditor;
                if (!_this.blurCausedByClickInsideComponent || _this.focusGoesToOtherEditor) {
                    TrivialCore_1.selectElementContents(_this.$timeEditor[0], 0, _this.$timeEditor.text().length);
                }
            });
            if (this.config.showTrigger) {
                var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$dateTimeField);
                $trigger.mousedown(function () {
                    if (_this.isDropDownOpen) {
                        _this.closeDropDown();
                    }
                    else {
                        setTimeout(function () {
                            _this.setDropDownMode(Mode.MODE_CALENDAR);
                            _this.calendarBox.setSelectedDate(_this.dateValue ? _this.dateValue.moment : moment());
                            _this.$activeEditor = _this.$dateEditor;
                            TrivialCore_1.selectElementContents(_this.$dateEditor[0], 0, _this.$dateEditor.text().length);
                            _this.openDropDown();
                        });
                    }
                });
            }
            this.$dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(function () {
                return false;
            });
            this.dropdownNeeded = this.config.editingMode == 'editable';
            if (this.dropdownNeeded) {
                this.$dropDown.appendTo("body");
            }
            var $dateListBox = $('<div class="date-listbox">').appendTo(this.$dropDown);
            this.dateListBox = new TrivialListBox_1.TrivialListBox($dateListBox, {
                entryRenderingFunction: function (entry) {
                    return Mustache.render(_this.dateTemplate, entry);
                }
            });
            this.dateListBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    _this.setDate(selectedEntry, selectedEntry.displayString != (_this.dateValue && _this.dateValue.displayString));
                    _this.dateListBox.setSelectedEntry(null);
                    _this.closeDropDown();
                }
            });
            var $timeListBox = $('<div class="time-listbox">').appendTo(this.$dropDown);
            this.timeListBox = new TrivialListBox_1.TrivialListBox($timeListBox, {
                entryRenderingFunction: function (entry) {
                    return Mustache.render(_this.timeTemplate, entry);
                }
            });
            this.timeListBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    _this.setTime(selectedEntry, selectedEntry.displayString != (_this.timeValue && _this.timeValue.displayString));
                    _this.dateListBox.setSelectedEntry(null);
                    _this.closeDropDown();
                }
            });
            this.$calendarBox = $('<div class="calendarbox">').appendTo(this.$dropDown);
            this.$dateEditor
                .add(this.$timeEditor)
                .focus(function () {
                _this.$dateTimeField.addClass('focus');
            })
                .blur(function () {
                if (!_this.blurCausedByClickInsideComponent) {
                    _this.$dateTimeField.removeClass('focus');
                    _this.updateDisplay();
                    _this.closeDropDown();
                }
            })
                .keydown(function (e) {
                if (TrivialCore_1.keyCodes.isModifierKey(e)) {
                    return;
                }
                else if (e.which == TrivialCore_1.keyCodes.tab) {
                    _this.selectHighlightedListBoxEntry();
                    return;
                }
                else if (e.which == TrivialCore_1.keyCodes.left_arrow || e.which == TrivialCore_1.keyCodes.right_arrow) {
                    if (_this.getActiveEditor() === _this.$timeEditor && e.which == TrivialCore_1.keyCodes.left_arrow && window.getSelection().focusOffset === 0) {
                        e.preventDefault();
                        TrivialCore_1.selectElementContents(_this.$dateEditor[0], 0, _this.$dateEditor.text().length);
                    }
                    else if (_this.getActiveEditor() === _this.$dateEditor && e.which == TrivialCore_1.keyCodes.right_arrow && window.getSelection().focusOffset === _this.$dateEditor.text().length) {
                        e.preventDefault();
                        TrivialCore_1.selectElementContents(_this.$timeEditor[0], 0, _this.$timeEditor.text().length);
                    }
                    return;
                }
                if (e.which == TrivialCore_1.keyCodes.backspace || e.which == TrivialCore_1.keyCodes.delete) {
                    _this.doNoAutoCompleteBecauseBackspaceWasPressed = true;
                }
                if (e.which == TrivialCore_1.keyCodes.up_arrow || e.which == TrivialCore_1.keyCodes.down_arrow) {
                    _this.getActiveEditor().select();
                    var direction = e.which == TrivialCore_1.keyCodes.up_arrow ? -1 : 1;
                    if (_this.isDropDownOpen) {
                        _this.setDropDownMode(e.currentTarget === _this.$dateEditor[0] ? Mode.MODE_DATE_LIST : Mode.MODE_TIME_LIST);
                        _this.query(direction);
                        _this.openDropDown();
                    }
                    else {
                        if (_this.dropDownMode !== Mode.MODE_CALENDAR) {
                            _this.getActiveBox().navigate(direction === 1 ? 'down' : 'up');
                            _this.autoCompleteIfPossible(_this.config.autoCompleteDelay);
                        }
                    }
                    return false;
                }
                else if (e.which == TrivialCore_1.keyCodes.enter) {
                    if (_this.isDropDownOpen) {
                        e.preventDefault();
                        _this.selectHighlightedListBoxEntry();
                        TrivialCore_1.selectElementContents(_this.getActiveEditor()[0], 0, _this.getActiveEditor().text().length);
                        _this.closeDropDown();
                    }
                }
                else if (e.which == TrivialCore_1.keyCodes.escape) {
                    e.preventDefault();
                    if (_this.isDropDownOpen) {
                        _this.updateDisplay();
                        TrivialCore_1.selectElementContents(_this.getActiveEditor()[0], 0, _this.getActiveEditor().text().length);
                    }
                    _this.closeDropDown();
                }
                else {
                    _this.setDropDownMode(e.currentTarget === _this.$dateEditor[0] ? Mode.MODE_DATE_LIST : Mode.MODE_TIME_LIST);
                    _this.query(1);
                    _this.openDropDown();
                }
            });
            if (this.$originalInput.val()) {
                this.setValue(moment(this.$originalInput.val()));
            }
            else {
                this.setValue(null);
            }
            if (this.$originalInput.attr("tabindex")) {
                this.$dateEditor.add(this.$timeEditor).attr("tabindex", this.$originalInput.attr("tabindex"));
            }
            if (this.$originalInput.attr("autofocus")) {
                this.$dateEditor.focus();
            }
            this.$dateTimeField.add(this.$dropDown).mousedown(function (e) {
                if (_this.$dateEditor.is(":focus") || _this.$timeEditor.is(":focus")) {
                    _this.blurCausedByClickInsideComponent = true;
                }
                if (e.target === _this.$dateEditor[0]
                    || e.target === _this.$timeEditor[0]
                    || e.target === _this.$dateIconWrapper[0]
                    || e.target === _this.$timeIconWrapper[0]) {
                    _this.focusGoesToOtherEditor = true;
                }
            }).on('mouseup mouseout', function () {
                if (_this.blurCausedByClickInsideComponent && !_this.focusGoesToOtherEditor) {
                    _this.getActiveEditor().focus();
                }
                _this.blurCausedByClickInsideComponent = false;
                _this.focusGoesToOtherEditor = false;
            });
            this.$activeEditor = this.$dateEditor;
            this.dateSuggestionEngine = new TrivialDateSuggestionEngine_1.TrivialDateSuggestionEngine({
                preferredDateFormat: this.config.dateFormat
            });
            this.timeSuggestionEngine = new TrivialTimeSuggestionEngine_1.TrivialTimeSuggestionEngine();
        }
        TrivialDateTimeField.prototype.setDropDownMode = function (mode) {
            var _this = this;
            this.dropDownMode = mode;
            if (!this.calendarBoxInitialized && mode === Mode.MODE_CALENDAR) {
                this.calendarBox = new TrivialCalendarBox_1.TrivialCalendarBox(this.$calendarBox, {
                    firstDayOfWeek: 1,
                    mode: 'date'
                });
                this.calendarBox.setKeyboardNavigationState('month');
                this.calendarBox.onChange.addListener(function (_a) {
                    var value = _a.value, timeUnitEdited = _a.timeUnitEdited;
                    _this.setDate(TrivialDateTimeField.createDateComboBoxEntry(value, _this.config.dateFormat));
                    if (timeUnitEdited === 'day') {
                        _this.closeDropDown();
                        _this.$activeEditor = _this.$timeEditor;
                        TrivialCore_1.selectElementContents(_this.$timeEditor[0], 0, _this.$timeEditor.text().length);
                        _this.fireChangeEvents();
                    }
                });
                this.calendarBoxInitialized = true;
            }
            this.calendarBoxInitialized && $(this.calendarBox.getMainDomElement()).toggle(mode === Mode.MODE_CALENDAR);
            $(this.dateListBox.getMainDomElement()).toggle(mode === Mode.MODE_DATE_LIST);
            $(this.timeListBox.getMainDomElement()).toggle(mode === Mode.MODE_TIME_LIST);
        };
        TrivialDateTimeField.prototype.getActiveBox = function () {
            if (this.dropDownMode === Mode.MODE_CALENDAR) {
                return this.calendarBox;
            }
            else if (this.dropDownMode === Mode.MODE_DATE_LIST) {
                return this.dateListBox;
            }
            else {
                return this.timeListBox;
            }
        };
        TrivialDateTimeField.prototype.getActiveEditor = function () {
            return this.$activeEditor;
        };
        TrivialDateTimeField.prototype.selectHighlightedListBoxEntry = function () {
            if (this.dropDownMode === Mode.MODE_DATE_LIST || this.dropDownMode === Mode.MODE_TIME_LIST) {
                var highlightedEntry = this.getActiveBox().getHighlightedEntry();
                if (this.isDropDownOpen && highlightedEntry) {
                    if (this.getActiveEditor() === this.$dateEditor) {
                        this.setDate(highlightedEntry, true);
                    }
                    else {
                        this.setTime(highlightedEntry, true);
                    }
                }
            }
        };
        TrivialDateTimeField.prototype.query = function (highlightDirection) {
            var _this = this;
            setTimeout(function () {
                var queryString = _this.getNonSelectedEditorValue();
                if (_this.getActiveEditor() === _this.$dateEditor) {
                    var entries = _this.dateSuggestionEngine.generateSuggestions(queryString, moment())
                        .map(function (s) { return TrivialDateTimeField.createDateComboBoxEntry(s.moment, _this.config.dateFormat); });
                    _this.updateEntries(entries, highlightDirection);
                }
                else {
                    var entries = _this.timeSuggestionEngine.generateSuggestions(queryString)
                        .map(function (s) { return TrivialDateTimeField.createTimeComboBoxEntry(s.hour, s.minute, _this.config.timeFormat); });
                    _this.updateEntries(entries, highlightDirection);
                }
            }, 0);
        };
        TrivialDateTimeField.prototype.getValue = function () {
            if (this.dateValue == null && this.timeValue == null) {
                return null;
            }
            else if (this.dateValue == null) {
                return null;
            }
            else if (this.timeValue == null) {
                return moment([
                    this.dateValue.year,
                    this.dateValue.month - 1,
                    this.dateValue.day
                ]).startOf('day');
            }
            else {
                return moment([
                    this.dateValue.year,
                    this.dateValue.month - 1,
                    this.dateValue.day,
                    this.timeValue.hour,
                    this.timeValue.minute
                ]);
            }
        };
        ;
        TrivialDateTimeField.prototype.fireChangeEvents = function () {
            this.$originalInput.trigger("change");
            this.onChange.fire(this.getValue());
        };
        TrivialDateTimeField.prototype.setDate = function (newDateValue, fireEvent) {
            if (fireEvent === void 0) { fireEvent = false; }
            this.dateValue = newDateValue;
            this.updateDisplay();
            if (fireEvent) {
                this.fireChangeEvents();
            }
        };
        TrivialDateTimeField.prototype.setTime = function (newTimeValue, fireEvent) {
            if (fireEvent === void 0) { fireEvent = false; }
            this.timeValue = newTimeValue;
            this.updateDisplay();
            if (fireEvent) {
                this.fireChangeEvents();
            }
        };
        TrivialDateTimeField.prototype.updateDisplay = function () {
            if (this.dateValue) {
                this.$dateEditor.text(moment([this.dateValue.year, this.dateValue.month - 1, this.dateValue.day]).format(this.config.dateFormat));
                this.$dateIconWrapper.empty().append(Mustache.render(this.dateIconTemplate, this.dateValue));
            }
            else {
                this.$dateEditor.text("");
                this.$dateIconWrapper.empty().append(Mustache.render(this.dateIconTemplate, {}));
            }
            if (this.timeValue) {
                this.$timeEditor.text(moment([1970, 0, 1, this.timeValue.hour, this.timeValue.minute]).format(this.config.timeFormat));
                this.$timeIconWrapper.empty().append(Mustache.render(this.timeIconTemplate, this.timeValue));
            }
            else {
                this.$timeEditor.text("");
                this.$timeIconWrapper.empty().append(Mustache.render(this.timeIconTemplate, {}));
            }
        };
        TrivialDateTimeField.prototype.setValue = function (mom) {
            this.setDate(mom && TrivialDateTimeField.createDateComboBoxEntry(mom, this.config.dateFormat));
            this.setTime(mom && TrivialDateTimeField.createTimeComboBoxEntry(mom.hour(), mom.minute(), this.config.timeFormat));
        };
        TrivialDateTimeField.prototype.repositionDropDown = function () {
            var _this = this;
            this.$dropDown
                .show()
                .position({
                my: "left top",
                at: "left bottom",
                of: this.$dateTimeField,
                collision: "flip",
                using: function (calculatedPosition, info) {
                    if (info.vertical === "top") {
                        _this.$dateTimeField.removeClass("dropdown-flipped");
                        _this.$dropDown.removeClass("flipped");
                    }
                    else {
                        _this.$dateTimeField.addClass("dropdown-flipped");
                        _this.$dropDown.addClass("flipped");
                    }
                    _this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            })
                .width(this.$dateTimeField.width());
        };
        TrivialDateTimeField.prototype.openDropDown = function () {
            if (this.dropdownNeeded) {
                this.$dateTimeField.addClass("open");
                this.repositionDropDown();
                this.isDropDownOpen = true;
            }
        };
        TrivialDateTimeField.prototype.closeDropDown = function () {
            this.$dateTimeField.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
        };
        TrivialDateTimeField.prototype.getNonSelectedEditorValue = function () {
            var editorText = this.getActiveEditor().text().replace(String.fromCharCode(160), " ");
            var selection = window.getSelection();
            if (selection.anchorOffset != selection.focusOffset) {
                return editorText.substring(0, Math.min(selection.anchorOffset, selection.focusOffset));
            }
            else {
                return editorText;
            }
        };
        TrivialDateTimeField.prototype.autoCompleteIfPossible = function (delay) {
            var _this = this;
            if (this.config.autoComplete && (this.dropDownMode === Mode.MODE_DATE_LIST || this.dropDownMode === Mode.MODE_TIME_LIST)) {
                clearTimeout(this.autoCompleteTimeoutId);
                var listBox = this.getActiveBox();
                var highlightedEntry = listBox.getHighlightedEntry();
                if (highlightedEntry && this.doNoAutoCompleteBecauseBackspaceWasPressed) {
                    var autoCompletingEntryDisplayValue_1 = highlightedEntry.displayString;
                    if (autoCompletingEntryDisplayValue_1) {
                        this.autoCompleteTimeoutId = window.setTimeout(function () {
                            var oldEditorValue = _this.getNonSelectedEditorValue();
                            var newEditorValue;
                            if (autoCompletingEntryDisplayValue_1.toLowerCase().indexOf(oldEditorValue.toLowerCase()) === 0) {
                                newEditorValue = oldEditorValue + autoCompletingEntryDisplayValue_1.substr(oldEditorValue.length);
                            }
                            else {
                                newEditorValue = _this.getNonSelectedEditorValue();
                            }
                            _this.getActiveEditor().text(newEditorValue);
                            if (_this.getActiveEditor().is(":focus")) {
                                TrivialCore_1.selectElementContents(_this.getActiveEditor()[0], oldEditorValue.length, newEditorValue.length);
                            }
                        }, delay || 0);
                    }
                }
                this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            }
        };
        TrivialDateTimeField.prototype.updateEntries = function (newEntries, highlightDirection) {
            var listBox = this.getActiveBox();
            highlightDirection = highlightDirection === undefined ? 1 : highlightDirection;
            listBox.updateEntries(newEntries);
            listBox.highlightTextMatches(this.getNonSelectedEditorValue());
            listBox.highlightNextEntry(highlightDirection);
            this.autoCompleteIfPossible(this.config.autoCompleteDelay);
            if (this.isDropDownOpen) {
                this.openDropDown();
            }
        };
        TrivialDateTimeField.createTimeComboBoxEntry = function (hour, minute, timeFormat) {
            return {
                hour: hour,
                minute: minute,
                hourString: TrivialDateTimeField.pad(hour, 2),
                minuteString: TrivialDateTimeField.pad(minute, 2),
                displayString: moment().hour(hour).minute(minute).format(timeFormat),
                hourAngle: ((hour % 12) + minute / 60) * 30,
                minuteAngle: minute * 6,
                isNight: hour < 6 || hour >= 20
            };
        };
        TrivialDateTimeField.pad = function (num, size) {
            var s = num + "";
            while (s.length < size)
                s = "0" + s;
            return s;
        };
        TrivialDateTimeField.createDateComboBoxEntry = function (m, dateFormat) {
            return {
                moment: m,
                day: m.date(),
                weekDay: m.format('dd'),
                month: m.month() + 1,
                year: m.year(),
                displayString: m.format(dateFormat)
            };
        };
        TrivialDateTimeField.prototype.focus = function () {
            TrivialCore_1.selectElementContents(this.getActiveEditor()[0], 0, this.getActiveEditor().text().length);
        };
        TrivialDateTimeField.prototype.destroy = function () {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$dateTimeField);
            this.$dateTimeField.remove();
            this.$dropDown.remove();
        };
        TrivialDateTimeField.prototype.getMainDomElement = function () {
            return this.$dateTimeField[0];
        };
        return TrivialDateTimeField;
    }());
    exports.TrivialDateTimeField = TrivialDateTimeField;
});

//# sourceMappingURL=TrivialDateTimeField.js.map
