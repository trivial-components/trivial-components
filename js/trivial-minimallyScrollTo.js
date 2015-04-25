$.fn.minimallyScrollTo = function (target) {
    return this.each(function () {
        var $this = $(this);

        var viewPortMinY = $this.scrollTop();
        var viewPortMaxY = viewPortMinY + $this.innerHeight();

        var targetMinY = $(target).offset().top - $(this).offset().top + $this.scrollTop();
        var targetMaxY = targetMinY + target.height();

        if (targetMinY < viewPortMinY) {
            $this.scrollTop(targetMinY);
        } else if (targetMaxY > viewPortMaxY) {
            $this.scrollTop(targetMaxY - $this.innerHeight());
        }
    });
};