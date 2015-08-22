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
                selectedDate: null,
                firstDayOfWeek: 1,
                showTrigger: true
            }, options);

            config.queryFunction = config.queryFunction || TrivialComponents.defaultListQueryFunctionFactory(config.entries || [], config.matchingOptions);

            var dropdownBox;
            var isDropDownOpen = false;
            var entries = config.entries;
            var selectedDate = null;
            var blurCausedByClickInsideComponent = false;
            var doNoAutoCompleteBecauseBackspaceWasPressed = false;

            var $originalInput = $(originalInput);
            var $calendarComboBox = $('<div class="tr-calendarcombobox"/>').insertAfter($originalInput);
            if (config.showTrigger) {
                var $trigger = $('<div class="tr-combobox-trigger"><span class="tr-combobox-trigger-icon"/></div>').appendTo($calendarComboBox);
                $trigger.mousedown(function () {
                    if (isDropDownOpen) {
                        closeDropDown();
                    } else {
                            $editor.select();
                            openDropDown();
                    }
                });
            }
            var $dropDown = $('<div class="tr-calendarcombobox-dropdown tr-combobox-dropdown"></div>').appendTo("body");
            var $editor;
            $originalInput.addClass("tr-original-input");
            $editor = $('<input type="text"/>');

            $editor.prependTo($calendarComboBox).addClass("tr-calendarcombobox-edit-input")
                .focus(function () {
                    if (blurCausedByClickInsideComponent) {
                        // do nothing!
                    } else {
                        $calendarComboBox.addClass('focus');
                    }
                })
                .blur(function () {
                    if (blurCausedByClickInsideComponent) {
                        $editor.focus();
                    } else {
                        $calendarComboBox.removeClass('focus');
                        clearEditorIfNotContainsFreeText();
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                        return; // tab or modifier key was pressed...
                    } else if (!isDropDownOpen && (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow)) {
                        return; // let the user navigate freely left and right...
                    }

                    if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                        doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                    }

                    if (!isDropDownOpen && (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow)) {
                        openDropDown();
                    } else if (e.which == keyCodes.up_arrow) {
                        dropdownBox.navigate('up');
                    } else if (e.which == keyCodes.down_arrow) {
                        dropdownBox.navigate('down');
                    } else if (e.which == keyCodes.left_arrow) {
                        dropdownBox.navigate('left');
                    } else if (e.which == keyCodes.right_arrow) {
                        dropdownBox.navigate('right');
                    } else if (isDropDownOpen && e.which == keyCodes.enter) {
                        closeDropDown();
                        $editor.select();
                    } else if (e.which == keyCodes.escape) {
                        closeDropDown();
                        clearEditorIfNotContainsFreeText();
                    } else {
                        openDropDown();
                        query(1);
                    }
                })
                .mousedown(function () {
                    openDropDown();
                });

            $calendarComboBox.add($dropDown).mousedown(function () {
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

            dropdownBox = $dropDown.TrivialCalendarBox(config);
            dropdownBox.$.change(function () {
                var selectedListBoxEntry = dropdownBox.getSelectedDate();
                if (selectedListBoxEntry) {
                    closeDropDown();
                }
            });

            dropdownBox.setSelectedDate(config.selectedDate || null);

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
        }

        TrivialComponents.registerJqueryPlugin(TrivialCalendarComboBox, "TrivialCalendarComboBox", "tr-calendarcombobox");

        return $.fn.TrivialCalendarComboBox;
    })
);
