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
                decimalSeparator: '.',
                decimalPrecision: 2,
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
                autoComplete: true,
                autoCompleteDelay: 0,
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
            var autoCompleteTimeoutId = -1;
            var doNoAutoCompleteBecauseBackspaceWasPressed = false;
            var numberRegex = new RegExp('\\d+(?:\\' + config.decimalSeparator + '\\d*)?');
            var queryCharacterRegex = new RegExp('[^\\d\\' + config.decimalSeparator + ' ]');
            var lastQueryCharacterRegex = new RegExp('[^\\d\\' + config.decimalSeparator + ' ](?=[\\d\\' + config.decimalSeparator + ' ]*$)');

            var $spinners = $();
            var $originalInput = $(originalInput).addClass("tr-original-input");
            var $editor = $('<input type="text"/>');
            var $unitBox = $('<div class="tr-unitbox"/>').insertAfter($originalInput)
                .addClass(config.unitDisplayPosition === 'left' ? 'unit-display-left' : 'unit-display-right');
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


            $editor.prependTo($unitBox).addClass("tr-unitbox-edit-input")
                .focus(function () {
                    if (blurCausedByClickInsideComponent) {
                        // do nothing!
                    } else {
                        $unitBox.addClass('focus');
                    }
                })
                .blur(function () {
                    if (blurCausedByClickInsideComponent) {
                        $editor.focus();
                    } else {
                        $unitBox.removeClass('focus');
                        cleanUpEditorValue();
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                        return; // tab or modifier key was pressed...
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        return; // let the user navigate freely left and right...
                    }

                    if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                        doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (isDropDownOpen) {
                            listBox.highlightNextEntry(direction);
                            autoCompleteIfPossible(config.autoCompleteDelay);
                        } else {
                            openDropDown();
                            query(direction);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    } else if (isDropDownOpen && e.which == keyCodes.enter) {
                        selectEntry(listBox.getHighlightedEntry());
                        closeDropDown();
                    } else if (e.which == keyCodes.escape) {
                        closeDropDown();
                        cleanUpEditorValue();
                    } else if (!e.shiftKey && keyCodes.numberKeys.indexOf(e.which) != -1) {
                        var numberPart = getEditorValueNumberPart();
                        var decimalSeparatorIndex = numberPart.indexOf(config.decimalSeparator);
                        if (decimalSeparatorIndex != -1 && numberPart.length - (decimalSeparatorIndex + 1) >= config.decimalPrecision) {
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
                    } else if (getQueryString().length > 0) {
                        openDropDown();
                        query(1);
                    } else {
                        closeDropDown();
                    }
                })
                .mousedown(function () {
                    openDropDown();
                    if (entries == null) {
                        query();
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
                var nonSelectedEditorValue = getNonAutoCompleteEditorValue();
                var firstQueryCharacterIndex = nonSelectedEditorValue.search(queryCharacterRegex);
                var lastQueryCharacterIndex = nonSelectedEditorValue.search(lastQueryCharacterRegex);
                if (firstQueryCharacterIndex != -1) {
                    return nonSelectedEditorValue.substring(firstQueryCharacterIndex, lastQueryCharacterIndex + 1);
                } else {
                    return "";
                }
            };

            var getEditorValueNumberPart = function () {
                var match = numberRegex.exec($editor.val());
                if (match) {
                    return match[0];
                } else {
                    return "";
                }
            };

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
                            listBox.highlightNextMatchingEntry(highlightDirection);
                        } else {
                            listBox.highlightNextEntry(highlightDirection);
                        }

                        autoCompleteIfPossible(config.autoCompleteDelay);

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
                cleanUpEditorValue();
                if (!doNotFireEvents) {
                    fireChangeEvents();
                }
            }

            function cleanUpEditorValue() {
                var match = /[\d\.]+/.exec($editor.val());
                if (match) {
                    $editor.val($editor.val().substr(match.index, match[0].length));
                } else {
                    $editor.val("");
                }
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

            function getNonAutoCompleteEditorValue() {
                if ($editor[0].selectionStart < $editor[0].selectionEnd && $editor[0].selectionEnd === $editor.val().length) {
                    return $editor.val().substring(0, $editor[0].selectionStart);
                } else {
                    return $editor.val();
                }
            }

            function autoCompleteIfPossible(delay) {
                if (config.autoComplete) {
                    clearTimeout(autoCompleteTimeoutId);

                    var highlightedEntry = listBox.getHighlightedEntry();
                    if (highlightedEntry && !doNoAutoCompleteBecauseBackspaceWasPressed) {
                        var autoCompletingEntryDisplayValue = highlightedEntry[config.inputTextProperty];
                        autoCompleteTimeoutId = setTimeout(function () {
                            var nonSelectedEditorValue = getNonAutoCompleteEditorValue();
                            var queryString = getQueryString();
                            var newEditorValue;
                            if (autoCompletingEntryDisplayValue.toLowerCase().indexOf(queryString.toLowerCase()) === 0) {
                                newEditorValue = nonSelectedEditorValue + autoCompletingEntryDisplayValue.substr(queryString.length);
                            } else {
                                newEditorValue = getNonAutoCompleteEditorValue();
                            }
                            $editor.val(newEditorValue);
                            setTimeout(function () { // we need this to guarantee that the editor has been updated...
                                $editor[0].setSelectionRange(nonSelectedEditorValue.length, newEditorValue.length);
                            }, 0);
                        }, delay || 0);
                    }
                    doNoAutoCompleteBecauseBackspaceWasPressed = false;
                }
            }

            var updateOriginalInputValue = function () {
                if (config.unitDisplayPosition === 'left') {
                    $originalInput.val((selectedEntry ? selectedEntry[config.unitValueProperty] : '') + ' ' + getAmount());
                } else {
                    $originalInput.val(getAmount() + ' ' + (selectedEntry ? selectedEntry[config.unitValueProperty] : ''));
                }
            };

            function getAmount() {
                var numberMatch = $editor.val().match(numberRegex);
                return numberMatch && numberMatch[0];
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
            this.selectEntry = selectEntry;
        }

        TrivialComponents.registerJqueryPlugin(TrivialUnitBox, "TrivialUnitBox", "tr-unitbox");

        return $.fn.TrivialUnitBox;
    })
);