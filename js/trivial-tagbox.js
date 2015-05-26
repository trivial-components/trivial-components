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
        define('trivial-tagbox', ['jquery', 'mustache'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory(require('jquery', 'mustache'));
    } else if (jQuery && !jQuery.fn.trivialtagbox) {
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
    var defaultQueryFunctionFactory = function (entries) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trEntryElement;
                if ($entryElement.is(':containsIgnoreCase(' + queryString + ')')) {
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

    function TrivialTagBox(originalInput, options) {
        options = options || {};
        var config = $.extend({
            valueProperty: null,
            inputTextProperty: 'displayValue',
            template: defaultTemplate,
            selectedEntryTemplate: options.template || defaultTemplate,
            spinnerTemplate: defaultSpinnerTemplate,
            noEntriesTemplate: defaultNoEntriesTemplate,
            entries: null,
            emptyEntry: {},
            queryFunction: defaultQueryFunctionFactory(options.entries || []),
            autoComplete: true,
            autoCompleteDelay: 0,
            allowFreeText: false,
            showTrigger: true
        }, options);

        var isDropDownOpen = false;
        var entries = config.entries;
        var selectedTags = [];
        var highlightedEntry = null;
        var blurCausedByClickInsideComponent = false;
        var autoCompleteTimeoutId = -1;

        var $originalInput = $(originalInput);
        var $tagBox = $('<div class="tr-tagbox"/>').insertAfter($originalInput);
        var $tagArea = $('<div class="tr-tagbox-tagarea"/>').appendTo($tagBox);
        if (config.showTrigger) {
            var $trigger = $('<div class="tr-tagbox-trigger"><span class="tr-tagbox-trigger-icon"/></div>').appendTo($tagBox);
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
        var $dropDown = $('<div class="tr-tagbox-dropdown"></div>').appendTo("body")
            .scroll(function (e) {
                e.preventDefault();
                return false;
            });
        $originalInput.addClass("tr-original-input");
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
                    clearEditorIfNotContainsFreeText();
                    closeDropDown();
                }
            })
            .keydown(function (e) {
                if (e.which == keyCodes.tab || isModifierKey(e)) {
                    return; // tab or modifier key was pressed...
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    return; // let the user navigate freely left and right...
                }

                if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                    if ($editor.text() == "") {
                        console.log("EMPTY editor.");
                        if (selectedTags.length > 0) {
                            var tagToBeRemoved = selectedTags[selectedTags.length-1];
                            removeTag(tagToBeRemoved);
                        }
                    }
                    return; // do not open the dropdown.
                }

                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
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
                    entries = null;
                    $editor.select();
                } else if (e.which == keyCodes.escape) {
                    closeDropDown();
                    clearEditorIfNotContainsFreeText();
                } else {
                    openDropDown();
                    query(1);
                }
            })
            .keyup(function (e) {
                if ($editor.find('*').length > 0) {
                    $editor.text($editor.text()); // removes possible <div> or <br> or whatever the browser likes to put inside...
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

        // selectEntry(config.selectedEntry || null);// TODO init entries

        $tagArea.click(function () {
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
            var index = selectedTags.indexOf(tagToBeRemoved);
            if (index > -1) {
                selectedTags.splice(index, 1);
            }
            tagToBeRemoved._trEntryElement.remove();
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

        function selectEntry(entry) {
            if (entry == null) {
                return; // do nothing
            }
            if (config.valueProperty) {
                $originalInput.val(entry[config.valueProperty]);
            } // else the $originalInput IS the $editor

            var tag = $.extend({}, entry);
            selectedTags.push(tag);

            var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, tag))
                .addClass("tr-tagbox-entry tr-tagbox-tag-content");
            var $tagWrapper = $('<div class="tr-tagbox-tag"></div>');
            var $tagRemoveButton = $('<div class="tr-tagbox-tag-button"></div>');
            $tagRemoveButton.click(function (e) {
                removeTag(tag);
                return false;
            });
            $tagWrapper.append($selectedEntry).append($tagRemoveButton);
            $tagWrapper.insertBefore($editor);

            tag._trEntryElement = $tagWrapper;

            $editor.text("");
        }

        function clearEditorIfNotContainsFreeText() {
            if (!config.allowFreeText && ($originalInput.val().length > 0 || $editor.text().length > 0)) {
                $originalInput.val("");
                $editor.text("");
                entries = null; // so we will query again when we tagbox is re-focused
            }
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
            $tagBox.addClass("open");
            $dropDown.show();
            repositionDropdown();
            isDropDownOpen = true;
        }

        function closeDropDown() {
            $tagBox.removeClass("open");
            $dropDown.hide();
            isDropDownOpen = false;
        }

        function getNonSelectedEditorValue() {
            var sel = window.getSelection();
            return $editor.text().replace(String.fromCharCode(160), " ").substring(0, window.getSelection().baseOffset);
        }

        function autoCompleteIfPossible(autoCompletingEntryDisplayValue, delay) {
            clearTimeout(autoCompleteTimeoutId);
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
                    selectElementContents($editor[0], oldEditorValue.length, newEditorValue.length);
                }, 0);
            }, delay || 0);
        }

        function selectElementContents(el, start, end) {
            el = el.firstChild;
            var range = document.createRange();
            //range.selectNodeContents(el);
            range.setStart(el, start);
            range.setEnd(el, end);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
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
                $entryElement.trivialHighlight(nonSelectedEditorValue);
            }
        }

        this.$ = $tagBox;
        $tagBox[0].trivialTagBox = this;

        this.updateEntries = updateEntries;
        this.getSelectedEntries = function () {
            return selectedTags;
        }
    }

    $.fn.trivialtagbox = function (options) {
        var $tagBoxes = [];
        this.each(function () {
            var existingTagBoxWrapper = $(this).parents('.tr-tagbox').addBack('.tr-tagbox');
            if (existingTagBoxWrapper.length > 0 && existingTagBoxWrapper[0].trivialTagBox) {
                $tagBoxes.push(existingTagBoxWrapper[0].trivialTagBox.$);
            } else {
                var tagBox = new TrivialTagBox(this, options);
                $tagBoxes.push(tagBox.$);
            }
        });
        return $($tagBoxes);
    };
    $.fn.TrivialTagBox = function (options) {
        var tagBoxes = [];
        this.each(function () {
            var existingTagBoxWrapper = $(this).parents('.tr-tagbox').addBack('.tr-tagbox');
            if (existingTagBoxWrapper.length > 0 && existingTagBoxWrapper[0].trivialTagBox) {
                tagBoxes.push(existingTagBoxWrapper[0].trivialTagBox);
            } else {
                var tagBox = new TrivialTagBox(this, options);
                tagBoxes.push(tagBox);
            }
        });
        return tagBoxes.length == 1 ? tagBoxes[0] : tagBoxes;
    };

    $.fn.trivialtagbox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.TrivialTagBox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.trivialtagbox.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.TrivialTagBox.iconSingleLineTemplate = iconSingleLineTemplate;
    $.fn.trivialtagbox.singleLineTemplate = singleLineTemplate;
    $.fn.TrivialTagBox.singleLineTemplate = singleLineTemplate;

    return $.fn.TrivialTagBox;
})
);
