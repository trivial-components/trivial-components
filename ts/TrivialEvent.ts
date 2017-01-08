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