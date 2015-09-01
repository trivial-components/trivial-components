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
        define('trivial-tagbox', ['trivial-core', 'jquery', 'mustache'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
    } else if (jQuery && !jQuery.fn.trivialtagbox) {
        // Define using browser globals otherwise
        // Prevent multiple instantiations if the script is loaded twice
        factory(TrivialComponents, jQuery, Mustache);
    }
}(function (TrivialComponents, $, Mustache) {

    var keyCodes = TrivialComponents.keyCodes;

    function TrivialTagBox(originalInput, options) {
        options = options || {};
        var config = $.extend({
            valueProperty: 'displayValue',
            valueSeparator: ',',
            inputTextProperty: 'displayValue',
            template: TrivialComponents.image2LinesTemplate,
            selectedEntryTemplate: options.template ? TrivialComponents.wrapEntryTemplateWithDefaultTagWrapperTemplate(options.template) : TrivialComponents.wrapEntryTemplateWithDefaultTagWrapperTemplate(TrivialComponents.image2LinesTemplate),
            spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
            noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
            entries: null,
            selectedEntries: [],
            maxSelectedEntries: null,
            queryFunction: null, // defined below...
            autoComplete: true,
            autoCompleteDelay: 0,
            allowFreeText: true,
            freeTextSeparators: [',', ';'],
            freeTextEntryValues: {_isFreeTextEntry: true},
            showTrigger: true,
            distinct: true,
            matchingOptions: {
                matchingMode: 'contains',
                ignoreCase: true,
                maxLevenshteinDistance: 2
            }
        }, options);

        config.queryFunction = config.queryFunction || TrivialComponents.defaultListQueryFunctionFactory(config.entries || [], config.matchingOptions);

        var isDropDownOpen = false;
        var entries = config.entries;
        var selectedEntries = [];
        var highlightedEntry = null;
        var blurCausedByClickInsideComponent = false;
        var autoCompleteTimeoutId = -1;
        var doNoAutoCompleteBecauseBackspaceWasPressed = false;

        var $originalInput = $(originalInput).addClass("tr-original-input");
        var $tagBox = $('<div class="tr-tagbox tr-input-wrapper"/>').insertAfter($originalInput);
        $originalInput.appendTo($tagBox);
        var $tagArea = $('<div class="tr-tagbox-tagarea"/>').appendTo($tagBox);
        if (config.showTrigger) {
            var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($tagBox);
            $trigger.mousedown(function () {
                if (isDropDownOpen) {
                    closeDropDown();
                } else {
                    setTimeout(function () { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                        $editor.select();
                        openDropDown();
                        if (entries == null) {
                            query();
                        }
                    });
                }
            });
        }
        var $dropDown = $('<div class="tr-dropdown"></div>');
        var dropdownNeeded = config.entries && config.entries.length > 0 || options.queryFunction || config.showTrigger;
        if (dropdownNeeded) {
            $dropDown.appendTo("body")
                .scroll(function (e) {
                    return false;
                });
        }
        var $editor = $('<span contenteditable="true" class="tagbox-editor"></span>');

        $editor.appendTo($tagArea).addClass("tr-tagbox-editor")
            .focus(function () {
                if (blurCausedByClickInsideComponent) {
                    // do nothing!
                } else {
                    $tagBox.addClass('focus');
                }
            })
            .blur(function () {
                if (blurCausedByClickInsideComponent) {
                    $editor.focus();
                } else {
                    $tagBox.removeClass('focus');
                    entries = null;
                    closeDropDown();
                    if (config.allowFreeText && $editor.text().trim().length > 0) {
                        var entry = $.extend({}, config.freeTextEntryValues);
                        entry[config.inputTextProperty] = $editor.text();
                        selectEntry(entry);
                    }
                    $editor.text("");
                }
            })
            .keydown(function (e) {
                if (e.which == keyCodes.tab || TrivialComponents.isModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    return; // let the user navigate freely left and right...
                }

                if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                    if ($editor.text() == "") {
                        if (selectedEntries.length > 0) {
                            var tagToBeRemoved = selectedEntries[selectedEntries.length - 1];
                            removeTag(tagToBeRemoved);
                            closeDropDown();
                        }
                    } else {
                        doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                        query(1);
                    }
                    return; // do not open the dropdown.
                }

                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                    openDropDown();
                    var direction = e.which == keyCodes.up_arrow ? -1 : 1;
                    if (entries != null) {
                        highlightNextEntry(direction);
                        return false; // some browsers move the caret to the beginning on up key
                    } else {
                        query(direction);
                    }
                } else if (e.which == keyCodes.enter) {
                    if (isDropDownOpen && highlightedEntry != null) {
                        selectEntry(highlightedEntry);
                        entries = null;
                    } else if (config.allowFreeText && $editor.text().trim().length > 0) {
                        var entry = $.extend({}, config.freeTextEntryValues);
                        entry[config.inputTextProperty] = $editor.text();
                        selectEntry(entry);
                    }
                    closeDropDown();
                } else if (e.which == keyCodes.escape) {
                    closeDropDown();
                    $editor.text("");
                } else {
                    openDropDown();
                    query(1);
                }
            })
            .keyup(function (e) {
                if ($editor.find('*').length > 0) {
                    $editor.text($editor.text()); // removes possible <div> or <br> or whatever the browser likes to put inside...
                }
                if (config.allowFreeText) {
                    var editorValueBeforeCursor = getNonSelectedEditorValue();
                    if (editorValueBeforeCursor.length > 0) {

                        function splitStringBySeparatorChars(s, separatorChars) {
                            return s.split(new RegExp("[" + TrivialComponents.escapeSpecialRegexCharacter(separatorChars.join()) + "]"));
                        }
                        var tagValuesEnteredByUser = splitStringBySeparatorChars(editorValueBeforeCursor, config.freeTextSeparators);

                        for (var i =0; i< tagValuesEnteredByUser.length -1; i++) {
                            var value = tagValuesEnteredByUser[i].trim();
                            if (value.length > 0) {
                                var entry = {};
                                entry[config.inputTextProperty] = value;
                                selectEntry(entry);
                            }
                            $editor.text(tagValuesEnteredByUser[tagValuesEnteredByUser.length - 1]);
                            TrivialComponents.selectElementContents($editor[0], $editor.text().length, $editor.text().length);
                            entries = null;
                            closeDropDown();
                        }
                    }
                }
            })
            .mousedown(function () {
                openDropDown();
                if (entries == null) {
                    query();
                }
            });

        $tagBox.add($dropDown).mousedown(function () {
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

        $tagArea.click(function () {
            $editor.select();
            openDropDown();
            if (entries == null) {
                query();
            }
        });

        for (var i = 0; i < config.selectedEntries.length; i++) {
            selectEntry(config.selectedEntries[i]);
        }

        function updateDropDownEntryElements(entries) {
            $dropDown.empty();
            if (entries.length > 0) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var html = Mustache.render(config.template, entry);
                    var $entry = $(html).addClass("tr-tagbox-entry filterable-item").appendTo($dropDown);
                    entry._trEntryElement = $entry;
                    (function (entry) {
                        $entry
                            .mousedown(function () {
                                blurCausedByClickInsideComponent = true;
                                selectEntry(entry);
                                $editor.select();
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

        function removeTag(tagToBeRemoved) {
            var index = selectedEntries.indexOf(tagToBeRemoved);
            if (index > -1) {
                selectedEntries.splice(index, 1);
            }
            tagToBeRemoved._trEntryElement.remove();
            $originalInput.val(calculateOriginalInputValue());
            fireChangeEvents();
        }

        function query(highlightDirection) {
            $dropDown.append(config.spinnerTemplate);

            // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
            setTimeout(function () {
                config.queryFunction($editor.text().replace(String.fromCharCode(160), " "), function (newEntries) {
                    updateEntries(newEntries, highlightDirection);
                    if (isDropDownOpen) {
                        openDropDown(); // only for repositioning!
                    }
                });
            });
        }

        function setHighlightedEntry(entry) {
            highlightedEntry = entry;
            $dropDown.find('.tr-tagbox-entry').removeClass('tr-highlighted-entry');
            if (entry != null) {
                entry._trEntryElement.addClass('tr-highlighted-entry');
                $dropDown.minimallyScrollTo(entry._trEntryElement);
            }
        }

        function fireChangeEvents() {
            $originalInput.trigger("change");
            $tagBox.trigger("change");
        }

        function calculateOriginalInputValue() {
            return selectedEntries
                .map(function(entry) {return entry[config.valueProperty]})
                .join(config.valueSeparator);
        }

        function selectEntry(entry) {
            if (entry == null) {
                return; // do nothing
            }
            if (config.maxSelectedEntries && selectedEntries.length >= config.maxSelectedEntries) {
                return; // no more entries allowed
            }
            if (config.distinct && selectedEntries.map(function(entry) {return entry[config.valueProperty]}).indexOf(entry[config.valueProperty]) != -1) {
                return; // entry already selected
            }

            var tag = $.extend({}, entry);
            selectedEntries.push(tag);
            $originalInput.val(calculateOriginalInputValue());

            var $entry = $(Mustache.render(config.selectedEntryTemplate, tag));
            $entry.find('.tr-tagbox-tag-remove-button').click(function (e) {
                removeTag(tag);
                return false;
            });

            var $tagWrapper = $('<div class="tr-tagbox-tag"></div>');
            $tagWrapper.append($entry).insertBefore($editor);
            tag._trEntryElement = $tagWrapper;

            $editor.text("");

            fireChangeEvents();
        }

        function repositionDropdown() {
            $dropDown.position({
                my: "left top",
                at: "left bottom",
                of: $tagBox,
                collision: "flip",
                using: function (calculatedPosition, info) {
                    if (info.vertical === "top") {
                        $tagBox.removeClass("dropdown-flipped");
                        $(this).removeClass("flipped");
                    } else {
                        $tagBox.addClass("dropdown-flipped");
                        $(this).addClass("flipped");
                    }
                    $(this).css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            }).width($tagBox.width());
        }

        function openDropDown() {
            if (dropdownNeeded) {
                $tagBox.addClass("open");
                $dropDown.show();
                repositionDropdown();
                isDropDownOpen = true;
            }
        }

        function closeDropDown() {
            $tagBox.removeClass("open");
            $dropDown.hide();
            isDropDownOpen = false;
        }

        function getNonSelectedEditorValue() {
            var editorText = $editor.text().replace(String.fromCharCode(160), " ");
            var selection = window.getSelection();
            if (selection.anchorOffset != selection.focusOffset) {
                return editorText.substring(0, Math.min(window.getSelection().baseOffset, window.getSelection().focusOffset));
            } else {
                return editorText;
            }
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
                    $editor.text(newEditorValue);
                    repositionDropdown(); // the auto-complete might cause a line-break, so the dropdown would cover the editor...
                    setTimeout(function () { // we need this to guarantee that the editor has been updated...
                        TrivialComponents.selectElementContents($editor[0], oldEditorValue.length, newEditorValue.length);
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
                var $entryElement = entries[i]._trEntryElement;
                $entryElement.trivialHighlight(nonSelectedEditorValue, config.matchingOptions);
            }
        }

        this.$ = $tagBox;
        $tagBox[0].trivialTagBox = this;

        this.updateEntries = updateEntries;
        this.getSelectedEntries = function () {
            var selectedEntriesToReturn = [];
            for (var i=0; i<selectedEntries.length; i++) {
                var selectedEntryToReturn = jQuery.extend({}, selectedEntries[i]);
                selectedEntryToReturn._trEntryElement = undefined;
                selectedEntriesToReturn.push(selectedEntryToReturn);
            }
            return selectedEntriesToReturn;
        }
    }

        TrivialComponents.registerJqueryPlugin(TrivialTagBox, "TrivialTagBox", "tr-tagbox");

    return $.fn.TrivialTagBox;
})
);
