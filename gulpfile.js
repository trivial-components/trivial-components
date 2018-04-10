var gulp = require('gulp');
var gutil = require('gulp-util');
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
var fileinclude = require('gulp-file-include');
var merge = require('merge-stream');
var concat = require('gulp-concat');
var replace = require('gulp-regex-replace');

gulp.task('clean', function () {
    del(['typedoc']);
});

gulp.task('copyJsDependencies2lib', function () {
	var a = gulp.src([
		'node_modules/@types/jquery/index.d.ts'
	]).pipe(gulp.dest('lib/tsd/jquery'));
	var b = gulp.src([
		'node_modules/trivial-components/dist/js/bundle/trivial-components-global.d.ts',
	]).pipe(gulp.dest('lib/tsd/trivial-components'));
	var c = gulp.src([
		'node_modules/trivial-components/dist/js/commonjs/*.d.ts',
		'!node_modules/trivial-components/dist/js/commonjs/index.d.ts'
	])
		.pipe(concat('trivial-components-externals-concatenated.d.ts'))
		.pipe(replace({regex:'import .*', replace:''}))
		.pipe(gulp.dest('lib/tsd/trivial-components'));
	return merge(a, b, c);
});

gulp.task('generate-html', function() {
    gulp.src(['page-templates/*.html'])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(gulp.dest('./'));
});

var typedoc = require("gulp-typedoc");

gulp.task("typedoc", function() {
	return gulp
		.src(["node_modules/trivial-components/ts/*.ts", "!node_modules/trivial-components/ts/*.d.ts"])
		.pipe(typedoc({
			module: "es2015",
			out: "./typedoc",
			json: "./typedoc/trivial-components.typedoc.json",

			// TypeDoc options (see typedoc docs)
			name: "trivial-components",
			ignoreCompilerErrors: true,
			version: true
		}));
});

gulp.task('watch', function() {
    livereload.listen();
    gulp.watch(['page-templates/**/*.html'], ['generate-html']);
});

gulp.task('default', ['copyJsDependencies2lib', 'generate-html', 'typedoc']);


