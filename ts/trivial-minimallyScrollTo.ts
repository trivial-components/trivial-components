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
$.fn.minimallyScrollTo = function (target:JQuery|Element|string) {
    return this.each(function () {
        var $this = $(this);
        let $target = $(target);

        var viewPortMinY = $this.scrollTop();
        var viewPortMaxY = viewPortMinY + $this.innerHeight();

        var targetMinY = $($target).offset().top - $(this).offset().top + $this.scrollTop();
        var targetMaxY = targetMinY + $target.height();

        if (targetMinY < viewPortMinY) {
            $this.scrollTop(targetMinY);
        } else if (targetMaxY > viewPortMaxY) {
            $this.scrollTop(Math.min(targetMinY, targetMaxY - $this.innerHeight()));
        }
        
        var viewPortMinX = $this.scrollLeft();
        var viewPortMaxX = viewPortMinX + $this.innerWidth();

        var targetMinX = $($target).offset().left - $(this).offset().left + $this.scrollLeft();
        var targetMaxX = targetMinX + $target.width();

        if (targetMinX < viewPortMinX) {
            $this.scrollLeft(targetMinX);
        } else if (targetMaxX > viewPortMaxX) {
            $this.scrollLeft(Math.min(targetMinX, targetMaxX - $this.innerWidth()));
        }
    });
};

interface JQuery {
    minimallyScrollTo:(target:JQuery|Element|string) => JQuery;
}

