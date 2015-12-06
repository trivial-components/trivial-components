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
            define('trivial-unitbox', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.trivialunitbox) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var keyCodes = TrivialComponents.keyCodes;

        function TrivialUnitBox(originalInput, options) {
            options = options || {};
            var config = $.extend({
                unitValueProperty: 'code',
                idProperty: 'code',
                decimalPrecision: 2,
                decimalSeparator: '.',
                thousandsSeparator: ',',
                allowNoValue: false,
                unitDisplayPosition: 'right', // right or left
                inputTextProperty: 'code',
                template: TrivialComponents.currency2LineTemplate,
                selectedEntryTemplate: TrivialComponents.currencySingleLineShortTemplate,
                selectedEntry: undefined,
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                entries: null,
                emptyEntry: {
                    code: '...'
                },
                queryFunction: null, // defined below...
                queryOnNonNumberFields: true,
                openDropdownOnEditorClick: false,
                showTrigger: true,
                matchingOptions: {
                    matchingMode: 'prefix-word',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                }
            }, options);

            config.queryFunction = config.queryFunction || TrivialComponents.defaultListQueryFunctionFactory(config.entries || [], config.matchingOptions);

            var listBox;
            var isDropDownOpen = false;
            var entries = config.entries;
            var selectedEntry = null;
            var blurCausedByClickInsideComponent = false;
            var numberRegex = new RegExp('\\d*\\' + config.decimalSeparator + '?\\d*', 'g');

            var $spinners = $();
            var $originalInput = $(originalInput).addClass("tr-original-input");
            var $editor = $('<input type="text"/>');
            var $unitBox = $('<div class="tr-unitbox tr-input-wrapper"/>').insertAfter($originalInput)
                .addClass(config.unitDisplayPosition === 'left' ? 'unit-display-left' : 'unit-display-right');
            $originalInput.appendTo($unitBox);
            var $selectedEntryAndTriggerWrapper = $('<div class="tr-unitbox-selected-entry-and-trigger-wrapper"/>').appendTo($unitBox);
            var $selectedEntryWrapper = $('<div class="tr-unitbox-selected-entry-wrapper"/>').appendTo($selectedEntryAndTriggerWrapper);
            if (config.showTrigger) {
                var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($selectedEntryAndTriggerWrapper);
            }
            $selectedEntryAndTriggerWrapper.mousedown(function () {
                if (isDropDownOpen) {
                    closeDropDown();
                } else {
                    setTimeout(function () { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                        openDropDown();
                        query();
                    });
                }
                $editor.focus();
            });
            var $dropDown = $('<div class="tr-dropdown"></div>').appendTo("body");


            $editor.prependTo($unitBox).addClass("tr-unitbox-editor tr-editor")
                .focus(function () {
                    if (blurCausedByClickInsideComponent) {
                        // do nothing!
                    } else {
                        $unitBox.addClass('focus');
                        cleanupEditorValue();
                    }
                })
                .blur(function () {
                    if (blurCausedByClickInsideComponent) {
                        $editor.focus();
                    } else {
                        $unitBox.removeClass('focus');
                        formatEditorValue();
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    if (TrivialComponents.isModifierKey(e)) {
                        return;
                    } else if (e.which == keyCodes.tab) {
                        var highlightedEntry = listBox.getHighlightedEntry();
                        if (isDropDownOpen && highlightedEntry) {
                            selectEntry(highlightedEntry);
                        }
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        return; // let the user navigate freely left and right...
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (isDropDownOpen) {
                            listBox.highlightNextEntry(direction);
                        } else {
                            openDropDown();
                            query(direction);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    } else if (isDropDownOpen && e.which == keyCodes.enter) {
                        e.preventDefault(); // do not submit form
                        selectEntry(listBox.getHighlightedEntry());
                        closeDropDown();
                    } else if (e.which == keyCodes.escape) {
                        closeDropDown();
                        cleanupEditorValue();
                    } else if (!e.shiftKey && keyCodes.numberKeys.indexOf(e.which) != -1) {
                        var numberPart = getEditorValueNumberPart();
                        var numberPartDecimalSeparatorIndex = numberPart.indexOf(config.decimalSeparator);
                        var maxDecimalDigitsReached = numberPartDecimalSeparatorIndex != -1 && numberPart.length - (numberPartDecimalSeparatorIndex + 1) >= config.decimalPrecision;

                        var editorValue = $editor.val();
                        var decimalSeparatorIndex = editorValue.indexOf(config.decimalSeparator);
                        var selection = window.getSelection();
                        var wouldAddAnotherDigit = decimalSeparatorIndex !== -1 && $editor[0].selectionEnd > decimalSeparatorIndex && $editor[0].selectionStart === $editor[0].selectionEnd;
                        if (maxDecimalDigitsReached && wouldAddAnotherDigit) {
                            return false;
                        }
                    }
                })
                .keypress(function (e) {
                    var character = String.fromCharCode(e.which);
                    if (character >= '0' && character <= '9') {
                        // was number input...
                    }
                })
                .keyup(function (e) {
                    if (keyCodes.specialKeys.indexOf(e.which) != -1
                        && e.which != keyCodes.backspace
                        && e.which != keyCodes.delete) {
                        // ignore
                    } else if (getQueryString().length > 0 && config.queryOnNonNumberFields) {
                        openDropDown();
                        query(1);
                    } else {
                        closeDropDown();
                    }
                })
                .mousedown(function () {
                    if (config.openDropdownOnEditorClick) {
                        openDropDown();
                        if (entries == null) {
                            query();
                        }
                    }
                }).change(function () {
                updateOriginalInputValue();
                fireChangeEvents();
            });

            $unitBox.add($dropDown).mousedown(function () {
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

            listBox = $dropDown.TrivialListBox(config);
            listBox.$.change(function () {
                var selectedListBoxEntry = listBox.getSelectedEntry();
                if (selectedListBoxEntry) {
                    selectEntry(selectedListBoxEntry, true);
                    listBox.selectEntry(null);
                    updateOriginalInputValue();
                    closeDropDown();
                    fireChangeEvents();
                }
            });

            selectEntry(config.selectedEntry || null);

            var getQueryString = function () {
                return $editor.val().replace(numberRegex, '');
            };

            function getEditorValueNumberPart () {
                var matches = $editor.val().match(numberRegex);
                var rawNumberPart = matches.join('');
                var decimalDeparatorIndex = rawNumberPart.indexOf(config.decimalSeparator);
                var numberPart;
                if (decimalDeparatorIndex !== -1) {
                    var decimalPart = rawNumberPart.substring(decimalDeparatorIndex + 1);
                    numberPart = rawNumberPart.substring(0, decimalDeparatorIndex + 1) + decimalPart.replace(/\D/g, '')
                } else {
                    numberPart = rawNumberPart;
                }
                return numberPart;
            }

            function query(highlightDirection) {
                var $spinner = $(config.spinnerTemplate).appendTo($dropDown);
                $spinners = $spinners.add($spinner);

                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    config.queryFunction(getQueryString(), function (newEntries) {
                        updateEntries(newEntries);

                        var queryString = getQueryString();
                        if (queryString.length > 0) {
                            listBox.highlightTextMatches(queryString);
                        }
                        listBox.highlightNextEntry(highlightDirection);

                        if (isDropDownOpen) {
                            openDropDown(); // only for repositioning!
                        }
                    });
                });
            }

            function fireChangeEvents() {
                $originalInput.trigger("change");
                $unitBox.trigger("change");
            }

            function selectEntry(entry, doNotFireEvents) {
                if (entry == null) {
                    selectedEntry = null;
                    var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, config.emptyEntry))
                        .addClass("tr-combobox-entry")
                        .addClass("empty");
                    $selectedEntryWrapper.empty().append($selectedEntry);
                } else {
                    selectedEntry = entry;
                    var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, entry))
                        .addClass("tr-combobox-entry");
                    $selectedEntryWrapper.empty().append($selectedEntry);
                }
                cleanupEditorValue();
                if (!doNotFireEvents) {
                    fireChangeEvents();
                }
            }

            function formatEditorValue() {
                var numberPart = getEditorValueNumberPart();
                if (numberPart) {
                    var amount = parseFloat(numberPart);
                    var formattedValue = TrivialComponents.formatNumber(amount, config.decimalPrecision, config.decimalSeparator, config.thousandsSeparator);
                    $editor.val(formattedValue);
                } else if (config.allowNoValue) {
                    $editor.val("");
                } else {
                    $editor.val(TrivialComponents.formatNumber(0, config.decimalPrecision, config.decimalSeparator, config.thousandsSeparator));
                }
            }

            function cleanupEditorValue() {
                $editor.val(getEditorValueNumberPart());
            }

            function openDropDown() {
                $unitBox.addClass("open");
                $dropDown
                    .show()
                    .position({
                        my: "left top",
                        at: "left bottom",
                        of: $unitBox,
                        collision: "flip",
                        using: function (calculatedPosition, info) {
                            if (info.vertical === "top") {
                                $unitBox.removeClass("dropdown-flipped");
                                $(this).removeClass("flipped");
                            } else {
                                $unitBox.addClass("dropdown-flipped");
                                $(this).addClass("flipped");
                            }
                            $(this).css({
                                left: calculatedPosition.left + 'px',
                                top: calculatedPosition.top + 'px'
                            });
                        }
                    })
                    .width($unitBox.width());
                isDropDownOpen = true;
            }

            function closeDropDown() {
                $unitBox.removeClass("open");
                $dropDown.hide();
                isDropDownOpen = false;
            }

            var updateOriginalInputValue = function () {
                if (config.unitDisplayPosition === 'left') {
                    $originalInput.val((selectedEntry ? selectedEntry[config.unitValueProperty] : '') + TrivialComponents.formatNumber(getAmount(), config.decimalPrecision, config.decimalSeparator, ''));
                } else {
                    $originalInput.val(TrivialComponents.formatNumber(getAmount(), config.decimalPrecision, config.decimalSeparator, '') + (selectedEntry ? selectedEntry[config.unitValueProperty] : ''));
                }
            };

            function getAmount() {
                return parseFloat(getEditorValueNumberPart() || "0");
            }

            function selectUnit(unitIdentifier) {
                selectEntry(entries.filter(function (entry) {
                    return entry[config.idProperty] === unitIdentifier;
                })[0], true);
            }

            this.$ = $unitBox;
            $unitBox[0].trivialUnitBox = this;

            function updateEntries(newEntries) {
                entries = newEntries;
                $spinners.remove();
                $spinners = $();
                listBox.updateEntries(newEntries);
            }

            this.updateEntries = updateEntries;
            this.getSelectedUnit = function () {
                if (selectedEntry == null) {
                    return null;
                } else {
                    var selectedEntryToReturn = jQuery.extend({}, selectedEntry);
                    selectedEntryToReturn._trEntryElement = undefined;
                    return selectedEntryToReturn;
                }
            };
            this.getAmount = getAmount;
            this.setAmount = function (amount) {
                $editor.val(amount);
            };
            this.selectEntry = selectEntry;
            this.selectUnit = selectUnit;
            this.focus = function () {
                $editor.select();
            };
            this.destroy = function () {
                $originalInput.removeClass('tr-original-input').insertBefore($unitBox);
                $unitBox.remove();
                $dropDown.remove();
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialUnitBox, "TrivialUnitBox", "tr-unitbox");

        return $.fn.TrivialUnitBox;
    })
);