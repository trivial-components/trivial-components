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

import * as $ from "jquery";
import * as Mustache from "mustache";
import {DEFAULT_TEMPLATES, HighlightDirection, MatchingOptions, minimallyScrollTo, NavigationDirection, RenderingFunction, TrivialComponent} from "./TrivialCore";
import {TrivialEvent} from "./TrivialEvent";

export interface TrivialListBoxConfig<E> {
    /**
     * Rendering function used to display a _suggested_ entry
     * (i.e. an entry displayed in the dropdown).
     *
     * @param entry
     * @return HTML string
     * @default Using the `image2LinesTemplate` from `TrivialCore`.
     */
    entryRenderingFunction?: RenderingFunction<E>,

    /**
     * The initially selected entry. (Caution: use `selectedEntries` for `TrivialTagBox`).
     */
    selectedEntry?: E,

    /**
     * The initial list of suggested entries.
     */
    entries?: E[],

    /**
     * Used for highlighting suggested entries. Also used by the default filtering functions int `TrivialCore`.
     *
     * @default `{ matchingMode: 'contains', ignoreCase: true, maxLevenshteinDistance: 1 }`
     */
    matchingOptions?: MatchingOptions,

    /**
     * Html string defining what to display when the list of results from the `queryFunction` is empty.
     */
    noEntriesTemplate?: string
}

export class TrivialListBox<E> implements TrivialComponent {

    private config: TrivialListBoxConfig<E>;

    public readonly onSelectedEntryChanged = new TrivialEvent<E>(this);

    private $listBox: JQuery;
    private $entryList: JQuery;
    private entries: E[];
    private highlightedEntry: E;
    private selectedEntry: E;

    constructor($container: JQuery|Element|string, options: TrivialListBoxConfig<E> = {} ) {
        this.config = $.extend(<TrivialListBoxConfig<E>> {
            entryRenderingFunction: function (entry: E) {
                const template = (entry as any).template || DEFAULT_TEMPLATES.image2LinesTemplate;
                return Mustache.render(template, entry);
            },
            selectedEntry: null,
            entries: null,
            matchingOptions: {
                matchingMode: 'contains',
                ignoreCase: true,
                maxLevenshteinDistance: 1
            },
            noEntriesTemplate: DEFAULT_TEMPLATES.defaultNoEntriesTemplate
        }, options);

        this.$listBox = $('<div class="tr-listbox"/>').appendTo($container);
        let me = this;
        this.$listBox.on("mousedown", ".tr-listbox-entry", function (e) {
            me.setSelectedEntry($(this).data("entry"), e, true);
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

    private updateEntryElements(entries: E[]) {
        this.$entryList.detach();
        this.$entryList.empty();
        if (entries.length > 0) {
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                let $entry: JQuery;
                if (!(entry as any)._trEntryElement) {
                    const html = this.config.entryRenderingFunction(entry);
                    $entry = $(html).addClass("tr-listbox-entry filterable-item");
                } else {
                    $entry = (entry as any)._trEntryElement;
                }
                $entry.appendTo(this.$entryList)
                    .data("entry", entry);
                (entry as any)._trEntryElement = $entry;
            }
        } else {
            this.$entryList.append(this.config.noEntriesTemplate);
        }
        this.$entryList.appendTo(this.$listBox);
    }

    public updateEntries(newEntries: E[]) {
        if (newEntries == null) {
            newEntries = [];
        }
        this.setHighlightedEntry(null);
        this.entries = newEntries;
        this.updateEntryElements(this.entries);
    }

    private minimallyScrollTo($entryWrapper: JQuery) {
        minimallyScrollTo(this.$listBox.parent(), $entryWrapper);
    }

    public setHighlightedEntry(entry: E) {
        if (entry !== this.highlightedEntry) {
            this.highlightedEntry = entry;
            this.$entryList.find('.tr-listbox-entry').removeClass('tr-highlighted-entry');
            if (entry != null) {
                (entry as any)._trEntryElement.addClass('tr-highlighted-entry');
                this.minimallyScrollTo((entry as any)._trEntryElement);
            }
        }
    }

    private fireChangeEvents(selectedEntry: E, originalEvent: Event) {
        this.$listBox.trigger("change");
        this.onSelectedEntryChanged.fire(selectedEntry, originalEvent);
    }

    public setSelectedEntry(entry: E, originalEvent?: Event, fireEvent = false) {
        this.selectedEntry = entry;
        this.$entryList.find(".tr-selected-entry").removeClass("tr-selected-entry");
        if (entry != null) {
            (this.selectedEntry as any)._trEntryElement.addClass("tr-selected-entry");
        }
        if (fireEvent) {
            this.fireChangeEvents(this.selectedEntry, originalEvent);
        }
    }

    public highlightNextEntry(direction: HighlightDirection) {
        const newHighlightedEntry = this.getNextHighlightableEntry(direction);
        if (newHighlightedEntry != null) {
            this.setHighlightedEntry(newHighlightedEntry);
        }
    }

    private getNextHighlightableEntry(direction:HighlightDirection) {
        let newHighlightedElementIndex: number;
        if (this.entries == null || this.entries.length == 0) {
            return null;
        } else if (this.highlightedEntry == null && direction > 0) {
            newHighlightedElementIndex = -1 + direction;
        } else if (this.highlightedEntry == null && direction < 0) {
            newHighlightedElementIndex = this.entries.length + direction;
        } else {
            const currentHighlightedElementIndex = this.entries.indexOf(this.highlightedEntry);
            newHighlightedElementIndex = (currentHighlightedElementIndex + this.entries.length + direction) % this.entries.length;
        }
        return this.entries[newHighlightedElementIndex];
    }

    public highlightTextMatches(searchString:string) {
        for (let i = 0; i < this.entries.length; i++) {
            const $entryElement = (this.entries[i] as any)._trEntryElement;
            $entryElement.trivialHighlight(searchString, this.config.matchingOptions);
        }
    }

    public getSelectedEntry() {
        if (this.selectedEntry) {
            const selectedEntryToReturn = $.extend({}, this.selectedEntry);
            delete selectedEntryToReturn._trEntryElement;
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

    getMainDomElement(): Element {
        return this.$listBox[0];
    }

    public destroy() {
        this.$listBox.remove();
    };
}