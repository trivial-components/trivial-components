var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "moment"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return window.jQuery;    } else if (name === "levenshtein") {      return window.Levenshtein;    } else if (name === "moment") {      return window.moment;    } else if (name === "mustache") {      return window.Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var moment = require("moment");
    var TrivialDateSuggestionEngine = (function () {
        function TrivialDateSuggestionEngine(options) {
            this.options = __assign({ preferredDateFormat: "YYYY-MM-DD" }, options);
        }
        TrivialDateSuggestionEngine.prototype.generateSuggestions = function (searchString, now) {
            now = moment(now);
            var suggestions;
            if (searchString.match(/[^\d]/)) {
                var fragments = searchString.split(/[^\d]/).filter(function (f) { return !!f; });
                suggestions = this.createSuggestionsForFragments(fragments, now);
            }
            else {
                suggestions = this.generateSuggestionsForDigitsOnlyInput(searchString, now);
            }
            var preferredYmdOrder = TrivialDateSuggestionEngine.dateFormatToYmdOrder(this.options.preferredDateFormat);
            suggestions.sort(function (a, b) {
                if (preferredYmdOrder.indexOf(a.ymdOrder) === -1 && preferredYmdOrder.indexOf(b.ymdOrder) !== -1) {
                    return 1;
                }
                else if (preferredYmdOrder.indexOf(a.ymdOrder) !== -1 && preferredYmdOrder.indexOf(b.ymdOrder) === -1) {
                    return -1;
                }
                else if (a.ymdOrder.length != b.ymdOrder.length) {
                    return a.ymdOrder.length - b.ymdOrder.length;
                }
                else {
                    return a.moment.diff(now, 'days') - b.moment.diff(now, 'days');
                }
            });
            suggestions = this.removeDuplicates(suggestions);
            return suggestions;
        };
        TrivialDateSuggestionEngine.prototype.removeDuplicates = function (suggestions) {
            var seenDates = [];
            return suggestions.filter(function (s) {
                var dateAlreadyContained = seenDates.filter(function (seenDate) { return s.moment.isSame(seenDate, 'day'); }).length > 0;
                if (dateAlreadyContained) {
                    return false;
                }
                else {
                    seenDates.push(s.moment);
                    return true;
                }
            });
        };
        TrivialDateSuggestionEngine.dateFormatToYmdOrder = function (dateFormat) {
            var ymdIndexes = {
                D: dateFormat.indexOf("D"),
                M: dateFormat.indexOf("M"),
                Y: dateFormat.indexOf("Y")
            };
            return (["D", "M", "Y"].sort(function (a, b) { return ymdIndexes[a] - ymdIndexes[b]; }).join(""));
        };
        TrivialDateSuggestionEngine.createSuggestion = function (moment, ymdOrder) {
            return { moment: moment, ymdOrder: ymdOrder };
        };
        TrivialDateSuggestionEngine.prototype.generateSuggestionsForDigitsOnlyInput = function (input, today) {
            input = input || "";
            if (input.length === 0) {
                return this.createSuggestionsForFragments([], today);
            }
            else if (input.length > 8) {
                return [];
            }
            var suggestions = [];
            for (var i = 1; i <= input.length; i++) {
                for (var j = Math.min(input.length, i + 1); j <= input.length && j - i <= 4; j - i === 2 ? j += 2 : j++) {
                    suggestions = suggestions.concat(this.createSuggestionsForFragments([input.substring(0, i), input.substring(i, j), input.substring(j, input.length)], today));
                }
            }
            return suggestions;
        };
        TrivialDateSuggestionEngine.prototype.todayOrFavoriteDirection = function (m, today) {
            return this.options.favorPastDates ? today.isSameOrAfter(m, 'day') : today.isSameOrBefore(m, 'day');
        };
        TrivialDateSuggestionEngine.prototype.createSuggestionsForFragments = function (fragments, today) {
            var _this = this;
            function mod(n, m) {
                return ((n % m) + m) % m;
            }
            function numberToYear(n) {
                var shortYear = today.year() % 100;
                var yearSuggestionBoundary = (shortYear + 20) % 100;
                var currentCentury = Math.floor(today.year() / 100) * 100;
                if (n < yearSuggestionBoundary) {
                    return currentCentury + n;
                }
                else if (n < 100) {
                    return currentCentury - 100 + n;
                }
                else if (n > today.year() - 100 && n < today.year() + 100) {
                    return n;
                }
                else {
                    return null;
                }
            }
            var s1 = fragments[0], s2 = fragments[1], s3 = fragments[2];
            var _a = [parseInt(s1), parseInt(s2), parseInt(s3)], n1 = _a[0], n2 = _a[1], n3 = _a[2];
            var suggestions = [];
            if (!s1 && !s2 && !s3) {
                var result = [];
                for (var i = 0; i < 7; i++) {
                    result.push(TrivialDateSuggestionEngine.createSuggestion(moment(today).add((this.options.favorPastDates ? -1 : 1) * i, "day"), ""));
                }
                return result;
            }
            else if (s1 && !s2 && !s3) {
                if (n1 > 0 && n1 <= 31) {
                    var nextValidDate = this.findNextValidDate({ year: today.year(), month: today.month(), day: n1 }, function (currentDate) {
                        return {
                            year: currentDate.year + (_this.options.favorPastDates ? (currentDate.month == 0 ? -1 : 0) : (currentDate.month == 11 ? 1 : 0)),
                            month: mod(currentDate.month + (_this.options.favorPastDates ? -1 : 1), 12),
                            day: currentDate.day
                        };
                    }, today);
                    if (nextValidDate) {
                        suggestions.push(TrivialDateSuggestionEngine.createSuggestion(nextValidDate, "D"));
                    }
                }
            }
            else if (s1 && s2 && !s3) {
                if (n1 <= 12 && n2 > 0 && n2 <= 31) {
                    var nextValidDate = this.findNextValidDate({ year: today.year(), month: n1 - 1, day: n2 }, function (currentDate) {
                        return {
                            year: currentDate.year + (_this.options.favorPastDates ? -1 : 1),
                            month: currentDate.month,
                            day: currentDate.day
                        };
                    }, today);
                    if (nextValidDate) {
                        suggestions.push(TrivialDateSuggestionEngine.createSuggestion(nextValidDate, "MD"));
                    }
                }
                if (n2 <= 12 && n1 > 0 && n1 <= 31) {
                    var nextValidDate = this.findNextValidDate({ year: today.year(), month: n2 - 1, day: n1 }, function (currentDate) {
                        return {
                            year: currentDate.year + (_this.options.favorPastDates ? -1 : 1),
                            month: currentDate.month,
                            day: currentDate.day
                        };
                    }, today);
                    if (nextValidDate) {
                        suggestions.push(TrivialDateSuggestionEngine.createSuggestion(nextValidDate, "DM"));
                    }
                }
            }
            else {
                var mom = void 0;
                mom = moment([numberToYear(n1), n2 - 1, s3]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateSuggestionEngine.createSuggestion(mom, "YMD"));
                }
                mom = moment([numberToYear(n1), n3 - 1, s2]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateSuggestionEngine.createSuggestion(mom, "YDM"));
                }
                mom = moment([numberToYear(n2), n1 - 1, s3]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateSuggestionEngine.createSuggestion(mom, "MYD"));
                }
                mom = moment([numberToYear(n2), n3 - 1, s1]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateSuggestionEngine.createSuggestion(mom, "DYM"));
                }
                mom = moment([numberToYear(n3), n1 - 1, s2]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateSuggestionEngine.createSuggestion(mom, "MDY"));
                }
                mom = moment([numberToYear(n3), n2 - 1, s1]);
                if (mom.isValid()) {
                    suggestions.push(TrivialDateSuggestionEngine.createSuggestion(mom, "DMY"));
                }
            }
            return suggestions;
        };
        ;
        TrivialDateSuggestionEngine.prototype.findNextValidDate = function (startDate, incementor, today) {
            var currentDate = startDate;
            var momentInNextMonth = moment(startDate);
            var numberOfIterations = 0;
            while (!(momentInNextMonth.isValid() && this.todayOrFavoriteDirection(momentInNextMonth, today)) && numberOfIterations < 4) {
                currentDate = incementor(currentDate);
                momentInNextMonth = moment(currentDate);
                numberOfIterations++;
            }
            return momentInNextMonth.isValid() ? momentInNextMonth : null;
        };
        return TrivialDateSuggestionEngine;
    }());
    exports.TrivialDateSuggestionEngine = TrivialDateSuggestionEngine;
});

//# sourceMappingURL=TrivialDateSuggestionEngine.js.map
