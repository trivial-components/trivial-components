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
        define(["require", "exports", "jquery", "moment", "./TrivialEvent"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return jQuery;    } else if (name === "levenshtein") {      return Levenshtein;    } else if (name === "moment") {      return moment;    } else if (name === "mustache") {      return Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var $ = require("jquery");
    var moment = require("moment");
    var TrivialEvent_1 = require("./TrivialEvent");
    var WeekDay;
    (function (WeekDay) {
        WeekDay[WeekDay["MONDAY"] = 1] = "MONDAY";
        WeekDay[WeekDay["TUESDAY"] = 2] = "TUESDAY";
        WeekDay[WeekDay["WEDNESDAY"] = 3] = "WEDNESDAY";
        WeekDay[WeekDay["THURSDAY"] = 4] = "THURSDAY";
        WeekDay[WeekDay["FRIDAY"] = 5] = "FRIDAY";
        WeekDay[WeekDay["SATURDAY"] = 6] = "SATURDAY";
        WeekDay[WeekDay["SUNDAY"] = 7] = "SUNDAY";
    })(WeekDay = exports.WeekDay || (exports.WeekDay = {}));
    var TrivialCalendarBox = (function () {
        function TrivialCalendarBox($container, options) {
            if (options === void 0) { options = {}; }
            this.$container = $container;
            this.onChange = new TrivialEvent_1.TrivialEvent(this);
            this.onOnEditingTimeUnitChange = new TrivialEvent_1.TrivialEvent(this);
            this.config = $.extend({
                selectedDate: moment(),
                firstDayOfWeek: WeekDay.MONDAY,
                mode: 'datetime',
                highlightKeyboardNavigationState: false
            }, options);
            this.keyboardNavigationState = this.config.mode == 'time' ? 'hour' : 'day';
            this.keyboardNavCssClass = this.config.highlightKeyboardNavigationState ? "keyboard-nav" : "";
            this.selectedDate = this.config.selectedDate;
            this.$calendarBox = $('<div class="tr-calendarbox"/>').appendTo(this.$container);
            this.$calendarDisplay = $('<div class="tr-calendar-display"/>');
            this.$yearDisplay = $('<div class="year"><span class="back-button"/><span class="name"/><span class="forward-button"/></div>').appendTo(this.$calendarDisplay);
            this.$monthDisplay = $('<div class="month"><span class="back-button"/><span class="name"/><span class="forward-button"/></div>').appendTo(this.$calendarDisplay);
            this.$monthTable = $('<div class="month-table">').appendTo(this.$calendarDisplay);
            this.$year = this.$yearDisplay.find(".name");
            this.$month = this.$monthDisplay.find(".name");
            this.$yearDisplay.click(this.setKeyboardNavigationState.bind(this, "year"));
            this.$yearDisplay.find('.back-button').click(this.navigateByUnit.bind(this, "year", "left", true));
            this.$yearDisplay.find('.forward-button').click(this.navigateByUnit.bind(this, "year", "right", true));
            this.$monthDisplay.click(this.setKeyboardNavigationState.bind(this, "month"));
            this.$monthDisplay.find('.back-button').click(this.navigateByUnit.bind(this, "month", "left", true));
            this.$monthDisplay.find('.forward-button').click(this.navigateByUnit.bind(this, "month", "right", true));
            this.$clockDisplay = $('<div class="tr-clock-display"/>')
                .append('<svg class="clock" viewBox="0 0 100 100" width="100" height="100"> ' +
                '<circle class="clockcircle" cx="50" cy="50" r="45"/> ' +
                '<g class="ticks" > ' +
                ' <line x1="50" y1="5.000" x2="50.00" y2="10.00"/> <line x1="72.50" y1="11.03" x2="70.00" y2="15.36"/> <line x1="88.97" y1="27.50" x2="84.64" y2="30.00"/> <line x1="95.00" y1="50.00" x2="90.00" y2="50.00"/> <line x1="88.97" y1="72.50" x2="84.64" y2="70.00"/> <line x1="72.50" y1="88.97" x2="70.00" y2="84.64"/> <line x1="50.00" y1="95.00" x2="50.00" y2="90.00"/> <line x1="27.50" y1="88.97" x2="30.00" y2="84.64"/> <line x1="11.03" y1="72.50" x2="15.36" y2="70.00"/> <line x1="5.000" y1="50.00" x2="10.00" y2="50.00"/> <line x1="11.03" y1="27.50" x2="15.36" y2="30.00"/> <line x1="27.50" y1="11.03" x2="30.00" y2="15.36"/> ' +
                '</g> ' +
                '<g class="numbers">' +
                ' <text x="50" y="22">12</text> <text x="85" y="55">3</text> <text x="50" y="88">6</text> <text x="15" y="55">9</text> ' +
                '</g> ' +
                '<g class="hands">' +
                ' <line class="minutehand" x1="50" y1="50" x2="50" y2="20"/>' +
                ' <line class="hourhand" x1="50" y1="50" x2="50" y2="26"/> ' +
                '</g> ' +
                '<g class="am-pm-box">' +
                ' <rect x="58" y="59" width="20" height="15"/>' +
                ' <text class="am-pm-text" x="60" y="70" >??</text>' +
                '</g>' +
                '</svg>').append('<div class="digital-time-display"><div class="hour-wrapper">' +
                '<div class="up-button"/><div class="hour">??</div><div class="down-button"/>' +
                '</div>:<div class="minute-wrapper">' +
                '<div class="up-button"/><div class="minute">??</div><div class="down-button"/>' +
                '</div></div>');
            this.$hourHand = this.$clockDisplay.find('.hourhand');
            this.$minuteHand = this.$clockDisplay.find('.minutehand');
            this.$amPmText = this.$clockDisplay.find('.am-pm-text');
            this.$digitalTimeHourDisplayWrapper = this.$clockDisplay.find('.digital-time-display .hour-wrapper');
            this.$digitalTimeHourDisplay = this.$clockDisplay.find('.digital-time-display .hour');
            this.$digitalTimeHourDisplayWrapper.click(this.setKeyboardNavigationState.bind(this, "hour"));
            this.$digitalTimeHourDisplayWrapper.find(".up-button").click(this.navigateByUnit.bind(this, "hour", "up", true));
            this.$digitalTimeHourDisplayWrapper.find(".down-button").click(this.navigateByUnit.bind(this, "hour", "down", true));
            this.$digitalTimeMinuteDisplayWrapper = this.$clockDisplay.find('.digital-time-display .minute-wrapper');
            this.$digitalTimeMinuteDisplay = this.$clockDisplay.find('.digital-time-display .minute');
            this.$digitalTimeMinuteDisplayWrapper.click(this.setKeyboardNavigationState.bind(this, "minute"));
            this.$digitalTimeMinuteDisplayWrapper.find(".up-button").click(this.navigateByUnit.bind(this, "minute", "up", true));
            this.$digitalTimeMinuteDisplayWrapper.find(".down-button").click(this.navigateByUnit.bind(this, "minute", "down", true));
            if (this.config.mode == 'date' || this.config.mode == 'datetime') {
                this.$calendarDisplay.appendTo(this.$calendarBox);
            }
            if (this.config.mode == 'time' || this.config.mode === 'datetime') {
                this.$clockDisplay.appendTo(this.$calendarBox);
            }
            if (this.selectedDate) {
                this.updateMonthDisplay(this.selectedDate);
                this.updateClockDisplay(this.selectedDate);
            }
            else {
                this.updateMonthDisplay(moment());
                this.updateClockDisplay(moment());
            }
        }
        TrivialCalendarBox.getDaysForCalendarDisplay = function (dateInMonthDoBeDisplayed, firstDayOfWeek) {
            var firstDayOfMonth = dateInMonthDoBeDisplayed.clone().utc().startOf('month').hour(12);
            var firstDayToBeDisplayed = firstDayOfMonth.clone().isoWeekday(firstDayOfWeek <= firstDayOfMonth.isoWeekday() ? firstDayOfWeek : firstDayOfWeek - 7);
            var daysOfMonth = [];
            for (var day = firstDayToBeDisplayed.clone(); daysOfMonth.length < 42; day.add(1, 'day')) {
                daysOfMonth.push(day.clone());
            }
            return daysOfMonth;
        };
        TrivialCalendarBox.prototype.updateMonthDisplay = function (dateInMonthToBeDisplayed) {
            var _this = this;
            this.$year.text(dateInMonthToBeDisplayed.year());
            this.$month.text(moment.months()[dateInMonthToBeDisplayed.month()]);
            this.$monthTable.remove();
            this.$monthTable = $('<div class="month-table">').appendTo(this.$calendarDisplay);
            var daysToBeDisplayed = TrivialCalendarBox.getDaysForCalendarDisplay(dateInMonthToBeDisplayed, 1);
            var $tr = $('<tr>').appendTo(this.$monthTable);
            for (var i = 0; i < 7; i++) {
                $tr.append('<th>' + moment.weekdaysMin()[(this.config.firstDayOfWeek + i) % 7] + '</th>');
            }
            for (var w = 0; w < daysToBeDisplayed.length / 7; w++) {
                $tr = $('<tr>').appendTo(this.$monthTable);
                for (var d = 0; d < 7; d++) {
                    var day = daysToBeDisplayed[w * 7 + d];
                    var $td = $('<td>' + day.date() + '</td>');
                    if (day.month() == dateInMonthToBeDisplayed.month()) {
                        $td.addClass('current-month');
                    }
                    else {
                        $td.addClass('other-month');
                    }
                    if (day.year() == moment().year() && day.dayOfYear() == moment().dayOfYear()) {
                        $td.addClass('today');
                    }
                    if (day.year() == this.selectedDate.year() && day.dayOfYear() == this.selectedDate.dayOfYear()) {
                        $td.addClass('selected');
                        if (this.keyboardNavigationState === 'day') {
                            $td.addClass(this.keyboardNavCssClass);
                        }
                    }
                    $td.click((function (day) {
                        _this.setKeyboardNavigationState("day");
                        _this.setMonthAndDay(day.month() + 1, day.date(), true);
                    }).bind(this, day));
                    $tr.append($td);
                }
            }
        };
        TrivialCalendarBox.prototype.updateClockDisplay = function (date) {
            this.$amPmText.text(date.hour() >= 12 ? 'pm' : 'am');
            var minutesAngle = date.minute() * 6;
            var hours = (date.hour() % 12) + date.minute() / 60;
            var hourAngle = hours * 30;
            this.$hourHand.attr("transform", "rotate(" + hourAngle + ",50,50)");
            this.$minuteHand.attr("transform", "rotate(" + minutesAngle + ",50,50)");
            this.$digitalTimeHourDisplay.text(date.format('HH'));
            this.$digitalTimeMinuteDisplay.text(date.format('mm'));
        };
        TrivialCalendarBox.prototype.updateDisplay = function () {
            this.updateMonthDisplay(this.selectedDate);
            this.updateClockDisplay(this.selectedDate);
        };
        ;
        TrivialCalendarBox.prototype.setSelectedDate = function (moment) {
            this.selectedDate = moment;
            this.updateDisplay();
        };
        TrivialCalendarBox.prototype.setYear = function (year, fireEvent) {
            this.selectedDate.year(year);
            this.updateDisplay();
            if (fireEvent) {
                this.onOnEditingTimeUnitChange.fire('year');
                this.fireChangeEvents('year');
            }
        };
        TrivialCalendarBox.prototype.setMonth = function (month, fireEvent) {
            this.selectedDate.month(month - 1);
            this.updateDisplay();
            if (fireEvent) {
                this.onOnEditingTimeUnitChange.fire('month');
                this.fireChangeEvents('month');
            }
        };
        TrivialCalendarBox.prototype.setDayOfMonth = function (dayOfMonth, fireEvent) {
            this.selectedDate.date(dayOfMonth);
            this.updateDisplay();
            if (fireEvent) {
                this.onOnEditingTimeUnitChange.fire('day');
                this.fireChangeEvents('day');
            }
        };
        TrivialCalendarBox.prototype.setMonthAndDay = function (month, day, fireEvent) {
            this.selectedDate.month(month - 1);
            this.selectedDate.date(day);
            this.updateDisplay();
            if (fireEvent) {
                this.onOnEditingTimeUnitChange.fire('day');
                this.fireChangeEvents('month');
                this.fireChangeEvents('day');
            }
        };
        TrivialCalendarBox.prototype.setHour = function (hour, fireEvent) {
            this.selectedDate.hour(hour);
            this.updateDisplay();
            if (fireEvent) {
                this.onOnEditingTimeUnitChange.fire('hour');
                this.fireChangeEvents('hour');
            }
        };
        TrivialCalendarBox.prototype.setMinute = function (minute, fireEvent) {
            this.selectedDate.minute(minute);
            this.updateDisplay();
            if (fireEvent) {
                this.onOnEditingTimeUnitChange.fire('minute');
                this.fireChangeEvents('minute');
            }
        };
        TrivialCalendarBox.prototype.fireChangeEvents = function (timeUnit) {
            this.$calendarBox.trigger("change");
            this.onChange.fire({
                value: this.getSelectedDate(),
                timeUnitEdited: timeUnit
            });
        };
        TrivialCalendarBox.prototype.setKeyboardNavigationState = function (newKeyboardNavigationState) {
            this.keyboardNavigationState = newKeyboardNavigationState;
            if (this.config.highlightKeyboardNavigationState) {
                var me_1 = this;
                $(this.$yearDisplay).add(this.$monthDisplay).add(this.$monthTable.find('td.' + this.keyboardNavCssClass)).add(this.$hourHand).add(this.$digitalTimeHourDisplayWrapper).add(this.$minuteHand).add(this.$digitalTimeMinuteDisplayWrapper)
                    .each(function () {
                    $(this).attr("class", $(this).attr("class").replace(me_1.keyboardNavCssClass, ''));
                });
                if (this.keyboardNavigationState == 'year') {
                    this.$yearDisplay.addClass(this.keyboardNavCssClass);
                }
                else if (this.keyboardNavigationState == 'month') {
                    this.$monthDisplay.addClass(this.keyboardNavCssClass);
                }
                else if (this.keyboardNavigationState == 'day') {
                    this.$monthTable.find(".selected").addClass(this.keyboardNavCssClass);
                }
                else if (this.keyboardNavigationState == 'hour') {
                    this.$hourHand.attr("class", "hourhand " + this.keyboardNavCssClass);
                    this.$digitalTimeHourDisplayWrapper.addClass(this.keyboardNavCssClass);
                }
                else if (this.keyboardNavigationState == 'minute') {
                    this.$minuteHand.attr("class", "minutehand " + this.keyboardNavCssClass);
                    this.$digitalTimeMinuteDisplayWrapper.addClass(this.keyboardNavCssClass);
                }
            }
        };
        TrivialCalendarBox.prototype.getSelectedDate = function () {
            return this.selectedDate;
        };
        ;
        TrivialCalendarBox.prototype.navigateByUnit = function (unit, direction, fireEvent) {
            if (fireEvent === void 0) { fireEvent = false; }
            if (unit == 'year') {
                if (direction == 'down' || direction == 'left') {
                    this.setYear(this.selectedDate.year() - 1, fireEvent);
                }
                else if (direction == 'up' || direction == 'right') {
                    this.setYear(this.selectedDate.year() + 1, fireEvent);
                }
                fireEvent && this.fireChangeEvents('year');
                return true;
            }
            else if (unit == 'month') {
                if (direction == 'down' || direction == 'left') {
                    this.setMonth(this.selectedDate.month(), fireEvent);
                }
                else if (direction == 'up' || direction == 'right') {
                    this.setMonth(this.selectedDate.month() + 2, fireEvent);
                }
                fireEvent && this.fireChangeEvents('month');
                return true;
            }
            else if (unit == 'day') {
                if (direction == 'down') {
                    this.selectedDate.dayOfYear(this.selectedDate.dayOfYear() + 7);
                }
                else if (direction == 'left') {
                    this.selectedDate.dayOfYear(this.selectedDate.dayOfYear() - 1);
                }
                else if (direction == 'up') {
                    this.selectedDate.dayOfYear(this.selectedDate.dayOfYear() - 7);
                }
                else if (direction == 'right') {
                    this.selectedDate.dayOfYear(this.selectedDate.dayOfYear() + 1);
                }
                this.updateDisplay();
                fireEvent && this.fireChangeEvents('day');
                return true;
            }
            else if (unit == 'hour') {
                if (direction == 'down' || direction == 'left') {
                    this.setHour(this.selectedDate.hour() - 1, fireEvent);
                }
                else if (direction == 'up' || direction == 'right') {
                    this.setHour(this.selectedDate.hour() + 1, fireEvent);
                }
                fireEvent && this.fireChangeEvents('hour');
                return true;
            }
            else if (unit == 'minute') {
                if (direction == 'down' || direction == 'left') {
                    this.setMinute(this.selectedDate.minute() - (this.selectedDate.minute() % 5) - 5, fireEvent);
                }
                else if (direction == 'up' || direction == 'right') {
                    this.setMinute(this.selectedDate.minute() - (this.selectedDate.minute() % 5) + 5, fireEvent);
                }
                fireEvent && this.fireChangeEvents('minute');
                return true;
            }
        };
        TrivialCalendarBox.prototype.navigate = function (direction) {
            this.navigateByUnit(this.keyboardNavigationState, direction);
        };
        ;
        TrivialCalendarBox.prototype.getMainDomElement = function () {
            return this.$calendarBox[0];
        };
        TrivialCalendarBox.prototype.destroy = function () {
            this.$calendarBox.remove();
        };
        ;
        return TrivialCalendarBox;
    }());
    exports.TrivialCalendarBox = TrivialCalendarBox;
});

//# sourceMappingURL=TrivialCalendarBox.js.map
