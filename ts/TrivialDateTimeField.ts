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

    import Moment = moment.Moment;

    enum Mode {
        MODE_CALENDAR,
        MODE_DATE_LIST,
        MODE_TIME_LIST
    }

    type DatePart = {moment: Moment, ymdOrder: string};

    type DateComboBoxEntry = {
        moment: Moment,
        day: number,
        weekDay: string,
        month: number,
        year: number,
        displayString: string
    }

    type TimeComboBoxEntry = {
        hour: number,
        minute: number,
        hourString: string,
        minuteString: string,
        displayString: string,
        hourAngle: number,
        minuteAngle: number,
        isNight: boolean
    };

    export interface TrivialDateTimeFieldConfig {
        dateFormat?: string,
        timeFormat?: string,
        autoComplete?: boolean,
        autoCompleteDelay?: number,
        showTrigger?: boolean,
        editingMode?: EditingMode
    }

    export class TrivialDateTimeField implements TrivialComponent {

        private config: TrivialDateTimeFieldConfig;

        private dateIconTemplate = `<svg viewBox="0 0 540 540" width="22" height="22" class="calendar-icon">
        <defs>
            <linearGradient id="Gradient1" x1="0" x2="0" y1="0" y2="1">
                <stop class="calendar-symbol-ring-gradient-stop1" offset="0%"/>
                <stop class="calendar-symbol-ring-gradient-stop2" offset="50%"/>
                <stop class="calendar-symbol-ring-gradient-stop3" offset="100%"/>
            </linearGradient>
        </defs>        
        <g id="layer1">
            <rect class="calendar-symbol-page-background" x="90" y="90" width="360" height="400" ry="3.8"></rect>
            <rect class="calendar-symbol-color" x="90" y="90" width="360" height="100" ry="3.5"></rect>
            <rect class="calendar-symbol-page" x="90" y="90" width="360" height="395" ry="3.8"></rect>
            <rect class="calendar-symbol-ring" fill="url(#Gradient2)" x="140" y="30" width="40" height="120" ry="30.8"></rect>
            <rect class="calendar-symbol-ring" fill="url(#Gradient2)" x="250" y="30" width="40" height="120" ry="30.8"></rect>
            <rect class="calendar-symbol-ring" fill="url(#Gradient2)" x="360" y="30" width="40" height="120" ry="30.8"></rect>
            <text class="calendar-symbol-date" x="270" y="415" text-anchor="middle">{{weekDay}}</text>
        </g>
    </svg>`;
        private dateTemplate = '<div class="tr-template-icon-single-line">'
            + this.dateIconTemplate
            + '<div class="content-wrapper tr-editor-area">{{displayString}}</div>'
            + '</div>';
        private timeIconTemplate = '<svg class="clock-icon night-{{isNight}}" viewBox="0 0 110 110" width="22" height="22"> ' +
            '<circle class="clockcircle" cx="55" cy="55" r="45"/>' +
            '<g class="hands">' +
            ' <line class="hourhand" x1="55" y1="55" x2="55" y2="35" {{#hourAngle}}transform="rotate({{hourAngle}},55,55)"{{/hourAngle}}/> ' +
            ' <line class="minutehand" x1="55" y1="55" x2="55" y2="22" {{#minuteAngle}}transform="rotate({{minuteAngle}},55,55)"{{/minuteAngle}}/>' +
            '</g> ' +
            '</svg>';
        private timeTemplate = '<div class="tr-template-icon-single-line">' +
            this.timeIconTemplate +
            '  <div class="content-wrapper tr-editor-area">{{displayString}}</div>' +
            '</div>';

        public readonly onChange = new TrivialEvent<Moment>(this);

        private dateListBox: TrivialListBox<DateComboBoxEntry>;
        private timeListBox: TrivialListBox<TimeComboBoxEntry>;
        private calendarBox: TrivialCalendarBox;
        private isDropDownOpen = false;

        private dateValue: DateComboBoxEntry = null; // moment object representing the current value
        private timeValue: TimeComboBoxEntry = null; // moment object representing the current value

        private blurCausedByClickInsideComponent = false;
        private focusGoesToOtherEditor = false;
        private autoCompleteTimeoutId = -1;
        private doNoAutoCompleteBecauseBackspaceWasPressed = false;
        private calendarBoxInitialized = false;
        private dropdownNeeded: boolean;

        private dropDownMode = Mode.MODE_CALENDAR;

        private $originalInput: JQuery;
        private $dateTimeField: JQuery;
        private $dropDown: JQuery;

        private $dateIconWrapper: JQuery;
        private $dateEditor: JQuery;
        private $timeIconWrapper: JQuery;
        private $timeEditor: JQuery;

        private $calendarBox: JQuery;
        private $activeEditor: JQuery;

        constructor(originalInput: JQuery|Element|string, options: TrivialDateTimeFieldConfig = {}) {
            options = options || {};
            this.config = $.extend(<TrivialDateTimeFieldConfig> {
                dateFormat: "MM/DD/YYYY",
                timeFormat: "HH:mm",
                autoComplete: true,
                autoCompleteDelay: 0,
                showTrigger: true,
                editingMode: "editable" // one of 'editable', 'disabled' and 'readonly'
            }, options);

            this.$originalInput = $(originalInput).addClass("tr-original-input");
            this.$dateTimeField = $('<div class="tr-datetimefield tr-input-wrapper"/>')
                .addClass(this.config.editingMode)
                .insertAfter(this.$originalInput);

            let $editorWrapper = $('<div class="tr-editor-wrapper">').appendTo(this.$dateTimeField);

            this.$dateIconWrapper = $('<div class="tr-date-icon-wrapper"/>').appendTo($editorWrapper);
            this.$dateEditor = $('<div class="tr-date-editor" contenteditable="true"/>').appendTo($editorWrapper);
            this.$timeIconWrapper = $('<div class="tr-time-icon-wrapper"/>').appendTo($editorWrapper);
            this.$timeEditor = $('<div class="tr-time-editor" contenteditable="true"/>').appendTo($editorWrapper);

            this.$dateIconWrapper.click(() => {
                this.$activeEditor = this.$dateEditor;
                this.setDropDownMode(Mode.MODE_CALENDAR);
                this.openDropDown();
                selectElementContents(this.$dateEditor[0], 0, this.$dateEditor.text().length);
            });
            this.$timeIconWrapper.click(() => {
                this.$activeEditor = this.$timeEditor;
                this.setDropDownMode(Mode.MODE_CALENDAR);
                selectElementContents(this.$timeEditor[0], 0, this.$timeEditor.text().length);
            });

            this.$dateEditor.focus(() => {
                this.$activeEditor = this.$dateEditor;
                if (!this.blurCausedByClickInsideComponent || this.focusGoesToOtherEditor) {
                    selectElementContents(this.$dateEditor[0], 0, this.$dateEditor.text().length);
                }
            });
            this.$timeEditor.focus(() => {
                this.$activeEditor = this.$timeEditor;
                if (!this.blurCausedByClickInsideComponent || this.focusGoesToOtherEditor) {
                    selectElementContents(this.$timeEditor[0], 0, this.$timeEditor.text().length);
                }
            });

            if (this.config.showTrigger) {
                const $trigger = $('<div class="tr-trigger"><span class="tr-trigger-icon"/></div>').appendTo(this.$dateTimeField);
                $trigger.mousedown(() => {
                    if (this.isDropDownOpen) {
                        this.closeDropDown();
                    } else {
                        setTimeout(() => { // TODO remove this when Chrome bug is fixed. Chrome scrolls to the top of the page if we do this synchronously. Maybe this has something to do with https://code.google.com/p/chromium/issues/detail?id=342307 .
                            this.setDropDownMode(Mode.MODE_CALENDAR);
                            this.calendarBox.setSelectedDate(this.dateValue ? this.dateValue.moment : moment());
                            this.$activeEditor = this.$dateEditor;
                            selectElementContents(this.$dateEditor[0], 0, this.$dateEditor.text().length);
                            this.openDropDown();
                        });
                    }
                });
            }
            this.$dropDown = $('<div class="tr-dropdown"></div>')
                .scroll(() => {
                    return false;
                });
            this.dropdownNeeded = this.config.editingMode == 'editable';
            if (this.dropdownNeeded) {
                this.$dropDown.appendTo("body");
            }

            let $dateListBox = $('<div class="date-listbox">').appendTo(this.$dropDown);
            this.dateListBox = new TrivialListBox($dateListBox, {
                entryRenderingFunction: (entry: any) => {
                    return Mustache.render(this.dateTemplate, entry);
                }
            });
            this.dateListBox.onSelectedEntryChanged.addListener((selectedEntry: DateComboBoxEntry) => {
                if (selectedEntry) {
                    this.setDate(selectedEntry, selectedEntry.displayString != (this.dateValue && this.dateValue.displayString));
                    this.dateListBox.setSelectedEntry(null);
                    this.closeDropDown();
                }
            });
            let $timeListBox = $('<div class="time-listbox">').appendTo(this.$dropDown);
            this.timeListBox = new TrivialListBox($timeListBox, {
                entryRenderingFunction: (entry: any) => {
                    return Mustache.render(this.timeTemplate, entry);
                }
            });
            this.timeListBox.onSelectedEntryChanged.addListener((selectedEntry: TimeComboBoxEntry) => {
                if (selectedEntry) {
                    this.setTime(selectedEntry, selectedEntry.displayString != (this.timeValue && this.timeValue.displayString));
                    this.dateListBox.setSelectedEntry(null);
                    this.closeDropDown();
                }
            });
            this.$calendarBox = $('<div class="calendarbox">').appendTo(this.$dropDown);

            this.$dateEditor
                .add(this.$timeEditor)
                .focus(
                    () => {
                        this.$dateTimeField.addClass('focus');
                    }
                )
                .blur(
                    () => {
                        if (!this.blurCausedByClickInsideComponent) {
                            this.$dateTimeField.removeClass('focus');
                            this.updateDisplay();
                            this.closeDropDown();
                        }
                    }
                )
                .keydown(
                    (e: KeyboardEvent) => {
                        if (keyCodes.isModifierKey(e)) {
                            return;
                        } else if (e.which == keyCodes.tab) {
                            this.selectHighlightedListBoxEntry();
                            return;
                        } else if (e.which == keyCodes.left_arrow || e.which == keyCodes.right_arrow) {
                            if (this.getActiveEditor() === this.$timeEditor && e.which == keyCodes.left_arrow && window.getSelection().focusOffset === 0) {
                                e.preventDefault();
                                selectElementContents(this.$dateEditor[0], 0, this.$dateEditor.text().length);
                            } else if (this.getActiveEditor() === this.$dateEditor && e.which == keyCodes.right_arrow && window.getSelection().focusOffset === this.$dateEditor.text().length) {
                                e.preventDefault();
                                selectElementContents(this.$timeEditor[0], 0, this.$timeEditor.text().length);
                            }
                            return; // let the user navigate freely left and right...
                        }

                        if (e.which == keyCodes.backspace || e.which == keyCodes.delete) {
                            this.doNoAutoCompleteBecauseBackspaceWasPressed = true; // we want query results, but no autocomplete
                        }

                        if (e.which == keyCodes.up_arrow || e.which == keyCodes.down_arrow) {
                            this.getActiveEditor().select();
                            const direction = e.which == keyCodes.up_arrow ? -1 : 1;
                            if (this.isDropDownOpen) {
                                this.setDropDownMode(e.currentTarget === this.$dateEditor[0] ? Mode.MODE_DATE_LIST : Mode.MODE_TIME_LIST);
                                this.query(direction);
                                this.openDropDown();
                            } else {
                                if (this.dropDownMode !== Mode.MODE_CALENDAR) {
                                    this.getActiveBox().navigate(direction === 1 ? 'down' : 'up');
                                    this.autoCompleteIfPossible(this.config.autoCompleteDelay);
                                }
                            }
                            return false; // some browsers move the caret to the beginning on up key
                        } else if (e.which == keyCodes.enter) {
                            if (this.isDropDownOpen) {
                                e.preventDefault(); // do not submit form
                                this.selectHighlightedListBoxEntry();
                                selectElementContents(this.getActiveEditor()[0], 0, this.getActiveEditor().text().length);
                                this.closeDropDown();
                            }
                        } else if (e.which == keyCodes.escape) {
                            e.preventDefault(); // prevent ie from doing its text field magic...
                            if (this.isDropDownOpen) {
                                this.updateDisplay();
                                selectElementContents(this.getActiveEditor()[0], 0, this.getActiveEditor().text().length);
                            }
                            this.closeDropDown();
                        } else {
                            this.setDropDownMode(e.currentTarget === this.$dateEditor[0] ? Mode.MODE_DATE_LIST : Mode.MODE_TIME_LIST);
                            this.query(1);
                            this.openDropDown();
                        }
                    }
                );

            if (this.$originalInput.val()) {
                this.setValue(moment(this.$originalInput.val()));
            } else {
                this.setValue(null);
            }

            if (this.$originalInput.attr("tabindex")) {
                this.$dateEditor.add(this.$timeEditor).attr("tabindex", this.$originalInput.attr("tabindex"));
            }
            if (this.$originalInput.attr("autofocus")) {
                this.$dateEditor.focus();
            }

            this.$dateTimeField.add(this.$dropDown).mousedown((e) => {
                if (this.$dateEditor.is(":focus") || this.$timeEditor.is(":focus")) {
                    this.blurCausedByClickInsideComponent = true;
                }
                if (e.target === this.$dateEditor[0]
                    || e.target === this.$timeEditor[0]
                    || e.target === this.$dateIconWrapper[0]
                    || e.target === this.$timeIconWrapper[0]) {
                    this.focusGoesToOtherEditor = true;
                }
            }).on('mouseup mouseout', () => {
                if (this.blurCausedByClickInsideComponent && !this.focusGoesToOtherEditor) {
                    this.getActiveEditor().focus();
                }
                this.blurCausedByClickInsideComponent = false;
                this.focusGoesToOtherEditor = false;
            });
            this.$activeEditor = this.$dateEditor;
        }

        private setDropDownMode(mode: Mode) {
            this.dropDownMode = mode;
            if (!this.calendarBoxInitialized && mode === Mode.MODE_CALENDAR) {
                this.calendarBox = new TrivialCalendarBox(this.$calendarBox, {
                    firstDayOfWeek: 1,
                    mode: 'date' // 'date', 'time', 'datetime'
                });
                this.calendarBox.setKeyboardNavigationState('month');
                this.calendarBox.onChange.addListener(({value, timeUnitEdited}) => {
                    this.setDate(TrivialDateTimeField.createDateComboBoxEntry(value, this.config.dateFormat));
                    if (timeUnitEdited === 'day') {
                        this.closeDropDown();
                        this.$activeEditor = this.$timeEditor;
                        selectElementContents(this.$timeEditor[0], 0, this.$timeEditor.text().length);
                        this.fireChangeEvents();
                    }
                });
                this.calendarBoxInitialized = true;
            }
            this.calendarBoxInitialized && $(this.calendarBox.getMainDomElement()).toggle(mode === Mode.MODE_CALENDAR);
            $(this.dateListBox.getMainDomElement()).toggle(mode === Mode.MODE_DATE_LIST);
            $(this.timeListBox.getMainDomElement()).toggle(mode === Mode.MODE_TIME_LIST);
        }

        private getActiveBox(): any /*TODO Navigateable*/ {
            if (this.dropDownMode === Mode.MODE_CALENDAR) {
                return this.calendarBox;
            } else if (this.dropDownMode === Mode.MODE_DATE_LIST) {
                return this.dateListBox;
            } else {
                return this.timeListBox;
            }
        }

        private getActiveEditor() {
            return this.$activeEditor;
        }


        private selectHighlightedListBoxEntry() {
            if (this.dropDownMode === Mode.MODE_DATE_LIST || this.dropDownMode === Mode.MODE_TIME_LIST) {
                const highlightedEntry = this.getActiveBox().getHighlightedEntry();
                if (this.isDropDownOpen && highlightedEntry) {
                    if (this.getActiveEditor() === this.$dateEditor) {
                        this.setDate(highlightedEntry, true);
                    } else {
                        this.setTime(highlightedEntry, true);
                    }
                }
            }
        }


        private query(highlightDirection: HighlightDirection) {
            // call queryprivate asynchronously to be sure the editor has been updated before the result callback is called. Note: the query() method is called on keydown...
            setTimeout(() => {
                const queryString = this.getNonSelectedEditorValue();
                if (this.getActiveEditor() === this.$dateEditor) {
                    TrivialDateTimeField.dateQueryFunction(queryString, (newEntries: any[]) => {
                        this.updateEntries(newEntries, highlightDirection);
                    }, this.config.dateFormat);
                } else {
                    TrivialDateTimeField.timeQueryFunction(queryString, (newEntries: any[]) => {
                        this.updateEntries(newEntries, highlightDirection);
                    }, this.config.timeFormat);
                }
            }, 0);
        }

        public getValue() {
            if (this.dateValue == null && this.timeValue == null) {
                return null;
            } else if (this.dateValue == null) {
                return null;
            } else if (this.timeValue == null) {
                return moment([
                    this.dateValue.year,
                    this.dateValue.month - 1,
                    this.dateValue.day
                ]).startOf('day');
            } else {
                return moment([
                    this.dateValue.year,
                    this.dateValue.month - 1,
                    this.dateValue.day,
                    this.timeValue.hour,
                    this.timeValue.minute
                ]);
            }
        };

        private fireChangeEvents() {
            this.$originalInput.trigger("change");
            this.onChange.fire(this.getValue());
        }

        private setDate(newDateValue: DateComboBoxEntry, fireEvent: boolean = false) {
            this.dateValue = newDateValue;
            this.updateDisplay();
            if (fireEvent) {
                this.fireChangeEvents();
            }
            // TODO update original input
        }

        private setTime(newTimeValue: TimeComboBoxEntry, fireEvent: boolean = false) {
            this.timeValue = newTimeValue;
            this.updateDisplay();
            if (fireEvent) {
                this.fireChangeEvents();
            }
            // TODO update original input
        }

        private updateDisplay() {
            if (this.dateValue) {
                this.$dateEditor.text(moment([this.dateValue.year, this.dateValue.month - 1, this.dateValue.day]).format(this.config.dateFormat));
                this.$dateIconWrapper.empty().append(Mustache.render(this.dateIconTemplate, this.dateValue));
            } else {
                this.$dateEditor.text("");
                this.$dateIconWrapper.empty().append(Mustache.render(this.dateIconTemplate, {}));
            }
            if (this.timeValue) {
                this.$timeEditor.text(moment([1970, 0, 1, this.timeValue.hour, this.timeValue.minute]).format(this.config.timeFormat));
                this.$timeIconWrapper.empty().append(Mustache.render(this.timeIconTemplate, this.timeValue));
            } else {
                this.$timeEditor.text("");
                this.$timeIconWrapper.empty().append(Mustache.render(this.timeIconTemplate, {}));
            }
        }

        public setValue(mom: Moment) {
            this.setDate(mom && TrivialDateTimeField.createDateComboBoxEntry(mom, this.config.dateFormat));
            this.setTime(mom && TrivialDateTimeField.createTimeComboBoxEntry(mom.hour(), mom.minute(), this.config.timeFormat));
        }

        private repositionDropDown() {
            this.$dropDown
                .show()
                .position({
                    my: "left top",
                    at: "left bottom",
                    of: this.$dateTimeField,
                    collision: "flip",
                    using: (calculatedPosition: {left: number, top: number}, info: {vertical: string}) => {
                        if (info.vertical === "top") {
                            this.$dateTimeField.removeClass("dropdown-flipped");
                            this.$dropDown.removeClass("flipped");
                        } else {
                            this.$dateTimeField.addClass("dropdown-flipped");
                            this.$dropDown.addClass("flipped");
                        }
                        this.$dropDown.css({
                            left: calculatedPosition.left + 'px',
                            top: calculatedPosition.top + 'px'
                        });
                    }
                })
                .width(this.$dateTimeField.width()
                );
        }

        private openDropDown() {
            if (this.dropdownNeeded) {
                this.$dateTimeField.addClass("open");
                this.repositionDropDown();
                this.isDropDownOpen = true;
            }
        }

        private closeDropDown() {
            this.$dateTimeField.removeClass("open");
            this.$dropDown.hide();
            this.isDropDownOpen = false;
        }

        private getNonSelectedEditorValue() {
            const editorText = this.getActiveEditor().text().replace(String.fromCharCode(160), " ");
            const selection = window.getSelection();
            if (selection.anchorOffset != selection.focusOffset) {
                return editorText.substring(0, Math.min(selection.anchorOffset, selection.focusOffset));
            } else {
                return editorText;
            }
        }

        private autoCompleteIfPossible(delay: number) {
            if (this.config.autoComplete && (this.dropDownMode === Mode.MODE_DATE_LIST || this.dropDownMode === Mode.MODE_TIME_LIST)) {
                clearTimeout(this.autoCompleteTimeoutId);

                const listBox = this.getActiveBox();
                const highlightedEntry = listBox.getHighlightedEntry();
                if (highlightedEntry && this.doNoAutoCompleteBecauseBackspaceWasPressed) {
                    const autoCompletingEntryDisplayValue = highlightedEntry.displayString;
                    if (autoCompletingEntryDisplayValue) {
                        this.autoCompleteTimeoutId = setTimeout(() => {
                            const oldEditorValue = this.getNonSelectedEditorValue();
                            let newEditorValue: string;
                            if (autoCompletingEntryDisplayValue.toLowerCase().indexOf(oldEditorValue.toLowerCase()) === 0) {
                                newEditorValue = oldEditorValue + autoCompletingEntryDisplayValue.substr(oldEditorValue.length);
                            } else {
                                newEditorValue = this.getNonSelectedEditorValue();
                            }
                            this.getActiveEditor().text(newEditorValue);
                            // $editor[0].offsetHeight;  // we need this to guarantee that the editor has been updated...
                            if (this.getActiveEditor().is(":focus")) {
                                selectElementContents(this.getActiveEditor()[0], oldEditorValue.length, newEditorValue.length);
                            }
                        }, delay || 0);
                    }
                }
                this.doNoAutoCompleteBecauseBackspaceWasPressed = false;
            }
        }

        private updateEntries(newEntries: any[], highlightDirection: HighlightDirection) {
            const listBox = this.getActiveBox();

            highlightDirection = highlightDirection === undefined ? 1 : highlightDirection;
            listBox.updateEntries(newEntries);

            listBox.highlightTextMatches(this.getNonSelectedEditorValue());

            listBox.highlightNextEntry(highlightDirection);

            this.autoCompleteIfPossible(this.config.autoCompleteDelay);

            if (this.isDropDownOpen) {
                this.openDropDown(); // only for repositioning!
            }
        }

        public focus() {
            selectElementContents(this.getActiveEditor()[0], 0, this.getActiveEditor().text().length);
        }

        public destroy() {
            this.$originalInput.removeClass('tr-original-input').insertBefore(this.$dateTimeField);
            this.$dateTimeField.remove();
            this.$dropDown.remove();
        }


// ====================== static DATE functions =========================

        private static dateQueryFunction(searchString: string, resultCallback: Function, dateFormat: string) {
            let suggestions: DatePart[];
            if (searchString.match(/[^\d]/)) {
                const fragments = searchString.split(/[^\d]/).filter((f) => {
                    return !!f
                });
                suggestions = TrivialDateTimeField.createSuggestionsForFragments(fragments, moment());
            } else {
                suggestions = TrivialDateTimeField.generateSuggestionsForDigitsOnlyInput(searchString, moment());
            }

            // remove duplicates
            const seenMoments: Moment[] = [];
            suggestions = suggestions.filter((s) => {
                if (seenMoments.filter((seenMoment) => {
                        return s.moment.isSame(seenMoment, 'day');
                    }).length > 0) {
                    return false;
                } else {
                    seenMoments.push(s.moment);
                    return true;
                }
            });

            // sort by relevance
            const preferredYmdOrder = TrivialDateTimeField.dateFormatToYmdOrder(dateFormat);
            suggestions.sort((a, b) => {
                if (preferredYmdOrder.indexOf(a.ymdOrder) === -1 && preferredYmdOrder.indexOf(b.ymdOrder) !== -1) {
                    return 1;
                } else if (preferredYmdOrder.indexOf(a.ymdOrder) !== -1 && preferredYmdOrder.indexOf(b.ymdOrder) === -1) {
                    return -1;
                } else if (a.ymdOrder.length != b.ymdOrder.length) { // D < DM < DMY
                    return a.ymdOrder.length - b.ymdOrder.length;
                } else if (a.ymdOrder !== b.ymdOrder) {
                    return new Levenshtein(a.ymdOrder, preferredYmdOrder).distance - new Levenshtein(b.ymdOrder, preferredYmdOrder).distance;
                } else {
                    const today = moment();
                    return a.moment.diff(today, 'days') - b.moment.diff(today, 'days'); // nearer is better
                }
            });

            resultCallback(suggestions.map((s) => {
                return TrivialDateTimeField.createDateComboBoxEntry(s.moment, dateFormat)
            }));
        }


        private static createDateComboBoxEntry(m: Moment, dateFormat: string): DateComboBoxEntry {
            return {
                moment: m,
                day: m.date(),
                weekDay: m.format('dd'),
                month: m.month() + 1,
                year: m.year(),
                displayString: m.format(dateFormat)
            };
        }

        private static dateFormatToYmdOrder(dateFormat: string) {
            const ymdIndexes: {[ymd: string]: number} = {
                D: dateFormat.indexOf("D"),
                M: dateFormat.indexOf("M"),
                Y: dateFormat.indexOf("Y")
            };
            return ["D", "M", "Y"].sort((a: string, b: string) => {
                return ymdIndexes[a] - ymdIndexes[b]
            }).join("");
        }

        private static createDateParts(moment: Moment, ymdOrder: string): DatePart {
            return {moment, ymdOrder};
        }

        private static generateSuggestionsForDigitsOnlyInput(input: string, today: Moment): DatePart[] {
            if (!input) {
                const result: DatePart[] = [];
                for (let i = 0; i < 7; i++) {
                    result.push(TrivialDateTimeField.createDateParts(moment(today).add(i, "day"), ""));
                }
                return result;
            } else if (input.length > 8) {
                return [];
            }

            let suggestions: DatePart[] = [];
            for (let i = 1; i <= input.length; i++) {
                for (let j = Math.min(input.length, i + 1); j <= input.length; j - i === 2 ? j += 2 : j++) {
                    suggestions = suggestions.concat(TrivialDateTimeField.createSuggestionsForFragments([input.substring(0, i), input.substring(i, j), input.substring(j, input.length)], today));
                }
            }
            return suggestions;
        }

        private static createSuggestionsForFragments(fragments: string[], today: Moment) {

            let todayOrFuture = (m: Moment) => {
                return today.isBefore(m, 'day') || today.isSame(m, 'day');
            };

            let numberToYear = (n: number) => {
                const shortYear = today.year() % 100;
                const yearSuggestionBoundary = (shortYear + 20) % 100; // suggest 20 years into the future and 80 year backwards
                const currentCentury = Math.floor(today.year() / 100) * 100;
                if (n < yearSuggestionBoundary) {
                    return currentCentury + n;
                } else if (n < 100) {
                    return currentCentury - 100 + n;
                } else if (n > today.year() - 100 && n < today.year() + 100) {
                    return n;
                } else {
                    return null;
                }
            };

            const s1 = fragments[0];
            let s2 = fragments[1], s3 = fragments[2];
            const n1 = parseInt(s1), n2 = parseInt(s2), n3 = parseInt(s3);
            const suggestions: DatePart[] = [];

            if (s1 && !s2 && !s3) {
                const momentInCurrentMonth = moment([today.year(), today.month(), s1]);
                if (momentInCurrentMonth.isValid() && todayOrFuture(momentInCurrentMonth)) {
                    suggestions.push(TrivialDateTimeField.createDateParts(momentInCurrentMonth, "D"));
                } else {
                    const momentInNextMonth = moment([today.year() + (today.month() == 11 ? 1 : 0), (today.month() + 1) % 12, s1]);
                    if (momentInNextMonth.isValid()) {
                        suggestions.push(TrivialDateTimeField.createDateParts(momentInNextMonth, "D"));
                    }
                }
            } else if (s1 && s2 && !s3) {
                let mom: Moment;
                mom = moment([moment().year(), n1 - 1, s2]);
                if (mom.isValid() && todayOrFuture(mom)) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "MD"));
                } else {
                    mom = moment([moment().year() + 1, n1 - 1, s2]);
                    if (mom.isValid()) {
                        suggestions.push(TrivialDateTimeField.createDateParts(mom, "MD"));
                    }
                }
                mom = moment([moment().year(), n2 - 1, s1]);
                if (mom.isValid() && todayOrFuture(mom)) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "DM"));
                } else {
                    mom = moment([moment().year() + 1, n2 - 1, s1]);
                    if (mom.isValid()) {
                        suggestions.push(TrivialDateTimeField.createDateParts(mom, "DM"));
                    }
                }
            } else { // s1 && s2 && s3
                let mom: Moment;
                mom = moment([numberToYear(n1), n2 - 1, s3]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "YMD"));
                }
                mom = moment([numberToYear(n1), n3 - 1, s2]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "YDM"));
                }
                mom = moment([numberToYear(n2), n1 - 1, s3]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "MYD"));
                }
                mom = moment([numberToYear(n2), n3 - 1, s1]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "DYM"));
                }
                mom = moment([numberToYear(n3), n1 - 1, s2]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "MDY"));
                }
                mom = moment([numberToYear(n3), n2 - 1, s1]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateTimeField.createDateParts(mom, "DMY"));
                }
            }

            return suggestions;
        }

// ================ static TIME functions =======================

        private static timeQueryFunction(searchString: string, resultCallback: Function, timeFormat: string) {
            let suggestedValues: TimeComboBoxEntry[] = [];

            const match = searchString.match(/[^\d]/);
            const colonIndex = match != null ? match.index : null;
            if (colonIndex !== null) {
                const hourString = searchString.substring(0, colonIndex);
                const minuteString = searchString.substring(colonIndex + 1);
                suggestedValues = suggestedValues.concat(TrivialDateTimeField.createTimeComboBoxEntries(TrivialDateTimeField.createHourSuggestions(hourString), TrivialDateTimeField.createMinuteSuggestions(minuteString), timeFormat));
            } else if (searchString.length > 0) { // is a number!
                if (searchString.length >= 2) {
                    const hourString = searchString.substr(0, 2);
                    const minuteString = searchString.substring(2, searchString.length);
                    suggestedValues = suggestedValues.concat(TrivialDateTimeField.createTimeComboBoxEntries(TrivialDateTimeField.createHourSuggestions(hourString), TrivialDateTimeField.createMinuteSuggestions(minuteString), timeFormat));
                }
                const hourString = searchString.substr(0, 1);
                const minuteString = searchString.substring(1, searchString.length);
                if (minuteString.length <= 2) {
                    suggestedValues = suggestedValues.concat(TrivialDateTimeField.createTimeComboBoxEntries(TrivialDateTimeField.createHourSuggestions(hourString), TrivialDateTimeField.createMinuteSuggestions(minuteString), timeFormat));
                }
            } else {
                suggestedValues = suggestedValues.concat(TrivialDateTimeField.createTimeComboBoxEntries(TrivialDateTimeField.intRange(6, 24).concat(TrivialDateTimeField.intRange(1, 5)), [0], timeFormat));
            }

            resultCallback(suggestedValues);
        }

        private static intRange(fromInclusive: number, toInclusive: number) {
            const ints: number[] = [];
            for (let i = fromInclusive; i <= toInclusive; i++) {
                ints.push(i)
            }
            return ints;
        }

        private static pad(num: number, size: number) {
            let s: string = num + "";
            while (s.length < size) s = "0" + s;
            return s;
        }

        private static createTimeComboBoxEntry(h: number, m: number, timeFormat: string): TimeComboBoxEntry {
            return {
                hour: h,
                minute: m,
                hourString: TrivialDateTimeField.pad(h, 2),
                minuteString: TrivialDateTimeField.pad(m, 2),
                displayString: moment().hour(h).minute(m).format(timeFormat),
                hourAngle: ((h % 12) + m / 60) * 30,
                minuteAngle: m * 6,
                isNight: h < 6 || h >= 20
            };
        }

        private static createTimeComboBoxEntries(hourValues: number[], minuteValues: number[], timeFormat: string) {
            const entries: TimeComboBoxEntry[] = [];
            for (let i = 0; i < hourValues.length; i++) {
                const hour = hourValues[i];
                for (let j = 0; j < minuteValues.length; j++) {
                    const minute = minuteValues[j];
                    entries.push(TrivialDateTimeField.createTimeComboBoxEntry(hour, minute, timeFormat));
                }
            }
            return entries;
        }

        private static createMinuteSuggestions(minuteString: string) {
            const m = parseInt(minuteString);
            if (isNaN(m)) {
                return [0];
            } else if (minuteString.length > 1) {
                return [m % 60]; // the user entered an exact minute string!
            } else if (m < 6) {
                return [m * 10];
            } else {
                return [m % 60];
            }
        }

        private static createHourSuggestions(hourString: string) {
            const h = parseInt(hourString);
            if (isNaN(h)) {
                return TrivialDateTimeField.intRange(1, 24);
                //} else if (h < 10) {
                //    return [(h + 12) % 24, h]; // afternoon first
                //} else if (h >= 10 && h < 12) {
                //    return [h, (h + 12) % 24]; // morning first
            } else if (h < 12) {
                return [h, (h + 12) % 24]; // morning first

            } else if (h <= 24) {
                return [h % 24];
            } else {
                return [];
            }
        }

        getMainDomElement(): Element {
            return this.$dateTimeField[0];
        }
    }
}
