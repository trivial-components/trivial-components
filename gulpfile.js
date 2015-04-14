var gulp = require('gulp');
var gutil = require('gulp-util');
var less = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var mirror = require('gulp-mirror');
var rename = require('gulp-rename');
var pipe = require('multipipe');
var uglify = require('gulp-uglify');

gulp.task('default', function () {
    // place code for your default task here
});

gulp.task('less', function () {
    return gulp.src(['less/trivial-combobox.less'])
        .pipe(less())
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".min";
                }),
                minifyCSS()
            )
        ))
        .pipe(gulp.dest('./dist/css'));
});

gulp.task('js', function () {
    return gulp.src(['trivial-combobox.js'])
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".min";
                }),
                uglify()
            )
        ))
        .pipe(gulp.dest('./dist/js'));
});

gulp.task('lib2dist', function () {
    return gulp.src([
        'bower_components/jquery/dist/jquery.js', 'bower_components/jquery/dist/jquery.min.js',
        'bower_components/Caret.js/dist/jquery.caret.js', 'bower_components/Caret.js/dist/jquery.caret.min.js',
        'bower_components/jquery-ui/ui/position.js', 'bower_components/jquery-ui/ui/minified/position.min.js',
        'bower_components/mustache/mustache.js', 'bower_components/mustache/mustache.min.js'
    ])
        .pipe(rename(function (path) {
            if (path.basename.indexOf('position') === 0) {
                path.basename = "jquery." + path.basename;
            }
        }))
        .pipe(gulp.dest('./dist/lib'));
});