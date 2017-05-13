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
import {DEFAULT_TEMPLATES, defaultListQueryFunctionFactory, EditingMode, HighlightDirection, objectEquals, QueryFunction, setTimeoutOrDoImmediately, TrivialComponent, keyCodes} from "./TrivialCore";
import {TrivialListBox, TrivialListBoxConfig} from "./TrivialListBox";
import {TrivialEvent} from "./TrivialEvent";   

export interface TrivialComboBoxConfig<E> extends TrivialListBoxConfig<E> {
    /** The function used for calculating the value of the original input. */
    valueFunction?: (entry: E) => string,
    /** The function used for rendering the selected entry. If not specified, this defaults to {@link entryRenderingFunction} */
    selectedEntryRenderingFunction?: (entry: E) => string,
    noEntriesTemplate?: string,
    textHighlightingEntryLimit?: number,
    emptyEntry?: E | any,
    queryFunction?: QueryFunction<E>,
    autoComplete?: boolean,
    autoCompleteDelay?: number,
    entryToEditorTextFunction?: (entry: E) => string,
    autoCompleteFunction?: (editorText: string, entry: E) => string,
    allowFreeText?: boolean,
    freeTextEntryFactory?: (freeText: string) => E | any,
    showClearButton?: boolean,
    showTrigger?: boolean,
    editingMode?: EditingMode,
    showDropDownOnResultsOnly?: boolean
}

/**
 * A templateable combobox.
 */
export class TrivialComboBox<E> implements TrivialComponent{

    private config: TrivialComboBoxConfig<E>;

    private $spinners: JQuery = $();
    private $originalInput: JQuery;
    private $comboBox: JQuery;
    private $selectedEntryWrapper: JQuery;
    private $dropDown: JQuery;
    private $trigger: JQuery;
    private $clearButton: JQuery;
    private $editor: JQuery;
    private $dropDownTargetElement:JQuery;

    public readonly onSelectedEntryChanged = new TrivialEvent<E>(this);
    public readonly onFocus = new TrivialEvent<void>(this);
    public readonly onBlur = new TrivialEvent<void>(this);

    private listBox: TrivialListBox<E>;
    private isDropDownOpen = false;
    private isEditorVisible = false;
    private lastQueryString: string = null;
    private lastCompleteInputQueryString: string = null;
    private entries: E[];
    private selectedEntry: E = null;
    private lastCommittedValue: E = null;
    private blurCausedByClickInsideComponent = false;
    private autoCompleteTimeoutId = -1;
    private doNoAutoCompleteBecauseBackspaceWasPressed = false;
    private listBoxDirty = true;
    private editingMode: EditingMode;
    private usingDefaultQueryFunction: boolean = false;

    constructor(originalInput: JQuery|Element|string, options: TrivialComboBoxConfig<E> = {}) {
        this.config = $.extend(<TrivialComboBoxConfig<E>> {
            valueFunction: (entry:E) => entry ? (entry as any).id : null,
            entryRenderingFunction: (entry: E) => {
                const template = (entry as any).template || DEFAULT_TEMPLATES.image2LinesTemplate;
                return Mustache.render(template, entry);
            },
            selectedEntryRenderingFunction: (entry: E) => {
                if ((entry as any).selectedEntryTemplate) {
                    return Mustache.render((entry as any).selectedEntryTemplate, entry)
                } else {
                    return this.config.entryRenderingFunction(entry);
                }
            },
            selectedEntry: undefined,
            spinnerTemplate: DEFAULT_TEMPLATES.defaultSpinnerTemplate,
            noEntriesTemplate: DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
            textHighlightingEntryLimit: 100,
            entries: null,
            emptyEntry: {
                _isEmptyEntry: true
            },
            queryFunction: null, // defined below...
            autoComplete: true,
            autoCompleteDelay: 0,
            entryToEditorTextFunction: (entry: E) => {
                return (entry as any)["displayValue"];
            },
            autoCompleteFunction: (editorText: string, entry: E) => {
                if (editorText) {
                    for (let propertyName in entry) {
                        if (entry.hasOwnProperty(propertyName)) {
                            let propertyValue = entry[propertyName];
                            if (propertyValue && (propertyValue as any).toString().toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                                return (propertyValue as any).toString();
                            }
                        }
                    }
                    return null;
                } else {
                    return this.config.entryToEditorTextFunction(entry);
                }
            },
            allowFreeText: false,
            freeTextEntryFactory: (freeText: string) => {
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
            editingMode: 'editable', // one of 'editable', 'disabled' and 'readonly'
            showDropDownOnResultsOnly: false
        }, options);

        if (!this.config.queryFunction) {
            this.config.queryFunction = defaultListQueryFunctionFactory(this.config.entries || [], this.config.matchingOptions);
            this.usingDefaultQueryFunction = true;
        }

        this.entries = this.config.entries;

        this.$originalInput = $(originalInput);
        this.$comboBox = $('<div class="tr-combobox tr-input-wrapper"/>')
            .insertAfter(this.$originalInput);
        this.$selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo(this.$comboBox);


        if (this.config.showClearButton) {
            this.$clearButton = $('<div class="tr-remove-button">').appendTo(this.$comboBox);
            this.$clearButton.mousedown((e) => {
                this.$editor.val("");
                this.setSelectedEntry(null, true, true, e);
            });
        }
        if (this.config.showTrigger) {
            this.$trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$comboBox);
            this.$trigger.mousedown(() => {
                if (this.isDropDownOpen) {
                    this.showEditor();
                    this.closeDropDown();
                } else {
                    setTimeout(() => { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                        this.showEditor();
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
        this.$originalInput.addClass("tr-original-input");
        this.$editor = $('<input type="text" autocomplete="off"/>');

        this.$editor.prependTo(this.$comboBox).addClass("tr-combobox-editor tr-editor")
            .focus(() => {
                if (this.blurCausedByClickInsideComponent) {
                    // do nothing!
                } else {
                    this.$originalInput.triggerHandler('focus');
                    this.onFocus.fire();
                    this.$comboBox.addClass('focus');
                    this.showEditor();
                }
            })
            .blur((e) => {
                if (this.blurCausedByClickInsideComponent) {
                    this.$editor.focus();
                } else {
                    this.$originalInput.triggerHandler('blur');
                    this.onBlur.fire();
                    this.$comboBox.removeClass('focus');
                    if (this.editorContainsFreeText()) {
                        if (!objectEquals(this.getSelectedEntry(), this.lastCommittedValue)) {
                            this.setSelectedEntry(this.getSelectedEntry(), true, true, e);
                        }
                    } else {
                        this.$editor.val("");
                        this.setSelectedEntry(this.lastCommittedValue, false, true, e);
                    }
                    this.hideEditor();
                    this.closeDropDown();
                }
            })
            .keydown((e: KeyboardEvent) => {
                if (keyCodes.isModifierKey(e)) {
                    return;
                } else if (e.which == keyCodes.tab) {
                    const highlightedEntry = this.listBox.getHighlightedEntry();
                    if (this.isDropDownOpen && highlightedEntry) {
                        this.setSelectedEntry(highlightedEntry, true, true, e);
                    } else if (!this.$editor.val()) {
                        this.setSelectedEntry(null, true, true);
                    } else if (this.config.allowFreeText) {
                        this.setSelectedEntry(this.getSelectedEntry(), true, true, e);
                    }
                    return;
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    this.showEditor();
                    return; // let the user navigate freely left and right...
                }

                setTimeout(() => {
                    // After the keystroke has taken effect to the editor, check if the editor content has changed and if yes, deselect the currently selected entry!
                    let isNonIgnoredKey = !keyCodes.isModifierKey(e) && [keyCodes.enter, keyCodes.escape, keyCodes.tab].indexOf(e.which) === -1;
                    let editorValueDoesNotCorrespondToSelectedValue = this.isEntrySelected() && this.$editor.val() !== this.config.entryToEditorTextFunction(this.selectedEntry);
                    if (isNonIgnoredKey && (editorValueDoesNotCorrespondToSelectedValue || this.config.valueFunction(this.listBox.getHighlightedEntry())) !== this.config.valueFunction(this.getSelectedEntry())) {
                        this.setSelectedEntry(null, false, false, e);
                    }
                });

                if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                    this.doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                }

                if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                    if (!this.isEditorVisible) {
                        this.$editor.select();
                        this.showEditor();
                    }
                    const direction = e.which == keyCodes.up_arrow ? -1 : 1;
                    if (!this.isDropDownOpen) {
                        this.query(direction);
                        if (!this.config.showDropDownOnResultsOnly) {
                            this.openDropDown();
                        }
                    } else {
                        this.listBox.highlightNextEntry(direction);
                        this.autoCompleteIfPossible();
                    }
                    return false; // some browsers move the caret to the beginning on up key
                } else if (e.which == keyCodes.enter) {
                    if (this.isEditorVisible || this.editorContainsFreeText()) {
                        e.preventDefault(); // do not submit form
                        const highlightedEntry = this.listBox.getHighlightedEntry();
                        if (this.isDropDownOpen && highlightedEntry) {
                            this.setSelectedEntry(highlightedEntry, true, true, e);
                        } else if (!this.$editor.val()) {
                            this.setSelectedEntry(null, true, true, e);
                        } else if (this.config.allowFreeText) {
                            this.setSelectedEntry(this.getSelectedEntry(), true, true, e);
                        }
                        this.closeDropDown();
                        this.hideEditor();
                    }
                } else if (e.which == keyCodes.escape) {
                    e.preventDefault(); // prevent ie from doing its text field magic...
                    if (!(this.editorContainsFreeText() && this.isDropDownOpen)) { // TODO if list is empty, still reset, even if there is freetext.
                        this.hideEditor();
                        this.$editor.val("");
                        this.entries = null; // so we will query again when we combobox is re-focused
                        this.setSelectedEntry(this.lastCommittedValue, false, true, e);
                    }
                    this.closeDropDown();
                } else {
                    if (!this.isEditorVisible) {
                        this.showEditor();
                        this.$editor.select();
                    }
                    if (!this.config.showDropDownOnResultsOnly) {
                        this.openDropDown();
                    }

                    setTimeout(() => { // We need the new editor value (after the keydown event). Therefore setTimeout().
                        if (this.$editor.val()) {
                            this.query(1);
                        } else {
                            this.query(0);
                            this.listBox.setHighlightedEntry(null);
                        }
                    })
                }
            })
            .mousedown(() => {
                if (!this.config.showDropDownOnResultsOnly) {
                    this.openDropDown();
                }
                this.query();
            });

        if (this.$originalInput.attr("tabindex")) {
            this.$editor.attr("tabindex", this.$originalInput.attr("tabindex"));
        }
        if (this.$originalInput.attr("autofocus")) {
            this.$editor.focus();
        }

        this.$comboBox.add(this.$dropDown).mousedown(() => {
            if (this.$editor.is(":focus")) {
                this.blurCausedByClickInsideComponent = true;
            }
        }).mouseup(() => {
            if (this.blurCausedByClickInsideComponent) {
                this.$editor.focus();
                this.blurCausedByClickInsideComponent = false;
            }
        }).mouseout(() => {
            if (this.blurCausedByClickInsideComponent) {
                this.$editor.focus();
                this.blurCausedByClickInsideComponent = false;
            }
        });

        const configWithoutEntries = $.extend({}, this.config);
        configWithoutEntries.entries = []; // for init performance reasons, initialize the dropdown content lazily
        this.listBox = new TrivialListBox<E>(this.$dropDown, configWithoutEntries);
        this.listBox.onSelectedEntryChanged.addListener((selectedEntry: E, eventSource, originalEvent) => {
            if (selectedEntry) {
                this.setSelectedEntry(selectedEntry, true, !objectEquals(selectedEntry, this.lastCommittedValue), originalEvent);
                this.listBox.setSelectedEntry(null);
                this.closeDropDown();
            }
            this.hideEditor();
        });

        this.setSelectedEntry(this.config.selectedEntry, true, false);

        this.$selectedEntryWrapper.click(() => {
            this.showEditor();
            this.$editor.select();
            if (!this.config.showDropDownOnResultsOnly) {
                this.openDropDown();
            }
            this.query();
        });
    }

    private query(highlightDirection?: HighlightDirection) {
        const queryString = this.getNonSelectedEditorValue();
        const completeInputString = this.$editor.val();
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
        } else {
            this.openDropDown();
        }
    }

    private fireChangeEvents(entry: E, originalEvent: Event) {
        this.$originalInput.trigger("change");
        this.onSelectedEntryChanged.fire(entry, originalEvent);
    }

    public setSelectedEntry(entry: E, commit = true, fireEvent = false, originalEvent?: Event) {
        if (entry == null) {
            this.$originalInput.val(this.config.valueFunction(null));
            this.selectedEntry = null;
            let $selectedEntry = $(this.config.selectedEntryRenderingFunction(this.config.emptyEntry))
                .addClass("tr-combobox-entry")
                .addClass("empty");
            this.$selectedEntryWrapper.empty().append($selectedEntry);
        } else {
            this.$originalInput.val(this.config.valueFunction(entry));
            this.selectedEntry = entry;
            let $selectedEntry = $(this.config.selectedEntryRenderingFunction(entry))
                .addClass("tr-combobox-entry");
            this.$selectedEntryWrapper.empty().append($selectedEntry);
            this.$editor.val(this.config.entryToEditorTextFunction(entry));
        }
        if (commit) {
            this.lastCommittedValue = entry;
            if (fireEvent) {
                this.fireChangeEvents(entry, originalEvent);
            }
        }
        if (this.$clearButton) {
            this.$clearButton.toggle(entry != null);
        }
        if (this.isEditorVisible) {
            this.showEditor(); // reposition editor
        }
        if (this.isDropDownOpen) {
            this.repositionDropDown();
        }
    }

    private isEntrySelected() {
        return this.selectedEntry != null && this.selectedEntry !== this.config.emptyEntry;
    }

    private showEditor() {
        let $editorArea = this.$selectedEntryWrapper.find(".tr-editor-area");
        if ($editorArea.length === 0) {
            $editorArea = this.$selectedEntryWrapper;
        }
        this.$editor
            .css({
                "width": Math.min($editorArea[0].offsetWidth, this.$trigger ? this.$trigger[0].offsetLeft - $editorArea[0].offsetLeft : 99999999) + "px", // prevent the editor from surpassing the trigger!
                "height": ($editorArea[0].offsetHeight) + "px"
            })
            .position({
                my: "left top",
                at: "left top",
                of: $editorArea
            });
        this.isEditorVisible = true;
    }

    private editorContainsFreeText() {
        return this.config.allowFreeText && this.$editor.val().length > 0 && !this.isEntrySelected();
    };

    private hideEditor() {
        this.$editor.width(0).height(0);
        this.isEditorVisible = false;
    }

    private repositionDropDown() {
        this.$dropDown
            .show()
            .position({
                my: "left top",
                at: "left bottom",
                of: this.$comboBox,
                collision: "flip",
                using:  (calculatedPosition: {top: number, left: number}, info: {vertical: string}) => {
                    if (info.vertical === "top") {
                        this.$comboBox.removeClass("dropdown-flipped");
                        this.$dropDown.removeClass("flipped");
                    } else {
                        this.$comboBox.addClass("dropdown-flipped");
                        this.$dropDown.addClass("flipped");
                    }
                    this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            })
            .width(this.$comboBox.width());
    };

    public openDropDown() {
        if (this.isDropDownNeeded()) {
            if (this.listBoxDirty) {
                this.updateListBoxEntries();
            }
            this.$comboBox.addClass("open");
            this.repositionDropDown();
            this.isDropDownOpen = true;
        }
    }

    public closeDropDown() {
        this.$comboBox.removeClass("open");
        this.$dropDown.hide();
        this.isDropDownOpen = false;
    }

    private getNonSelectedEditorValue() {
        return this.$editor.val().substring(0, (this.$editor[0] as any).selectionStart);
    }

    private autoCompleteIfPossible(delay?: number) {
        if (this.config.autoComplete) {
            clearTimeout(this.autoCompleteTimeoutId);
            const highlightedEntry = this.listBox.getHighlightedEntry();
            if (highlightedEntry && !this.doNoAutoCompleteBecauseBackspaceWasPressed) {
                this.autoCompleteTimeoutId = setTimeoutOrDoImmediately(() => {
                    const currentEditorValue = this.getNonSelectedEditorValue();
                    const autoCompleteString = this.config.autoCompleteFunction(currentEditorValue, highlightedEntry) || currentEditorValue;
                    this.$editor.val(currentEditorValue + autoCompleteString.substr(currentEditorValue.length));
                    if (this.$editor.is(":focus")) {
                        (this.$editor[0] as any).setSelectionRange(currentEditorValue.length, autoCompleteString.length);
                    }
                }, delay);
            }
            this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
        }
    }

    private updateListBoxEntries() {
        this.listBox.updateEntries(this.entries);
        this.listBoxDirty = false;
    }

    public updateEntries(newEntries:E[], highlightDirection?:number) {
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

        if (highlightDirection == null) {
            if (this.selectedEntry) {
                this.listBox.setHighlightedEntry(null);
            } else {
                this.listBox.highlightNextEntry(1);
            }
        } else if (highlightDirection === 0) {
            this.listBox.setHighlightedEntry(null)
        } else {
            this.listBox.highlightNextEntry(highlightDirection);
        }

        this.autoCompleteIfPossible(this.config.autoCompleteDelay);

        if (this.isDropDownOpen) {
            this.openDropDown(); // only for repositioning!
        }
    }

    private isDropDownNeeded() {
        return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
    }

    public setEditingMode(newEditingMode:EditingMode) {
        this.editingMode = newEditingMode;
        this.$comboBox.removeClass("editable readonly disabled").addClass(this.editingMode);
        if (this.isDropDownNeeded()) {
            this.$dropDown.appendTo(this.$dropDownTargetElement);
        }
    }

    public getSelectedEntry(): E {
        if (this.selectedEntry == null && (!this.config.allowFreeText || !this.$editor.val())) {
            return null;
        } else if (this.selectedEntry == null && this.config.allowFreeText) {
            return this.config.freeTextEntryFactory(this.$editor.val());
        } else {
            const selectedEntryToReturn = $.extend({}, this.selectedEntry);
            selectedEntryToReturn._trEntryElement = undefined;
            return selectedEntryToReturn;
        }
    };

    public focus() {
        this.showEditor();
        this.$editor.select();
    };

    public getEditor(): Element {
        return this.$editor[0];
    }

    public getDropDown() {
        return this.$dropDown;
    };

    public destroy() {
        this.$originalInput.removeClass('tr-original-input').insertBefore(this.$comboBox);
        this.$comboBox.remove();
        this.$dropDown.remove();
    };

    getMainDomElement(): Element {
        return this.$comboBox[0];
    }

}