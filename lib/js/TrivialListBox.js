/*!
Trivial Components (https://github.com/trivial-components/trivial-components)

Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors

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
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "jquery", "mustache", "./TrivialCore", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var Mustache = require("mustache");
    var TrivialCore_1 = require("./TrivialCore");
    var TrivialEvent_1 = require("./TrivialEvent");
    var TrivialListBox = (function () {
        function TrivialListBox($container, options) {
            if (options === void 0) { options = {}; }
            this.onSelectedEntryChanged = new TrivialEvent_1.TrivialEvent(this);
            this.config = $.extend({
                entryRenderingFunction: function (entry) {
                    var template = entry.template || TrivialCore_1.DEFAULT_TEMPLATES.image2LinesTemplate;
                    return Mustache.render(template, entry);
                },
                selectedEntry: null,
                spinnerTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                entries: null,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                },
                noEntriesTemplate: TrivialCore_1.DEFAULT_TEMPLATES.defaultNoEntriesTemplate
            }, options);
            this.$listBox = $('<div class="tr-listbox"/>').appendTo($container);
            var me = this;
            this.$listBox.on("mousedown", ".tr-listbox-entry", function (e) {
                me.setSelectedEntry($(this).data("entry"), e, true);
            }).on("mouseup", ".tr-listbox-entry", function (e) {
                me.$listBox.trigger("mouseup", e);
            }).on("mouseenter", ".tr-listbox-entry", function (e) {
                me.setHighlightedEntry($(this).data("entry"));
            }).on("mouseleave", ".tr-listbox-entry", function (e) {
                if (!$(e.toElement).is('.tr-listbox-entry')) {
                    me.setHighlightedEntry(null);
                }
            });
            this.$entryList = $('<div class="tr-listbox-entry-list"></div>').appendTo(this.$listBox);
            if (this.config.entries) {
                this.entries = this.config.entries;
                this.updateEntryElements(this.entries);
            }
            this.$listBox.data("trivialListBox", this);
        }
        TrivialListBox.prototype.updateEntryElements = function (entries) {
            this.$entryList.detach();
            this.$entryList.empty();
            if (entries.length > 0) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var $entry = void 0;
                    if (!entry._trEntryElement) {
                        var html = this.config.entryRenderingFunction(entry);
                        $entry = $(html).addClass("tr-listbox-entry filterable-item");
                    }
                    else {
                        $entry = entry._trEntryElement;
                    }
                    $entry.appendTo(this.$entryList)
                        .data("entry", entry);
                    entry._trEntryElement = $entry;
                }
            }
            else {
                this.$entryList.append(this.config.noEntriesTemplate);
            }
            this.$entryList.appendTo(this.$listBox);
        };
        TrivialListBox.prototype.updateEntries = function (newEntries) {
            if (newEntries == null) {
                newEntries = [];
            }
            this.setHighlightedEntry(null);
            this.entries = newEntries;
            this.updateEntryElements(this.entries);
        };
        TrivialListBox.prototype.minimallyScrollTo = function ($entryWrapper) {
            TrivialCore_1.minimallyScrollTo(this.$listBox.parent(), $entryWrapper);
        };
        TrivialListBox.prototype.setHighlightedEntry = function (entry) {
            if (entry !== this.highlightedEntry) {
                this.highlightedEntry = entry;
                this.$entryList.find('.tr-listbox-entry').removeClass('tr-highlighted-entry');
                if (entry != null) {
                    entry._trEntryElement.addClass('tr-highlighted-entry');
                    this.minimallyScrollTo(entry._trEntryElement);
                }
            }
        };
        TrivialListBox.prototype.fireChangeEvents = function (selectedEntry, originalEvent) {
            this.$listBox.trigger("change");
            this.onSelectedEntryChanged.fire(selectedEntry, originalEvent);
        };
        TrivialListBox.prototype.setSelectedEntry = function (entry, originalEvent, fireEvent) {
            if (fireEvent === void 0) { fireEvent = false; }
            this.selectedEntry = entry;
            this.$entryList.find(".tr-selected-entry").removeClass("tr-selected-entry");
            if (entry != null) {
                this.selectedEntry._trEntryElement.addClass("tr-selected-entry");
            }
            if (fireEvent) {
                this.fireChangeEvents(this.selectedEntry, originalEvent);
            }
        };
        TrivialListBox.prototype.highlightNextEntry = function (direction) {
            var newHighlightedEntry = this.getNextHighlightableEntry(direction);
            if (newHighlightedEntry != null) {
                this.setHighlightedEntry(newHighlightedEntry);
            }
        };
        TrivialListBox.prototype.getNextHighlightableEntry = function (direction) {
            var newHighlightedElementIndex;
            if (this.entries == null || this.entries.length == 0) {
                return null;
            }
            else if (this.highlightedEntry == null && direction > 0) {
                newHighlightedElementIndex = -1 + direction;
            }
            else if (this.highlightedEntry == null && direction < 0) {
                newHighlightedElementIndex = this.entries.length + direction;
            }
            else {
                var currentHighlightedElementIndex = this.entries.indexOf(this.highlightedEntry);
                newHighlightedElementIndex = (currentHighlightedElementIndex + this.entries.length + direction) % this.entries.length;
            }
            return this.entries[newHighlightedElementIndex];
        };
        TrivialListBox.prototype.highlightTextMatches = function (searchString) {
            for (var i = 0; i < this.entries.length; i++) {
                var $entryElement = this.entries[i]._trEntryElement;
                $entryElement.trivialHighlight(searchString, this.config.matchingOptions);
            }
        };
        TrivialListBox.prototype.getSelectedEntry = function () {
            if (this.selectedEntry) {
                var selectedEntryToReturn = $.extend({}, this.selectedEntry);
                selectedEntryToReturn._trEntryElement = undefined;
                return selectedEntryToReturn;
            }
            else {
                return null;
            }
        };
        TrivialListBox.prototype.getHighlightedEntry = function () {
            return this.highlightedEntry;
        };
        ;
        TrivialListBox.prototype.navigate = function (direction) {
            if (direction === 'up') {
                this.highlightNextEntry(-1);
            }
            else if (direction === 'down') {
                this.highlightNextEntry(1);
            }
        };
        TrivialListBox.prototype.getMainDomElement = function () {
            return this.$listBox[0];
        };
        TrivialListBox.prototype.destroy = function () {
            this.$listBox.remove();
        };
        ;
        return TrivialListBox;
    }());
    exports.TrivialListBox = TrivialListBox;
});

//# sourceMappingURL=TrivialListBox.js.map
