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
var csswring = require('csswring');
var fileinclude = require('gulp-file-include');

gulp.task('clean', function () {
    del(['bower_components', 'css']);
});

gulp.task('bower', function () {
    return bower()
        .pipe(gulp.dest('bower_components/'))
});
gulp.task('bower-update', function () {
    return bower({cmd: 'update'})
        .pipe(gulp.dest('bower_components/'))
});

gulp.task('copyJsDependencies2lib', ['bower'], function () {
    return gulp.src([
        'bower_components/bootstrap/dist/js/bootstrap.min.js',
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/jquery-ui/ui/minified/position.min.js',
        'bower_components/mustache/mustache.min.js',
        'bower_components/prettify/index.js',
        'bower_components/trivial-components/js/*.js',
        'bower_components/google-code-prettify/bin/prettify.min.js'
    ])
        .pipe(gulp.dest('lib/js'));
});

gulp.task('copyFonts2lib', ['bower'], function() {
    return gulp.src("bower_components/bootstrap/fonts/*")
        .pipe(gulp.dest('lib/fonts'));
});

gulp.task('less', function () {
    return gulp.src(['less/all.less'])
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(postcss([
            autoprefixer({ browsers: ['> 2%'] }),
            csswring
        ]))
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".with-source-maps";
                }),
                sourcemaps.write()
            )
        ))
        .pipe(gulp.dest('css'))
        .pipe(livereload());
});

gulp.task('generate-html', function() {
    gulp.src(['page-templates/*.html'])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    livereload.listen();
    gulp.watch(['less/*.less', 'page-templates/**/*.html'], ['less', 'generate-html']);
});

gulp.task('default', ['bower', 'less', 'copyJsDependencies2lib', 'copyFonts2lib', 'generate-html']);


