(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    } else {   window.TrivialComponents = window.TrivialComponents || {};  factory(function(name) {    if (name === "jquery") {      return window.jQuery;    } else if (name === "levenshtein") {      return window.Levenshtein;    } else if (name === "moment") {      return window.moment;    } else if (name === "mustache") {      return window.Mustache;    } else {      return window.TrivialComponents;    }  }, window.TrivialComponents);}
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TrivialTimeSuggestionEngine = (function () {
        function TrivialTimeSuggestionEngine() {
        }
        TrivialTimeSuggestionEngine.prototype.generateSuggestions = function (searchString) {
            var suggestions = [];
            var match = searchString.match(/[^\d]/);
            var colonIndex = match != null ? match.index : null;
            if (colonIndex !== null) {
                var hourString = searchString.substring(0, colonIndex);
                var minuteString = searchString.substring(colonIndex + 1);
                suggestions = suggestions.concat(TrivialTimeSuggestionEngine.createTimeSuggestions(TrivialTimeSuggestionEngine.createHourSuggestions(hourString), TrivialTimeSuggestionEngine.createMinuteSuggestions(minuteString)));
            }
            else if (searchString.length > 0) {
                if (searchString.length >= 2) {
                    var hourString_1 = searchString.substr(0, 2);
                    var minuteString_1 = searchString.substring(2, searchString.length);
                    suggestions = suggestions.concat(TrivialTimeSuggestionEngine.createTimeSuggestions(TrivialTimeSuggestionEngine.createHourSuggestions(hourString_1), TrivialTimeSuggestionEngine.createMinuteSuggestions(minuteString_1)));
                }
                var hourString = searchString.substr(0, 1);
                var minuteString = searchString.substring(1, searchString.length);
                if (minuteString.length <= 2) {
                    suggestions = suggestions.concat(TrivialTimeSuggestionEngine.createTimeSuggestions(TrivialTimeSuggestionEngine.createHourSuggestions(hourString), TrivialTimeSuggestionEngine.createMinuteSuggestions(minuteString)));
                }
            }
            else {
                suggestions = suggestions.concat(TrivialTimeSuggestionEngine.createTimeSuggestions(TrivialTimeSuggestionEngine.intRange(6, 24).concat(TrivialTimeSuggestionEngine.intRange(1, 5)), [0]));
            }
            return suggestions;
        };
        TrivialTimeSuggestionEngine.intRange = function (fromInclusive, toInclusive) {
            var ints = [];
            for (var i = fromInclusive; i <= toInclusive; i++) {
                ints.push(i);
            }
            return ints;
        };
        TrivialTimeSuggestionEngine.createTimeSuggestions = function (hourValues, minuteValues) {
            var entries = [];
            for (var i = 0; i < hourValues.length; i++) {
                var hour = hourValues[i];
                for (var j = 0; j < minuteValues.length; j++) {
                    var minute = minuteValues[j];
                    entries.push({ hour: hour, minute: minute });
                }
            }
            return entries;
        };
        TrivialTimeSuggestionEngine.createMinuteSuggestions = function (minuteString) {
            var m = parseInt(minuteString);
            if (isNaN(m)) {
                return [0];
            }
            else if (minuteString.length > 1) {
                return [m % 60];
            }
            else if (m < 6) {
                return [m * 10];
            }
            else {
                return [m % 60];
            }
        };
        TrivialTimeSuggestionEngine.createHourSuggestions = function (hourString) {
            var h = parseInt(hourString);
            if (isNaN(h)) {
                return TrivialTimeSuggestionEngine.intRange(1, 24);
            }
            else if (h < 12) {
                return [h, (h + 12) % 24];
            }
            else if (h <= 24) {
                return [h % 24];
            }
            else {
                return [];
            }
        };
        return TrivialTimeSuggestionEngine;
    }());
    exports.TrivialTimeSuggestionEngine = TrivialTimeSuggestionEngine;
});

//# sourceMappingURL=TrivialTimeSuggestionEngine.js.map
