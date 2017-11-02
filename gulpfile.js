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

var copyrightHeader = "/*!\n"
    + "*\n"
    + "*  Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors\n"
    + "*\n"
    + "*  Licensed under the Apache License, Version 2.0 (the \"License\");\n"
    + "*  you may not use this file except in compliance with the License.\n"
    + "*  You may obtain a copy of the License at\n"
    + "*\n"
    + "*  http://www.apache.org/licenses/LICENSE-2.0\n"
    + "*\n"
    + "*  Unless required by applicable law or agreed to in writing, software\n"
    + "*  distributed under the License is distributed on an \"AS IS\" BASIS,\n"
    + "*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n"
    + "*  See the License for the specific language governing permissions and\n"
    + "*  limitations under the License.\n"
    + "*\n"
    + "*/\n";
var minCopyrightHeader = "/*! Trivial Components | (c) 2015 Yann Massard and others | Apache License, Version 2.0 (https://raw.githubusercontent.com/trivial-components/trivial-components/master/LICENSE) */\n";

var VERSION = require('./package.json').version;

var gulp = require('gulp');
var bower = require('gulp-bower');
var jest = require('jest-cli');
var less = require('gulp-less');
var mirror = require('gulp-mirror');
var rename = require('gulp-rename');
var pipe = require('multipipe');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
var sourcemaps = require('gulp-sourcemaps');
var path = require('path');
var del = require('del');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var concat = require('gulp-concat');
var zip = require('gulp-zip');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');
var stripDebug = require('gulp-strip-debug');
var header = require('gulp-header');
var strip = require('gulp-strip-comments');
var stripCssComments = require('gulp-strip-css-comments');
var sizereport = require('gulp-sizereport');
var ts = require('gulp-typescript');
var gulpTypings = require("gulp-typings");
var release = require('gulp-github-release');
var merge = require('merge-stream');
var spawn = require('child_process').spawn;
var change = require('gulp-change');

gulp.task('clean', function () {
    return del(['dist']);
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

function compileLess(src, dest) {
    return gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(postcss([
            require('autoprefixer')({browsers: ['> 2%']})
        ]))
        .pipe(stripCssComments())
        .pipe(header(copyrightHeader))
        .pipe(pipe(sourcemaps.write('.')))
        .pipe(gulp.dest(dest))
        .pipe(livereload());
}

gulp.task('less', ['bower'], function () {
    return compileLess(['less/trivial-components.less'], 'dist/css');
});

gulp.task('less-bootstrap', ['bower'], function () {
    return compileLess(['less/trivial-components-bootstrap.less'], 'dist/css');
});

gulp.task('less-demo', ['bower'], function () {
    return compileLess(['demo/less/demo.less'], 'demo/css');
});

gulp.task('minify-css', ['less', 'less-bootstrap'], function () {
    return gulp.src(["dist/css/*.css", "!dist/css/*.min.css", "!dist/css/*.sourcemaps.css"])
        .pipe(rename(function (path) {
            path.basename += ".min"
        }))
        .pipe(postcss([
            require('cssnano')
        ]))
        .pipe(header(minCopyrightHeader))
        .pipe(gulp.dest("dist/css"));
});


gulp.task('js-single', ['typescript'], function () {
    return gulp.src(['dist/js/single/TrivialCore.js', 'dist/js/single/*.js', '!**/*.min.*'])
        .pipe(stripDebug())
        .pipe(rename(function (path) {
            path.basename += ".min";
        }))
        .pipe(uglify())
        .pipe(header(minCopyrightHeader))
        .pipe(gulp.dest('./dist/js/single'));
});

gulp.task('js-bundle', ['js-single'], function () {
    return gulp.src(['dist/js/single/TrivialCore.js', 'dist/js/single/*.js', '!**/*.min.js'])
        .pipe(stripDebug())
        .pipe(strip())
        .pipe(concat('trivial-components.js'))
        .pipe(header(copyrightHeader))
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

gulp.task('ts-declarations-bundle', ['typescript'], function () {
    return gulp.src(['dist/js/single/*.d.ts'])
	    .pipe(strip())
        .pipe(concat('trivial-components-global.d.ts'))
	    .pipe(change(function (content) {
		    content = content.replace(/import .*\n?/g, '');
		    content = content.replace(/export as namespace .*\n?/g, '');
		    content = content.replace(/export declare /g, 'export ');
		    content = 'declare namespace TrivialComponents {\n' + content + '\n}';
		    return content;
	    }))
        .pipe(header(copyrightHeader))
        .pipe(gulp.dest('./dist/js/bundle'))
});

gulp.task('test', function (done) {
	jest.runCLI({ config: require('./package.json').jest }, ".", function(result) {
		done(result.success ? undefined: 'There are test failures!');
	});
});

gulp.task('prepare-dist', ['bower', 'less', 'less-bootstrap', 'minify-css', 'js-single', 'js-bundle', 'ts-declarations-bundle', 'copyLibs2dist', 'test']);

gulp.task('zip', ["prepare-dist"], function () {
    return gulp.src(['README.md', 'LICENSE', 'less*/*', 'ts*/*', 'dist/**/*', "!dist/*.gz", "!dist/*.zip"])
        .pipe(zip('trivial-components.zip'))
        .pipe(rename(function (path) {
            path.basename += '-' + VERSION;
        }))
        .pipe(gulp.dest('dist'));
});
gulp.task('tar', ['prepare-dist'], function () {
	return gulp.src(['README.md', 'LICENSE', 'less/*', 'ts/*', 'dist/**/*', "!dist/*.gz", "!dist/*.zip"])
        .pipe(tar('trivial-components.tar'))
        .pipe(rename(function (path) {
            path.basename += '-' + VERSION;
        }))
        .pipe(gzip())
        .pipe(gulp.dest('dist'));
});

gulp.task('size-report', ["js-bundle", "minify-css"], function () {
    return gulp.src(['dist/js/bundle/trivial-components.min.js', 'dist/css/trivial-components.min.css'])
        .pipe(sizereport({
            gzip: true,
            'trivial-components.min.js': {
                'maxSize': 100000,
                'maxGzippedSize': 20000
            },
            'trivial-components.min.css': {
                'maxSize': 25000,
                'maxGzippedSize': 5000
            },
            '*': {
                maxTotalSize: 125000,
                maxTotalGzippedSize: 25000
            }
        }));
});

gulp.task('default', ['zip', 'tar', "less-demo", "size-report"]);

gulp.task('watch', function () {
    livereload.listen();
    gulp.watch(['less/*.less', 'demo/less/*.less'], ["less-demo", 'less', 'less-bootstrap']);
});

gulp.task('watch-ts', function () {
	gulp.watch(['ts/*.ts', 'demo/ts/*.ts'], ['js-single', 'typescript-demo']);
});

var tsProject = ts.createProject('tsconfig.json');

gulp.task('typescript', ['install-typings'], function () {
	var tsResult = tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject());

	return merge([ // Merge the two output streams, so this task is finished when the IO of both operations is done.
		tsResult
			.dts
			.pipe(change(function (content) {
				return content + '\n\nexport as namespace TrivialComponents;'
			}))
			.pipe(gulp.dest("dist/js/single")),
		tsResult
			.js
			.pipe(sourcemaps.write('.', {
				includeContent: false,
				debug: true,
				mapSources: function (filePath) {
					return "../../../ts/" + path.basename(filePath);
				}
			}))
			.pipe(change(function (content) {
				return content.replace(/else if \(typeof define === ['"]function['"] && define.amd\) {[\s\S]*?}/,
					'$& else { ' +
					'  window.TrivialComponents = window.TrivialComponents || {};' +
					'  factory(function(name) {' +
					'    if (name === "jquery") {' +
					'      return window.jQuery;' +
					'    } else if (name === "levenshtein") {' +
					'      return window.Levenshtein;' +
					'    } else if (name === "moment") {' +
					'      return window.moment;' +
					'    } else if (name === "mustache") {' +
					'      return window.Mustache;' +
					'    } else {' +
					'      return window.TrivialComponents;' +
					'    }' +
					'  }, window.TrivialComponents);' +
					'}')
			}))
			.pipe(gulp.dest("dist/js/single"))
	]);
});

var tsDemoProject = ts.createProject('demo/tsconfig.json');
gulp.task('typescript-demo', ['install-typings'], function () {
	return tsDemoProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsDemoProject())
		.js
		.pipe(sourcemaps.write('.', {
			includeContent: false,
			debug: true,
			mapSources: function (filePath) {
				return path.basename(filePath);
			}
		}))
		.pipe(gulp.dest("demo/ts"));
});

gulp.task("install-typings", function () {
    return gulp.src("./typings.json");
        // .pipe(gulpTypings());
});

gulp.task('github-release', ['default'], function () {
	var token = require('./github-token.json').token;
    return gulp.src(['dist/trivial-components-' + VERSION + '.zip', 'dist/trivial-components-' + VERSION + '.tar.gz'])
        .pipe(release({
            tag: 'v' + VERSION,
            name: VERSION,
            token: token,
            prerelease: true,
            manifest: require('./package.json')
        }));
});

gulp.task('npm-publish', ['default'], function (done) {
	spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', done);
});