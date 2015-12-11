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
(function (factory) {
        "use strict";

        if (typeof define === 'function' && define.amd) {
            // Define as an AMD module if possible
            define('trivial-dateTimeField', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.trivialdatetimefield) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var dateIconTemplate = '<svg viewBox="0 0 540 540" width="22" height="22" class="calendar-icon">'
            + '<g id="layer1">'
            + '<rect class="calendar-symbol-page-background" x="90" y="90" width="360" height="400" ry="3.8"></rect>'
            + '<rect class="calendar-symbol-color" x="90" y="90" width="360" height="100" ry="3.5"></rect>'
            + '<rect class="calendar-symbol-page" x="90" y="90" width="360" height="400" ry="3.8"></rect>'
            + '<rect class="calendar-symbol-ring" x="140" y="30" width="40" height="120" ry="30.8"></rect>'
            + '<rect class="calendar-symbol-ring" x="250" y="30" width="40" height="120" ry="30.8"></rect>'
            + '<rect class="calendar-symbol-ring" x="360" y="30" width="40" height="120" ry="30.8"></rect>'
            + '<text class="calendar-symbol-date" x="270" y="415" text-anchor="middle">{{weekDay}}</text>'
            + '</g>'
            + '</svg>';
        var dateTemplate = '<div class="tr-template-icon-single-line">'
            + dateIconTemplate
            + '<div class="content-wrapper editor-area">{{displayString}}</div>'
            + '</div>';
        var timeIconTemplate = '<svg class="clock-icon night-{{isNight}}" viewBox="0 0 110 110" width="22" height="22"> ' +
            '<circle class="clockcircle" cx="55" cy="55" r="45"/>' +
            '<g class="hands">' +
            ' <line class="hourhand" x1="55" y1="55" x2="55" y2="35" {{#hourAngle}}transform="rotate({{hourAngle}},55,55)"{{/hourAngle}}/> ' +
            ' <line class="minutehand" x1="55" y1="55" x2="55" y2="22" {{#minuteAngle}}transform="rotate({{minuteAngle}},55,55)"{{/minuteAngle}}/>' +
            '</g> ' +
            '</svg>';
        var timeTemplate = '<div class="tr-template-icon-single-line">' +
            timeIconTemplate +
            '  <div class="content-wrapper editor-area">{{displayString}}</div>' +
            '</div>';

        var keyCodes = TrivialComponents.keyCodes;

        function TrivialDateTimeField(originalInput, options) {
            var me = this;

            options = options || {};
            var config = $.extend({
                dateFormat: "MM/DD/YYYY",
                timeFormat: "HH:mm",
                autoComplete: true,
                autoCompleteDelay: 0,
                showTrigger: true,
                editingMode: "editable" // one of 'editable', 'disabled' and 'readonly'
            }, options);

            this.onSelectedEntryChanged = new TrivialComponents.Event();

            var dateListBox;
            var timeListBox;
            var calendarBox;
            var isDropDownOpen = false;

            var dateValue = null; // moment object representing the current value
            var timeValue = null; // moment object representing the current value

            var blurCausedByClickInsideComponent = false;
            var focusGoesToOtherEditor = false;
            var autoCompleteTimeoutId = -1;
            var doNoAutoCompleteBecauseBackspaceWasPressed = false;

            var $originalInput = $(originalInput).addClass("tr-original-input");
            var $dateTimeField = $('<div class="tr-datetimefield tr-input-wrapper"/>')
                .addClass(config.editingMode)
                .insertAfter($originalInput);

            var $editorWrapper = $('<div class="tr-editor-wrapper">').appendTo($dateTimeField);

            var $dateIconWrapper = $('<div class="tr-date-icon-wrapper"/>').appendTo($editorWrapper);
            var $dateEditor = $('<div class="tr-date-editor" contenteditable="true"/>').appendTo($editorWrapper);
            var $timeIconWrapper = $('<div class="tr-time-icon-wrapper"/>').appendTo($editorWrapper);
            var $timeEditor = $('<div class="tr-time-editor" contenteditable="true"/>').appendTo($editorWrapper);

            $dateIconWrapper.click(function () {
                $activeEditor = $dateEditor;
                setActiveBox(calendarBox);
                TrivialComponents.selectElementContents($dateEditor[0], 0, $dateEditor.text().length);
            });
            $timeIconWrapper.click(function () {
                $activeEditor = $timeEditor;
                setActiveBox(calendarBox);
                TrivialComponents.selectElementContents($timeEditor[0], 0, $timeEditor.text().length);
            });

            $dateEditor.focus(function () {
                $activeEditor = $dateEditor;
                if (!blurCausedByClickInsideComponent || focusGoesToOtherEditor) {
                    TrivialComponents.selectElementContents($dateEditor[0], 0, $dateEditor.text().length);
                }
            });
            $timeEditor.focus(function () {
                $activeEditor = $timeEditor;
                if (!blurCausedByClickInsideComponent || focusGoesToOtherEditor) {
                    TrivialComponents.selectElementContents($timeEditor[0], 0, $timeEditor.text().length);
                }
            });

            if (config.showTrigger) {
                var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($dateTimeField);
                $trigger.mousedown(function () {
                    if (isDropDownOpen) {
                        closeDropDown();
                    } else {
                        setTimeout(function () { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                            setActiveBox(calendarBox);
                            $activeEditor.focus();
                            openDropDown();
                        });
                    }
                });
            }
            var $dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(function (e) {
                    return false;
                });
            var dropdownNeeded = config.editingMode == 'editable';
            if (dropdownNeeded) {
                $dropDown.appendTo("body");
            }

            dateListBox = $('<div class="date-listbox">').appendTo($dropDown).TrivialListBox({
                template: dateTemplate
            });
            dateListBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    setDate(selectedEntry, selectedEntry.displayString != (dateValue && dateValue.displayString));
                    dateListBox.selectEntry(null);
                    closeDropDown();
                }
            });
            timeListBox = $('<div class="time-listbox">').appendTo($dropDown).TrivialListBox({
                template: timeTemplate
            });
            timeListBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    setTime(selectedEntry, selectedEntry.displayString != (timeValue && timeValue.displayString));
                    dateListBox.selectEntry(null);
                    closeDropDown();
                }
            });
            calendarBox = $('<div class="calendarbox">').appendTo($dropDown).TrivialCalendarBox({
                firstDayOfWeek: 1,
                mode: 'datetime' // 'date', 'time', 'datetime'
            });
            calendarBox.onChange.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    setTime(selectedEntry, selectedEntry.displayString != (timeValue && timeValue.displayString));
                    dateListBox.selectEntry(null);
                    closeDropDown();
                }
            });

            var $activeEditor;
            function setActiveBox(activeBox) {
                calendarBox.$.toggle(activeBox === calendarBox);
                dateListBox.$.toggle(activeBox === dateListBox);
                timeListBox.$.toggle(activeBox === timeListBox);
            }

            var currentMode; // one of 'date', 'time', 'calendarbox'
            function setCurrentMode(mode) {
                currentMode = mode;
            }

            function getActiveListBox() {
                return currentMode == 'date' ? dateListBox : timeListBox;
            }

            function getActiveEditor() {
                return currentMode == 'date' ? $dateEditor : $timeEditor;
            }

            $activeEditor = $dateEditor;
            setActiveBox(calendarBox);

            $dateEditor.add($timeEditor)
                .focus(function () {
                    $dateTimeField.addClass('focus');
                })
                .blur(function () {
                    if (!blurCausedByClickInsideComponent) {
                        $dateTimeField.removeClass('focus');
                        updateDisplay();
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    if (TrivialComponents.isModifierKey(e)) {
                        return;
                    } else if (e.which == keyCodes.tab) {
                        var highlightedEntry = getActiveListBox().getHighlightedEntry();
                        if (isDropDownOpen && highlightedEntry) {
                            if (getActiveEditor() === $dateEditor) {
                                setDate(highlightedEntry, true);
                            } else {
                                setTime(highlightedEntry, true);
                            }
                        }
                        return;
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        return; // let the user navigate freely left and right...
                    }

                    setCurrentMode(this == $dateEditor[0] ? 'date' : 'time');

                    if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                        doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        getActiveEditor().select();
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (!isDropDownOpen) {
                            query(direction);
                            setActiveBox($activeEditor === $dateEditor ? dateListBox : timeListBox);
                            openDropDown();
                        } else {
                            getActiveListBox().highlightNextEntry(direction);
                            autoCompleteIfPossible(config.autoCompleteDelay);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    } else if (e.which == keyCodes.enter) {
                        if (isDropDownOpen) {
                            e.preventDefault(); // do not submit form
                            var highlightedEntry = getActiveListBox().getHighlightedEntry();
                            if (isDropDownOpen && highlightedEntry) {
                                if (getActiveEditor() === $dateEditor) {
                                    setDate(highlightedEntry, true);
                                } else {
                                    setTime(highlightedEntry, true);
                                }
                            }
                            closeDropDown();
                        }
                    } else if (e.which == keyCodes.escape) {
                        e.preventDefault(); // prevent ie from doing its text field magic...
                        if (!isDropDownOpen) {
                            updateDisplay();
                            TrivialComponents.selectElementContents(getActiveEditor()[0], 0, getActiveEditor().text().length);
                        }
                        closeDropDown();
                    } else {
                        openDropDown();
                        setActiveBox($activeEditor === $dateEditor ? dateListBox : timeListBox);
                        query(1);
                    }
                });

            if ($originalInput.val()) {
                setValue(moment($originalInput.val()));
            } else {
                setValue(null);
            }

            if ($originalInput.attr("tabindex")) {
                $dateEditor.add($timeEditor).attr("tabindex", $originalInput.attr("tabindex"));
            }
            if ($originalInput.attr("autofocus")) {
                $dateEditor.focus();
            }

            $dateTimeField.add($dropDown).mousedown(function (e) {
                if ($dateEditor.is(":focus") || $timeEditor.is(":focus")) {
                    blurCausedByClickInsideComponent = true;
                }
                if (e.target === $dateEditor[0]
                    || e.target === $timeEditor[0]
                    || e.target === $dateIconWrapper[0]
                    || e.target === $timeIconWrapper[0]) {
                    focusGoesToOtherEditor = true;
                    console.log('focusGoesToOtherEditor');
                }
            }).on('mouseup mouseout', function () {
                if (blurCausedByClickInsideComponent && !focusGoesToOtherEditor) {
                    getActiveEditor().focus();
                }
                blurCausedByClickInsideComponent = false;
                focusGoesToOtherEditor = false;
            });

            function query(highlightDirection) {
                // call queryFunction asynchronously to be sure the editor has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    var queryString = getNonSelectedEditorValue();
                    if (getActiveEditor() === $dateEditor) {
                        dateQueryFunction(queryString, function (newEntries) {
                            updateEntries(newEntries, highlightDirection);
                        });
                    } else {
                        timeQueryFunction(queryString, function (newEntries) {
                            updateEntries(newEntries, highlightDirection);
                        });
                    }
                }, 0);
            }

            function fireChangeEvents() {
                $originalInput.trigger("change");
                //me.onSelectedEntryChanged.fire(moment(dateValue).hour(timeValue.hour()).minute(timeValue.minute())); // TODO
            }

            function setDate(newDateValue, fireEvent) {
                dateValue = newDateValue;
                updateDisplay();
                if (fireEvent) {
                    fireChangeEvents();
                }
                // TODO update original input
                // TODO update icon
            }

            function setTime(newTimeValue, fireEvent) {
                timeValue = newTimeValue;
                updateDisplay();
                if (fireEvent) {
                    fireChangeEvents();
                }
                // TODO update original input
                // TODO update icon
            }

            function updateDisplay() {
                if (dateValue) {
                    $dateEditor.text(moment([dateValue.year, dateValue.month - 1, dateValue.day]).format(config.dateFormat));
                    $dateIconWrapper.empty().append(Mustache.render(dateIconTemplate, dateValue));
                } else {
                    $dateEditor.text("");
                    $dateIconWrapper.empty().append(Mustache.render(dateIconTemplate, {}));
                }
                if (timeValue) {
                    $timeEditor.text(moment([1970, 0, 1, timeValue.hour, timeValue.minute]).format(config.timeFormat));
                    $timeIconWrapper.empty().append(Mustache.render(timeIconTemplate, timeValue));
                } else {
                    $timeEditor.text("");
                    $timeIconWrapper.empty().append(Mustache.render(timeIconTemplate, {}));
                }
            }

            function setValue(mom) {
                setDate(createDateComboBoxEntry(mom, config.dateFormat));
                setTime(createTimeComboBoxEntry(mom.hour(), mom.minute(), config.timeFormat));
            }

            var repositionDropDown = function () {
                $dropDown
                    .show()
                    .position({
                        my: "left top",
                        at: "left bottom",
                        of: $dateTimeField,
                        collision: "flip",
                        using: function (calculatedPosition, info) {
                            if (info.vertical === "top") {
                                $dateTimeField.removeClass("dropdown-flipped");
                                $(this).removeClass("flipped");
                            } else {
                                $dateTimeField.addClass("dropdown-flipped");
                                $(this).addClass("flipped");
                            }
                            $(this).css({
                                left: calculatedPosition.left + 'px',
                                top: calculatedPosition.top + 'px'
                            });
                        }
                    })
                    .width($dateTimeField.width());
            };

            function openDropDown() {
                if (dropdownNeeded) {
                    $dateTimeField.addClass("open");
                    repositionDropDown();
                    isDropDownOpen = true;
                }
            }

            function closeDropDown() {
                $dateTimeField.removeClass("open");
                $dropDown.hide();
                isDropDownOpen = false;
            }

            function getNonSelectedEditorValue() {
                var editorText = getActiveEditor().text().replace(String.fromCharCode(160), " ");
                var selection = window.getSelection();
                if (selection.anchorOffset != selection.focusOffset) {
                    return editorText.substring(0, Math.min(selection.anchorOffset, selection.focusOffset));
                } else {
                    return editorText;
                }
            }

            function autoCompleteIfPossible(delay) {
                if (config.autoComplete) {
                    clearTimeout(autoCompleteTimeoutId);

                    var listBox = getActiveListBox();
                    var highlightedEntry = listBox.getHighlightedEntry();
                    if (highlightedEntry && !doNoAutoCompleteBecauseBackspaceWasPressed) {
                        var autoCompletingEntryDisplayValue = highlightedEntry.displayString;
                        if (autoCompletingEntryDisplayValue) {
                            autoCompleteTimeoutId = setTimeout(function () {
                                var oldEditorValue = getNonSelectedEditorValue();
                                var newEditorValue;
                                if (autoCompletingEntryDisplayValue.toLowerCase().indexOf(oldEditorValue.toLowerCase()) === 0) {
                                    newEditorValue = oldEditorValue + autoCompletingEntryDisplayValue.substr(oldEditorValue.length);
                                } else {
                                    newEditorValue = getNonSelectedEditorValue();
                                }
                                getActiveEditor().text(newEditorValue);
                                // $editor[0].offsetHeight;  // we need this to guarantee that the editor has been updated...
                                if (getActiveEditor().is(":focus")) {
                                    TrivialComponents.selectElementContents(getActiveEditor()[0], oldEditorValue.length, newEditorValue.length);
                                }
                            }, delay || 0);
                        }
                    }
                    doNoAutoCompleteBecauseBackspaceWasPressed = false;
                }
            }

            this.$ = $dateTimeField;
            $dateTimeField[0].trivialDateTimeField = this;

            function updateEntries(newEntries, highlightDirection) {
                var listBox = getActiveListBox();

                highlightDirection = highlightDirection === undefined ? 1 : highlightDirection;
                listBox.updateEntries(newEntries);

                var nonSelectedEditorValue = getNonSelectedEditorValue();

                listBox.highlightTextMatches(newEntries.length <= config.textHighlightingEntryLimit ? nonSelectedEditorValue : null);

                listBox.highlightNextEntry(highlightDirection);

                autoCompleteIfPossible(config.autoCompleteDelay);

                if (isDropDownOpen) {
                    openDropDown(); // only for repositioning!
                }
            }

            this.setValue = setValue;
            this.focus = function () {
                getActiveEditor().select();
            };
            this.destroy = function () {
                $originalInput.removeClass('tr-original-input').insertBefore($dateTimeField);
                $dateTimeField.remove();
                $dropDown.remove();
            };


            // ====================== static DATE functions =========================

            function dateQueryFunction(searchString, resultCallback) {
                var suggestions;
                if (searchString.match(/[^\d]/)) {
                    var fragments = searchString.split(/[^\d]/).filter(function (f) {
                        return !!f
                    });
                    suggestions = createSuggestionsForFragments(fragments, moment());
                } else {
                    suggestions = generateSuggestionsForDigitsOnlyInput(searchString, moment());
                }

                // remove duplicates
                var seenMoments = [];
                suggestions = suggestions.filter(function (s) {
                    if (seenMoments.filter(function (seenMoment) {
                            return s.moment.isSame(seenMoment, 'day');
                        }).length > 0) {
                        return false;
                    } else {
                        seenMoments.push(s.moment);
                        return true;
                    }
                });

                // sort by relevance
                var preferredYmdOrder = dateFormatToYmdOrder(config.dateFormat);
                suggestions.sort(function (a, b) {
                    if (a.ymdOrder.length != b.ymdOrder.length) { // D < DM < DMY
                        return a.ymdOrder.length - b.ymdOrder.length;
                    } else if (a.ymdOrder !== b.ymdOrder) {
                        return new Levenshtein(a.ymdOrder, preferredYmdOrder).distance - new Levenshtein(b.ymdOrder, preferredYmdOrder).distance;
                    } else {
                        var today = moment();
                        return a.moment.diff(today, 'days') - b.moment.diff(today, 'days'); // nearer is better
                    }
                });

                resultCallback(suggestions.map(function (s) {
                    return createDateComboBoxEntry(s.moment, config.dateFormat)
                }));
            }


            function createDateComboBoxEntry(m, dateFormat) {
                return {
                    moment: m,
                    day: m.date(),
                    weekDay: m.format('dd'),
                    month: m.month() + 1,
                    year: m.year(),
                    displayString: m.format(dateFormat)
                };
            }

            function dateFormatToYmdOrder(dateFormat) {
                var ymdIndexes = {
                    D: dateFormat.indexOf("D"),
                    M: dateFormat.indexOf("M"),
                    Y: dateFormat.indexOf("Y")
                };
                return ["D", "M", "Y"].sort(function (a, b) {
                    return ymdIndexes[a] - ymdIndexes[b]
                }).join("");
            }

            function createDateParts(moment, ymdOrder) {
                return {moment: moment, ymdOrder: ymdOrder};
            }

            function generateSuggestionsForDigitsOnlyInput(input, today) {
                if (!input) {
                    var result = [];
                    for (var i = 0; i < 7; i++) {
                        result.push(createDateParts(moment(today).add(i, "day"), ""));
                    }
                    return result;
                } else if (input.length > 8) {
                    return [];
                }

                var suggestions = [];
                for (var i = 1; i <= input.length; i++) {
                    for (var j = Math.min(input.length, i + 1); j <= input.length; j - i === 2 ? j += 2 : j++) {
                        suggestions = suggestions.concat(createSuggestionsForFragments([input.substring(0, i), input.substring(i, j), input.substring(j, input.length)], today));
                    }
                }
                return suggestions;
            }

            function createSuggestionsForFragments(fragments, today) {
                function todayOrFuture(m) {
                    return today.isBefore(m, 'day') || today.isSame(m, 'day');
                }

                function numberToYear(n) {
                    var shortYear = today.year() % 100;
                    var yearSuggestionBoundary = (shortYear + 20) % 100; // suggest 20 years into the future and 80 year backwards
                    var currentCentury = Math.floor(today.year() / 100) * 100;
                    if (n < yearSuggestionBoundary) {
                        return currentCentury + n;
                    } else if (n < 100) {
                        return currentCentury - 100 + n;
                    } else if (n > today.year() - 100 && n < today.year() + 100) {
                        return n;
                    } else {
                        return null;
                    }
                }

                var s1 = fragments[0], s2 = fragments[1], s3 = fragments[2];
                var n1 = parseInt(s1), n2 = parseInt(s2), n3 = parseInt(s3);
                var suggestions = [];

                if (s1 && !s2 && !s3) {
                    var momentInCurrentMonth = moment([today.year(), today.month(), s1]);
                    if (momentInCurrentMonth.isValid() && todayOrFuture(momentInCurrentMonth)) {
                        suggestions.push(createDateParts(momentInCurrentMonth, "D"));
                    } else {
                        var momentInNextMonth = moment([today.year() + (today.month() == 11 ? 1 : 0), (today.month() + 1) % 12, s1]);
                        if (momentInNextMonth.isValid()) {
                            suggestions.push(createDateParts(momentInNextMonth, "D"));
                        }
                    }
                } else if (s1 && s2 && !s3) {
                    var mom;
                    mom = moment([moment().year(), n1 - 1, s2]);
                    if (mom.isValid() && todayOrFuture(mom)) {
                        suggestions.push(createDateParts(mom, "MD"));
                    } else {
                        mom = moment([moment().year() + 1, n1 - 1, s2]);
                        if (mom.isValid()) {
                            suggestions.push(createDateParts(mom, "MD"));
                        }
                    }
                    mom = moment([moment().year(), n2 - 1, s1]);
                    if (mom.isValid() && todayOrFuture(mom)) {
                        suggestions.push(createDateParts(mom, "DM"));
                    } else {
                        mom = moment([moment().year() + 1, n2 - 1, s1]);
                        if (mom.isValid()) {
                            suggestions.push(createDateParts(mom, "DM"));
                        }
                    }
                } else { // s1 && s2 && s3
                    var mom;
                    mom = moment([numberToYear(n1), n2 - 1, s3]);
                    if (mom.isValid()) {
                        suggestions.push(createDateParts(mom, "YMD"));
                    }
                    mom = moment([numberToYear(n1), n3 - 1, s2]);
                    if (mom.isValid()) {
                        suggestions.push(createDateParts(mom, "YDM"));
                    }
                    mom = moment([numberToYear(n2), n1 - 1, s3]);
                    if (mom.isValid()) {
                        suggestions.push(createDateParts(mom, "MYD"));
                    }
                    mom = moment([numberToYear(n2), n3 - 1, s1]);
                    if (mom.isValid()) {
                        suggestions.push(createDateParts(mom, "DYM"));
                    }
                    mom = moment([numberToYear(n3), n1 - 1, s2]);
                    if (mom.isValid()) {
                        suggestions.push(createDateParts(mom, "MDY"));
                    }
                    mom = moment([numberToYear(n3), n2 - 1, s1]);
                    if (mom.isValid()) {
                        suggestions.push(createDateParts(mom, "DMY"));
                    }
                }

                return suggestions;
            }

            // ================ static TIME functions =======================

            function timeQueryFunction(searchString, resultCallback) {
                var suggestedValues = [];

                var match = searchString.match(/[^\d]/);
                var colonIndex = match != null ? match.index : null;
                if (colonIndex !== null) {
                    var hourString = searchString.substring(0, colonIndex);
                    var minuteString = searchString.substring(colonIndex + 1);
                    suggestedValues = suggestedValues.concat(createTimeComboBoxEntries(createHourSuggestions(hourString), createMinuteSuggestions(minuteString), config.timeFormat));
                } else if (searchString.length > 0) { // is a number!
                    if (searchString.length >= 2) {
                        var hourString = searchString.substr(0, 2);
                        var minuteString = searchString.substring(2, searchString.length);
                        suggestedValues = suggestedValues.concat(createTimeComboBoxEntries(createHourSuggestions(hourString), createMinuteSuggestions(minuteString), config.timeFormat));
                    }
                    var hourString = searchString.substr(0, 1);
                    var minuteString = searchString.substring(1, searchString.length);
                    if (minuteString.length <= 2) {
                        suggestedValues = suggestedValues.concat(createTimeComboBoxEntries(createHourSuggestions(hourString), createMinuteSuggestions(minuteString), config.timeFormat));
                    }
                } else {
                    suggestedValues = suggestedValues.concat(createTimeComboBoxEntries(intRange(6, 24).concat(intRange(1, 5)), [0], config.timeFormat));
                }

                resultCallback(suggestedValues);
            }

            function intRange(fromInclusive, toInclusive) {
                var ints = [];
                for (var i = fromInclusive; i <= toInclusive; i++) {
                    ints.push(i)
                }
                return ints;
            }

            function pad(num, size) {
                var s = num + "";
                while (s.length < size) s = "0" + s;
                return s;
            }

            function createTimeComboBoxEntry(h, m, timeFormat) {
                return {
                    hour: h,
                    minute: m,
                    hourString: pad(h, 2),
                    minuteString: pad(m, 2),
                    displayString: moment().hour(h).minute(m).format(timeFormat),
                    hourAngle: ((h % 12) + m / 60) * 30,
                    minuteAngle: m * 6,
                    isNight: h < 6 || h >= 20
                };
            }

            function createTimeComboBoxEntries(hourValues, minuteValues, timeFormat) {
                var entries = [];
                for (var i = 0; i < hourValues.length; i++) {
                    var hour = hourValues[i];
                    for (var j = 0; j < minuteValues.length; j++) {
                        var minute = minuteValues[j];
                        entries.push(createTimeComboBoxEntry(hour, minute, timeFormat));
                    }
                }
                return entries;
            }

            function createMinuteSuggestions(minuteString) {
                var m = parseInt(minuteString);
                if (isNaN(m)) {
                    return [0];
                } else if (minuteString.length > 1) {
                    return [m % 60]; // the user entered an exact minute string!
                } else if (m < 6) {
                    return [m * 10];
                } else {
                    return [m % 60];
                }
            }

            function createHourSuggestions(hourString) {
                var h = parseInt(hourString);
                if (isNaN(h)) {
                    return intRange(1, 24);
                    //} else if (h < 10) {
                    //    return [(h + 12) % 24, h]; // afternoon first
                    //} else if (h >= 10 && h < 12) {
                    //    return [h, (h + 12) % 24]; // morning first
                } else if (h < 12) {
                    return [h, (h + 12) % 24]; // morning first

                } else if (h <= 24) {
                    return [h % 24];
                } else {
                    return [];
                }
            }


        }

        TrivialComponents.registerJqueryPlugin(TrivialDateTimeField, "TrivialDateTimeField", "tr-datetimefield");

        return $.fn.TrivialDateTimeField;
    })
);
