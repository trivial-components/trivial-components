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

    export interface TrivialTagComboBoxConfig<E> extends TrivialListBoxConfig<E> {
        valueFunction?: (entries: E[]) => string,
        selectedEntryRenderingFunction?: (entry: E) => string,
        noEntriesTemplate?: string,
        selectedEntries?: E[],
        textHighlightingEntryLimit?: number,
        emptyEntry?: E | any,
        queryFunction?: QueryFunction<E>,
        autoComplete?: boolean,
        autoCompleteDelay?: number,
        entryToEditorTextFunction?: (entry: E) => string,
        autoCompleteFunction?: (editorText: string, entry: E) => string,
        allowFreeText?: boolean,
        freeTextSeparators?: [',', ';'], // TODO function here?
        freeTextEntryFactory?: (freeText: string) => E | any,
        showClearButton?: boolean,
        showTrigger?: boolean,
        distinct?: boolean,
        editingMode?: EditingMode,
        showDropDownOnResultsOnly?: boolean,
        maxSelectedEntries?: number
    }

    export class TrivialTagComboBox<E> implements TrivialComponent {

        private config: TrivialTagComboBoxConfig<E>;

        private $spinners = $();
        private $originalInput: JQuery;
        private $tagComboBox: JQuery;
        private $dropDown: JQuery;
        private $trigger: JQuery;
        private $editor: JQuery;
        private $dropDownTargetElement: JQuery;

        public readonly onSelectedEntryChanged = new TrivialEvent<E[]>(this);
        public readonly onFocus = new TrivialEvent<void>(this);
        public readonly onBlur = new TrivialEvent<void>(this);

        private listBox: TrivialListBox<E>;
        private isDropDownOpen = false;
        private lastQueryString: string = null;
        private lastCompleteInputQueryString: string = null;
        private entries: E[];
        private selectedEntries: E[] = [];
        private blurCausedByClickInsideComponent = false;
        private autoCompleteTimeoutId = -1;
        private doNoAutoCompleteBecauseBackspaceWasPressed = false;
        private listBoxDirty = true;
        private repositionDropDownScheduler: number = null;
        private editingMode: EditingMode;
        private usingDefaultQueryFunction: boolean;

        constructor(originalInput: JQuery|Element|string, options: TrivialTagComboBoxConfig<E>) {
            options = options || {};
            this.config = $.extend(<TrivialTagComboBoxConfig<E>>{
                valueFunction: (entries:E[]) => entries.map(e => (e as any)._isFreeTextEntry ? (e as any).displayValue : (e as any).id).join(','),
                entryRenderingFunction: (entry: E) => {
                    const template = (entry as any).template || DEFAULT_TEMPLATES.image2LinesTemplate;
                    return Mustache.render(template, entry);
                },
                selectedEntryRenderingFunction: (entry: E) => {
                    if ((entry as any).selectedEntryTemplate) {
                        return Mustache.render((entry as any).selectedEntryTemplate, entry)
                    } else {
                        return wrapWithDefaultTagWrapper(this.config.entryRenderingFunction(entry));
                    }
                },
                spinnerTemplate: DEFAULT_TEMPLATES.defaultSpinnerTemplate,
                noEntriesTemplate: DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
                textHighlightingEntryLimit: 100,
                entries: null,
                selectedEntries: [],
                maxSelectedEntries: null,
                queryFunction: null, // defined below...
                autoComplete: true,
                autoCompleteDelay: 0,
                autoCompleteFunction: (editorText: string, entry: E) => {
                    if (editorText) {
                        for (let propertyName in entry) {
                            if (entry.hasOwnProperty(propertyName)) {
                                const propertyValue = entry[propertyName];
                                if (propertyValue && ("" + propertyValue).toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                                    return "" + propertyValue;
                                }
                            }
                        }
                        return null;
                    } else {
                        return null;
                    }
                },
                allowFreeText: false,
                freeTextSeparators: [',', ';'], // TODO function here
                freeTextEntryFactory: (freeText: string) => {
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

            if (!this.config.queryFunction) {
                this.config.queryFunction = defaultListQueryFunctionFactory(this.config.entries || [], this.config.matchingOptions);
                this.usingDefaultQueryFunction = true;
            }

            this.entries = this.config.entries;

            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$tagComboBox = $('<div class="tr-tagbox tr-input-wrapper"/>')
                .insertAfter(this.$originalInput);
            this.$originalInput.appendTo(this.$tagComboBox);
            const $tagArea = $('<div class="tr-tagbox-tagarea"/>').appendTo(this.$tagComboBox);
            if (this.config.showTrigger) {
                this.$trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$tagComboBox);
                this.$trigger.mousedown(() => {
                    this.$editor.focus();
                    if (this.isDropDownOpen) {
                        this.closeDropDown();
                    } else {
                        setTimeout(() => { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                            this.$editor.select();
                            this.openDropDown();
                            this.query();
                        });
                    }
                });
            }
            this.$dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(() => {
                    return false;
                });
            this.$dropDownTargetElement = $("body");
            this.setEditingMode(this.config.editingMode);
            this.$editor = $('<span contenteditable="true" class="tagbox-editor" autocomplete="off"></span>');

            this.$editor.appendTo($tagArea).addClass("tr-tagbox-editor tr-editor")
                .focus(() => {
                    if (this.blurCausedByClickInsideComponent) {
                        // do nothing!
                    } else {
                        this.$originalInput.triggerHandler('focus');
                        this.onFocus.fire();
                        this.$tagComboBox.addClass('focus');
                    }
                    setTimeout(() => { // the editor needs to apply its new css sheets (:focus) before we scroll to it...
                        TrivialComponents.minimallyScrollTo($tagArea, this.$editor);
                    });
                })
                .blur(() => {
                    if (this.blurCausedByClickInsideComponent) {
                        this.$editor.focus();
                    } else {
                        this.$originalInput.triggerHandler('blur');
                        this.onBlur.fire();
                        this.$tagComboBox.removeClass('focus');
                        this.entries = null;
                        this.closeDropDown();
                        if (this.config.allowFreeText && this.$editor.text().trim().length > 0) {
                            this.setSelectedEntry(this.config.freeTextEntryFactory(this.$editor.text()));
                        }
                        this.$editor.text("");
                        //fireChangeEvents(me.getSelectedEntries());
                    }
                })
                .keydown((e: KeyboardEvent) => {
                    if (keyCodes.isModifierKey(e)) {
                        return;
                    } else if (e.which == keyCodes.tab) {
                        const highlightedEntry = this.listBox.getHighlightedEntry();
                        if (this.isDropDownOpen && highlightedEntry) {
                            this.setSelectedEntry(highlightedEntry);
                        }
                        return;
                    } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                        if (e.which == keyCodes.left_arrow && this.$editor.text().length === 0 && window.getSelection().anchorOffset === 0) {
                            if (this.$editor.prev()) {
                                this.$editor.insertBefore(this.$editor.prev());
                                this.$editor.focus();
                            }
                        } else if (e.which == keyCodes.right_arrow && this.$editor.text().length === 0 && window.getSelection().anchorOffset === 0) {
                            if (this.$editor.next()) {
                                this.$editor.insertAfter(this.$editor.next());
                                this.$editor.focus();
                            }
                        }
                        return;
                    }

                    if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                        if (this.$editor.text() == "") {
                            const tagToBeRemoved = this.selectedEntries[this.$editor.index() + (e.which == keyCodes.backspace ? -1 : 0)];
                            if (tagToBeRemoved) {
                                this.removeTag(tagToBeRemoved);
                                this.closeDropDown();
                            }
                        } else {
                            this.doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                            this.query(1);
                        }
                        return; // do not open the dropdown.
                    }

                    if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                        this.openDropDown();
                        const direction = e.which == keyCodes.up_arrow ? -1 : 1;
                        if (!this.isDropDownOpen) {
                            this.query(direction);
                            if (!this.config.showDropDownOnResultsOnly) {
                                this.openDropDown();
                            }
                        } else {
                            this.listBox.highlightNextEntry(direction);
                            this.autoCompleteIfPossible(this.config.autoCompleteDelay);
                        }
                        return false; // some browsers move the caret to the beginning on up key
                    } else if (e.which == keyCodes.enter) {
                        const highlightedEntry = this.listBox.getHighlightedEntry();
                        if (this.isDropDownOpen && highlightedEntry != null) {
                            this.setSelectedEntry(highlightedEntry);
                            this.entries = null;
                        } else if (this.config.allowFreeText && this.$editor.text().trim().length > 0) {
                            this.setSelectedEntry(this.config.freeTextEntryFactory(this.$editor.text()));
                        }
                        this.closeDropDown();
                        e.preventDefault(); // prevent the new line to be added to the editor!
                    } else if (e.which == keyCodes.escape) {
                        this.closeDropDown();
                        this.$editor.text("");
                    } else {
                        if (!this.config.showDropDownOnResultsOnly) {
                            this.openDropDown();
                        }
                        this.query(1);
                    }
                })
                .keyup(() => {
                    function splitStringBySeparatorChars(s: string, separatorChars: string[]) {
                        return s.split(new RegExp("[" + escapeSpecialRegexCharacter(separatorChars.join()) + "]"));
                    }

                    if (this.$editor.find('*').length > 0) {
                        this.$editor.text(this.$editor.text()); // removes possible <div> or <br> or whatever the browser likes to put inside...
                    }
                    if (this.config.allowFreeText) {
                        const editorValueBeforeCursor = this.getNonSelectedEditorValue();
                        if (editorValueBeforeCursor.length > 0) {
                            const tagValuesEnteredByUser = splitStringBySeparatorChars(editorValueBeforeCursor, this.config.freeTextSeparators);

                            for (let i = 0; i < tagValuesEnteredByUser.length - 1; i++) {
                                const value = tagValuesEnteredByUser[i].trim();
                                if (value.length > 0) {
                                    this.setSelectedEntry(this.config.freeTextEntryFactory(value));
                                }
                                this.$editor.text(tagValuesEnteredByUser[tagValuesEnteredByUser.length - 1]);
                                selectElementContents(this.$editor[0], this.$editor.text().length, this.$editor.text().length);
                                this.entries = null;
                                this.closeDropDown();
                            }
                        }
                    }
                })
                .mousedown(() => {
                    if (!this.config.showDropDownOnResultsOnly) {
                        this.openDropDown();
                    }
                    this.query();
                });


            if (this.$originalInput.attr("placeholder")) {
                this.$editor.attr("placeholder", this.$originalInput.attr("placeholder"));
            }
            if (this.$originalInput.attr("tabindex")) {
                this.$editor.attr("tabindex", this.$originalInput.attr("tabindex"));
            }
            if (this.$originalInput.attr("autofocus")) {
                this.$editor.focus();
            }

            this.$tagComboBox.add(this.$dropDown).mousedown(() => {
                if (this.$editor.is(":focus")) {
                    this.blurCausedByClickInsideComponent = true;
                }
            }).mouseup(() => {
                if (this.blurCausedByClickInsideComponent) {
                    this.$editor.focus();
                    setTimeout(() => this.blurCausedByClickInsideComponent = false); // let the other handlers do their job before removing event blocker
                }
            }).mouseout(() => {
                if (this.blurCausedByClickInsideComponent) {
                    this.$editor.focus();
                    setTimeout(() => this.blurCausedByClickInsideComponent = false); // let the other handlers do their job before removing event blocker
                }
            });

            const configWithoutEntries = $.extend({}, this.config);
            configWithoutEntries.entries = []; // for init performance reasons, initialize the dropdown content lazily
            this.listBox = new TrivialListBox<E>(this.$dropDown, configWithoutEntries);
            this.listBox.onSelectedEntryChanged.addListener((selectedEntry: E) => {
                if (selectedEntry) {
                    this.setSelectedEntry(selectedEntry);
                    this.listBox.setSelectedEntry(null);
                    this.closeDropDown();
                }
            });

            this.setSelectedEntry(this.config.selectedEntry, true);

            $tagArea.click((e) => {
                if (!this.config.showDropDownOnResultsOnly) {
                    this.openDropDown();
                }
                this.query();

                // find the tag in the same row as the click with the smallest distance to the click
                let $tagWithSmallestDistance: JQuery = null;
                let smallestDistanceX = 1000000;
                for (let i = 0; i < this.selectedEntries.length; i++) {
                    const selectedEntry = this.selectedEntries[i];
                    const $tag = (selectedEntry as any)._trEntryElement;
                    const tagBoundingRect = $tag[0].getBoundingClientRect();
                    const sameRow = e.clientY >= tagBoundingRect.top && e.clientY < tagBoundingRect.bottom;
                    const sameCol = e.clientX >= tagBoundingRect.left && e.clientX < tagBoundingRect.right;
                    const distanceX = sameCol ? 0 : Math.min(Math.abs(e.clientX - tagBoundingRect.left), Math.abs(e.clientX - tagBoundingRect.right));
                    if (sameRow && distanceX < smallestDistanceX) {
                        $tagWithSmallestDistance = $tag;
                        smallestDistanceX = distanceX;
                        if (distanceX === 0) {
                            break;
                        }
                    }
                }
                if ($tagWithSmallestDistance) {
                    const tagBoundingRect = $tagWithSmallestDistance[0].getBoundingClientRect();
                    const isRightSide = e.clientX > (tagBoundingRect.left + tagBoundingRect.right) / 2;
                    if (isRightSide) {
                        this.$editor.insertAfter($tagWithSmallestDistance);
                    } else {
                        this.$editor.insertBefore($tagWithSmallestDistance);
                    }
                }
                this.$editor.focus();
            });

            for (let i = 0; i < this.config.selectedEntries.length; i++) {
                this.setSelectedEntry(this.config.selectedEntries[i], true);
            }

            // ===
            this.$tagComboBox.data("trivialTagComboBox", this);
        }

        private updateListBoxEntries() {
            this.listBox.updateEntries(this.entries);
            this.listBoxDirty = false;
        }

        public updateEntries(newEntries: E[], highlightDirection?: HighlightDirection) {
            this.entries = newEntries;
            this.$spinners.remove();
            this.$spinners = $();
            if (this.isDropDownOpen) {
                this.updateListBoxEntries();
            } else {
                this.listBoxDirty = true;
            }

            const nonSelectedEditorValue = this.getNonSelectedEditorValue();

            this.listBox.highlightTextMatches(newEntries.length <= this.config.textHighlightingEntryLimit ? nonSelectedEditorValue : null);

            if (highlightDirection) {
                this.listBox.highlightNextEntry(highlightDirection);
            } else {
                this.listBox.setHighlightedEntry(null);
            }

            this.autoCompleteIfPossible(this.config.autoCompleteDelay);

            if (this.isDropDownOpen) {
                this.openDropDown(); // only for repositioning!
            }
        }

        private removeTag(tagToBeRemoved: E) {
            const index = this.selectedEntries.indexOf(tagToBeRemoved);
            if (index > -1) {
                this.selectedEntries.splice(index, 1);
            }
            (tagToBeRemoved as any)._trEntryElement.remove();
            this.$originalInput.val(this.config.valueFunction(this.getSelectedEntries()));
            this.fireChangeEvents(this.getSelectedEntries());
        }

        private query(highlightDirection?: HighlightDirection) {
            // call queryFunction asynchronously to be sure the input field has been updated before the result callback is called. Note: the query() method is called on keydown...
            setTimeout(() => {
                const queryString = this.getNonSelectedEditorValue();
                const completeInputString = this.$editor.text().replace(String.fromCharCode(160), " ");
                if (this.lastQueryString !== queryString || this.lastCompleteInputQueryString !== completeInputString) {
                    if (this.$spinners.length === 0) {
                        const $spinner = $(this.config.spinnerTemplate).appendTo(this.$dropDown);
                        this.$spinners = this.$spinners.add($spinner);
                    }
                    this.config.queryFunction(queryString, (newEntries: E[]) => {
                        this.updateEntries(newEntries, highlightDirection);
                        if (this.config.showDropDownOnResultsOnly && newEntries && newEntries.length > 0 && this.$editor.is(":focus")) {
                            this.openDropDown();
                        }
                    });
                    this.lastQueryString = queryString;
                    this.lastCompleteInputQueryString = completeInputString;
                }
            }, 0);
        }

        private fireChangeEvents(entries: E[]) {
            this.$originalInput.trigger("change");
            this.onSelectedEntryChanged.fire(entries);
        }

        public setSelectedEntry(entry: E, fireEvent = false) {
            if (entry == null) {
                return; // do nothing
            }
            if (this.config.maxSelectedEntries && this.selectedEntries.length >= this.config.maxSelectedEntries) {
                return; // no more entries allowed
            }
            if (this.config.distinct && this.selectedEntries.map((entry: E) => {
                    return this.config.valueFunction([entry])
                }).indexOf(this.config.valueFunction([entry])) != -1) {
                return; // entry already selected
            }

            const tag = $.extend({}, entry);
            this.selectedEntries.splice(this.$editor.index(), 0, tag);
            this.$originalInput.val(this.config.valueFunction(this.getSelectedEntries()));

            const $entry = $(this.config.selectedEntryRenderingFunction(tag));
            const $tagWrapper = $('<div class="tr-tagbox-tag"></div>');
            $tagWrapper.append($entry).insertBefore(this.$editor);
            tag._trEntryElement = $tagWrapper;

            if (this.config.editingMode == "editable") {
                $entry.find('.tr-remove-button').click((e) => {
                    this.removeTag(tag);
                    return false;
                });
            }

            this.$editor.text("");

            if (fireEvent) {
                this.fireChangeEvents(this.getSelectedEntries());
            }
        }

        private repositionDropDown() {
            this.$dropDown.position({
                my: "left top",
                at: "left bottom",
                of: this.$tagComboBox,
                collision: "flip",
                using: (calculatedPosition: {top: number, left: number}, info: {vertical: string}) => {
                    if (info.vertical === "top") {
                        this.$tagComboBox.removeClass("dropdown-flipped");
                        this.$dropDown.removeClass("flipped");
                    } else {
                        this.$tagComboBox.addClass("dropdown-flipped");
                        this.$dropDown.addClass("flipped");
                    }
                    this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            }).width(this.$tagComboBox.width());
        }

        public openDropDown() {
            if (this.isDropDownNeeded()) {
                if (this.listBoxDirty) {
                    this.updateListBoxEntries();
                }
                this.$tagComboBox.addClass("open");
                this.$dropDown.show();
                this.repositionDropDown();
                this.isDropDownOpen = true;
            }
            if (this.repositionDropDownScheduler == null) {
                this.repositionDropDownScheduler = window.setInterval(() => this.repositionDropDown(), 1000); // make sure that under no circumstances the dropdown is mal-positioned
            }
        }

        private closeDropDown() {
            this.$tagComboBox.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
            if (this.repositionDropDownScheduler != null) {
                clearInterval(this.repositionDropDownScheduler);
            }
        }

        private getNonSelectedEditorValue() {
            const editorText = this.$editor.text().replace(String.fromCharCode(160), " ");
            const selection = window.getSelection();
            if (selection.anchorOffset != selection.focusOffset) {
                return editorText.substring(0, Math.min((window.getSelection() as any).baseOffset, window.getSelection().focusOffset));
            } else {
                return editorText;
            }
        }

        private autoCompleteIfPossible(delay: number) {
            if (this.config.autoComplete) {
                clearTimeout(this.autoCompleteTimeoutId);
                const highlightedEntry = this.listBox.getHighlightedEntry();
                if (highlightedEntry && !this.doNoAutoCompleteBecauseBackspaceWasPressed) {
                    this.autoCompleteTimeoutId = window.setTimeout(() => {
                        const currentEditorValue = this.getNonSelectedEditorValue();
                        const autoCompleteString = this.config.autoCompleteFunction(currentEditorValue, highlightedEntry) || currentEditorValue;
                        this.$editor.text(currentEditorValue + autoCompleteString.replace(' ', String.fromCharCode(160)).substr(currentEditorValue.length)); // I have to replace whitespaces by 160 because text() trims whitespaces...
                        this.repositionDropDown(); // the auto-complete might cause a line-break, so the dropdown would cover the editor...
                        if (this.$editor.is(":focus")) {
                            selectElementContents(this.$editor[0], currentEditorValue.length, autoCompleteString.length);
                        }
                    }, delay || 0);
                }
                this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            }
        }

        private isDropDownNeeded() {
            return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
        }

        public setEditingMode(newEditingMode: EditingMode) {
            this.editingMode = newEditingMode;
            this.$tagComboBox.removeClass("editable readonly disabled").addClass(this.editingMode);
            if (this.isDropDownNeeded()) {
                this.$dropDown.appendTo(this.$dropDownTargetElement);
            }
        }

        public setSelectedEntries(entries: E[]) {
            this.selectedEntries
                .slice() // copy the array as it gets changed during the forEach loop
                .forEach((e) => this.removeTag(e));
            if (entries) {
                for (let i = 0; i < entries.length; i++) {
                    this.setSelectedEntry(entries[i], true);
                }
            }
        }

        public getSelectedEntries() {
            const selectedEntriesToReturn: E[] = [];
            for (let i = 0; i < this.selectedEntries.length; i++) {
                const selectedEntryToReturn = jQuery.extend({}, this.selectedEntries[i]);
                selectedEntryToReturn._trEntryElement = undefined;
                selectedEntriesToReturn.push(selectedEntryToReturn);
            }
            return selectedEntriesToReturn;
        };

        public focus() {
            this.$editor.focus();
            selectElementContents(this.$editor[0], 0, this.$editor.text().length);
        };

        public destroy() {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$tagComboBox);
            this.$tagComboBox.remove();
            this.$dropDown.remove();
        };

        getMainDomElement(): Element {
            return this.$tagComboBox[0];
        }

    }
}