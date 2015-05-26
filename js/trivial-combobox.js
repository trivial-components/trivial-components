/*
 Copyright 2015 Yann Massard (Trivial Components)

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
        define('trivial-combobox', ['jquery', 'mustache'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery', 'mustache'));
    } else if (jQuery && !jQuery.fn.trivialcombobox) {
        // Define using browser globals otherwise
        // Prevent multiple instantiations if the script is loaded twice
        factory(jQuery, Mustache);
    }
}(function ($, Mustache) {

    var keyCodes = {
        backspace: 8,
        tab: 9,
        enter: 13,
        shift: 16,
        ctrl: 17,
        alt: 18,
        pause: 19,
        caps_lock: 20,
        escape: 27,
        page_up: 33,
        page_down: 34,
        end: 35,
        home: 36,
        left_arrow: 37,
        up_arrow: 38,
        right_arrow: 39,
        down_arrow: 40,
        insert: 45,
        delete: 46,
        left_window_key: 91,
        right_window_key: 92,
        select_key: 93,
        num_lock: 144,
        scroll_lock: 145
    };

    var icon2LinesTemplate = '<div class="tr-template-icon-2-lines">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div class="main-line">{{displayValue}}</div> ' +
        '    <div class="additional-info">{{additionalInfo}}</div>' +
        '  </div>' +
        '</div>';
    var iconSingleLineTemplate = '<div class="tr-template-icon-single-line">' +
        '  <div class="img-wrapper" style="background-image: url({{imageUrl}})"></div>' +
        '  <div class="content-wrapper editor-area">{{displayValue}}</div>' +
        '</div>';
    var singleLineTemplate = '<div class="tr-template-single-line">' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div>{{displayValue}}</div> ' +
        '  </div>' +
        '</div>';
    var defaultTemplate = icon2LinesTemplate;
    var defaultSpinnerTemplate = '<div class="tr-default-spinner"><div>Fetching data...</div></div>';
    var defaultNoEntriesTemplate = '<div class="tr-default-no-data-display"><div>No matching entries...</div></div>';
    var defaultQueryFunctionFactory = function (entries, matchingOptions) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trElement;
                if (!queryString || $.trivialMatch($entryElement.text().trim().replace(/\s{2,}/g, ' '), queryString, matchingOptions).length > 0) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        return function (queryString, resultCallback) {
            resultCallback(filterElements(queryString));
        }
    };

    function isModifierKey(e) {
        return [keyCodes.shift, keyCodes.caps_lock, keyCodes.alt, keyCodes.ctrl, keyCodes.left_window_key, keyCodes.right_window_key]
                .indexOf(e.which) != -1;
    }

    function TrivialComboBox(originalInput, options) {
        options = options || {};
        var config = $.extend({
            valueProperty: null,
            inputTextProperty: 'displayValue',
            template: defaultTemplate,
            selectedEntryTemplate: options.template || defaultTemplate,
            spinnerTemplate: defaultSpinnerTemplate,
            noEntriesTemplate: defaultNoEntriesTemplate,
            entries: null,
            selectedEntry: undefined,
            emptyEntry: {},
            queryFunction: null, // defined below...
            autoComplete: true,
            autoCompleteDelay: 0,
            allowFreeText: false,
            showTrigger: true,
            matchingOptions: {
                matchingMode: 'prefix-word',
                ignoreCase: true,
                maxLevenshteinDistance: 2
            }
        }, options);

        config.queryFunction = defaultQueryFunctionFactory(options.entries || [], config.matchingOptions);

        var isDropDownOpen = false;
        var entries = config.entries;
        var selectedEntry = null;
        var highlightedEntry = null;
        var blurCausedByClickInsideComponent = false;
        var autoCompleteTimeoutId = -1;
        var doNoAutoCompleteBecauseBackspaceWasPressed = false;

        var $originalInput = $(originalInput);
        var $comboBox = $('<div class="tr-combobox"/>').insertAfter($originalInput);
        var $selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo($comboBox);
        if (config.showTrigger) {
            var $trigger = $('<div class="tr-combobox-trigger"><span class="tr-combobox-trigger-icon"/></div>').appendTo($comboBox);
            $trigger.mousedown(function () {
                if (isDropDownOpen) {
                    showEditor();
                    closeDropDown();
                } else {
                    setTimeout(function () { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                        showEditor();
                        $editor.select();
                        openDropDown();
                        if (entries == null) {
                            query();
                        }
                    });
                }
            });
        }
        var $dropDown = $('<div class="tr-combobox-dropdown"></div>').appendTo("body");
        var $editor;
        if (config.valueProperty) {
            $originalInput.addClass("tr-original-input");
            $editor = $('<input type="text"/>');
        } else {
            $editor = $originalInput;
        }

        $editor.prependTo($comboBox).addClass("tr-combobox-edit-input")
            .focus(function () {
                if (blurCausedByClickInsideComponent) {
                    // do nothing!
                } else {
                    $comboBox.addClass('focus');
                }
            })
            .blur(function () {
                if (blurCausedByClickInsideComponent) {
                    $editor.focus();
                } else {
                    $comboBox.removeClass('focus');
                    clearEditorIfNotContainsFreeText();
                    hideEditorIfNotContainsFreeText();
                    closeDropDown();
                }
            })
            .keydown(function (e) {
                if (e.which == keyCodes.tab || isModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    showEditor();
                    return; // let the user navigate freely left and right...
                }

                if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                    doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                }

                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                    showEditor();
                    openDropDown();
                    var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                    if (entries != null) {
                        highlightNextEntry(direction);
                        e.preventDefault(); // some browsers move the caret to the beginning on up key
                    } else {
                        query(direction);
                    }
                } else if (isDropDownOpen && e.which == keyCodes.enter) {
                    selectEntry(highlightedEntry);
                    closeDropDown();
                    hideEditorIfNotContainsFreeText();
                    $editor.select();
                } else if (e.which == keyCodes.escape) {
                    closeDropDown();
                    clearEditorIfNotContainsFreeText();
                    hideEditorIfNotContainsFreeText();
                } else {
                    showEditor();
                    openDropDown();
                    query(1);
                }
            })
            .keyup(function (e) {
                if (!isModifierKey(e) && e.which != keyCodes.enter && isEntrySelected() && $editor.val() !== selectedEntry[config.inputTextProperty]) {
                    selectEntry(null);
                } else if (e.which == keyCodes.tab) {
                    showEditor();
                }
            })
            .mousedown(function () {
                openDropDown();
                if (entries == null) {
                    query();
                }
            });

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

        if (entries) { // if config.entries was set...
            updateDropDownEntryElements(entries);
        }

        selectEntry(config.selectedEntry || null);

        $selectedEntryWrapper.click(function () {
            showEditor();
            $editor.select();
            openDropDown();
            if (entries == null) {
                query();
            }
        });

        function updateDropDownEntryElements(entries) {
            $dropDown.empty();
            if (entries.length > 0) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var html = Mustache.render(config.template, entry);
                    var $entry = $(html).addClass("tr-combobox-entry filterable-item").appendTo($dropDown);
                    entry._trElement = $entry;
                    (function (entry) {
                        $entry
                            .mousedown(function () {
                                blurCausedByClickInsideComponent = true;
                                selectEntry(entry);
                                $editor.select();
                                hideEditorIfNotContainsFreeText();
                                closeDropDown();
                            })
                            .mouseup(function () {
                                if (blurCausedByClickInsideComponent) {
                                    $editor.focus();
                                    blurCausedByClickInsideComponent = false;
                                }
                            }).mouseout(function () {
                                if (blurCausedByClickInsideComponent) {
                                    $editor.focus();
                                    blurCausedByClickInsideComponent = false;
                                }
                            })
                            .mouseover(function () {
                                setHighlightedEntry(entry);
                            });
                    })(entry);
                }
            } else {
                $dropDown.append(config.noEntriesTemplate);
            }
        }

        function updateEntries(newEntries, highlightDirection) {
            highlightedEntry = null;
            entries = newEntries;
            updateDropDownEntryElements(entries);

            if (entries.length > 0) {
                highlightTextMatches();

                if (typeof highlightDirection != 'undefined') {
                    highlightNextEntry(highlightDirection);
                }
            } else {
                setHighlightedEntry(null);
            }
        }

        function query(highlightDirection) {
            $dropDown.append(config.spinnerTemplate);

            // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
            setTimeout(function () {
                config.queryFunction($editor.val(), function (newEntries) {
                    updateEntries(newEntries, highlightDirection);
                    if (isDropDownOpen) {
                        openDropDown(); // only for repositioning!
                    }
                });
            });
        }

        function setHighlightedEntry(entry) {
            highlightedEntry = entry;
            $dropDown.find('.tr-combobox-entry').removeClass('tr-highlighted-entry');
            if (entry != null) {
                entry._trElement.addClass('tr-highlighted-entry');
                $dropDown.minimallyScrollTo(entry._trElement);
            }
        }

        function fireChangeEvents() {
            $originalInput.trigger("change");
            $comboBox.trigger("change");
        }

        function selectEntry(entry) {
            if (entry == null) {
                if (config.valueProperty) {
                    $originalInput.val("");
                } // else the $originalInput IS the $editor
                selectedEntry = null;
                var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, config.emptyEntry))
                    .addClass("tr-combobox-entry")
                    .addClass("empty");
                $selectedEntryWrapper.empty().append($selectedEntry);
            } else {
                if (config.valueProperty) {
                    $originalInput.val(entry[config.valueProperty]);
                } // else the $originalInput IS the $editor
                selectedEntry = entry;
                var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, selectedEntry))
                    .addClass("tr-combobox-entry");
                $selectedEntryWrapper.empty().append($selectedEntry);
                $editor.val(selectedEntry[config.inputTextProperty]);
            }
            fireChangeEvents();
        }

        function isEntrySelected() {
            return selectedEntry != null && selectedEntry !== config.emptyEntry;
        }

        function showEditor() {
            var $editorArea = $selectedEntryWrapper.find(".editor-area");
            $editor
                .css({
                    "width": $editorArea.width() + "px",
                    "height": ($editorArea.height()) + "px"
                })
                .position({
                    my: "left top",
                    at: "left top",
                    of: $editorArea
                });
        }

        function clearEditorIfNotContainsFreeText() {
            if (!config.allowFreeText && !isEntrySelected() && ($originalInput.val().length > 0 || $editor.val().length > 0)) {
                $originalInput.val("");
                fireChangeEvents();
                $editor.val("");
                entries = null; // so we will query again when we combobox is re-focused
            }
        }

        function hideEditorIfNotContainsFreeText() {
            if (!(config.allowFreeText && $editor.val().length > 0 && !isEntrySelected())) {
                hideEditor();
            }
        }

        function hideEditor() {
            $editor.width(0).height(0);
        }

        function openDropDown() {
            $comboBox.addClass("open");
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
            isDropDownOpen = true;
        }

        function closeDropDown() {
            $comboBox.removeClass("open");
            $dropDown.hide();
            isDropDownOpen = false;
        }

        function getNonSelectedEditorValue() {
            return $editor.val().substring(0, $editor[0].selectionStart);
        }

        function autoCompleteIfPossible(autoCompletingEntryDisplayValue, delay) {
            clearTimeout(autoCompleteTimeoutId);
            if (!doNoAutoCompleteBecauseBackspaceWasPressed) {
                autoCompleteTimeoutId = setTimeout(function () {
                    var oldEditorValue = getNonSelectedEditorValue();
                    var newEditorValue;
                    if (autoCompletingEntryDisplayValue.toLowerCase().indexOf(oldEditorValue.toLowerCase()) === 0) {
                        newEditorValue = oldEditorValue + autoCompletingEntryDisplayValue.substr(oldEditorValue.length);
                    } else {
                        newEditorValue = getNonSelectedEditorValue();
                    }
                    $editor.val(newEditorValue);
                    setTimeout(function () { // we need this to guarantee that the editor has been updated...
                        $editor[0].setSelectionRange(oldEditorValue.length, newEditorValue.length);
                    }, 0);
                }, delay || 0);
            }
            doNoAutoCompleteBecauseBackspaceWasPressed = false;
        }

        function highlightNextEntry(direction) {
            var newHighlightedEntry = getNextHighlightableEntry(direction);
            if (newHighlightedEntry != null) {
                setHighlightedEntry(newHighlightedEntry);
                if (config.autoComplete) {
                    autoCompleteIfPossible(newHighlightedEntry[config.inputTextProperty], config.autoCompleteDelay);
                }
            }
        }

        function getNextHighlightableEntry(direction) {
            var newHighlightedElementIndex;
            if (entries == null || entries.length == 0) {
                return null;
            } else if (highlightedEntry == null && direction > 0) {
                newHighlightedElementIndex = -1 + direction;
            } else if (highlightedEntry == null && direction < 0) {
                newHighlightedElementIndex = entries.length + direction;
            } else {
                var currentHighlightedElementIndex = entries.indexOf(highlightedEntry);
                newHighlightedElementIndex = (currentHighlightedElementIndex + entries.length + direction) % entries.length;
            }
            return entries[newHighlightedElementIndex];
        }

        function highlightTextMatches() {
            var nonSelectedEditorValue = getNonSelectedEditorValue();
            for (var i = 0; i < entries.length; i++) {
                var $entryElement = entries[i]._trElement;
                $entryElement.trivialHighlight(nonSelectedEditorValue, config.matchingOptions);
            }
        }

        this.$ = $comboBox;
        $comboBox[0].trivialComboBox = this;

        this.updateEntries = updateEntries;
        this.getSelectedEntry = function () {
            if (selectedEntry == null && (!config.allowFreeText || !$editor.val())) {
                return null;
            } else if (selectedEntry == null && config.allowFreeText) {
                var fakeEntry = {
                    _isFakeEntry: true
                };
                fakeEntry[config.inputTextProperty] = $editor.val();
                return fakeEntry;
            } else {
                var selectedEntryToReturn = jQuery.extend({}, selectedEntry);
                selectedEntryToReturn._trElement = undefined;
                return selectedEntryToReturn;
            }
        }
    }

    $.fn.trivialcombobox = function (options) {
        var $comboBoxes = [];
        this.each(function () {
            var existingComboBoxWrapper = $(this).parents('.tr-combobox').addBack('.tr-combobox');
            if (existingComboBoxWrapper.length > 0 && existingComboBoxWrapper[0].trivialComboBox) {
                $comboBoxes.push(existingComboBoxWrapper[0].trivialComboBox.$);
            } else {
                var comboBox = new TrivialComboBox(this, options);
                $comboBoxes.push(comboBox.$);
            }
        });
        return $($comboBoxes);
    };
    $.fn.TrivialComboBox = function (options) {
        var comboBoxes = [];
        this.each(function () {
            var existingComboBoxWrapper = $(this).parents('.tr-combobox').addBack('.tr-combobox');
            if (existingComboBoxWrapper.length > 0 && existingComboBoxWrapper[0].trivialComboBox) {
                comboBoxes.push(existingComboBoxWrapper[0].trivialComboBox);
            } else {
                var comboBox = new TrivialComboBox(this, options);
                comboBoxes.push(comboBox);
            }
        });
        return comboBoxes.length == 1 ? comboBoxes[0] : comboBoxes;
    };

    $.fn.trivialcombobox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.TrivialComboBox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.trivialcombobox.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.TrivialComboBox.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.trivialcombobox.singleLineTemplate = singleLineTemplate;
    $.fn.TrivialComboBox.singleLineTemplate = singleLineTemplate;

    return $.fn.TrivialComboBox;
})
);
