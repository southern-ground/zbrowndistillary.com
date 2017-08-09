var _ = require('underscore'),
    gulp = require('gulp'),
    pkg = require('./package.json'),
    config = pkg['config'],
    args = require('yargs').argv,
    browserSync = require('browser-sync'),
    data = require('gulp-data'),
    del = require('del'),
    dirs = config.directories,
    env = args.env || "dev",
    gitRev = require('git-rev-sync'),
    htmlMin = require('gulp-html-minifier'),
    print = require('gulp-print'),
    pump = require('pump'),
    siteData = require(config.siteData),
    render = require('gulp-nunjucks-render'),
    runSequence = require('run-sequence'),
    sass = require('gulp-sass'),
    uglify = require('gulp-uglify');

/*
 *
 Main Tasks
 *
 */

var manageEnvironment = function(environment) {
    environment.addGlobal('guid', function(){
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    });
    environment.addGlobal('gitRev', function(){
        return "\n\t\t*** Revision Information ***\n"+
            "\t\tCommit: " + gitRev.long() + "\n" +
            "\t\tDate: " + gitRev.date() + "\n" +
            "\t\tMessage: " + gitRev.message() + "\n\t\t";
    });
    environment.addGlobal('localizedCdn', function(){
        if(env==="stage"){
            return siteData.cdn.stage;
        }else if(env === "prod"){
            return siteData.cdn.prod;
        }
        return "";
    });
    environment.addGlobal('getCurrentYear', function(){
        return new Date().getFullYear();
    });
};

gulp.task('copy:docs', function (done) {
    return gulp.src([dirs.src + "/docs/**/*.*"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/docs/"));
});

gulp.task('compress:js', function (done) {
    var options = {
        compress: {
            passes: 2,
            comparisons: true,
            evaluate: true,
            booleans: true,
            toplevel: true,
            if_return: true
        },
        mangle:{
            toplevel: true
        },
        output: {
            beautify: false,
            preamble: "/* Southern Reel @2017 */"
        }
    };
    pump([
            gulp.src([dirs.src + "/js/**/*.js", '!'+dirs.src + '/js/vendor/**/*.*'], {
                dot: false
            }),
            uglify(options),
            gulp.dest(dirs.dist + "/js/")
        ],
        done
    );
});

gulp.task('copy:images', function (done) {
    return gulp.src([dirs.src + "/img/**/*.*"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/img/"));
});

gulp.task('copy:js', function (done) {
    return gulp.src([dirs.src + "/js/**/*.js"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/js/"));
});

gulp.task('copy:jsVendor', function (done) {
    return gulp.src([dirs.src + "/js/vendor/**/*.js"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/js/vendor/"));
});

gulp.task('copy:fonts', function (done) {
    return gulp.src([dirs.src + "/fonts/**/*.*"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/fonts/"));
});

gulp.task('copy:cssFonts', function (done) {
    return gulp.src([dirs.src + "/css/fonts/**/*.*"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/css/fonts/"));
});

gulp.task('copy:video', function (done) {
    return gulp.src([dirs.src + "/video/**/*.*", "!" + dirs.src + "/video/src/*.*"], {
        dot: false
    })
        .pipe(gulp.dest(dirs.dist + "/video/"));
});

gulp.task('copy', function (done) {
    runSequence([
        'copy:images',
        'compress:js',
        'copy:jsVendor',
        'copy:fonts',
        'copy:cssFonts',
        'copy:docs',
        'copy:video'
    ], done);
});

gulp.task('sass', function () {

    var options = {
        outputStyle: 'compressed'
    };

    return gulp.src([
        dirs.src + '/sass/**/*.scss',
        dirs.src + '/sass/**/*.sass',
        '!' + dirs.src + '/sass/**/_*.scss',
        '!' + dirs.src + '/sass/**/_*.sass'
    ])
        .pipe(print(function (filepath) {
            return "\tsassing " + filepath;
        }))
        .pipe(sass(options))
        .pipe(gulp.dest(dirs.dist + '/css'));
});

gulp.task('render', function () {
    return gulp.src([dirs.src + '/**/*.html', '!' + dirs.src + '/rev.html'])
        .pipe(print(function (filepath) {
            return "\tRendering " + filepath;
        }))
        .pipe(data(function () {
            return _.extend(config, {env: env}, siteData);
        }))
        .pipe(render({manageEnv: manageEnvironment}))
        .pipe(htmlMin({collapseWhitespace: true}))
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('serve', function () {

    browserSync.init({server: "./dist"});

    gulp.watch([
            dirs.src + "/**/*.html",
            dirs.src + "/**/*.js",
            dirs.src + "/sass/**/*.scss",
            dirs.src + "/img/*.*",
            dirs.src + "/data/**/*.json"],
        function () {
            runSequence(['build'],
                browserSync.reload);
        });

    gulp.watch([
            dirs.dest + "/js/**/*.js",
            dirs.dest + "/css/**/*.css",
            dirs.dest + "/img/**/*.*"
        ],
        browserSync.reload());

});

gulp.task('build', function (done) {

    // Clean up the distribution directory:
    del([
        dirs.dist + "/**/*.html",
        dirs.dist + "/css/**/*.css",
        "!" + dirs.dist + "/css/vendor/**/*.css",
        dirs.dist + "/js/**/*.js",
        "!" + dirs.dist + "/js/vendor/**/*.js",
        dirs.dist + "/img/**/*.*"
    ]);
    // Build
    runSequence(['sass', 'render'], ['copy'], done);

});

gulp.task('default', function (done) {

    runSequence(['build'], ['serve'], done);

});