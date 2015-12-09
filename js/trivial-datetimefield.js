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

        var dateTemplate = '<div class="tr-template-icon-single-line">'
            + '<svg viewBox="0 0 540 540" width="22" height="22" class="calendar-icon">'
            + '<g id="layer1">'
            + '<rect class="calendar-symbol-page-background" x="90" y="90" width="360" height="400" ry="3.8"></rect>'
            + '<rect class="calendar-symbol-color" x="90" y="90" width="360" height="100" ry="3.5"></rect>'
            + '<rect class="calendar-symbol-page" x="90" y="90" width="360" height="400" ry="3.8"></rect>'
            + '<rect class="calendar-symbol-ring" x="140" y="30" width="40" height="120" ry="30.8"></rect>'
            + '<rect class="calendar-symbol-ring" x="250" y="30" width="40" height="120" ry="30.8"></rect>'
            + '<rect class="calendar-symbol-ring" x="360" y="30" width="40" height="120" ry="30.8"></rect>'
            + '<text class="calendar-symbol-date" x="270" y="415" text-anchor="middle">{{weekDay}}</text>'
            + '</g>'
            + '</svg>'
            + '<div class="content-wrapper editor-area">{{completeDateString}}</div>'
            + '</div>';
        var timeTemplate = '<div class="tr-template-icon-single-line">' +
            '<svg class="clock-icon night-{{isNight}}" viewBox="0 0 110 110" width="22" height="22"> ' +
            '<circle class="clockcircle" cx="55" cy="55" r="45"/>' +
            '<g class="hands">' +
            ' <line class="hourhand" x1="55" y1="55" x2="55" y2="35" transform="rotate({{hourAngle}},55,55)"/> ' +
            ' <line class="minutehand" x1="55" y1="55" x2="55" y2="22" transform="rotate({{minuteAngle}},55,55)"/>' +
            '</g> ' +
            '</svg>' +
            '  <div class="content-wrapper editor-area">{{completeTimeString}}</div>' +
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
            var isDropDownOpen = false;
            var isDateEditorVisible = false;
            var isTimeEditorVisible = false;
            var lastDateQueryString = null;
            var lastTimeQueryString = null;
            var selectedDateEntry = null;
            var selectedTimeEntry = null;


            var lastCommittedDate = null; // moment object representing the current value
            var lastCommittedTime = null; // moment object representing the current value

            var blurCausedByClickInsideComponent = false;
            var autoCompleteTimeoutId = -1;
            var doNoAutoCompleteBecauseBackspaceWasPressed = false;

            var $originalInput = $(originalInput);
            var $dateTimeField = $('<div class="tr-dateTimeField tr-input-wrapper"/>')
                .addClass(config.editingMode)
                .insertAfter($originalInput);

            var $selectedDateEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper tr-date-selected-entry-wrapper"/>').appendTo($dateTimeField);
            var $selectedTimeEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper tr-time-selected-entry-wrapper"/>').appendTo($dateTimeField);

            function getActiveSelectedElementWrapper() {
                return currentMode == 'date' ? $selectedDateEntryWrapper : $selectedTimeEntryWrapper;
            }

            function getActiveDropdownBox() {
                return currentMode == 'date' ? dateListBox : timeListBox;
            }

            if (config.showTrigger) {
                var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($dateTimeField);
                $trigger.mousedown(function () {
                    if (isDropDownOpen) {
                        showEditor();
                        closeDropDown();
                    } else {
                        setTimeout(function () { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                            showEditor();
                            $editor.select();
                            openDropDown();
                            query();
                        });
                    }
                });
            }
            var $dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(function (e) {
                    return false;
                });
            var dropdownNeeded = config.editingMode == 'editable' && (config.entries && config.entries.length > 0 || options.queryFunction || config.showTrigger);
            if (dropdownNeeded) {
                $dropDown.appendTo("body");
            }
            $originalInput.addClass("tr-original-input");
            var $editor = $('<input type="text" autocomplete="off" style="background-color: yellow"/>');

            $editor.prependTo($dateTimeField).addClass("tr-combobox-editor tr-editor")
                .focus(function () {
                    if (blurCausedByClickInsideComponent) {
                        // do nothing!
                    } else {
                        $dateTimeField.addClass('focus');
                        showEditor();
                    }
                })
                .blur(function () {
                    if (blurCausedByClickInsideComponent) {
                        $editor.focus();
                    } else {
                        $dateTimeField.removeClass('focus');
                        $editor.val("");
                        selectDateEntry(lastCommittedValue); // TODO handle this correctly for date and time!
                        hideEditor();
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    if (TrivialComponents.isModifierKey(e)) {
                        return;
                    } else if (e.which == keyCodes.tab) {
                        var highlightedEntry = getActiveListBox().getHighlightedEntry();
                        if (isDropDownOpen && highlightedEntry) {
                            selectDateEntry(highlightedEntry, true);
                        }
                        return;
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        showEditor();
                        return; // var the user navigate freely left and right...
                    }

                    if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                        doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        if (!isEditorVisible) {
                            $editor.select();
                            showEditor();
                        }
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (!isDropDownOpen) {
                            query(direction);
                            openDropDown();
                        } else {
                            getActiveListBox().highlightNextEntry(direction);
                            autoCompleteIfPossible(config.autoCompleteDelay);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    } else if (e.which == keyCodes.enter) {
                        if (isDropDownOpen || editorContainsFreeText()) {
                            e.preventDefault(); // do not submit form
                            var highlightedEntry = getActiveListBox().getHighlightedEntry();
                            if (isDropDownOpen && highlightedEntry) {
                                selectDateEntry(highlightedEntry, true);
                            } else if (config.allowFreeText) {
                                selectDateEntry(me.getSelectedEntry(), true);
                            }
                            closeDropDown();
                            hideEditor();
                        }
                    } else if (e.which == keyCodes.escape) {
                        e.preventDefault(); // prevent ie from doing its text field magic...
                        if (!(editorContainsFreeText() && isDropDownOpen)) { // TODO if list is empty, still reset, even if there is freetext.
                            hideEditor();
                            $editor.val("");
                            entries = null; // so we will query again when we dateTimeField is re-focused
                            selectDateEntry(lastCommittedValue, false);
                        }
                        closeDropDown();
                    } else {
                        if (!isEditorVisible) {
                            showEditor();
                            $editor.select();
                        }
                        openDropDown();
                        query(1);
                    }
                })
                .keyup(function (e) {
                    if (!TrivialComponents.isModifierKey(e) && [keyCodes.enter, keyCodes.escape, keyCodes.tab].indexOf(e.which) === -1 && isEntrySelected() && $editor.val() !== selectedEntry[config.inputTextProperty]) {
                        selectDateEntry(null, false);
                    }
                })
                .mousedown(function () {
                    openDropDown();
                    query();
                });

            if ($originalInput.val()) {
                setValue(moment($originalInput.val()));
            } else {
                setValue(null);
            }

            if ($originalInput.attr("tabindex")) {
                $editor.attr("tabindex", $originalInput.attr("tabindex"));
            }
            if ($originalInput.attr("autofocus")) {
                $editor.focus();
            }

            $dateTimeField.add($dropDown).mousedown(function () {
                if ($editor.is(":focus")) {
                    blurCausedByClickInsideComponent = true;
                }
            }).mouseup(function () {
                if (blurCausedByClickInsideComponent) {
                    $editor.focus();
                    blurCausedByClickInsideComponent = false;
                }
            }).mouseout(function () {
                if (blurCausedByClickInsideComponent) {
                    $editor.focus();
                    blurCausedByClickInsideComponent = false;
                }
            });

            dateListBox = $('<div class="date-listbox">').appendTo($dropDown).TrivialListBox({
                template: dateTemplate
            });
            dateListBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    selectDateEntry(selectedEntry, true, TrivialComponents.objectEquals(selectedEntry, lastCommittedValue));
                    dateListBox.selectEntry(null);
                    closeDropDown();
                }
                hideEditor();
            });
            timeListBox = $('<div class="time-listbox">').appendTo($dropDown).TrivialListBox({
                template: timeTemplate
            });
            timeListBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    selectTimeEntry(selectedEntry, true, TrivialComponents.objectEquals(selectedEntry, lastCommittedValue));
                    timeListBox.selectEntry(null);
                    closeDropDown();
                }
                hideEditor();
            });

            function setCurrentMode(mode) {
                currentMode = mode;
                dateListBox.$.toggle(mode === 'date');
                timeListBox.$.toggle(mode === 'time');
            }

            $selectedDateEntryWrapper.add($selectedTimeEntryWrapper).click(function (e) {
                setCurrentMode(e.currentTarget === $selectedDateEntryWrapper[0] ? 'date' : 'time');
                showEditor();
                $editor.select();
                openDropDown();
                query();
            });

            setCurrentMode('date');

            function query(highlightDirection) {
                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    var queryString = getNonSelectedEditorValue();
                    if (currentMode == 'date') {
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

            function fireChangeEvents(entry) {
                $originalInput.trigger("change");
                me.onSelectedEntryChanged.fire(entry);
            }

            function selectDateEntry(entry, commit, muteEvent) {
                if (entry == null) {
                    if (config.valueProperty) {
                        $originalInput.val("");
                    }
                    selectedEntry = null;
                    var $selectedEntry = $(Mustache.render(dateTemplate, {})).addClass("tr-combobox-entry").addClass("empty");
                    $selectedDateEntryWrapper.empty().append($selectedEntry);
                } else {
                    if (config.valueProperty) {
                        $originalInput.val(entry[config.valueProperty]);
                    }
                    selectedEntry = entry;
                    var $selectedEntry = $(Mustache.render(dateTemplate, entry))
                        .addClass("tr-combobox-entry");
                    $selectedDateEntryWrapper.empty().append($selectedEntry);
                    $editor.val(entry[config.inputTextProperty]);
                }
                if (commit) {
                    lastCommittedValue = entry;
                    if (!muteEvent) {
                        fireChangeEvents(entry);
                    }
                }
            }

            function selectTimeEntry(entry, commit, muteEvent) {
                if (entry == null) {
                    if (config.valueProperty) {
                        $originalInput.val("");
                    }
                    selectedEntry = null;
                    var $selectedEntry = $(Mustache.render(timeTemplate, {})).addClass("tr-combobox-entry").addClass("empty");
                    $selectedTimeEntryWrapper.empty().append($selectedEntry);
                } else {
                    if (config.valueProperty) {
                        $originalInput.val(entry[config.valueProperty]);
                    }
                    selectedEntry = entry;
                    var $selectedEntry = $(Mustache.render(timeTemplate, entry)).addClass("tr-combobox-entry");
                    $selectedTimeEntryWrapper.empty().append($selectedEntry);
                    $editor.val(entry[config.inputTextProperty]);
                }
                if (commit) {
                    lastCommittedValue = entry;
                    if (!muteEvent) {
                        fireChangeEvents(entry);
                    }
                }
            }

            function setValue(mom) {
                if (mom == null) {
                    selectDateEntry({}, true, true);
                    selectTimeEntry({}, true, true);
                } else {
                    selectDateEntry(createDateComboBoxEntry(mom, config.dateFormat), true, true);
                    selectTimeEntry(createTimeComboBoxEntry(mom.hour(), mom.minute(), config.timeFormat), true, true);
                }
            }

            function isEntrySelected() {
                return selectedEntry != null && selectedEntry !== config.emptyEntry;
            }

            function showEditor() {
                var $editorArea = getActiveSelectedElementWrapper().find(".editor-area");
                var maxX = currentMode == 'date' ? $selectedTimeEntryWrapper[0].offsetLeft - $editorArea[0].offsetLeft : $trigger ? $trigger[0].offsetLeft - $editorArea[0].offsetLeft : 99999999;
                $editor
                    .css({
                        "width": Math.min($editorArea[0].offsetWidth, maxX) + "px", // prevent the editor from surpassing the trigger!
                        "height": ($editorArea.height()) + "px"
                    })
                    .position({
                        my: "left top",
                        at: "left top",
                        of: $editorArea
                    });
                isEditorVisible = true;
            }

            function hideEditor() {
                $editor.width(0).height(0);
                isEditorVisible = false;
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
                return $editor.val().substring(0, $editor[0].selectionStart);
            }

            function autoCompleteIfPossible(delay) {
                if (config.autoComplete) {
                    clearTimeout(autoCompleteTimeoutId);

                    var listBox = getActiveListBox();
                    var highlightedEntry = listBox.getHighlightedEntry();
                    if (highlightedEntry && !doNoAutoCompleteBecauseBackspaceWasPressed) {
                        var autoCompletingEntryDisplayValue = highlightedEntry[config.inputTextProperty];
                        if (autoCompletingEntryDisplayValue) {
                            autoCompleteTimeoutId = setTimeout(function () {
                                var oldEditorValue = getNonSelectedEditorValue();
                                var newEditorValue;
                                if (autoCompletingEntryDisplayValue.toLowerCase().indexOf(oldEditorValue.toLowerCase()) === 0) {
                                    newEditorValue = oldEditorValue + autoCompletingEntryDisplayValue.substr(oldEditorValue.length);
                                } else {
                                    newEditorValue = getNonSelectedEditorValue();
                                }
                                $editor.val(newEditorValue);
                                // $editor[0].offsetHeight;  // we need this to guarantee that the editor has been updated...
                                if ($editor.is(":focus")) {
                                    $editor[0].setSelectionRange(oldEditorValue.length, newEditorValue.length);
                                }
                            }, delay || 0);
                        }
                    }
                    doNoAutoCompleteBecauseBackspaceWasPressed = false;
                }
            }

            this.$ = $dateTimeField;
            $dateTimeField[0].trivialDateTimeField = this;

            function getActiveListBox() {
                return currentMode == 'date' ? dateListBox : timeListBox;
            }

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

            this.getSelectedEntry = function () {
                if (selectedEntry == null && (!config.allowFreeText || !$editor.val())) {
                    return null;
                } else {
                    var selectedEntryToReturn = jQuery.extend({}, selectedEntry);
                    selectedEntryToReturn._trEntryElement = undefined;
                    return selectedEntryToReturn;
                }
            };
            this.selectEntry = function (entry, muteEvent) {
                selectDateEntry(entry, true, muteEvent);
            };
            this.setValue = setValue;
            this.focus = function () {
                showEditor();
                $editor.select();
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
                    weekDay: m.format('dd'), // see UiRootPanel.setConfig()...
                    month: m.month() + 1,
                    year: m.year(),
                    completeDateString: m.format(dateFormat)
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
                    completeTimeString: moment().hour(h).minute(m).format(timeFormat),
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

        TrivialComponents.registerJqueryPlugin(TrivialDateTimeField, "TrivialDateTimeField", "tr-dateTimeField");

        return $.fn.TrivialDateTimeField;
    })
);
