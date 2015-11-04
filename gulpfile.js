var minCopyrightHeader = "/*! Trivial Components | (c) 2015 Yann Massard and others | Apache License, Version 2.0 (https://raw.githubusercontent.com/trivial-components/trivial-components/master/LICENSE) */\n";

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
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var concat = require('gulp-concat');
var zip = require('gulp-zip');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');
var stripDebug = require('gulp-strip-debug');
var karma = require('karma').server;
var header = require('gulp-header');
var sizereport = require('gulp-sizereport');

gulp.task('clean', function () {
    del(['dist']);
});

gulp.task('bower', function () {
    return bower()
        .pipe(gulp.dest('bower_components/'))
});

gulp.task('copyLibs2dist', ['bower'], function () {
    return gulp.src([
        'bower_components/jquery/dist/jquery.js',
        'bower_components/Caret.js/dist/jquery.caret.js',
        'bower_components/jquery-ui/ui/position.js',
        'bower_components/mustache/mustache.js',
        'bower_components/levenshtein/lib/levenshtein.js'
    ])
        .pipe(rename(function (path) {
            // rename position to jquery.position...
            if (path.basename.indexOf('position') === 0) {
                path.basename = "jquery." + path.basename;
            }
        }))
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".min";
                }),
                uglify()
            )
        ))
        .pipe(gulp.dest('./dist/lib'));
});

gulp.task('copyLess2dist', function () {
    return gulp.src(['less/*', "!less/demo.less"])
        .pipe(rename(function (path) {
            if (path.basename.indexOf('position') === 0) {
                path.basename = "jquery." + path.basename;
            }
        }))
        .pipe(gulp.dest('./dist/less'));
});

function compileLess(src, dest) {
    return gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(postcss([autoprefixer({browsers: ['> 2%']})]))
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".sourcemaps";
                }),
                pipe(sourcemaps.write())
            )
        ))
        .pipe(gulp.dest(dest))
        .pipe(livereload());
}

gulp.task('less', ['bower'], function () {
    return compileLess(['less/trivial-components.less'], 'dist/css');
});

gulp.task('less-demo', ['bower'], function () {
    return compileLess(['demo/less/demo.less'], 'demo/css');
});

gulp.task('minifyCss', ['less'], function () {
    return gulp.src(["dist/css/*.css", "!dist/css/*.min.css", "!dist/css/*.sourcemaps.css"])
        .pipe(rename(function (path) {
            path.basename += ".min"
        }))
        .pipe(minifyCSS())
        .pipe(header(minCopyrightHeader))
        .pipe(gulp.dest("dist/css"));
});


gulp.task('js-single', function () {
    return gulp.src(['js/*.js'])
        .pipe(stripDebug())
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".min";
                }),
                uglify(),
                header(minCopyrightHeader)
            )
        ))
        .pipe(gulp.dest('./dist/js/single'));
});

gulp.task('js-bundle', function () {
    return gulp.src(['js/trivial-core.js', 'js/*.js'])
        .pipe(stripDebug())
        .pipe(concat('trivial-components.js'))
        .pipe(mirror(
            pipe(
                rename(function (path) {
                    path.basename += ".min";
                }),
                uglify(),
                header(minCopyrightHeader)
            )
        ))
        .pipe(gulp.dest('./dist/js/bundle'))
});

gulp.task('test', ['bower'], function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

gulp.task('prepare-dist', ['test', 'bower', 'less', 'minifyCss', 'js-single', 'js-bundle', 'copyLibs2dist']);

gulp.task('zip', ["prepare-dist"], function () {
    return gulp.src(['dist/**/*', "!dist/*.gz", "!dist/*.zip"])
        .pipe(zip('trivial-components.zip'))
        .pipe(gulp.dest('dist'));
});

gulp.task('tar', ['prepare-dist'], function () {
    return gulp.src(['dist/**/*', "!dist/*.gz", "!dist/*.zip"])
        .pipe(tar('trivial-components.tar'))
        .pipe(gzip())
        .pipe(gulp.dest('dist'));
});

gulp.task('size-report',  function () {
    return gulp.src(['dist/js/bundle/trivial-components.min.js', 'dist/css/trivial-components.min.css'
        //,  'bower_components/moment/min/moment-with-locales.min.js',
        //'dist/lib/jquery.min.js',
        //'dist/lib/jquery.position.min.js',
        //'dist/lib/levenshtein.min.js',
        //'dist/lib/mustache.min.js'
    ])
        .pipe(sizereport({
            gzip: true,
            'trivial-components.min.js': {
                'maxSize': 45000,
                'maxGzippedSize': 10000
            },
            'trivial-components.min.css': {
                'maxSize': 17000,
                'maxGzippedSize': 3000
            },
            '*': {
                maxTotalSize: 60000,
                maxTotalGzippedSize: 12000
            }
        }));
});

gulp.task('default', ['prepare-dist', "zip", "tar", "less-demo", "size-report"]);

gulp.task('watch', function () {
    livereload.listen();
    gulp.watch(['less/*.less', 'demo/less/*.less'], ['less', "less-demo"]);
});

gulp.task('watch-js', function () {
    gulp.watch(['js/*.js'], ['js-bundle']);
});
