"use strict";

// Load plugins
const autoprefixer = require("gulp-autoprefixer");
const browsersync = require("browser-sync").create();
const cleanCSS = require("gulp-clean-css");
const del = require("del");
const gulp = require("gulp");
const header = require("gulp-header");
const merge = require("merge-stream");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const uglify = require("gulp-uglify");
//

var gutil = require("gulp-util");
var argv = require("minimist")(process.argv);
var gulpif = require("gulp-if");
var prompt = require("gulp-prompt");
var rsync = require("gulp-rsync");

gulp.task("deploy", function() {
  // Dirs and Files to sync
  rsyncPaths = [
    path.dist,
    "lang",
    "lib",
    "templates",
    "./*.php",
    "./style.css"
  ];

  // Default options for rsync
  rsyncConf = {
    progress: true,
    incremental: true,
    relative: true,
    emptyDirectories: true,
    recursive: true,
    clean: true,
    exclude: []
  };

  // Staging
  if (argv.staging) {
    rsyncConf.hostname = ""; // hostname
    rsyncConf.username = ""; // ssh username
    rsyncConf.destination = ""; // path where uploaded files go

    // Production
  } else if (argv.production) {
    rsyncConf.hostname = ""; // hostname
    rsyncConf.username = ""; // ssh username
    rsyncConf.destination = ""; // path where uploaded files go

    // Missing/Invalid Target
  } else {
    throwError("deploy", gutil.colors.red("Missing or invalid target"));
  }

  // Use gulp-rsync to sync the files
  return gulp
    .src(rsyncPaths)
    .pipe(
      gulpif(
        argv.production,
        prompt.confirm({
          message: "Heads Up! Are you SURE you want to push to PRODUCTION?",
          default: false
        })
      )
    )
    .pipe(rsync(rsyncConf));
});

function throwError(taskName, msg) {
  throw new gutil.PluginError({
    plugin: taskName,
    message: msg
  });
}

// Load package.json for banner
const pkg = require("./package.json");

// Set the banner content
const banner = [
  "/*!\n",
  " * Start Bootstrap - <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n",
  " * Copyright 2013-" + new Date().getFullYear(),
  " <%= pkg.author %>\n",
  " * Licensed under <%= pkg.license %> (https://github.com/BlackrockDigital/<%= pkg.name %>/blob/master/LICENSE)\n",
  " */\n",
  "\n"
].join("");

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "./"
    },
    port: 3000
  });
  done();
}

// BrowserSync reload
function browserSyncReload(done) {
  browsersync.reload();
  done();
}

// Clean vendor
function clean() {
  return del(["./vendor/"]);
}

// Bring third party dependencies from node_modules into vendor directory
function modules() {
  // Bootstrap JS
  var bootstrap = gulp
    .src("./node_modules/bootstrap/dist/js/**/*")
    .pipe(gulp.dest("./vendor/bootstrap/js"));
  // Font Awesome CSS
  var fontAwesomeCSS = gulp
    .src("./node_modules/@fortawesome/fontawesome-free/css/**/*")
    .pipe(gulp.dest("./vendor/fontawesome-free/css"));
  // Font Awesome Webfonts
  var fontAwesomeWebfonts = gulp
    .src("./node_modules/@fortawesome/fontawesome-free/webfonts/**/*")
    .pipe(gulp.dest("./vendor/fontawesome-free/webfonts"));
  // jQuery Easing
  var jqueryEasing = gulp
    .src("./node_modules/jquery.easing/*.js")
    .pipe(gulp.dest("./vendor/jquery-easing"));
  // Magnific Popup
  var magnificPopup = gulp
    .src("./node_modules/magnific-popup/dist/*")
    .pipe(gulp.dest("./vendor/magnific-popup"));
  // jQuery
  var jquery = gulp
    .src([
      "./node_modules/jquery/dist/*",
      "!./node_modules/jquery/dist/core.js"
    ])
    .pipe(gulp.dest("./vendor/jquery"));
  return merge(
    bootstrap,
    fontAwesomeCSS,
    fontAwesomeWebfonts,
    jquery,
    jqueryEasing,
    magnificPopup
  );
}

// CSS task
function css() {
  return gulp
    .src("./scss/**/*.scss")
    .pipe(plumber())
    .pipe(
      sass({
        outputStyle: "expanded",
        includePaths: "./node_modules"
      })
    )
    .on("error", sass.logError)
    .pipe(
      autoprefixer({
        cascade: false
      })
    )
    .pipe(
      header(banner, {
        pkg: pkg
      })
    )
    .pipe(gulp.dest("./css"))
    .pipe(
      rename({
        suffix: ".min"
      })
    )
    .pipe(cleanCSS())
    .pipe(gulp.dest("./css"))
    .pipe(browsersync.stream());
}

// JS task
function js() {
  return gulp
    .src(["./js/*.js", "!./js/*.min.js"])
    .pipe(uglify())
    .pipe(
      header(banner, {
        pkg: pkg
      })
    )
    .pipe(
      rename({
        suffix: ".min"
      })
    )
    .pipe(gulp.dest("./js"))
    .pipe(browsersync.stream());
}

// Watch files
function watchFiles() {
  gulp.watch("./scss/**/*", css);
  gulp.watch(["./js/**/*", "!./js/**/*.min.js"], js);
  gulp.watch("./**/*.html", browserSyncReload);
}

// Define complex tasks
const vendor = gulp.series(clean, modules);
const build = gulp.series(vendor, gulp.parallel(css, js));
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));

// Export tasks
exports.css = css;
exports.js = js;
exports.clean = clean;
exports.vendor = vendor;
exports.build = build;
exports.watch = watch;
exports.default = build;

// var gulp = require("gulp");
// var deploy = require("gulp-gh-pages")
// gulp.task("deploy", function() {
//   return gulp.src("./prod/**/*").pipe(
//     deploy({
//       remoteUrl: "https://github.com/rh1456/rh1456.github.io.git",
//       branch: "master"
//     })
//   );
// });
