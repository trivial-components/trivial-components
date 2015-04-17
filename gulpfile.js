var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('gulp-bower');
var less = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var mirror = require('gulp-mirror');
var rename = require('gulp-rename');
var pipe = require('multipipe');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('bower', function () {
    return bower()
        .pipe(gulp.dest('lib/'))
});

gulp.task('less', function () {
    return gulp.src(['less/all.less'])
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('css'))
        .pipe(livereload());
});

gulp.task('copy-fonts', function() {
    return gulp.src("bower_components/bootstrap/fonts/*")
        .pipe(gulp.dest('fonts'));
});

gulp.task('watch', ['bower'], function() {
    livereload.listen();
    gulp.watch('less/*.less', ['less']);
});

gulp.task('default', ['bower', 'less', 'copy-fonts']);

