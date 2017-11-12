/*!
*
*  Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*  http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*
*/
declare namespace TrivialComponents {
export enum WeekDay {
    MONDAY = 1,
    TUESDAY = 2,
    WEDNESDAY = 3,
    THURSDAY = 4,
    FRIDAY = 5,
    SATURDAY = 6,
    SUNDAY = 7,
}
export type TimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute';
export interface TrivialCalendarBoxConfig {
    selectedDate?: Moment;
    firstDayOfWeek?: WeekDay;
    mode?: 'date' | 'time' | 'datetime';
    highlightKeyboardNavigationState?: boolean;
}
export class TrivialCalendarBox implements TrivialComponent {
    private $container;
    private config;
    private keyboardNavigationState;
    private keyboardNavCssClass;
    private selectedDate;
    private $calendarBox;
    private $calendarDisplay;
    private $yearDisplay;
    private $monthDisplay;
    private $monthTable;
    private $year;
    private $month;
    private $clockDisplay;
    private $hourHand;
    private $minuteHand;
    private $amPmText;
    private $digitalTimeHourDisplayWrapper;
    private $digitalTimeHourDisplay;
    private $digitalTimeMinuteDisplayWrapper;
    private $digitalTimeMinuteDisplay;
    readonly onChange: TrivialEvent<{
        value: Moment;
        timeUnitEdited: TimeUnit;
    }>;
    readonly onOnEditingTimeUnitChange: TrivialEvent<TimeUnit>;
    constructor($container: JQuery | Element | string, options?: TrivialCalendarBoxConfig);
    private static getDaysForCalendarDisplay(dateInMonthDoBeDisplayed, firstDayOfWeek);
    private updateMonthDisplay(dateInMonthToBeDisplayed);
    private updateClockDisplay(date);
    private updateDisplay();
    setSelectedDate(moment: Moment): void;
    setYear(year: number, fireEvent?: boolean): void;
    setMonth(month: number, fireEvent?: boolean): void;
    setDayOfMonth(dayOfMonth: number, fireEvent?: boolean): void;
    setMonthAndDay(month: number, day: number, fireEvent?: boolean): void;
    setHour(hour: number, fireEvent?: boolean): void;
    setMinute(minute: number, fireEvent?: boolean): void;
    private fireChangeEvents(timeUnit);
    setKeyboardNavigationState(newKeyboardNavigationState: TimeUnit): void;
    getSelectedDate(): Moment;
    private navigateByUnit(unit, direction, fireEvent?);
    navigate(direction: NavigationDirection): void;
    getMainDomElement(): Element;
    destroy(): void;
}


export interface TrivialComboBoxConfig<E> extends TrivialListBoxConfig<E> {
    valueFunction?: (entry: E) => string;
    selectedEntryRenderingFunction?: RenderingFunction<E>;
    selectedEntry?: E;
    textHighlightingEntryLimit?: number;
    queryFunction?: QueryFunction<E>;
    autoComplete?: boolean;
    autoCompleteDelay?: number;
    autoCompleteFunction?: (editorText: string, entry: E) => string;
    entryToEditorTextFunction?: (entry: E) => string;
    allowFreeText?: boolean;
    freeTextEntryFactory?: (freeText: string) => E | any;
    showClearButton?: boolean;
    showTrigger?: boolean;
    editingMode?: EditingMode;
    showDropDownOnResultsOnly?: boolean;
    spinnerTemplate?: string;
}
export class TrivialComboBox<E> implements TrivialComponent {
    private config;
    private $spinners;
    private $originalInput;
    private $comboBox;
    private $selectedEntryWrapper;
    private $dropDown;
    private $trigger;
    private $clearButton;
    private $editor;
    private $dropDownTargetElement;
    readonly onSelectedEntryChanged: TrivialEvent<E>;
    readonly onFocus: TrivialEvent<void>;
    readonly onBlur: TrivialEvent<void>;
    private listBox;
    private isDropDownOpen;
    private isEditorVisible;
    private entries;
    private selectedEntry;
    private lastCommittedValue;
    private blurCausedByClickInsideComponent;
    private autoCompleteTimeoutId;
    private doNoAutoCompleteBecauseBackspaceWasPressed;
    private listBoxDirty;
    private editingMode;
    private usingDefaultQueryFunction;
    constructor(originalInput: JQuery | Element | string, options?: TrivialComboBoxConfig<E>);
    private query(highlightDirection?);
    private fireChangeEvents(entry, originalEvent);
    setSelectedEntry(entry: E, commit?: boolean, fireEvent?: boolean, originalEvent?: Event): void;
    private isEntrySelected();
    private showEditor();
    private editorContainsFreeText();
    private hideEditor();
    private repositionDropDown();
    openDropDown(): void;
    closeDropDown(): void;
    private getNonSelectedEditorValue();
    private autoCompleteIfPossible(delay?);
    private updateListBoxEntries();
    updateEntries(newEntries: E[], highlightDirection?: number): void;
    private isDropDownNeeded();
    setEditingMode(newEditingMode: EditingMode): void;
    getSelectedEntry(): E;
    focus(): void;
    getEditor(): Element;
    getDropDown(): JQuery;
    destroy(): void;
    getMainDomElement(): Element;
}


export interface TrivialComponent {
    getMainDomElement(): Element;
    destroy(): void;
}
export type EditingMode = 'editable' | 'disabled' | 'readonly';
export type MatchingOptions = {
    matchingMode?: 'contains' | 'prefix' | 'prefix-word' | 'prefix-levenshtein' | 'levenshtein';
    ignoreCase?: boolean;
    maxLevenshteinDistance?: number;
};
export type Match = {
    start: number;
    length: number;
    distance?: number;
};
export type HighlightDirection = number | null | undefined;
export type NavigationDirection = "up" | "left" | "down" | "right";
export type ResultCallback<E> = (entries: E[]) => void;
export type QueryFunction<E> = (queryString: string, resultCallback: ResultCallback<E>) => void;
export type RenderingFunction<E> = (entry: E) => string;
export const keyCodes: {
    backspace: number;
    tab: number;
    enter: number;
    shift: number;
    ctrl: number;
    alt: number;
    pause: number;
    caps_lock: number;
    escape: number;
    space: number;
    page_up: number;
    page_down: number;
    end: number;
    home: number;
    left_arrow: number;
    up_arrow: number;
    right_arrow: number;
    down_arrow: number;
    insert: number;
    "delete": number;
    left_window_key: number;
    right_window_key: number;
    select_key: number;
    num_lock: number;
    scroll_lock: number;
    specialKeys: number[];
    numberKeys: number[];
    isSpecialKey: (keyCode: number) => boolean;
    isDigitKey: (keyCode: number) => boolean;
    isModifierKey(e: KeyboardEvent): boolean;
};
export const DEFAULT_TEMPLATES: {
    image2LinesTemplate: string;
    roundImage2LinesColorBubbleTemplate: string;
    icon2LinesTemplate: string;
    iconSingleLineTemplate: string;
    singleLineTemplate: string;
    currencySingleLineShortTemplate: string;
    currencySingleLineLongTemplate: string;
    currency2LineTemplate: string;
    defaultSpinnerTemplate: string;
    defaultNoEntriesTemplate: string;
};
export function wrapWithDefaultTagWrapper(entryHtml: string): string;
export function defaultListQueryFunctionFactory<E>(entries: E[], matchingOptions: MatchingOptions): QueryFunction<E>;
export function createProxy(delegate: any): any;
export function defaultEntryMatchingFunctionFactory(searchedPropertyNames: string[], matchingOptions: MatchingOptions): (entry: any, queryString: string, depth: number) => boolean;
export function defaultTreeQueryFunctionFactory(topLevelEntries: any[], entryMatchingFunction: Function, childrenPropertyName: string, expandedPropertyName: string): (queryString: string, resultCallback: Function) => void;
export function customTreeQueryFunctionFactory(topLevelEntries: any[], childrenPropertyName: string, expandedPropertyName: string, customNodeMatchingFunction: (entry: any, queryString: string, nodeDepth: number) => boolean): (queryString: string, resultCallback: (entries: any[]) => void) => void;
export function selectElementContents(domElement: Node, start: number, end: number): void;
export const escapeSpecialRegexCharacter: (s: string) => string;
export function objectEquals(x: any, y: any): boolean;
export function trivialMatch(text: string, searchString: string, options?: MatchingOptions): Match[];
export function minimallyScrollTo(element: JQuery | Element | string, target: JQuery | Element | string): void;
export function setTimeoutOrDoImmediately(f: Function, delay?: number): number;


export interface DateSuggestion {
    moment: Moment;
    ymdOrder: string;
}
export type YearMonthDayOrder = "YMD" | "YDM" | "MDY" | "MYD" | "DMY" | "DYM";
export interface Options {
    preferredDateFormat?: string;
    favorPastDates?: boolean;
}
export class TrivialDateSuggestionEngine {
    private options;
    constructor(options: Options);
    generateSuggestions(searchString: string, now: Moment | Date): DateSuggestion[];
    private removeDuplicates(suggestions);
    static dateFormatToYmdOrder(dateFormat: string): YearMonthDayOrder;
    private static createSuggestion(moment, ymdOrder);
    generateSuggestionsForDigitsOnlyInput(input: string, today: Moment): DateSuggestion[];
    todayOrFavoriteDirection(m: Moment, today: Moment): boolean;
    private createSuggestionsForFragments(fragments, today);
    private findNextValidDate(startDate, incementor, today);
}


export interface TrivialDateTimeFieldConfig {
    dateFormat?: string;
    timeFormat?: string;
    autoComplete?: boolean;
    autoCompleteDelay?: number;
    showTrigger?: boolean;
    editingMode?: EditingMode;
}
export class TrivialDateTimeField implements TrivialComponent {
    private config;
    private dateIconTemplate;
    private dateTemplate;
    private timeIconTemplate;
    private timeTemplate;
    readonly onChange: TrivialEvent<Moment>;
    private dateListBox;
    private timeListBox;
    private calendarBox;
    private isDropDownOpen;
    private dateValue;
    private timeValue;
    private blurCausedByClickInsideComponent;
    private focusGoesToOtherEditor;
    private autoCompleteTimeoutId;
    private doNoAutoCompleteBecauseBackspaceWasPressed;
    private calendarBoxInitialized;
    private dropdownNeeded;
    private dropDownMode;
    private $originalInput;
    private $dateTimeField;
    private $dropDown;
    private $dateIconWrapper;
    private $dateEditor;
    private $timeIconWrapper;
    private $timeEditor;
    private $calendarBox;
    private $activeEditor;
    private dateSuggestionEngine;
    private timeSuggestionEngine;
    constructor(originalInput: JQuery | Element | string, options?: TrivialDateTimeFieldConfig);
    private setDropDownMode(mode);
    private getActiveBox();
    private getActiveEditor();
    private selectHighlightedListBoxEntry();
    private query(highlightDirection);
    getValue(): Moment;
    private fireChangeEvents();
    private setDate(newDateValue, fireEvent?);
    private setTime(newTimeValue, fireEvent?);
    private updateDisplay();
    setValue(mom: Moment): void;
    private repositionDropDown();
    openDropDown(): void;
    closeDropDown(): void;
    private getNonSelectedEditorValue();
    private autoCompleteIfPossible(delay);
    private updateEntries(newEntries, highlightDirection);
    private static createTimeComboBoxEntry(hour, minute, timeFormat);
    private static pad(num, size);
    private static createDateComboBoxEntry(m, dateFormat);
    focus(): void;
    destroy(): void;
    getMainDomElement(): Element;
}


export type TrivialEventListener<EO> = (eventObject?: EO, eventSource?: any, originalEvent?: Event) => void;
export class TrivialEvent<EO> {
    private eventSource;
    private listeners;
    constructor(eventSource: any);
    addListener(fn: TrivialEventListener<EO>): void;
    removeListener(fn: TrivialEventListener<EO>): void;
    fire(eventObject?: EO, originalEvent?: any): void;
}


export interface TrivialListBoxConfig<E> {
    entryRenderingFunction?: RenderingFunction<E>;
    selectedEntry?: E;
    entries?: E[];
    matchingOptions?: MatchingOptions;
    noEntriesTemplate?: string;
}
export class TrivialListBox<E> implements TrivialComponent {
    private config;
    readonly onSelectedEntryChanged: TrivialEvent<E>;
    private $listBox;
    private $entryList;
    private entries;
    private highlightedEntry;
    private selectedEntry;
    constructor($container: JQuery | Element | string, options?: TrivialListBoxConfig<E>);
    private updateEntryElements(entries);
    updateEntries(newEntries: E[]): void;
    private minimallyScrollTo($entryWrapper);
    setHighlightedEntry(entry: E): void;
    private fireChangeEvents(selectedEntry, originalEvent);
    setSelectedEntry(entry: E, originalEvent?: Event, fireEvent?: boolean): void;
    highlightNextEntry(direction: HighlightDirection): void;
    private getNextHighlightableEntry(direction);
    highlightTextMatches(searchString: string): void;
    getSelectedEntry(): any;
    getHighlightedEntry(): E;
    navigate(direction: NavigationDirection): void;
    getMainDomElement(): Element;
    destroy(): void;
}


export interface TrivialTagComboBoxConfig<E> extends TrivialListBoxConfig<E> {
    valueFunction?: (entries: E[]) => string;
    selectedEntryRenderingFunction?: RenderingFunction<E>;
    selectedEntries?: E[];
    textHighlightingEntryLimit?: number;
    queryFunction?: QueryFunction<E>;
    autoComplete?: boolean;
    autoCompleteDelay?: number;
    autoCompleteFunction?: (editorText: string, entry: E) => string;
    freeTextSeparators?: string[];
    freeTextEntryFactory?: (freeText: string) => E | any;
    showTrigger?: boolean;
    editingMode?: EditingMode;
    showDropDownOnResultsOnly?: boolean;
    tagCompleteDecider?: (entry: E) => boolean;
    entryMerger?: (partialEntry: E, newEntryPart: E) => E;
    removePartialTagOnBlur?: boolean;
    selectionAcceptor?: (entry: E) => boolean;
    spinnerTemplate?: string;
}
export class TrivialTagComboBox<E> implements TrivialComponent {
    private config;
    private $spinners;
    private $originalInput;
    private $tagComboBox;
    private $dropDown;
    private $trigger;
    private $editor;
    private $dropDownTargetElement;
    private $tagArea;
    readonly onSelectedEntryChanged: TrivialEvent<E[]>;
    readonly onFocus: TrivialEvent<void>;
    readonly onBlur: TrivialEvent<void>;
    private listBox;
    private isDropDownOpen;
    private entries;
    private selectedEntries;
    private blurCausedByClickInsideComponent;
    private autoCompleteTimeoutId;
    private doNoAutoCompleteBecauseBackspaceWasPressed;
    private listBoxDirty;
    private repositionDropDownScheduler;
    private editingMode;
    private usingDefaultQueryFunction;
    private currentPartialTag;
    constructor(originalInput: JQuery | Element | string, options?: TrivialTagComboBoxConfig<E>);
    private cancelPartialTag();
    private findNearestTag(mouseEvent);
    private updateListBoxEntries();
    updateEntries(newEntries: E[], highlightDirection?: HighlightDirection): void;
    private removeTag(tagToBeRemoved, originalEvent?);
    private query(highlightDirection?);
    private fireChangeEvents(entries, originalEvent);
    private addSelectedEntry(entry, fireEvent?, originalEvent?, forceAcceptance?);
    private focusEditor();
    private repositionDropDown();
    openDropDown(): void;
    closeDropDown(): void;
    private getNonSelectedEditorValue();
    private autoCompleteIfPossible(delay);
    private isDropDownNeeded();
    private insertAtIndex($element, index);
    private doIgnoringBlurEvents(f);
    setEditingMode(newEditingMode: EditingMode): void;
    setSelectedEntries(entries: E[], forceAcceptance?: boolean): void;
    getSelectedEntries(): E[];
    getCurrentPartialTag(): E;
    focus(): void;
    getEditor(): Element;
    destroy(): void;
    getMainDomElement(): Element;
}


export interface TimeSuggestion {
    hour: number;
    minute: number;
}
export interface TimeComboBoxEntry {
    hour: number;
    minute: number;
    hourString: string;
    minuteString: string;
    displayString: string;
    hourAngle: number;
    minuteAngle: number;
    isNight: boolean;
}
export class TrivialTimeSuggestionEngine {
    constructor();
    generateSuggestions(searchString: string): TimeSuggestion[];
    private static intRange(fromInclusive, toInclusive);
    private static createTimeSuggestions(hourValues, minuteValues);
    private static createMinuteSuggestions(minuteString);
    private static createHourSuggestions(hourString);
}


export type SearchBarMode = 'none' | 'show-if-filled' | 'always-visible';
export interface TrivialTreeConfig<E> extends TrivialTreeBoxConfig<E> {
    queryFunction?: QueryFunction<E>;
    searchBarMode?: SearchBarMode;
    directSelectionViaArrowKeys?: boolean;
    performanceOptimizationSettings?: {
        toManyVisibleItemsRenderDelay: number;
        toManyVisibleItemsThreshold: number;
    };
}
export class TrivialTree<E> implements TrivialComponent {
    private config;
    readonly onSelectedEntryChanged: TrivialEvent<E>;
    readonly onNodeExpansionStateChanged: TrivialEvent<E>;
    private treeBox;
    private entries;
    private selectedEntryId;
    private $spinners;
    private $originalInput;
    private $componentWrapper;
    private $editor;
    private processUpdateTimer;
    constructor(originalInput: JQuery | Element | string, options?: TrivialTreeConfig<E>);
    updateEntries(newEntries: E[]): void;
    private query(highlightDirection?);
    private countVisibleEntries(entries);
    private findEntries(filterFunction);
    private findEntryById(id);
    private setSelectedEntry(entry);
    private fireChangeEvents(entry);
    getSelectedEntry(): void;
    updateChildren(parentNodeId: any, children: E[]): void;
    updateNode(node: E): void;
    removeNode(nodeId: string): void;
    addNode(parentNodeId: number, node: E): void;
    selectNodeById(nodeId: any): void;
    getEditor(): Element;
    destroy(): void;
    getMainDomElement(): Element;
}


export interface TrivialTreeBoxConfig<E> {
    valueFunction?: (entry: E) => string;
    entryRenderingFunction?: (entry: E, depth: number) => string;
    selectedEntry?: E;
    entries?: E[];
    matchingOptions?: MatchingOptions;
    childrenProperty?: string;
    lazyChildrenFlagProperty?: string;
    lazyChildrenQueryFunction?: (node: E, resultCallback: ResultCallback<E>) => void;
    expandedProperty?: string;
    selectedEntryId?: any;
    animationDuration?: number;
    showExpanders?: boolean;
    expandOnSelection?: boolean;
    enforceSingleExpandedPath?: boolean;
    noEntriesTemplate?: string;
    spinnerTemplate?: string;
}
export class TrivialTreeBox<E> implements TrivialComponent {
    private config;
    readonly onSelectedEntryChanged: TrivialEvent<E>;
    readonly onNodeExpansionStateChanged: TrivialEvent<E>;
    private $componentWrapper;
    private $tree;
    private entries;
    private selectedEntryId;
    private highlightedEntry;
    constructor($container: JQuery | Element | string, options?: TrivialTreeBoxConfig<E>);
    private isLeaf(entry);
    private createEntryElement(entry, depth);
    private updateTreeEntryElements();
    private setNodeExpanded(node, expanded, animate);
    private nodeDepth(node);
    private setChildren(node, children);
    private renderChildren(node);
    updateEntries(newEntries: E[]): void;
    private findEntries(filterFunction);
    private findPathToFirstMatchingNode(predicateFunction);
    private findEntryById(id);
    private findParentNode(childNode);
    setSelectedEntry(entry: E, originalEvent?: Event): void;
    setSelectedEntryById(nodeId: any): void;
    private minimallyScrollTo($entryWrapper);
    private markSelectedEntry(entry);
    private fireChangeEvents(entry, originalEvent);
    selectNextEntry(direction: HighlightDirection, originalEvent?: Event): void;
    setHighlightedEntry(entry: E): void;
    private getNextVisibleEntry(currentEntry, direction, onlyEntriesWithTextMatches?);
    highlightTextMatches(searchString: string): void;
    getSelectedEntry(): E;
    revealSelectedEntry(animate?: boolean): void;
    highlightNextEntry(direction: HighlightDirection): void;
    highlightNextMatchingEntry(direction: HighlightDirection): void;
    selectNextMatchingEntry(direction: HighlightDirection): void;
    getHighlightedEntry(): E;
    setHighlightedNodeExpanded(expanded: boolean): boolean;
    updateChildren(parentNodeId: string, children: E[]): void;
    updateNode(node: E): void;
    removeNode(nodeId: string): void;
    addNode(parentNodeId: any, node: E): void;
    destroy(): void;
    getMainDomElement(): Element;
}


export interface TrivialTreeComboBoxConfig<E> extends TrivialTreeBoxConfig<E> {
    valueFunction?: (entry: E) => string;
    selectedEntryRenderingFunction?: RenderingFunction<E>;
    selectedEntry?: E;
    textHighlightingEntryLimit?: number;
    queryFunction?: QueryFunction<E>;
    autoComplete?: boolean;
    autoCompleteDelay?: number;
    autoCompleteFunction?: (editorText: string, entry: E) => string;
    entryToEditorTextFunction?: (entry: E) => string;
    allowFreeText?: boolean;
    freeTextEntryFactory?: (freeText: string) => E | any;
    showClearButton?: boolean;
    showTrigger?: boolean;
    editingMode?: EditingMode;
    showDropDownOnResultsOnly?: boolean;
    spinnerTemplate?: string;
}
export class TrivialTreeComboBox<E> implements TrivialComponent {
    private $treeComboBox;
    private $dropDown;
    private $dropDownTargetElement;
    private config;
    private $editor;
    private treeBox;
    private isDropDownOpen;
    private isEditorVisible;
    private selectedEntry;
    private lastCommittedValue;
    private blurCausedByClickInsideComponent;
    private autoCompleteTimeoutId;
    private doNoAutoCompleteBecauseBackspaceWasPressed;
    private editingMode;
    private usingDefaultQueryFunction;
    private $originalInput;
    private $selectedEntryWrapper;
    private $clearButton;
    private $trigger;
    private $spinners;
    readonly onSelectedEntryChanged: TrivialEvent<E>;
    readonly onFocus: TrivialEvent<void>;
    readonly onBlur: TrivialEvent<void>;
    constructor(originalInput: JQuery | Element | string, options?: TrivialTreeComboBoxConfig<E>);
    private query(highlightDirection?);
    private fireChangeEvents(entry, originalEvent?);
    setSelectedEntry(entry: E, commit: boolean, fireEvent?: boolean, originalEvent?: Event): void;
    private isEntrySelected();
    private showEditor();
    private editorContainsFreeText();
    private hideEditor();
    private repositionDropDown();
    openDropDown(): void;
    closeDropDown(): void;
    private getNonSelectedEditorValue();
    private autoCompleteIfPossible(delay?);
    updateEntries(newEntries: E[], highlightDirection?: HighlightDirection): void;
    private isDropDownNeeded();
    setEditingMode(newEditingMode: EditingMode): void;
    getSelectedEntry(): any;
    updateChildren(parentNodeId: any, children: E[]): void;
    updateNode(node: E): void;
    removeNode(nodeId: string): void;
    focus(): void;
    getEditor(): Element;
    getDropDown(): JQuery;
    destroy(): void;
    getMainDomElement(): Element;
}


export interface TrivialUnitBoxConfig<U> extends TrivialListBoxConfig<U> {
    unitValueProperty?: string;
    unitIdProperty?: string;
    decimalPrecision?: number;
    decimalSeparator?: string;
    thousandsSeparator?: string;
    unitDisplayPosition?: 'left' | 'right';
    allowNullAmount?: boolean;
    selectedEntryRenderingFunction?: (entry: U) => string;
    amount?: number;
    noEntriesTemplate?: string;
    queryFunction?: QueryFunction<U>;
    queryOnNonNumberCharacters?: boolean;
    openDropdownOnEditorClick?: boolean;
    showTrigger?: boolean;
    editingMode?: EditingMode;
    spinnerTemplate?: string;
}
export type TrivialUnitBoxChangeEvent<U> = {
    unit: string;
    unitEntry: U;
    amount: number;
    amountAsFloatingPointNumber: number;
};
export class TrivialUnitBox<U> implements TrivialComponent {
    private config;
    readonly onChange: TrivialEvent<TrivialUnitBoxChangeEvent<U>>;
    readonly onSelectedEntryChanged: TrivialEvent<U>;
    readonly onFocus: TrivialEvent<void>;
    readonly onBlur: TrivialEvent<void>;
    private listBox;
    private isDropDownOpen;
    private entries;
    private selectedEntry;
    private blurCausedByClickInsideComponent;
    private numberRegex;
    private $spinners;
    private $originalInput;
    private $editor;
    private $dropDownTargetElement;
    private $unitBox;
    private $selectedEntryAndTriggerWrapper;
    private $selectedEntryWrapper;
    private $dropDown;
    private editingMode;
    private usingDefaultQueryFunction;
    constructor(originalInput: JQuery | Element | string, options?: TrivialUnitBoxConfig<U>);
    private ensureDecimalInput();
    private getQueryString();
    private getEditorValueNumberPart(fillupDecimals?);
    private query(highlightDirection?);
    private fireSelectedEntryChangedEvent();
    private fireChangeEvents(originalEvent);
    setSelectedEntry(entry: U, fireEvent?: boolean, originalEvent?: Event): void;
    private formatEditorValue();
    private cleanupEditorValue();
    private formatAmount(integerNumber, precision, decimalSeparator, thousandsSeparator);
    private repositionDropDown();
    openDropDown(): void;
    closeDropDown(): void;
    private updateOriginalInputValue();
    getAmount(): number;
    private isDropDownNeeded();
    setEditingMode(newEditingMode: EditingMode): void;
    private selectUnit(unitIdentifier);
    updateEntries(newEntries: U[]): void;
    getSelectedEntry(): U;
    setAmount(amount: number): void;
    focus(): void;
    getEditor(): Element;
    destroy(): void;
    getMainDomElement(): Element;
}


export type HighlightOptions = MatchingOptions & {
    highlightClassName: string;
};



}