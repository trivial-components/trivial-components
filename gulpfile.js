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

gulp.task('lib2dist', ['bower'], function () {
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

gulp.task('less', ['bower'], function () {
    return gulp.src(['less/demo.less', 'less/trivial-components.less'])
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(postcss([ autoprefixer({ browsers: ['> 2%'] }) ]))
        .pipe(sourcemaps.write())
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".min";
                }),
                minifyCSS()
            )
        ))
        .pipe(gulp.dest('dist/css'))
        .pipe(livereload());
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

gulp.task('watch', ['bower'], function() {
    livereload.listen();
    gulp.watch('less/*.less', ['less']);
});

gulp.task('default', ['bower', 'less', 'js', 'lib2dist']);