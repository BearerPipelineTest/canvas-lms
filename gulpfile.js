/*
 * Copyright (C) 2018 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const gulp = require('gulp')
const gulpPlugins = require('gulp-load-plugins')()
const merge = require('merge-stream')
const rename = require('gulp-rename')

const DIST = 'public/dist'

const STUFF_TO_REV = [
  'public/fonts/**/*.{eot,otf,svg,ttf,woff,woff2}',
  'public/images/**/*',
]

gulp.task('rev', () => {
  const timezonefilesToIgnore = [
    'loaded.js',
    'locales.js',
    'rfc822.js',
    'synopsis.js',
    'zones.js',
    'ca_ES.js',
    'de_DE.js',
    'fr_FR.js',
    'fr_CA.js',
    'he_IL.js',
    'pl_PL.js',
    '**/index.js'
  ].map(f => `!./node_modules/timezone/${f}`)

  const timezoneFileGlobs = ['./node_modules/timezone/**/*.js'].concat(timezonefilesToIgnore)
  const timezonesStream = gulp
    .src(timezoneFileGlobs, {base: './node_modules'})
    .pipe(gulpTimezonePlugin())

  const customTimezoneStream = gulp
    .src('./ui/ext/custom_timezone_locales/*.js')
    .pipe(rename(path => (path.dirname = '/timezone')))
    .pipe(gulpTimezonePlugin())

  let stream = merge(
    timezonesStream,
    customTimezoneStream,
    gulp.src(STUFF_TO_REV, {
      base: 'public', // tell it to use the 'public' folder as the base of all paths
      follow: true // follow symlinks, so it picks up on images inside plugins and stuff
    }),
    gulp.src(['node_modules/tinymce/skins/lightgray/**/*'], {
      base: '.'
    })
  ).pipe(gulpPlugins.rev())

  if (
    process.env.JS_BUILD_NO_UGLIFY !== '1' &&
    (process.env.NODE_ENV === 'production' || process.env.RAILS_ENV === 'production')
  ) {
    const jsFilter = gulpPlugins.filter('**/*.js', {restore: true})
    stream = stream
      .pipe(jsFilter)
      .pipe(gulpPlugins.sourcemaps.init())
      .pipe(gulpPlugins.uglify())
      .pipe(gulpPlugins.sourcemaps.write('./maps'))
      .pipe(jsFilter.restore)
  }

  return stream
    .pipe(gulp.dest(DIST))
    .pipe(gulpPlugins.rev.manifest())
    .pipe(gulp.dest(DIST))
    .pipe(
      gulp.src(['packages/slickgrid/src/images/*.gif'], {
        base: 'packages/slickgrid/src/images'
      }).pipe(gulp.dest(`${DIST}/images/slickgrid`))
    )
})

gulp.task('watch', () => gulp.watch(STUFF_TO_REV, ['rev']))

function gulpTimezonePlugin() {
  const through = require('through2')

  const wrapTimezone = (code, timezoneName) =>
    `// this was autogenerated by gulpTimezonePlugin from the timezone source in node_modules
(window.__PRELOADED_TIMEZONE_DATA__ || (window.__PRELOADED_TIMEZONE_DATA__ = {}))['${timezoneName}'] ${code
      .toString()
      .replace('module.exports', '')}
`

  return through.obj((file, encoding, callback) => {
    if (file.isNull()) return callback(null, file)
    if (file.isBuffer()) {
      const timezoneName = file.path.replace(/.*\/timezone\//, '').replace(/\.js$/, '')
      file.contents = Buffer.from(wrapTimezone(file.contents, timezoneName))
      return callback(null, file)
    }
  })
}
