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
            var me = this;

            options = options || {};
            var config = $.extend({
                unitValueProperty: 'code',
                unitIdProperty: 'code',
                decimalPrecision: 2,
                decimalSeparator: '.',
                thousandsSeparator: ',',
                unitDisplayPosition: 'right', // right or left
                allowNullAmount: true,
                template: TrivialComponents.currency2LineTemplate,
                selectedEntryTemplate: TrivialComponents.currencySingleLineShortTemplate,
                amount: null,
                selectedEntry: undefined,
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                entries: null,
                emptyEntry: {
                    code: '...'
                },
                queryFunction: null, // defined below...
                queryOnNonNumberCharacters: true,
                openDropdownOnEditorClick: false,
                showTrigger: true,
                matchingOptions: {
                    matchingMode: 'prefix-word',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                }
            }, options);

            config.queryFunction = config.queryFunction || TrivialComponents.defaultListQueryFunctionFactory(config.entries || [], config.matchingOptions);

            this.onChange = new TrivialComponents.Event();
            this.onSelectedEntryChanged = new TrivialComponents.Event();

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
                $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($selectedEntryAndTriggerWrapper);
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
                        var selectionStart = $editor[0].selectionStart;
                        var selectionEnd = $editor[0].selectionEnd;
                        var wouldAddAnotherDigit = decimalSeparatorIndex !== -1 && selectionEnd > decimalSeparatorIndex && selectionStart === selectionEnd;
                        if (maxDecimalDigitsReached && wouldAddAnotherDigit) {
                            if (/^\d$/.test(editorValue[selectionEnd])) {
                                $editor.val(editorValue.substring(0, selectionEnd) + editorValue.substring(selectionEnd + 1)); // override the following digit
                                
                                $editor[0].setSelectionRange(selectionEnd, selectionEnd);
                            } else {
                                return false; // cannot add another digit!
                            }
                        }
                    }
                })
                .keyup(function (e) {
                    if (keyCodes.specialKeys.indexOf(e.which) != -1
                        && e.which != keyCodes.backspace
                        && e.which != keyCodes.delete) {
                        return; // ignore
                    }
                    var hasDoubleDecimalSeparator = new RegExp("(?:\\" + config.decimalSeparator + ".*)" + "\\" + config.decimalSeparator, "g").test($editor.val());
                    if (hasDoubleDecimalSeparator) {
                        cleanupEditorValue();
                        $editor[0].setSelectionRange($editor.val().length - config.decimalPrecision, $editor.val().length - config.decimalPrecision);
                    }
                    if (config.queryOnNonNumberCharacters) {
                        if (getQueryString().length > 0) {
                            openDropDown();
                            query(1);
                        } else {
                            closeDropDown();
                        }
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
                }
            );

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
            listBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    selectEntry(selectedEntry, false);
                    listBox.selectEntry(null);
                    closeDropDown();
                }
            });

            $editor.val(config.amount || $originalInput.amount);
            selectEntry(config.selectedEntry || null, true);

            var getQueryString = function () {
                return $editor.val().replace(numberRegex, '');
            };

            function getEditorValueNumberPart(fillupDecimals) {
                var rawNumber = $editor.val().match(numberRegex).join('');
                var decimalDeparatorIndex = rawNumber.indexOf(config.decimalSeparator);

                var integerPart;
                var fractionalPart;
                if (decimalDeparatorIndex !== -1) {
                    integerPart = rawNumber.substring(0, decimalDeparatorIndex);
                    fractionalPart = rawNumber.substring(decimalDeparatorIndex + 1, rawNumber.length).replace(/\D/g, '');
                } else {
                    integerPart = rawNumber;
                    fractionalPart = "";
                }

                if (integerPart.length == 0 && fractionalPart == 0) {
                    return "";
                } else {
                    if (fillupDecimals) {
                        fractionalPart = (fractionalPart + new Array(config.decimalPrecision + 1).join("0")).substr(0, config.decimalPrecision);
                    }
                    return integerPart + config.decimalSeparator + fractionalPart;
                }
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

            function fireSelectedEntryChangedEvent() {
                me.onSelectedEntryChanged.fire(selectedEntry);
            }

            function fireChangeEvents() {
                $originalInput.trigger("change");
                me.onChange.fire({
                    unit: selectedEntry != null ? selectedEntry[config.unitValueProperty] : null,
                    unitEntry: selectedEntry,
                    amount: getAmount(),
                    amountAsFloatingPointNumber: parseFloat(formatAmount(getAmount(), config.decimalPrecision, config.decimalSeparator, config.thousandsSeparator))
                });
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
                updateOriginalInputValue();
                if (!doNotFireEvents) {
                    fireSelectedEntryChangedEvent();
                }
            }

            function formatEditorValue() {
                $editor.val(formatAmount(getAmount(), config.decimalPrecision, config.decimalSeparator, config.thousandsSeparator));
            }

            function cleanupEditorValue() {
                if ($editor.val()) {
                    $editor.val(getEditorValueNumberPart(true));  
                }
            }

            function formatAmount(integerNumber, precision, decimalSeparator, thousandsSeparator) {
                if (integerNumber == null || isNaN(integerNumber)) {
                    return "";
                }
                var amountAsString = "" + integerNumber;
                if (amountAsString.length <= config.decimalPrecision) {
                    return 0 + config.decimalSeparator + new Array(config.decimalPrecision - amountAsString.length + 1).join("0") + amountAsString;
                } else {
                    var integerPart = amountAsString.substring(0, amountAsString.length - precision);
                    var formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator); // see http://stackoverflow.com/a/2901298/524913
                    var fractionalPart = amountAsString.substr(amountAsString.length - precision, precision);
                    return formattedIntegerPart + decimalSeparator + fractionalPart;
                }
            }

            var repositionDropDown = function () {
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
            };

            function openDropDown() {
                $unitBox.addClass("open");
                repositionDropDown();
                isDropDownOpen = true;
            }

            function closeDropDown() {
                $unitBox.removeClass("open");
                $dropDown.hide();
                isDropDownOpen = false;
            }

            function updateOriginalInputValue () {
                if (config.unitDisplayPosition === 'left') {
                    $originalInput.val((selectedEntry ? selectedEntry[config.unitValueProperty] : '') + formatAmount(getAmount(), config.decimalPrecision, config.decimalSeparator, ''));   
                } else {
                    $originalInput.val(formatAmount(getAmount(), config.decimalPrecision, config.decimalSeparator, '') + (selectedEntry ? selectedEntry[config.unitValueProperty] : ''));   
                }
            }

            function getAmount() {
                var editorValueNumberPart = getEditorValueNumberPart(false);
                if (editorValueNumberPart.length === 0 && config.allowNullAmount) {
                    return null;
                } else {
                    return parseInt(getEditorValueNumberPart(true).replace(/\D/g, ""));
                }
            }

            function selectUnit(unitIdentifier) {
                selectEntry(entries.filter(function (entry) {
                    return entry[config.unitIdProperty] === unitIdentifier;
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
                if (amount == null) {
                    $editor.val("");
                } else if ($editor.is(":focus")) {
                    $editor.val(formatAmount(amount, config.decimalPrecision, config.decimalSeparator, ''));          
                } else {
                    $editor.val(formatAmount(amount, config.decimalPrecision, config.decimalSeparator, config.thousandsSeparator));    
                }
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