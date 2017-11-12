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
import {
    DEFAULT_TEMPLATES, defaultEntryMatchingFunctionFactory, defaultTreeQueryFunctionFactory, EditingMode, HighlightDirection, objectEquals, QueryFunction, setTimeoutOrDoImmediately,
    TrivialComponent, keyCodes, RenderingFunction
} from "./TrivialCore";
import {TrivialTreeBox, TrivialTreeBoxConfig} from "./TrivialTreeBox";
import {TrivialEvent} from "./TrivialEvent";

export interface TrivialTreeComboBoxConfig<E> extends TrivialTreeBoxConfig<E> {
    /**
     * Calculates the value to set on the original input.
     *
     * @param entry the selected entry
     * @return the string to set as the value of the original input
     */
    valueFunction?: (entry: E) => string,

    /**
     * Rendering function used to display a _selected_ entry
     * (i.e. an entry inside the editor area of the component, not the dropdown).
     *
     * @param entry
     * @return HTML string
     * @default `wrapWithDefaultTagWrapper(entryRenderingFunction(entry))`
     */
    selectedEntryRenderingFunction?: RenderingFunction<E>,

    /**
     * Initially selected entry.
     *
     * @default `null`
     */
    selectedEntry?: E,

    /**
     * Performance setting. Defines the maximum number of entries until which text highlighting is performed.
     * Set to `0` to disable text highlighting.
     *
     * @default `100`
     */
    textHighlightingEntryLimit?: number,

    /**
     * Used to retrieve the entries ("suggestions") to be displayed in the dropdown box.
     *
     * @see QueryFunction
     * @default creates a client-side query function using the provided [[entries]]
     */
    queryFunction?: QueryFunction<E>,

    /**
     * Whether or not to provide auto-completion.
     *
     * @default `true`
     */
    autoComplete?: boolean,

    /**
     * The number of milliseconds to wait until auto-completion is performed.
     *
     * @default `0`
     */
    autoCompleteDelay?: number,

    /**
     * Generates an autocompletion string for the current input of the user and currently highlighted entry in the dropdown.
     *
     * @param editorText the current text input from the user
     * @param entry the currently highlighted entry in the dropdown
     * @return The _full_ string (not only the completion part) to apply for auto-completion.
     * @default best effort implementation using entry properties
     */
    autoCompleteFunction?: (editorText: string, entry: E) => string,

    /**
     * Similar to [[autoCompleteFunction]]. Used to set the editor's text when focusing the component.
     *
     * @default `entry["displayValue"]`
     */
    entryToEditorTextFunction?: (entry: E) => string,

    /**
     * Whether or not to allow free text to be entered by the user.
     *
     * @default `false`
     */
    allowFreeText?: boolean,

    /**
     * Creates an entry (object) from a string entered by the user.
     *
     * @param freeText the text entered by the user
     * @default `{ displayValue: freeText, _isFreeTextEntry: true }`
     */
    freeTextEntryFactory?: (freeText: string) => E | any,

    /**
     * The clear button is a the small 'x' at the right of the entry display that can be clicked to clear the selection.
     */
    showClearButton?: boolean,

    /**
     * The trigger is the button on the right side of the component that can be clicket to open the dropdown.
     *
     * @default `true`
     */
    showTrigger?: boolean,

    editingMode?: EditingMode,

    /**
     * It `true`, opening the dropdown will be delayed until the result callback of the [[queryFunction]] is called.
     *
     * @default `false`
     */
    showDropDownOnResultsOnly?: boolean,

    /**
     * HTML string defining the spinner to be displayed while entries are being retrieved.
     */
    spinnerTemplate?: string
}

export class TrivialTreeComboBox<E> implements TrivialComponent {

    private $treeComboBox: JQuery;
    private $dropDown: JQuery;
    private $dropDownTargetElement: JQuery;
    private config: TrivialTreeComboBoxConfig<E>;
    private $editor: JQuery;
    private treeBox: TrivialTreeBox<E>;
    private isDropDownOpen = false;
    private isEditorVisible = false;
    private selectedEntry: E = null;
    private lastCommittedValue: E = null;
    private blurCausedByClickInsideComponent = false;
    private autoCompleteTimeoutId = -1;
    private doNoAutoCompleteBecauseBackspaceWasPressed = false;
    private editingMode: EditingMode;
    private usingDefaultQueryFunction: boolean = false;
    private $originalInput: JQuery;
    private $selectedEntryWrapper: JQuery;
    private $clearButton: JQuery;
    private $trigger: JQuery;
    private $spinners = $();

    public readonly onSelectedEntryChanged = new TrivialEvent<E>(this);
    public readonly onFocus = new TrivialEvent<void>(this);
    public readonly onBlur = new TrivialEvent<void>(this);

    constructor(originalInput: JQuery|Element|string, options: TrivialTreeComboBoxConfig<E> = {}) {
        this.config = $.extend(<TrivialTreeComboBoxConfig<E>> {
            valueFunction: (entry:E) => entry ? "" + (entry as any).id : null,
            entryRenderingFunction: (entry: E, depth: number) => {
                const defaultTemplates = [DEFAULT_TEMPLATES.icon2LinesTemplate, DEFAULT_TEMPLATES.iconSingleLineTemplate];
                const template = defaultTemplates[Math.min(depth, defaultTemplates.length - 1)];
                return Mustache.render(template, entry);
            },
            selectedEntryRenderingFunction: (entry: E) => {
                return this.config.entryRenderingFunction(entry, 0);
            },
            selectedEntry: null,
            spinnerTemplate: DEFAULT_TEMPLATES.defaultSpinnerTemplate,
            noEntriesTemplate: DEFAULT_TEMPLATES.defaultNoEntriesTemplate,
            textHighlightingEntryLimit: 100,
            entries: null,
            queryFunction: null, // defined below...
            autoComplete: true,
            autoCompleteDelay: 0,
            entryToEditorTextFunction: (entry: E) => {
                return (entry as any)["displayValue"];
            },
            autoCompleteFunction: (editorText: string, entry: E) => {
                if (editorText) {
                    for (let propertyName in entry) {
                        const propertyValue = entry[propertyName];
                        if (propertyValue && (propertyValue as any).toString().toLowerCase().indexOf(editorText.toLowerCase()) === 0) {
                            return (propertyValue as any).toString();
                        }
                    }
                    return null;
                } else {
                    return entry ? this.config.entryToEditorTextFunction(entry) : null;
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
            childrenProperty: "children",
            lazyChildrenFlagProperty: "hasLazyChildren",
            expandedProperty: 'expanded',
            editingMode: "editable", // one of 'editable', 'disabled' and 'readonly'
            showDropDownOnResultsOnly: false
        }, options);

        if (!this.config.queryFunction) {
            this.config.queryFunction = defaultTreeQueryFunctionFactory(
                this.config.entries || [],
                defaultEntryMatchingFunctionFactory(["displayValue", "additionalInfo"], this.config.matchingOptions),
                this.config.childrenProperty,
                this.config.expandedProperty
            );
            this.usingDefaultQueryFunction = true;
        }

        this.$originalInput = $(originalInput);
        this.$treeComboBox = $('<div class="tr-treecombobox tr-combobox tr-input-wrapper"/>')
            .insertAfter(this.$originalInput);
        this.$selectedEntryWrapper = $('<div class="tr-combobox-selected-entry-wrapper"/>').appendTo(this.$treeComboBox);
        if (this.config.showClearButton) {
            this.$clearButton = $('<div class="tr-remove-button">').appendTo(this.$treeComboBox);
            this.$clearButton.mousedown((e) => {
                this.$editor.val("");
                this.setSelectedEntry(null, true, true, e);
            });
        }
        if (this.config.showTrigger) {
            this.$trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$treeComboBox);
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

        this.$editor.prependTo(this.$treeComboBox).addClass("tr-combobox-editor tr-editor")
            .focus(() => {
                if (this.blurCausedByClickInsideComponent) {
                    // do nothing!
                } else {
                    this.$originalInput.triggerHandler('focus');
                    this.onFocus.fire();
                    this.$treeComboBox.addClass('focus');
                    this.showEditor();
                }
            })
            .blur((e) => {
                if (this.blurCausedByClickInsideComponent) {
                    this.$editor.focus();
                } else {
                    this.$originalInput.triggerHandler('blur');
                    this.onBlur.fire();
                    this.$treeComboBox.removeClass('focus');
                    if (this.editorContainsFreeText()) {
                        if (!objectEquals(this.getSelectedEntry(), this.lastCommittedValue)) {
                            this.setSelectedEntry(this.getSelectedEntry(), true, true, e);
                        }
                    } else {
                        this.$editor.val("");
                        this.setSelectedEntry(this.lastCommittedValue, false, false, e);
                    }
                    this.hideEditor();
                    this.closeDropDown();
                }
            })
            .keydown((e: KeyboardEvent) => {
                if (keyCodes.isModifierKey(e)) {
                    return;
                } else if (e.which == keyCodes.tab) {
                    let highlightedEntry = this.treeBox.getHighlightedEntry();
                    if (this.isDropDownOpen && highlightedEntry) {
                        this.setSelectedEntry(highlightedEntry, true, true, e);
                    } else if (!this.$editor.val()) {
                        this.setSelectedEntry(null, true, true, e);
                    } else if (this.config.allowFreeText) {
                        this.setSelectedEntry(this.getSelectedEntry(), true, true, e);
                    }
                    return;
                } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                    if (this.isDropDownOpen) {
                        // expand the currently highlighted node.
                        const changedExpandedState = this.treeBox.setHighlightedNodeExpanded(e.which == keyCodes.right_arrow);
                        if (changedExpandedState) {
                            return false;
                        }
                    }
                    this.showEditor();
                    return; // let the user navigate freely left and right...
                }

                setTimeout(() => {
                    // After the keystroke has taken effect to the editor, check if the editor content has changed and if yes, deselect the currently selected entry!
                    let isNonIgnoredKey = !keyCodes.isModifierKey(e) && [keyCodes.enter, keyCodes.escape, keyCodes.tab].indexOf(e.which) === -1;
                    let editorValueDoesNotCorrespondToSelectedValue = this.isEntrySelected() && this.$editor.val() !== this.config.entryToEditorTextFunction(this.selectedEntry);
                    if (isNonIgnoredKey && (editorValueDoesNotCorrespondToSelectedValue || this.config.valueFunction(this.treeBox.getHighlightedEntry())) !== this.config.valueFunction(this.getSelectedEntry())) {
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
	                    this.openDropDown(); // directly open the dropdown (the user definitely wants to see it)
                    } else {
                        this.treeBox.highlightNextEntry(direction);
                        this.autoCompleteIfPossible(this.config.autoCompleteDelay);
                    }
                    return false; // some browsers move the caret to the beginning on up key
                } else if (e.which == keyCodes.enter) {
                    if (this.isEditorVisible || this.editorContainsFreeText()) {
                        e.preventDefault(); // do not submit form
                        let highlightedEntry = this.treeBox.getHighlightedEntry();
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
                        this.setSelectedEntry(this.lastCommittedValue, false, false, e);
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
                            this.treeBox.setHighlightedEntry(null);
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

        this.$treeComboBox.add(this.$dropDown)
            .mousedown(() => {
                if (this.$editor.is(":focus")) {
                    this.blurCausedByClickInsideComponent = true;
                }
            })
            .mouseup(() => {
                if (this.blurCausedByClickInsideComponent) {
                    this.$editor.focus();
                    this.blurCausedByClickInsideComponent = false;
                }
            })
            .mouseout(() => {
                if (this.blurCausedByClickInsideComponent) {
                    this.$editor.focus();
                    this.blurCausedByClickInsideComponent = false;
                }
            });

        this.treeBox = new TrivialTreeBox(this.$dropDown, this.config);
        this.treeBox.onSelectedEntryChanged.addListener((selectedEntry: E, eventSource, originalEvent) => {
            if (selectedEntry) {
                this.setSelectedEntry(selectedEntry, true, !objectEquals(selectedEntry, this.lastCommittedValue), originalEvent);
                this.treeBox.setSelectedEntry(null);
                this.closeDropDown();
            }
            this.hideEditor();
        });

        this.setSelectedEntry(this.config.selectedEntry, true, false, null);

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
        if (this.$spinners.length === 0) {
            const $spinner = $(this.config.spinnerTemplate).appendTo(this.$dropDown);
            this.$spinners = this.$spinners.add($spinner);
        }
        this.config.queryFunction(this.getNonSelectedEditorValue(), (newEntries: E[]) => {
            this.updateEntries(newEntries, highlightDirection);
            if (this.config.showDropDownOnResultsOnly && newEntries && newEntries.length > 0 && this.$editor.is(":focus")) {
                this.openDropDown();
            }
        });
    }

    private fireChangeEvents(entry: E, originalEvent?: Event) {
        this.$originalInput.trigger("change");
        this.onSelectedEntryChanged.fire(entry, originalEvent);
    }

    public setSelectedEntry(entry: E, commit: boolean, fireEvent?: boolean, originalEvent?: Event) {
        this.$originalInput.val(this.config.valueFunction(entry));
        this.selectedEntry = entry;
        let $selectedEntry = $(this.config.selectedEntryRenderingFunction(entry))
            .addClass("tr-combobox-entry");
        this.$selectedEntryWrapper.empty().append($selectedEntry);
        if (entry != null) {
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
        return this.selectedEntry != null;
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
                of: this.$treeComboBox,
                collision: "flip",
                using: (calculatedPosition: {top: number, left: number}, info: {vertical: string}) => {
                    if (info.vertical === "top") {
                        this.$treeComboBox.removeClass("dropdown-flipped");
                        this.$dropDown.removeClass("flipped");
                    } else {
                        this.$treeComboBox.addClass("dropdown-flipped");
                        this.$dropDown.addClass("flipped");
                    }
                    this.$dropDown.css({
                        left: calculatedPosition.left + 'px',
                        top: calculatedPosition.top + 'px'
                    });
                }
            })
            .width(this.$treeComboBox.width());
    };

    public openDropDown() {
        if (this.isDropDownNeeded()) {
            this.$treeComboBox.addClass("open");
            this.repositionDropDown();
            this.isDropDownOpen = true;
        }
    }

    public closeDropDown() {
        this.$treeComboBox.removeClass("open");
        this.$dropDown.hide();
        this.isDropDownOpen = false;
    }

    private getNonSelectedEditorValue() {
        return this.$editor.val().substring(0, (this.$editor[0] as any).selectionStart);
    }

    private autoCompleteIfPossible(delay?: number) {
        if (this.config.autoComplete) {
            clearTimeout(this.autoCompleteTimeoutId);
            const highlightedEntry = this.treeBox.getHighlightedEntry();
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


    public updateEntries(newEntries: E[], highlightDirection?: HighlightDirection) {
        this.blurCausedByClickInsideComponent = false; // we won't get any mouseout or mouseup events for entries if they get removed. so do this here proactively

        this.$spinners.remove();
        this.$spinners = $();
        
        this.treeBox.updateEntries(newEntries);

        const nonSelectedEditorValue = this.getNonSelectedEditorValue();

        this.treeBox.highlightTextMatches(newEntries.length <= this.config.textHighlightingEntryLimit ? nonSelectedEditorValue : null);

        if (highlightDirection == null) {
            if (this.selectedEntry) {
                this.treeBox.setHighlightedEntry(null);
            } else {
                if (nonSelectedEditorValue.length > 0) {
                    this.treeBox.highlightNextMatchingEntry(1);
                } else {
                    this.treeBox.highlightNextEntry(1);
                }
            }
        } else if (highlightDirection === 0) {
            this.treeBox.setHighlightedEntry(null)
        } else {
            if (nonSelectedEditorValue.length > 0) {
                this.treeBox.highlightNextMatchingEntry(1);
            } else {
                this.treeBox.highlightNextEntry(1);
            }
        }

        this.autoCompleteIfPossible(this.config.autoCompleteDelay);

        if (this.isDropDownOpen) {
            this.openDropDown(); // only for repositioning!
        }
    }

    private isDropDownNeeded() {
        return this.editingMode == 'editable' && (this.config.entries && this.config.entries.length > 0 || !this.usingDefaultQueryFunction || this.config.showTrigger);
    }

    public setEditingMode(newEditingMode: EditingMode) {
        this.editingMode = newEditingMode;
        this.$treeComboBox.removeClass("editable readonly disabled").addClass(this.editingMode);
        if (this.isDropDownNeeded()) {
            this.$dropDown.appendTo(this.$dropDownTargetElement);
        }
    }

    public getSelectedEntry() {
        if (this.selectedEntry == null && (!this.config.allowFreeText || !this.$editor.val())) {
            return null;
        } else if (this.selectedEntry == null && this.config.allowFreeText) {
            return this.config.freeTextEntryFactory(this.$editor.val());
        } else {
            const selectedEntryToReturn = $.extend({}, this.selectedEntry);
            delete selectedEntryToReturn._trEntryElement;
            return selectedEntryToReturn;
        }
    }

    public updateChildren(parentNodeId: any, children: E[]) {
        this.treeBox.updateChildren(parentNodeId, children);
    }

    public updateNode(node: E) {
        this.treeBox.updateNode(node);
    }

    public removeNode(nodeId: string) {
        this.treeBox.removeNode(nodeId);
    }

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
        this.$originalInput.removeClass('tr-original-input').insertBefore(this.$treeComboBox);
        this.$treeComboBox.remove();
        this.$dropDown.remove();
    };

    getMainDomElement(): Element {
        return this.$treeComboBox[0];
    }
}
