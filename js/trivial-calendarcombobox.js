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
            define('trivial-calendarcombobox', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.trivialcalendarcombobox) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var keyCodes = TrivialComponents.keyCodes;

        function TrivialCalendarComboBox(originalInput, options) {
            options = options || {};
            var config = $.extend({
                selectedDate: moment(),
                firstDayOfWeek: 1,
                showTrigger: true
            }, options);

            var dropdownBox;
            var isDropDownOpen = false;
            var entries = config.entries;
            var selectedDate = null;
            var blurCausedByClickInsideComponent = null;
            var blurCausedByInputFieldSwitching = false;
            var inputTextOnKeyDown;

            var $originalInput = $(originalInput);
            var $calendarComboBox = $('<div class="tr-calendarcombobox tr-input-wrapper"/>').insertAfter($originalInput);
            if (config.showTrigger) {
                var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($calendarComboBox);
                $trigger.mousedown(function () {
                    if (isDropDownOpen) {
                        closeDropDown();
                    } else {
                        if ($inputFields.get().indexOf(document.activeElement) == -1) {
                            $inputFields.first().focus();
                        }
                        openDropDown();
                    }
                    return false;
                });
            }
            var $dropDown = $('<div class="tr-calendarcombobox-dropdown tr-dropdown"></div>').appendTo("body");
            var $editor = $('<div class="tr-formatted-field"></div>');
            var $dayInput = $('<span class="dayInput tr-formatted-input-section tr-2-chars right" contenteditable="true" data-maxlength="2" data-placeholder="TT"></span>').appendTo($editor);
            $editor.append('<span class="separator">.</span>');
            var $monthInput = $('<span class="monthInput tr-formatted-input-section tr-2-chars right" contenteditable="true" data-maxlength="2" data-placeholder="MM"></span>').appendTo($editor);
            $editor.append('<span class="separator">.</span>');
            var $yearInput = $('<span class="yearInput tr-formatted-input-section tr-4-chars right" contenteditable="true" data-maxlength="4" data-placeholder="JJJJ"></span>').appendTo($editor);
            $editor.append('<span class="separator"> &nbsp;&nbsp; </span>');
            var $hourInput = $('<span class="hourInput tr-formatted-input-section tr-2-chars right" contenteditable="true" data-maxlength="2" data-placeholder="ss"></span>').appendTo($editor);
            $editor.append('<span class="separator">:</span>');
            var $minuteInput = $('<span class="minuteInput tr-formatted-input-section tr-2-chars right" contenteditable="true" data-maxlength="2" data-placeholder="mm"></span>').appendTo($editor);

            var $inputFields = $editor.find("[contenteditable='true']");
            //$inputFields.not($inputFields.first()).attr("tabindex", "-1");

            $originalInput.addClass("tr-original-input");

            $inputFields
                .focus(function (e) {
                    if (e.target == $yearInput[0]) {
                        dropdownBox.setKeyboardNavigationState("year");
                    } else if (e.target == $monthInput[0]) {
                        dropdownBox.setKeyboardNavigationState("month");
                    } else if (e.target == $dayInput[0]) {
                        dropdownBox.setKeyboardNavigationState("day");
                    } else if (e.target == $hourInput[0]) {
                        dropdownBox.setKeyboardNavigationState("hour");
                    } else if (e.target == $minuteInput[0]) {
                        dropdownBox.setKeyboardNavigationState("minute");
                    } else if (e.target == $timeZoneInput[0]) {
                        dropdownBox.setKeyboardNavigationState("timeZone");
                    }
                    $calendarComboBox.addClass('focus');
                })
                .blur(function (e) {
                    if (blurCausedByInputFieldSwitching) {
                        // ignore!!
                    } else if (blurCausedByClickInsideComponent) {
                        $(e.target).focus();
                    } else {
                        $calendarComboBox.removeClass('focus');
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    inputTextOnKeyDown = $(this).text();
                    if (TrivialComponents.isModifierKey(e) || e.altKey | e.ctrlKey | e.metaKey) {
                        return; // modifier key or keyboard shortcut was pressed...
                    } else if (e.which == keyCodes.tab) {
                        return !navigateToNextInputField(e.shiftKey ? -1 : 1, true);
                    } else if (!keyCodes.isSpecialKey(e.which) && !keyCodes.isDigitKey(e.which)) {
                        navigateToNextInputField(1, true);
                        return false;     debugger;
                    }

                    if (e.which == keyCodes.up_arrow) {
                        openDropDown();
                        if (e.target == $dayInput[0]) {
                            dropdownBox.navigate("right");
                        } else {
                            dropdownBox.navigate('up');
                        }
                        TrivialComponents.selectElementContents(e.target, 0, $(e.target).text().length);
                        return false;       debugger;
                    } else if (e.which == keyCodes.down_arrow) {
                        openDropDown();
                        if (e.target == $dayInput[0]) {
                            dropdownBox.navigate("left");
                        } else {
                            dropdownBox.navigate('down');
                        }
                        TrivialComponents.selectElementContents(e.target, 0, $(e.target).text().length);
                        return false;        debugger;
                    } else if (e.which == keyCodes.left_arrow) {
                        if (window.getSelection().anchorOffset == 0 && window.getSelection().focusOffset == 0) {
                            return !navigateToNextInputField(-1);
                        }
                    } else if (e.which == keyCodes.right_arrow) {
                        if (window.getSelection().anchorOffset == $(e.target).text().length && window.getSelection().focusOffset == $(e.target).text().length) {
                            return !navigateToNextInputField(1);
                        }
                    } else if (isDropDownOpen && e.which == keyCodes.enter) {
                        closeDropDown();
                        $editor.select();
                    } else if (e.which == keyCodes.escape) {
                        closeDropDown();
                        clearEditorIfNotContainsFreeText();
                    } else {
                        var $this = $(this);
                        var isSpecialKey = keyCodes.isSpecialKey(e.which);
                        var maxLengthReached = $this.text().length >= parseInt($this.attr("data-maxlength"));
                        var wouldAddNewCharacter = window.getSelection().anchorOffset === window.getSelection().focusOffset;
                        if (!isSpecialKey && maxLengthReached && wouldAddNewCharacter) {
                            e.preventDefault();
                        } else {
                            openDropDown();
                        }
                    }
                })
                .keyup(function(e) {
                    if (e.keyCode !== keyCodes.up_arrow && e.keyCodes !== keyCodes.down_arrow && e.keyCode !== keyCodes.left_arrow && e.keyCodes !== keyCodes.right_arrow) {
                        updateDropdown();
                    }
                });

            function navigateToNextInputField(direction, selectText) {
                var fieldIndex = $inputFields.get().indexOf(document.activeElement);
                var newFieldIndex = fieldIndex + direction;
                if (newFieldIndex >= 0 && newFieldIndex < $inputFields.length) {
                    var targetField = $inputFields.eq(newFieldIndex);
                    blurCausedByInputFieldSwitching = true;
                    targetField.focus();
                    if (selectText) {
                        TrivialComponents.selectElementContents(targetField[0], 0, targetField.text().length);
                    } else if (direction == -1) {
                        TrivialComponents.selectElementContents(targetField[0], targetField.text().length);
                    } else {
                        TrivialComponents.selectElementContents(targetField[0], 0);
                    }
                    return true;
                } else {
                    return false;
                }
            }

            function updateDropdown() {
                var mom = moment.utc().year($yearInput.text()).month(parseInt(($monthInput.text()) || 0) - 1).date($dayInput.text()).hour($hourInput.text()).minute($minuteInput.text());
                dropdownBox.setSelectedDate(mom);
            }

            $editor.prependTo($calendarComboBox)
                .mousedown(function (e) {

                    openDropDown();
                    if ($inputFields.get().indexOf(e.target) == -1) {
                        function sleep(milliseconds) {
                            var start = new Date().getTime();
                            for (var i = 0; i < 1e7; i++) {
                                if ((new Date().getTime() - start) > milliseconds) {
                                    break;
                                }
                            }
                        }

                        if ($inputFields.get().indexOf(document.activeElement) != -1) {
                            return false; // make the actual input field not loose the focus when the user clicks somewhere else in the editor
                        } else {
                            $inputFields.first().focus();
                            return false;
                        }
                    }
                });

            if ($originalInput.attr("placeholder")) {  // TODO
                $editor.attr("placeholder", $originalInput.attr("placeholder"));
            }
            if ($originalInput.attr("tabindex")) {
                $inputFields.first().attr("tabindex", $originalInput.attr("tabindex")); // only first!!!
            }
            if ($originalInput.attr("autofocus")) {
                $inputFields.first().focus();
            }


            $calendarComboBox.add($dropDown).add($trigger).mousedown(function (e) {
                if ($calendarComboBox.is(".focus")) {
                    if ($inputFields.get().indexOf(document.activeElement) != -1) {
                        blurCausedByInputFieldSwitching = true;
                    } else {
                        blurCausedByClickInsideComponent = true;
                    }
                }
            }).on("mouseout mouseup", function () {
                if (blurCausedByClickInsideComponent || blurCausedByInputFieldSwitching) {
                    blurCausedByClickInsideComponent = false;
                    blurCausedByInputFieldSwitching = false;
                }
            });

            dropdownBox = $dropDown.TrivialCalendarBox(config);
            dropdownBox.$.change(function () {
                var date = dropdownBox.getSelectedDate();
                if (date) {
                    selectedDate = date;
                    updateInputFieldValues();
                }
            });

            function updateInputFieldValues() {
                if (selectedDate) {
                    $dayInput.text(leadingZeros(selectedDate.date(), 2));
                    $monthInput.text(leadingZeros(selectedDate.month() + 1, 2));
                    $yearInput.text(selectedDate.year());
                    $hourInput.text(leadingZeros(selectedDate.hour(), 2));
                    $minuteInput.text(leadingZeros(selectedDate.minute(), 2));
                }
            }

            function leadingZeros(num, targetStringLength) {
                var s = num + "";
                while (s.length < targetStringLength) s = "0" + s;
                return s;
            }

            selectedDate = config.selectedDate;
            dropdownBox.setSelectedDate(config.selectedDate || null);
            updateInputFieldValues();

            function fireChangeEvents() {
                $originalInput.trigger("change");
                $calendarComboBox.trigger("change");
            }

            function openDropDown() {
                $calendarComboBox.addClass("open");
                $dropDown
                    .show()
                    .position({
                        my: "left top",
                        at: "left bottom",
                        of: $calendarComboBox,
                        collision: "flip",
                        using: function (calculatedPosition, info) {
                            if (info.vertical === "top") {
                                $calendarComboBox.removeClass("dropdown-flipped");
                                $(this).removeClass("flipped");
                            } else {
                                $calendarComboBox.addClass("dropdown-flipped");
                                $(this).addClass("flipped");
                            }
                            $(this).css({
                                left: calculatedPosition.left + 'px',
                                top: calculatedPosition.top + 'px'
                            });
                        }
                    })
                    .width($calendarComboBox.width());
                isDropDownOpen = true;
            }

            function closeDropDown() {
                $calendarComboBox.removeClass("open");
                $dropDown.hide();
                isDropDownOpen = false;
            }

            this.$ = $calendarComboBox;
            $calendarComboBox[0].trivialCalendarComboBox = this;

            this.destroy = function () {
                $originalInput.removeClass('tr-original-input').insertBefore($calendarComboBox);
                $calendarComboBox.remove();
                $dropDown.remove();
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialCalendarComboBox, "TrivialCalendarComboBox", "tr-calendarcombobox");

        return $.fn.TrivialCalendarComboBox;
    })
);
