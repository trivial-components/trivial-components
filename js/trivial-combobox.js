(function ($) {
    var icon2LinesTemplate = '<div class="combobox-entry">' +
        '  <div class="img-wrapper" style="background-image: url({{imgUrl}})"></div>' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div class="main-line">{{displayValue}}</div> ' +
        '    <div class="additional-info">{{additionalInfo}}</div>' +
        '  </div>' +
        '</div>';
    var singleLineTemplate = '<div class="combobox-entry">' +
        '  <div class="content-wrapper editor-area"> ' +
        '    <div>{{displayValue}}</div> ' +
        '  </div>' +
        '</div>';
    var defaultTemplate = icon2LinesTemplate;
    var defaultSpinnerTemplate = '<div class="tr-combobox-spinner"><div>Fetching data...</div></div>';
    var defaultNoEntriesTemplate = '<div class="tr-combobox-no-data"><div>No matching entries...</div></div>';
    var defaultQueryFunctionFactory = function (entries) {
        function filterElements(queryString) {
            var visibleEntries = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var $entryElement = entry._trComboBoxEntryElement;
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

    function TrivialComboBox(originalInput, options) {
        options = options || {};
        var config = $.extend({
            idProperty: 'id',
            template: defaultTemplate,
            selectedEntryTemplate: options.template || defaultTemplate,
            spinnerTemplate: defaultSpinnerTemplate,
            noEntriesTemplate: defaultNoEntriesTemplate,
            entries: [],
            selectedEntry: undefined,
            emptyEntry: {},
            queryFunction: defaultQueryFunctionFactory(options.entries || [])
        }, options);

        var isDropDownOpen = false;
        var selectedEntry = null;
        var highlightedEntry = null;
        var blurCausedByClickInsideComponent = false;

        var $originalInput = $(originalInput).addClass("tr-original-input");
        var $comboBox = $('<div class="tr-combobox"/>').insertAfter($originalInput).append($originalInput);
        var $selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo($comboBox);
        var $trigger = $('<div class="tr-combobox-trigger"><span class="tr-combobox-trigger-icon"/></div>').appendTo($comboBox);
        var $dropDown = $('<div class="tr-combobox-dropdown"></div>').appendTo("body");
        var $editor = $('<input class="tr-combobox-edit-input" type="text"/>').appendTo("body")
            .focus(function() {
                $comboBox.addClass('focus');
            })
            .blur(function () {
                console.log("$editor.blur");
                $comboBox.removeClass('focus');
                if (!blurCausedByClickInsideComponent) {
                    hideEditor();
                    closeDropDown();
                }
            })
            .keydown(function (e) {
                if (e.keyCode >= 16 && e.keyCode <= 20 || e.keyCode === 91 || e.keyCode == 92) {
                    return; // modifier key was pressed...
                }
                if (e.keyCode == 38 || e.keyCode == 40) { // up or down key
                    if (!isDropDownOpen) {
                        openDropDown();
                    }
                    if (e.keyCode == 38) { // up
                        var newHighlightedEntry = getNextHighlightableEntry(-1);
                        setHighlightedEntry(newHighlightedEntry);
                        setAutoCompleteTextIfPossible(newHighlightedEntry.displayValue);
                    } else if (e.keyCode == 40) { // down
                        var newHighlightedEntry = getNextHighlightableEntry(1);
                        setHighlightedEntry(newHighlightedEntry);
                        setAutoCompleteTextIfPossible(newHighlightedEntry.displayValue);
                    }
                } else if (isDropDownOpen && e.keyCode == 13) { // enter
                    selectEntry(highlightedEntry);
                    closeDropDown();
                    hideEditor();
                    $editor.select();
                } else if (e.keyCode == 27) { // escape
                    closeDropDown();
                    hideEditor();
                } else {
                    query();
                    showEditor();
                    openDropDown();
                }
            })
            .mousedown(function () {
                openDropDown();
            });

        $comboBox.add($dropDown).mousedown(function () {
//                    console.log("prevent handler");
            if ($editor.is(":focus")) {
//                        console.log("will blur because of click inside this component...");
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

        updateDropDownEntryElements(config.entries);

        selectEntry(config.selectedEntry || config.emptyEntry);

        $selectedEntryWrapper.click(function () {
            console.log("$selectedEntryWrapper.click");
            $editor.select();
            openDropDown();
            showEditor();
//                    return false;
        });
        $trigger.mousedown(function () {
            if (isDropDownOpen) {
                closeDropDown();
                showEditor();
            } else {
                $editor.select();
                openDropDown();
                showEditor();
            }
        });

        function updateDropDownEntryElements(entries) {
            $dropDown.empty();
            if (config.entries.length > 0) {
                for (var i = 0; i < config.entries.length; i++) {
                    var entry = config.entries[i];
                    var html = Mustache.render(config.template, entry);
                    var $entry = $(html).addClass("tr-combobox-entry filterable-item").appendTo($dropDown);
                    entry._trComboBoxEntryElement = $entry;
                    (function (entry) {
                        $entry
                            .mousedown(function () {
                                console.log("$entry.mousedown");
                                selectEntry(entry);
                                closeDropDown();
                                hideEditor();
                                $editor.select();
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

        function setEntries(entries) {
            config.entries = entries;
            updateDropDownEntryElements(entries);

            if (config.entries.length > 0) {
                setHighlightedEntry(config.entries[0]);
            }

            highlightTextMatches();
        }

        function query() {
            $dropDown.append(config.spinnerTemplate);

            // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called
            setTimeout(function () {
                config.queryFunction($editor.val(), setEntries);
            });
        }

        function setHighlightedEntry(entry) {
            highlightedEntry = entry;
            $dropDown.find('.tr-combobox-entry').removeClass('tr-highlighted');
            if (entry != null) {
                entry._trComboBoxEntryElement.addClass('tr-highlighted');
            }
        }

        function selectEntry(entry) {
            $originalInput.val(entry[config.idProperty]);
            selectedEntry = entry;
            var $selectedEntry = $(Mustache.render(config.selectedEntryTemplate, entry))
                .addClass("tr-combobox-entry");
            if (entry == config.emptyEntry) {
                $selectedEntry.addClass("empty");
            }
            $selectedEntryWrapper.empty().append($selectedEntry);
            console.log("setting val in selectEntry");
            $editor.val(entry.displayValue);
        }

        function showEditor() {
            var $editorArea = $selectedEntryWrapper.find(".editor-area");
            $editor.css({
                "width": $editorArea.width() + "px",
                "height": ($editorArea.height()) + "px"
            })
                .position({
                    my: "left top",
                    at: "left top",
                    of: $editorArea
                })
                .focus();
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
                    of: $comboBox
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
            return $editor.val().substring(0, $editor.caret('pos'));
        }

        function setAutoCompleteTextIfPossible(value) {
            console.log("setting val in setAutoCompleteTextIfPossible");
            var oldEditorValue = getNonSelectedEditorValue();
            var newEditorValue;
            if (value.indexOf(oldEditorValue) === 0) {
                newEditorValue = value;
            } else {
                newEditorValue = getNonSelectedEditorValue();
            }
            $editor.val(newEditorValue);
            setTimeout(function () {
                $editor[0].setSelectionRange(oldEditorValue.length, newEditorValue.length);
            }, 0);
        }

        function getAllVisibleEntries() {
            var visibleEntries = [];
            for (var i = 0; i < config.entries.length; i++) {
                var entry = config.entries[i];
                if (entry._trComboBoxEntryElement.is(':visible')) {
                    visibleEntries.push(entry);
                }
            }
            return visibleEntries;
        }

        function getNextHighlightableEntry(direction) {
            var visibleEntries = getAllVisibleEntries();
            if (highlightedEntry == null) {
                var newHighlightedElementIndex = (visibleEntries.length + direction) % visibleEntries.length;
            } else {
                var currentHighlightedElementIndex = visibleEntries.indexOf(highlightedEntry);
                var newHighlightedElementIndex = (currentHighlightedElementIndex + visibleEntries.length + direction) % visibleEntries.length;
            }
            return visibleEntries[newHighlightedElementIndex];
        }

        function highlightTextMatches() {
            for (var i = 0; i < config.entries.length; i++) {
                var $entryElement = config.entries[i]._trComboBoxEntryElement;
                $entryElement.highlight(getNonSelectedEditorValue(), "tr-search-highlighted");
            }
        }

        this.$ = $comboBox;
        this.setEntries = setEntries;
    }

    $.fn.trivialcombobox = function (options) {
        var $comboBoxes = [];
        this.each(function () {
            var comboBox = new TrivialComboBox(this, options);
            $comboBoxes.push(comboBox.$);
        });
        return $($comboBoxes);
    };
    $.fn.TrivialCombobox = function (options) {
        var comboBoxes = [];
        this.each(function () {
            var comboBox = new TrivialComboBox(this, options);
            comboBoxes.push(comboBox);
        });
        return comboBoxes.length == 1 ? comboBoxes[0] : comboBoxes;
    };

    $.fn.trivialcombobox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.TrivialCombobox.icon2LinesTemplate = icon2LinesTemplate;
    $.fn.trivialcombobox.singleLineTemplate = singleLineTemplate;
    $.fn.TrivialCombobox.singleLineTemplate = singleLineTemplate;
}(jQuery));