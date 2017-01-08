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
module TrivialComponents {

    export class TrivialListBox {

        private config: any;

        public readonly onSelectedEntryChanged = new TrivialEvent();

        private $listBox: JQuery;
        private $entryList: JQuery;
        private entries: any[];
        private highlightedEntry: any;
        private selectedEntry: any;

        constructor($container: JQuery|Element|string, options: any = {} /*TODO config type*/) {
            this.config = $.extend({
                entryRenderingFunction: function (entry: any) {
                    var template = entry.template || DEFAULT_TEMPLATES.image2LinesTemplate;
                    return Mustache.render(template, entry);
                },
                spinnerTemplate: DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                entries: null,
                queryFunction: null, // defined below...
                textHighlightingEntryLimit: 100,
                matchingOptions: {
                    matchingMode: 'contains',
                    ignoreCase: true,
                    maxLevenshteinDistance: 2
                }
            }, options);

            this.$listBox = $('<div class="tr-listbox"/>').appendTo($container);
            let me = this;
            this.$listBox.on("mousedown", ".tr-listbox-entry", function (e) {
                me.selectEntry($(this).data("entry"), e, false);
            }).on("mouseup", ".tr-listbox-entry", function (e) {
                me.$listBox.trigger("mouseup", e);
            }).on("mouseenter", ".tr-listbox-entry", function (e) {
                me.setHighlightedEntry($(this).data("entry"));
            }).on("mouseleave", ".tr-listbox-entry", (e) => {
                if (!$((<any>e).toElement).is('.tr-listbox-entry')) {
                    me.setHighlightedEntry(null);
                }
            });
            this.$entryList = $('<div class="tr-listbox-entry-list"></div>').appendTo(this.$listBox);


            if (this.config.entries) { // if this.config.entries was set...
                this.entries = this.config.entries;
                this.updateEntryElements(this.entries);
            }

            this.$listBox.data("trivialListBox", this);
        }

        private updateEntryElements(entries: any[]) {
            this.$entryList.detach();
            this.$entryList.empty();
            if (entries.length > 0) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var $entry: JQuery;
                    if (!entry._trEntryElement) {
                        var html = this.config.entryRenderingFunction(entry);
                        $entry = $(html).addClass("tr-listbox-entry filterable-item");
                    } else {
                        $entry = entry._trEntryElement;
                    }
                    $entry.appendTo(this.$entryList)
                        .data("entry", entry);
                    entry._trEntryElement = $entry;
                }
            } else {
                this.$entryList.append(this.config.noEntriesTemplate);
            }
            this.$entryList.appendTo(this.$listBox);
        }

        public updateEntries(newEntries: any[]) {
            if (newEntries == null) {
                newEntries = [];
            }
            this.setHighlightedEntry(null);
            this.entries = newEntries;
            this.updateEntryElements(this.entries);
        }

        private minimallyScrollTo($entryWrapper: JQuery) {
            this.$listBox.parent().minimallyScrollTo($entryWrapper);
        }

        public setHighlightedEntry(entry: any) {
            if (entry !== this.highlightedEntry) {
                this.highlightedEntry = entry;
                this.$entryList.find('.tr-listbox-entry').removeClass('tr-highlighted-entry');
                if (entry != null) {
                    entry._trEntryElement.addClass('tr-highlighted-entry');
                    this.minimallyScrollTo(entry._trEntryElement);
                }
            }
        }

        private fireChangeEvents(selectedEntry: any, originalEvent: Event) {
            this.$listBox.trigger("change");
            this.onSelectedEntryChanged.fire(selectedEntry, originalEvent);
        }

        public selectEntry(entry: any, originalEvent?: Event, muteEvent = true) {
            this.selectedEntry = entry;
            this.$entryList.find(".tr-selected-entry").removeClass("tr-selected-entry");
            if (entry != null) {
                this.selectedEntry._trEntryElement.addClass("tr-selected-entry");
            }
            if (!muteEvent) {
                this.fireChangeEvents(this.selectedEntry, originalEvent);
            }
        }

        public highlightNextEntry(direction: HighlightDirection) {
            var newHighlightedEntry = this.getNextHighlightableEntry(direction);
            if (newHighlightedEntry != null) {
                this.setHighlightedEntry(newHighlightedEntry);
            }
        }

        private getNextHighlightableEntry(direction:HighlightDirection) {
            var newHighlightedElementIndex:number;
            if (this.entries == null || this.entries.length == 0) {
                return null;
            } else if (this.highlightedEntry == null && direction > 0) {
                newHighlightedElementIndex = -1 + direction;
            } else if (this.highlightedEntry == null && direction < 0) {
                newHighlightedElementIndex = this.entries.length + direction;
            } else {
                var currentHighlightedElementIndex = this.entries.indexOf(this.highlightedEntry);
                newHighlightedElementIndex = (currentHighlightedElementIndex + this.entries.length + direction) % this.entries.length;
            }
            return this.entries[newHighlightedElementIndex];
        }

        public highlightTextMatches(searchString:string) {
            for (var i = 0; i < this.entries.length; i++) {
                var $entryElement = this.entries[i]._trEntryElement;
                $entryElement.trivialHighlight(searchString, this.config.matchingOptions);
            }
        }

        public getSelectedEntry() {
            if (this.selectedEntry) {
                var selectedEntryToReturn = jQuery.extend({}, this.selectedEntry);
                selectedEntryToReturn._trEntryElement = undefined;
                return selectedEntryToReturn;
            } else {
                return null;
            }
        }

        public getHighlightedEntry() {
            return this.highlightedEntry;
        };

        public navigate(direction:NavigationDirection) {
            if (direction === 'up') {
                this.highlightNextEntry(-1);
            } else if (direction === 'down') {
                this.highlightNextEntry(1);
            }
        }

        get $() {
            return this.$listBox;
        }
    }
}