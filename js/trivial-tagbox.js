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
                var me = this;

                options = options || {};
                var config = $.extend({
                    valueProperty: 'displayValue',
                    valueSeparator: ',',
                    entryRenderingFunction: function (entry) {
                        var template = entry.template || TrivialComponents.image2LinesTemplate;
                        return Mustache.render(template, entry);
                    },
                    selectedEntryRenderingFunction: function (entry) {
                        if (entry.selectedEntryTemplate) {
                            return Mustache.render(entry.selectedEntryTemplate, entry)
                        } else {
                            return TrivialComponents.wrapWithDefaultTagWrapper(config.entryRenderingFunction(entry));
                        }
                    },
                    spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                    noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                    textHighlightingEntryLimit: 100,
                    finalEntryProperty: "finalEntry", // this property determines if the tag is completed after selection of the entry. If not, the next tag will be appended to this one.
                    entries: null,
                    selectedEntries: [],
                    maxSelectedEntries: null,
                    queryFunction: null, // defined below...
                    autoComplete: true,
                    autoCompleteDelay: 0,
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
                            return null;
                        }
                    },
                    allowFreeText: false,
                    freeTextSeparators: [',', ';'],
                    freeTextEntryFactory: function (freeText) {
                        return {
                            displayValue: freeText,
                            _isFreeTextEntry: true
                        };
                    },
                    showTrigger: true,
                    distinct: true,
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
                this.onFocus = new TrivialComponents.Event();
                this.onBlur = new TrivialComponents.Event();

                var listBox;
                var isDropDownOpen = false;
                var lastQueryString = null;
                var lastCompleteInputQueryString = null;
                var entries = config.entries;
                var selectedEntries = [];
                var blurCausedByClickInsideComponent = false;
                var autoCompleteTimeoutId = -1;
                var doNoAutoCompleteBecauseBackspaceWasPressed = false;
                var listBoxDirty = true;
                var editingMode;

                var $spinners = $();
                var $originalInput = $(originalInput).addClass("tr-original-input");
                var $tagBox = $('<div class="tr-tagbox tr-input-wrapper"/>')
                    .insertAfter($originalInput);
                $originalInput.appendTo($tagBox);
                var $tagArea = $('<div class="tr-tagbox-tagarea"/>').appendTo($tagBox);
                if (config.showTrigger) {
                    var $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo($tagBox);
                    $trigger.mousedown(function () {
                        $editor.focus();
                        if (isDropDownOpen) {
                            closeDropDown();
                        } else {
                            setTimeout(function () { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
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
                var $dropDownTargetElement = $("body");
                setEditingMode(config.editingMode);
                var $editor = $('<span contenteditable="true" class="tagbox-editor" autocomplete="off"></span>');

                $editor.appendTo($tagArea).addClass("tr-tagbox-editor tr-editor")
                    .focus(function () {
                        if (blurCausedByClickInsideComponent) {
                            // do nothing!
                        } else {
                            $originalInput.triggerHandler('focus');
                            me.onFocus.fire();
                            $tagBox.addClass('focus');
                        }
                        setTimeout(function () { // the editor needs to apply its new css sheets (:focus) before we scroll to it...
                            $tagArea.minimallyScrollTo($editor);
                        });
                    })
                    .blur(function () {
                        if (blurCausedByClickInsideComponent) {
                            $editor.focus();
                        } else {
                            $originalInput.triggerHandler('blur');
                            me.onBlur.fire();
                            $tagBox.removeClass('focus');
                            entries = null;
                            closeDropDown();
                            if (config.allowFreeText && $editor.text().trim().length > 0) {
                                selectEntry(config.freeTextEntryFactory($editor.text()));
                            }
                            $editor.text("");
                            //fireChangeEvents(me.getSelectedEntries());
                        }
                    })
                    .keydown(function (e) {
                        if (TrivialComponents.isModifierKey(e)) {
                            return; // tab or modifier key was pressed...
                        } else if (e.which == keyCodes.tab) {
                            var highlightedEntry = listBox.getHighlightedEntry();
                            if (isDropDownOpen && highlightedEntry) {
                                selectEntry(highlightedEntry);
                            }
                            return;
                        } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                            if (e.which == keyCodes.left_arrow && $editor.text().length === 0 && window.getSelection().anchorOffset === 0) {
                                if ($editor.prev()) {
                                    $editor.insertBefore($editor.prev());
                                    $editor.focus();
                                }
                            } else if (e.which == keyCodes.right_arrow && $editor.text().length === 0 && window.getSelection().anchorOffset === 0) {
                                if ($editor.next()) {
                                    $editor.insertAfter($editor.next());
                                    $editor.focus();
                                }
                            }
                            return;
                        }

                        if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                            if ($editor.text() == "") {
                                var tagToBeRemoved = selectedEntries[$editor.index() + (e.which == keyCodes.backspace ? -1 : 0)];
                                if (tagToBeRemoved) {
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
                            var highlightedEntry = listBox.getHighlightedEntry();
                            if (isDropDownOpen && highlightedEntry != null) {
                                selectEntry(highlightedEntry);
                                entries = null;
                            } else if (config.allowFreeText && $editor.text().trim().length > 0) {
                                selectEntry(config.freeTextEntryFactory($editor.text()));
                            }
                            closeDropDown();
                        } else if (e.which == keyCodes.escape) {
                            closeDropDown();
                            $editor.text("");
                        } else {
                            if (!config.showDropDownOnResultsOnly) {
                                openDropDown();
                            }
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
                                    console.log(s);
                                    console.log(s.split(new RegExp("[" + TrivialComponents.escapeSpecialRegexCharacter(separatorChars.join()) + "]")))
                                    return s.split(new RegExp("[" + TrivialComponents.escapeSpecialRegexCharacter(separatorChars.join()) + "]"));
                                }

                                var tagValuesEnteredByUser = splitStringBySeparatorChars(editorValueBeforeCursor, config.freeTextSeparators);

                                for (var i = 0; i < tagValuesEnteredByUser.length - 1; i++) {
                                    var value = tagValuesEnteredByUser[i].trim();
                                    if (value.length > 0) {
                                        selectEntry(config.freeTextEntryFactory(value));
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
                        if (!config.showDropDownOnResultsOnly) {
                            openDropDown();
                        }
                        query();
                    });


                if ($originalInput.attr("placeholder")) {
                    $editor.attr("placeholder", $originalInput.attr("placeholder"));
                }
                if ($originalInput.attr("tabindex")) {
                    $editor.attr("tabindex", $originalInput.attr("tabindex"));
                }
                if ($originalInput.attr("autofocus")) {
                    $editor.focus();
                }

                $tagBox.add($dropDown).mousedown(function (e) {
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
                        selectEntry(selectedEntry);
                        listBox.selectEntry(null);
                        closeDropDown();
                    }
                });

                selectEntry(config.selectedEntry, true, true);

                $tagArea.click(function (e) {
                    if (!config.showDropDownOnResultsOnly) {
                        openDropDown();
                    }
                    query();

                    // find the tag in the same row as the click with the smallest distance to the click
                    var $tagWithSmallestDistance = null;
                    var smallestDistanceX = 1000000;
                    for (var i = 0; i < selectedEntries.length; i++) {
                        var selectedEntry = selectedEntries[i];
                        var $tag = selectedEntry._trEntryElement;
                        var tagBoundingRect = $tag[0].getBoundingClientRect();
                        var sameRow = e.clientY >= tagBoundingRect.top && e.clientY < tagBoundingRect.bottom;
                        var sameCol = e.clientX >= tagBoundingRect.left && e.clientX < tagBoundingRect.right;
                        var distanceX = sameCol ? 0 : Math.min(Math.abs(e.clientX - tagBoundingRect.left), Math.abs(e.clientX - tagBoundingRect.right));
                        if (sameRow && distanceX < smallestDistanceX) {
                            $tagWithSmallestDistance = $tag;
                            smallestDistanceX = distanceX;
                            if (distanceX === 0) {
                                break;
                            }
                        }
                    }
                    if ($tagWithSmallestDistance) {
                        var tagBoundingRect = $tagWithSmallestDistance[0].getBoundingClientRect();
                        var isRightSide = e.clientX > (tagBoundingRect.left + tagBoundingRect.right) / 2;
                        if (isRightSide) {
                            $editor.insertAfter($tagWithSmallestDistance);
                        } else {
                            $editor.insertBefore($tagWithSmallestDistance);
                        }
                    }
                    $editor.focus();
                });

                for (var i = 0; i < config.selectedEntries.length; i++) {
                    selectEntry(config.selectedEntries[i], true);
                }

                function updateListBoxEntries() {
                    listBox.updateEntries(entries);
                    listBoxDirty = false;
                }

                function updateEntries(newEntries, highlightDirection) {
                    blurCausedByClickInsideComponent = false; // if the entries are updated as a reaction of a user selecting an entry, there is no mouseup or mouseout event. Therefore, we must ensure that this flag is unset.

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

                    if (highlightDirection) {
                        listBox.highlightNextEntry(highlightDirection);
                    } else {
                        listBox.setHighlightedEntry(null);
                    }

                    autoCompleteIfPossible(config.autoCompleteDelay);

                    if (isDropDownOpen) {
                        openDropDown(); // only for repositioning!
                    }
                }

                function removeTag(tagToBeRemoved) {
                    var index = selectedEntries.indexOf(tagToBeRemoved);
                    if (index > -1) {
                        selectedEntries.splice(index, 1);
                    }
                    tagToBeRemoved._trEntryElement.remove();
                    $originalInput.val(calculateOriginalInputValue());
                    fireChangeEvents(me.getSelectedEntries());
                }

                function query(highlightDirection) {
                    // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
                    setTimeout(function () {
                        var queryString = getNonSelectedEditorValue();
                        var completeInputString = $editor.text().replace(String.fromCharCode(160), " ");
                        if (lastQueryString !== queryString || lastCompleteInputQueryString !== completeInputString) {
                            if ($spinners.length === 0) {
                                var $spinner = $(config.spinnerTemplate).appendTo($dropDown);
                                $spinners = $spinners.add($spinner);
                            }
                            config.queryFunction(queryString, {}, function (newEntries) {
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

                function fireChangeEvents(entries) {
                    $originalInput.trigger("change");
                    me.onSelectedEntryChanged.fire(entries);
                }

                function calculateOriginalInputValue() {
                    return selectedEntries
                        .map(function (entry) {
                            return entry[config.valueProperty]
                        })
                        .join(config.valueSeparator);
                }

                function selectEntry(entry, muteEvent) {
                    if (entry == null) {
                        return; // do nothing
                    }
                    if (config.maxSelectedEntries && selectedEntries.length >= config.maxSelectedEntries) {
                        return; // no more entries allowed
                    }
                    if (config.distinct && selectedEntries.map(function (entry) {
                            return entry[config.valueProperty]
                        }).indexOf(entry[config.valueProperty]) != -1) {
                        return; // entry already selected
                    }

                    var tag = $.extend({}, entry);
                    selectedEntries.splice($editor.index(), 0, tag);
                    $originalInput.val(calculateOriginalInputValue());

                    var $entry = $(config.selectedEntryRenderingFunction(tag));
                    var $tagWrapper = $('<div class="tr-tagbox-tag"></div>');
                    $tagWrapper.append($entry).insertBefore($editor);
                    tag._trEntryElement = $tagWrapper;

                    if (config.editingMode == "editable") {
                        $entry.find('.tr-remove-button').click(function (e) {
                            removeTag(tag);
                            return false;
                        });
                    }

                    $editor.text("");

                    if (!muteEvent) {
                        fireChangeEvents(me.getSelectedEntries());
                    }
                }

                function repositionDropDown() {
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

                var repositionDropDownScheduler = null;

                function openDropDown() {
                    if (isDropDownNeeded()) {
                        if (listBoxDirty) {
                            updateListBoxEntries();
                        }
                        $tagBox.addClass("open");
                        $dropDown.show();
                        repositionDropDown();
                        isDropDownOpen = true;
                    }
                    if (repositionDropDownScheduler == null) {
                        repositionDropDownScheduler = setInterval(repositionDropDown, 1000); // make sure that under no circumstances the dropdown is mal-positioned
                    }
                }

                function closeDropDown() {
                    $tagBox.removeClass("open");
                    $dropDown.hide();
                    isDropDownOpen = false;
                    if (repositionDropDownScheduler != null) {
                        clearInterval(repositionDropDownScheduler);
                    }
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

                function autoCompleteIfPossible(delay) {
                    if (config.autoComplete) {
                        clearTimeout(autoCompleteTimeoutId);
                        var highlightedEntry = listBox.getHighlightedEntry();
                        if (highlightedEntry && !doNoAutoCompleteBecauseBackspaceWasPressed) {
                            autoCompleteTimeoutId = setTimeout(function () {
                                var currentEditorValue = getNonSelectedEditorValue();
                                var autoCompleteString = config.autoCompleteFunction(currentEditorValue, highlightedEntry) || currentEditorValue;
                                $editor.text(currentEditorValue + autoCompleteString.replace(' ', String.fromCharCode(160)).substr(currentEditorValue.length)); // I have to replace whitespaces by 160 because text() trims whitespaces...
                                repositionDropDown(); // the auto-complete might cause a line-break, so the dropdown would cover the editor...
                                if ($editor.is(":focus")) {
                                    TrivialComponents.selectElementContents($editor[0], currentEditorValue.length, autoCompleteString.length);
                                }
                            }, delay || 0);
                        }
                        doNoAutoCompleteBecauseBackspaceWasPressed = false;
                    }
                }

                function isDropDownNeeded() {
                    return editingMode == 'editable' && (config.entries && config.entries.length > 0 || options.queryFunction || config.showTrigger);
                }

                function setEditingMode(newEditingMode) {
                    editingMode = newEditingMode;
                    $tagBox.removeClass("editable readonly disabled").addClass(editingMode);
                    if (isDropDownNeeded()) {
                        $dropDown.appendTo($dropDownTargetElement);
                    }
                }

                this.$ = $tagBox;
                $tagBox[0].trivialTagBox = this;

                this.updateEntries = updateEntries;
                this.getSelectedEntries = function () {
                    var selectedEntriesToReturn = [];
                    for (var i = 0; i < selectedEntries.length; i++) {
                        var selectedEntryToReturn = jQuery.extend({}, selectedEntries[i]);
                        selectedEntryToReturn._trEntryElement = undefined;
                        selectedEntriesToReturn.push(selectedEntryToReturn);
                    }
                    return selectedEntriesToReturn;
                };
                this.selectEntry = selectEntry;
                this.setSelectedEntries = function (entries) {
                    selectedEntries
                        .slice() // copy the array as it gets changed during the forEach loop
                        .forEach(removeTag);
                    if (entries) {
                        for (var i = 0; i < entries.length; i++) {
                            selectEntry(entries[i], true);
                        }
                    }
                };
                this.focus = function () {
                    $editor.focus();
                    TrivialComponents.selectElementContents($editor[0], 0, $editor.text().length);
                };
                this.setEditingMode = setEditingMode;
                this.destroy = function () {
                    $originalInput.removeClass('tr-original-input').insertBefore($tagBox);
                    $tagBox.remove();
                    $dropDown.remove();
                };
            }

            TrivialComponents.registerJqueryPlugin(TrivialTagBox, "TrivialTagBox", "tr-tagbox");

            return $.fn.TrivialTagBox;
        }
    )
);
