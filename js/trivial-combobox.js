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
            define('trivial-combobox', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.trivialcombobox) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        var keyCodes = TrivialComponents.keyCodes;

        function TrivialComboBox(originalInput, options) {
            var me = this;

            options = options || {};
            var config = $.extend({
                valueProperty: null,
                entryRenderingFunction: function (entry) {
                    var template = (entry && entry.template) || TrivialComponents.image2LinesTemplate;
                    return Mustache.render(template, entry);
                },
                selectedEntryRenderingFunction: function (entry) {
                    if (entry && entry.selectedEntryTemplate) {
                        return Mustache.render(entry.selectedEntryTemplate, entry)
                    } else {
                        return config.entryRenderingFunction(entry);
                    }
                },
                selectedEntry: undefined,
                spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                textHighlightingEntryLimit: 100,
                entries: null,
                emptyEntry: {
                    _isEmptyEntry: true
                },
                queryFunction: null, // defined below...
                autoComplete: true,
                autoCompleteDelay: 0,
                entryToEditorTextFunction: function (entry) {
                    return entry["displayValue"];
                },
                autoCompleteFunction: function (editorText, entry) {
                    if (editorText) {
                        for (propertyName in entry) {
                            var propertyValue = entry[propertyName];
                            if (propertyValue && propertyValue.toString().toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                                return propertyValue.toString();
                            }
                        }
                        return null;
                    } else {
                        return config.entryToEditorTextFunction(entry);
                    }
                },
                allowFreeText: false,
                freeTextEntryFactory: function (freeText) {
                    return {
                        displayValue: freeText,
                        _isFreeTextEntry: true
                    };
                },
                showClearButton: false,
                showTrigger: true,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                editingMode: "editable", // one of 'editable', 'disabled' and 'readonly'
                showDropDownOnResultsOnly: false
            }, options);

            config.queryFunction = config.queryFunction || TrivialComponents.defaultListQueryFunctionFactory(config.entries || [], config.matchingOptions);

            this.onSelectedEntryChanged = new TrivialComponents.Event();

            var listBox;
            var isDropDownOpen = false;
            var isEditorVisible = false;
            var lastQueryString = null;
            var lastCompleteInputQueryString = null;
            var entries = config.entries;
            var selectedEntry = null;
            var lastCommittedValue = null;
            var blurCausedByClickInsideComponent = false;
            var autoCompleteTimeoutId = -1;
            var doNoAutoCompleteBecauseBackspaceWasPressed = false;
            var listBoxDirty = true;

            var $spinners = $();
            var $originalInput = $(originalInput);
            var $comboBox = $('<div class="tr-combobox tr-input-wrapper"/>')
                .addClass(config.editingMode)
                .insertAfter($originalInput);
            var $selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo($comboBox);
            if (config.showClearButton) {
                var $clearButton = $('<div class="tr-remove-button">').appendTo($comboBox);
                $clearButton.mousedown(function () {
                    $editor.val("");
                    selectEntry(null, true);
                });
            }
            if (config.showTrigger) {
                var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($comboBox);
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
            var $editor;
            $originalInput.addClass("tr-original-input");
            $editor = $('<input type="text" autocomplete="off"/>');

            $editor.prependTo($comboBox).addClass("tr-combobox-editor tr-editor")
                .focus(function () {
                    if (blurCausedByClickInsideComponent) {
                        // do nothing!
                    } else {
                        $comboBox.addClass('focus');
                        showEditor();
                    }
                })
                .blur(function () {
                    if (blurCausedByClickInsideComponent) {
                        $editor.focus();
                    } else {
                        $comboBox.removeClass('focus');
                        if (editorContainsFreeText()) {
                            if (!TrivialComponents.objectEquals(me.getSelectedEntry(), lastCommittedValue)) {
                                selectEntry(me.getSelectedEntry(), true);
                            }
                        } else {
                            $editor.val("");
                            selectEntry(lastCommittedValue);
                        }
                        hideEditor();
                        closeDropDown();
                    }
                })
                .keydown(function (e) {
                    if (TrivialComponents.isModifierKey(e)) {
                        return;
                    } else if (e.which == keyCodes.tab) {
                        var highlightedEntry = listBox.getHighlightedEntry();
                        if (isDropDownOpen && highlightedEntry) {
                            selectEntry(highlightedEntry, true);
                        } else if (!$editor.val()) {
                            selectEntry(null, true);
                        } else if (config.allowFreeText) {
                            selectEntry(me.getSelectedEntry(), true);
                        }
                        return;
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        showEditor();
                        return; // let the user navigate freely left and right...
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
                            if (!config.showDropDownOnResultsOnly) {
                                openDropDown();
                            }
                        } else {
                            listBox.highlightNextEntry(direction);
                            autoCompleteIfPossible(config.autoCompleteDelay);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    } else if (e.which == keyCodes.enter) {
                        if (isEditorVisible || editorContainsFreeText()) {
                            e.preventDefault(); // do not submit form
                            var highlightedEntry = listBox.getHighlightedEntry();
                            if (isDropDownOpen && highlightedEntry) {
                                selectEntry(highlightedEntry, true);
                            } else if (!$editor.val()) {
                                selectEntry(null, true);
                            } else if (config.allowFreeText) {
                                selectEntry(me.getSelectedEntry(), true);
                            }
                            closeDropDown();
                            hideEditor();
                        }
                    } else if (e.which == keyCodes.escape) {
                        e.preventDefault(); // prevent ie from doing its text field magic...
                        if (!(editorContainsFreeText() && isDropDownOpen)) { // TODO if list is empty, still reset, even if there is freetext.
                            hideEditor();
                            $editor.val("");
                            entries = null; // so we will query again when we combobox is re-focused
                            selectEntry(lastCommittedValue, false);
                        }
                        closeDropDown();
                    } else {
                        if (!isEditorVisible) {
                            showEditor();
                            $editor.select();
                        }
                        if (!config.showDropDownOnResultsOnly) {
                            openDropDown();
                        }

                        setTimeout(function () { // We need the new editor value (after the keydown event). Therefore setTimeout().
                            if ($editor.val()) {
                                query(1);
                            } else {
                                query(0);
                                listBox.setHighlightedEntry(null);
                            }
                        })
                    }
                })
                .keyup(function (e) {
                    if (!TrivialComponents.isModifierKey(e) && [keyCodes.enter, keyCodes.escape, keyCodes.tab].indexOf(e.which) === -1 && isEntrySelected() && $editor.val() !== config.entryToEditorTextFunction(selectedEntry)) {
                        selectEntry(null, false);
                    }
                })
                .mousedown(function () {
                    if (!config.showDropDownOnResultsOnly) {
                        openDropDown();
                    }
                    query();
                });

            if ($originalInput.attr("tabindex")) {
                $editor.attr("tabindex", $originalInput.attr("tabindex"));
            }
            if ($originalInput.attr("autofocus")) {
                $editor.focus();
            }

            $comboBox.add($dropDown).mousedown(function () {
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

            var configWithoutEntries = $.extend({}, config);
            configWithoutEntries.entries = []; // for init performance reasons, initialize the dropdown content lazily
            listBox = $dropDown.TrivialListBox(configWithoutEntries);
            listBox.onSelectedEntryChanged.addListener(function (selectedEntry) {
                if (selectedEntry) {
                    selectEntry(selectedEntry, true, TrivialComponents.objectEquals(selectedEntry, lastCommittedValue));
                    listBox.selectEntry(null);
                    closeDropDown();
                }
                hideEditor();
            });

            selectEntry(config.selectedEntry, true, true);

            $selectedEntryWrapper.click(function () {
                showEditor();
                $editor.select();
                if (!config.showDropDownOnResultsOnly) {
                    openDropDown();
                }
                query();
            });

            function query(highlightDirection) {
                // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                setTimeout(function () {
                    var queryString = getNonSelectedEditorValue();
                    var completeInputString = $editor.val();
                    if (lastQueryString !== queryString || lastCompleteInputQueryString !== completeInputString) {
                        if ($spinners.length === 0) {
                            var $spinner = $(config.spinnerTemplate).appendTo($dropDown);
                            $spinners = $spinners.add($spinner);
                        }
                        config.queryFunction(queryString, {
                            completeInputString: completeInputString,
                            currentlySelectedEntry: selectedEntry
                        }, function (newEntries) {
                            updateEntries(newEntries, highlightDirection);
                            if (config.showDropDownOnResultsOnly && newEntries && newEntries.length > 0 && $editor.is(":focus")) {
                                openDropDown();
                            }
                        });
                        lastQueryString = queryString;
                        lastCompleteInputQueryString = completeInputString;
                    }
                }, 0);
            }

            function fireChangeEvents(entry) {
                $originalInput.trigger("change");
                me.onSelectedEntryChanged.fire(entry);
            }

            function selectEntry(entry, commit, muteEvent) {
                if (entry == null) {
                    if (config.valueProperty) {
                        $originalInput.val("");
                    }
                    selectedEntry = null;
                    var $selectedEntry = $(config.selectedEntryRenderingFunction(config.emptyEntry))
                        .addClass("tr-combobox-entry")
                        .addClass("empty");
                    $selectedEntryWrapper.empty().append($selectedEntry);
                } else {
                    if (config.valueProperty) {
                        $originalInput.val(entry[config.valueProperty]);
                    }
                    selectedEntry = entry;
                    var $selectedEntry = $(config.selectedEntryRenderingFunction(entry))
                        .addClass("tr-combobox-entry");
                    $selectedEntryWrapper.empty().append($selectedEntry);
                    $editor.val(config.entryToEditorTextFunction(entry));
                }
                if (commit) {
                    lastCommittedValue = entry;
                    if (!muteEvent) {
                        fireChangeEvents(entry);
                    }
                }
                if ($clearButton) {
                    $clearButton.toggle(entry != null);
                }
                if (isEditorVisible) {
                    showEditor(); // reposition editor
                }
                if (isDropDownOpen) {
                    repositionDropDown();
                }
            }

            function isEntrySelected() {
                return selectedEntry != null && selectedEntry !== config.emptyEntry;
            }

            function showEditor() {
                var $editorArea = $selectedEntryWrapper.find(".tr-editor-area");
                if ($editorArea.length === 0) {
                    $editorArea = $selectedEntryWrapper;
                }
                $editor
                    .css({
                        "width": Math.min($editorArea[0].offsetWidth, $trigger ? $trigger[0].offsetLeft - $editorArea[0].offsetLeft : 99999999) + "px", // prevent the editor from surpassing the trigger!
                        "height": ($editorArea[0].offsetHeight) + "px"
                    })
                    .position({
                        my: "left top",
                        at: "left top",
                        of: $editorArea
                    });
                isEditorVisible = true;
            }

            var editorContainsFreeText = function () {
                return config.allowFreeText && $editor.val().length > 0 && !isEntrySelected();
            };

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
                        of: $comboBox,
                        collision: "flip",
                        using: function (calculatedPosition, info) {
                            if (info.vertical === "top") {
                                $comboBox.removeClass("dropdown-flipped");
                                $(this).removeClass("flipped");
                            } else {
                                $comboBox.addClass("dropdown-flipped");
                                $(this).addClass("flipped");
                            }
                            $(this).css({
                                left: calculatedPosition.left + 'px',
                                top: calculatedPosition.top + 'px'
                            });
                        }
                    })
                    .width($comboBox.width());
            };

            function openDropDown() {
                if (dropdownNeeded) {
                    if (listBoxDirty) {
                        updateListBoxEntries();
                    }
                    $comboBox.addClass("open");
                    repositionDropDown();
                    isDropDownOpen = true;
                }
            }

            function closeDropDown() {
                $comboBox.removeClass("open");
                $dropDown.hide();
                isDropDownOpen = false;
            }

            function getNonSelectedEditorValue() {
                return $editor.val().substring(0, $editor[0].selectionStart);
            }

            function autoCompleteIfPossible(delay) {
                if (config.autoComplete) {
                    clearTimeout(autoCompleteTimeoutId);
                    var highlightedEntry = listBox.getHighlightedEntry();
                    if (highlightedEntry && !doNoAutoCompleteBecauseBackspaceWasPressed) {
                        autoCompleteTimeoutId = setTimeout(function () {
                            var currentEditorValue = getNonSelectedEditorValue();
                            var autoCompleteString = config.autoCompleteFunction(currentEditorValue, highlightedEntry) || currentEditorValue;
                            $editor.val(currentEditorValue + autoCompleteString.substr(currentEditorValue.length));
                            if ($editor.is(":focus")) {
                                $editor[0].setSelectionRange(currentEditorValue.length, autoCompleteString.length);
                            }
                        }, delay || 0);
                    }
                    doNoAutoCompleteBecauseBackspaceWasPressed = false;
                }
            }

            this.$ = $comboBox;
            $comboBox[0].trivialComboBox = this;

            function updateListBoxEntries() {
                listBox.updateEntries(entries);
                listBoxDirty = false;
            }

            function updateEntries(newEntries, highlightDirection) {
                entries = newEntries;
                $spinners.remove();
                $spinners = $();
                if (isDropDownOpen) {
                    updateListBoxEntries();
                } else {
                    listBoxDirty = true;
                }

                var nonSelectedEditorValue = getNonSelectedEditorValue();

                listBox.highlightTextMatches(newEntries.length <= config.textHighlightingEntryLimit ? nonSelectedEditorValue : null);

                if (highlightDirection == null) {
                    if (selectedEntry) {
                        listBox.setHighlightedEntry(null);
                    } else {
                        listBox.highlightNextEntry(1);
                    }
                } else if (highlightDirection === 0) {
                    listBox.setHighlightedEntry(null)
                } else {
                    listBox.highlightNextEntry(highlightDirection);
                }

                autoCompleteIfPossible(config.autoCompleteDelay);

                if (isDropDownOpen) {
                    openDropDown(); // only for repositioning!
                }
            }

            this.updateEntries = updateEntries;
            this.getSelectedEntry = function () {
                if (selectedEntry == null && (!config.allowFreeText || !$editor.val())) {
                    return null;
                } else if (selectedEntry == null && config.allowFreeText) {
                    return config.freeTextEntryFactory($editor.val());
                } else {
                    var selectedEntryToReturn = jQuery.extend({}, selectedEntry);
                    selectedEntryToReturn._trEntryElement = undefined;
                    return selectedEntryToReturn;
                }
            };
            this.selectEntry = function (entry, muteEvent) {
                selectEntry(entry, true, muteEvent);
            };
            this.focus = function () {
                showEditor();
                $editor.select();
            };
            this.getDropDown = function () {
                return $dropDown;
            };
            this.destroy = function () {
                $originalInput.removeClass('tr-original-input').insertBefore($comboBox);
                $comboBox.remove();
                $dropDown.remove();
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialComboBox, "TrivialComboBox", "tr-combobox");

        return $.fn.TrivialComboBox;
    })
);
