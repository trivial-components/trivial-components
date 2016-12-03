module TrivialComponents {

    export type TrivialEventListener = (...args:any[]) => void;

    export class TrivialEvent {
        private listeners:TrivialEventListener[] = [];

        public addListener(fn:TrivialEventListener) {
            this.listeners.push(fn);
        };

        public removeListener(fn:TrivialEventListener) {
            var listenerIndex = this.listeners.indexOf(fn);
            if (listenerIndex != -1) {
                this.listeners.splice(listenerIndex, 1);
            }
        };

        public fire(...args:any[]) {
            for (var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].apply(this.listeners[i], args);
            }
        };
    }

}