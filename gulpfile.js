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
var del = require('del');
var postcss      = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');

gulp.task('clean', function () {
    del(['bower_components', 'css']);
});

gulp.task('bower', function () {
    return bower()
        .pipe(gulp.dest('bower_components/'))
});

gulp.task('copyJsDependencies2lib', ['bower'], function () {
    return gulp.src([
        'bower_components/bootstrap/dist/js/bootstrap.min.js',
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/jquery-ui/ui/minified/position.min.js',
        'bower_components/mustache/mustache.min.js',
        'bower_components/prettify/index.js',
        'bower_components/trivial-components/js/*.js'
    ])
        .pipe(gulp.dest('lib/js'));
});

gulp.task('copyFonts2lib', ['bower'], function() {
    return gulp.src("bower_components/bootstrap/fonts/*")
        .pipe(gulp.dest('lib/fonts'));
});

gulp.task('less', ['bower'], function () {
    return gulp.src(['less/all.less'])
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(postcss([ autoprefixer({ browsers: ['ie >= 9, > 5%, last 2 version'] }) ]))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('css'))
        .pipe(livereload());
});

gulp.task('watch', ['bower'], function() {
    livereload.listen();
    gulp.watch('less/*.less', ['less']);
});

gulp.task('default', ['bower', 'less', 'copyJsDependencies2lib', 'copyFonts2lib']);

