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
    var TrivialEvent = (function () {
        function TrivialEvent(eventSource) {
            this.eventSource = eventSource;
            this.listeners = [];
        }
        TrivialEvent.prototype.addListener = function (fn) {
            this.listeners.push(fn);
        };
        ;
        TrivialEvent.prototype.removeListener = function (fn) {
            var listenerIndex = this.listeners.indexOf(fn);
            if (listenerIndex != -1) {
                this.listeners.splice(listenerIndex, 1);
            }
        };
        ;
        TrivialEvent.prototype.fire = function (eventObject, originalEvent) {
            for (var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].call(this.listeners[i], eventObject, this.eventSource, originalEvent);
            }
        };
        ;
        return TrivialEvent;
    }());
    exports.TrivialEvent = TrivialEvent;
});

//# sourceMappingURL=TrivialEvent.js.map
