/*
 Trivial Components (https://github.com/trivial-components/trivial-components)

 Copyright 2015 Yann Massard (https://github.com/yamass) and other contributors

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
        "use strict";

        if (typeof define === 'function' && define.amd) {
            // Define as an AMD module if possible
            define('trivial-calendarbox', ['trivial-core', 'jquery', 'mustache'], factory);
        } else if (typeof exports === 'object') {
            // Node/CommonJS
            module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
        } else if (jQuery && !jQuery.fn.trivialcalendarbox) {
            // Define using browser globals otherwise
            // Prevent multiple instantiations if the script is loaded twice
            factory(TrivialComponents, jQuery, Mustache);
        }
    }(function (TrivialComponents, $, Mustache) {

        function TrivialCalendarBox($container, options) {
            options = options || {};
            var config = $.extend({
                selectedDate: null,
                firstDayOfWeek: 1,
                mode: 'datetime' // 'date', 'time', 'datetime'
            }, options);

            var keyboardNavigationState = config.mode == 'time' ? 'hour' : 'day'; // 'year','month','day','hour','minute'

            var selectedDate = config.selectedDate;

            var $calendarBox = $('<div class="tr-calendarbox"/>').appendTo($container);
            var $calendarDisplay = $('<div class="tr-calendar-display"/>').appendTo($calendarBox);
            var $yearDisplay = $('<div class="year"><span class="back-button"/><span class="name"/><span class="forward-button"/></div>').appendTo($calendarDisplay);
            var $monthDisplay = $('<div class="month"><span class="back-button"/><span class="name"/><span class="forward-button"/></div>').appendTo($calendarDisplay);
            var $monthTable = $('<div class="month-table">').appendTo($calendarDisplay);
            var $year = $yearDisplay.find(".name");
            var $month = $monthDisplay.find(".name");
            $yearDisplay.find('.back-button').click(navigate.bind(this, "year", "left"));
            $yearDisplay.find('.forward-button').click(navigate.bind(this, "year", "right"));
            $monthDisplay.find('.back-button').click(navigate.bind(this, "month", "left"));
            $monthDisplay.find('.forward-button').click(navigate.bind(this, "month", "right"));

            var $clockDisplay = $('<div class="tr-clock-display"/>')
                .appendTo($calendarBox)
                .append('<svg class="clock" viewBox="0 0 100 100" width="100" height="100"> <circle class="clockcircle" cx="50" cy="50" r="45"/> <g class="ticks" > <line x1="50" y1="5.000" x2="50.00" y2="10.00"/> <line x1="72.50" y1="11.03" x2="70.00" y2="15.36"/> <line x1="88.97" y1="27.50" x2="84.64" y2="30.00"/> <line x1="95.00" y1="50.00" x2="90.00" y2="50.00"/> <line x1="88.97" y1="72.50" x2="84.64" y2="70.00"/> <line x1="72.50" y1="88.97" x2="70.00" y2="84.64"/> <line x1="50.00" y1="95.00" x2="50.00" y2="90.00"/> <line x1="27.50" y1="88.97" x2="30.00" y2="84.64"/> <line x1="11.03" y1="72.50" x2="15.36" y2="70.00"/> <line x1="5.000" y1="50.00" x2="10.00" y2="50.00"/> <line x1="11.03" y1="27.50" x2="15.36" y2="30.00"/> <line x1="27.50" y1="11.03" x2="30.00" y2="15.36"/> </g> <g class="numbers"> <text x="50" y="22">12</text> <text x="85" y="55">3</text> <text x="50" y="88">6</text> <text x="15" y="55">9</text> </g> <g class="hands"> <line class="minutehand" x1="50" y1="50" x2="50" y2="20"/> <line class="hourhand" x1="50" y1="50" x2="50" y2="26"/> </g> ' +
                '<g class="am-pm-box">' +
                '<rect x="58" y="59" width="20" height="15"/>' +
                '<text class="amPmText" x="60" y="70" >??</text>' +
                '</g>' +
                '</svg>'
            ).append('<div class="digital-time-display"><div class="hour-wrapper">' +
                '<div class="up-button"/><div class="hour">??</div><div class="down-button"/>' +
                '</div>:<div class="minute-wrapper">' +
                '<div class="up-button"/><div class="minute">??</div><div class="down-button"/>' +
                '</div></div>');
            var $hourHand = $clockDisplay.find('.hourhand');
            var $minuteHand = $clockDisplay.find('.minutehand');
            var $amPmText = $clockDisplay.find('.amPmText');
            var $digitalTimeHourDisplay = $clockDisplay.find('.digital-time-display .hour');
            var $digitalTimeMinuteDisplay = $clockDisplay.find('.digital-time-display .minute');

            if (selectedDate) { // if config.entries was set...
                updateMonthDisplay(selectedDate);
                updateClockDisplay(selectedDate);
            } else {
                updateMonthDisplay(moment());
                updateClockDisplay(moment());
            }

            function getDaysForCalendarDisplay(dateInMonthDoBeDisplayed, firstDayOfWeek /*1 mo, 7 su*/) {
                var firstDayOfMonth = dateInMonthDoBeDisplayed.clone().utc().startOf('month').hour(12); // mid-day to prevent strange daylight-saving effects.
                var firstDayToBeDisplayed = firstDayOfMonth.clone().isoWeekday(firstDayOfWeek <= firstDayOfMonth.isoWeekday() ? firstDayOfWeek : firstDayOfWeek - 7);

                var daysOfMonth = [];
                for (var day = firstDayToBeDisplayed.clone(); daysOfMonth.length < 42; day.add(1, 'day')) {
                    daysOfMonth.push(day.clone());
                }
                return daysOfMonth;
            }

            function updateMonthDisplay(dateInMonthToBeDisplayed) {
                $year.text(dateInMonthToBeDisplayed.year());
                $month.text(moment.months()[dateInMonthToBeDisplayed.month()]);
                $monthTable.remove();
                $monthTable = $('<div class="month-table">').appendTo($calendarDisplay);

                var daysToBeDisplayed = getDaysForCalendarDisplay(dateInMonthToBeDisplayed, 1);

                var $tr = $('<tr>').appendTo($monthTable);
                for (var i = 0; i < 7; i++) {
                    $tr.append('<th>' + moment.weekdaysMin()[(config.firstDayOfWeek + i) % 7] + '</th>');
                }
                for (var w = 0; w < daysToBeDisplayed.length / 7; w++) {
                    $tr = $('<tr>').appendTo($monthTable);
                    for (var d = 0; d < 7; d++) {
                        var day = daysToBeDisplayed[w * 7 + d];
                        var $td = $('<td>' + day.date() + '</td>');
                        if (day.month() == dateInMonthToBeDisplayed.month()) {
                            $td.addClass('current-month');
                        } else {
                            $td.addClass('other-month');
                        }
                        if (day.year() == moment().year() && day.dayOfYear() == moment().dayOfYear()) {
                            $td.addClass('today');
                        }
                        if (day.year() == selectedDate.year() && day.dayOfYear() == selectedDate.dayOfYear()) {
                            $td.addClass('selected');
                            if (keyboardNavigationState === 'day') {
                                $td.addClass("keyboard-nav");
                            }
                        }
                        $td.click(setMonthAndDay.bind(this, day.month() + 1, day.date()));
                        $tr.append($td);
                    }
                }
            }

            function updateClockDisplay(date) {
                $amPmText.text(date.hour() >= 12 ? 'pm' : 'am');
                var minutesAngle = date.minute() * 6;
                var hours = (date.hour() % 12) + date.minute() / 60;
                var hourAngle = hours * 30;
                $hourHand.attr("transform", "rotate(" + hourAngle + ",50,50)");
                $minuteHand.attr("transform", "rotate(" + minutesAngle + ",50,50)");

                $digitalTimeHourDisplay.text(date.format('HH'));
                $digitalTimeMinuteDisplay.text(date.format('mm'));
            }

            var updateDisplay = function () {
                updateMonthDisplay(selectedDate);
                updateClockDisplay(selectedDate);
            };

            function setSelectedDate(moment) {
                selectedDate = moment;
                updateDisplay();
                fireChangeEvents();
            }

            function setYear(year) {
                selectedDate.year(year);
                updateDisplay();
                fireChangeEvents();
            }

            function setMonth(month) {
                selectedDate.month(month - 1);
                updateDisplay();
                fireChangeEvents();
            }

            function setDayOfMonth(dayOfMonth) {
                selectedDate.date(dayOfMonth);
                updateDisplay();
                fireChangeEvents();
            }

            function setMonthAndDay(month, day) {
                selectedDate.month(month - 1);
                selectedDate.date(day);
                updateDisplay();
                fireChangeEvents();
            }

            function setHour(hour) {
                selectedDate.hour(hour);
                updateDisplay();
                fireChangeEvents();
            }

            function setMinute(minute) {
                selectedDate.minute(minute);
                updateDisplay();
                fireChangeEvents();
            }

            function fireChangeEvents() {
                $calendarBox.trigger("change");
            }

            this.$ = $calendarBox;
            this.setSelectedDate = setSelectedDate;
            this.getSelectedDate = function() {
                return selectedDate;
            };
            this.setYear = setYear;
            this.setMonth = setMonth;
            this.setDayOfMonth = setDayOfMonth;
            this.setHour = setHour;
            this.setMinute = setMinute;

            function navigate(unit /* year, month, day, hour, minute*/, direction /*up, left, down, right, tab*/) { // returns true if effectively navigated, false if nothing has changed
                console.log(unit + direction);
                if (unit == 'year') {
                    if (direction == 'down' || direction == 'left') {
                        setYear(selectedDate.year() - 1);
                    } else if (direction == 'up' || direction == 'right') {
                        setYear(selectedDate.year() + 1);
                    }
                    return true;
                } else if (unit == 'month') {
                    if (direction == 'down' || direction == 'left') {
                        setMonth(selectedDate.month());
                    } else if (direction == 'up' || direction == 'right') {
                        setMonth(selectedDate.month() + 2);
                    }
                    return true;
                } else if (unit == 'day') {
                    if (direction == 'down') {
                        selectedDate.dayOfYear(selectedDate.dayOfYear() + 7);
                    } else if (direction == 'left') {
                        selectedDate.dayOfYear(selectedDate.dayOfYear() - 1);
                    } else if (direction == 'up') {
                        selectedDate.dayOfYear(selectedDate.dayOfYear() - 7);
                    } else if (direction == 'right') {
                        selectedDate.dayOfYear(selectedDate.dayOfYear() + 1);
                    }
                    updateDisplay();
                    fireChangeEvents();
                    return true;
                } else if (unit == 'hour') {
                    if (direction == 'down' || direction == 'left') {
                        setHour(selectedDate.hour() - 1);
                    } else if (direction == 'up' || direction == 'right') {
                        setHour(selectedDate.hour() + 1);
                    }
                    return true;
                } else if (unit == 'minute') {
                    if (direction == 'down' || direction == 'left') {
                        setMinute(selectedDate.minute() - (selectedDate.minute() % 5) - 5);
                    } else if (direction == 'up' || direction == 'right') {
                        setMinute(selectedDate.minute() - (selectedDate.minute() % 5) + 5);
                    }
                    return true;
                }
            }

            this.setKeyboardNavigationState = function (newKeyboardNavigationState) {
                keyboardNavigationState = newKeyboardNavigationState;
                $($yearDisplay).add($monthDisplay).add($monthTable.find('td.keyboard-nav')).add($hourHand).add($digitalTimeHourDisplay).add($minuteHand).add($digitalTimeMinuteDisplay)
                    .each(function () {
                        $(this).attr("class", $(this).attr("class").replace("keyboard-nav", ''));
                    });
                if (keyboardNavigationState == 'year') {
                    $yearDisplay.addClass("keyboard-nav");
                } else if (keyboardNavigationState == 'month') {
                    $monthDisplay.addClass("keyboard-nav");
                } else if (keyboardNavigationState == 'day') {
                    $monthTable.find(".selected").addClass("keyboard-nav");
                } else if (keyboardNavigationState == 'hour') {
                    $hourHand.attr("class", "hourhand keyboard-nav");
                    $digitalTimeHourDisplay.addClass("keyboard-nav");
                } else if (keyboardNavigationState == 'minute') {
                    $minuteHand.attr("class", "minutehand keyboard-nav");
                    $digitalTimeMinuteDisplay.addClass("keyboard-nav");
                }
            };

            this.navigate = function (direction /*up, left, down, right, tab*/) { // returns true if effectively navigated, false if nothing has changed
                navigate(keyboardNavigationState, direction);
            };
        }

        TrivialComponents.registerJqueryPlugin(TrivialCalendarBox, "TrivialCalendarBox", "tr-calendarbox");

        return $.fn.TrivialCalendarBox;
    })
);
