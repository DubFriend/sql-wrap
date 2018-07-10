/* eslint-disable no-process-exit */
const { argv } = require('yargs');
const gulp = require('gulp');
const mocha = require('gulp-mocha');
const babel = require('gulp-babel');
const del = require('del');
const flowCopySource = require('flow-copy-source');
const { exec } = require('child_process');

gulp.task('clean-js', () => del('lib/**/*.js'));
gulp.task('clean-flow', () => del('lib/**/*.flow'));

gulp.task('transpile', ['clean-js', 'flow'], () =>
  gulp
    .src('src/**/*.js')
    .pipe(babel({ presets: ['flow', 'es2015', 'stage-0'] }))
    .pipe(gulp.dest('lib'))
);

gulp.task('flow-copy-source', ['clean-flow'], () =>
  flowCopySource(['src'], 'lib')
);

gulp.task(
  'flow',
  () =>
    new Promise((resolve, reject) => {
      exec('npm run flow', (err, stdout, stderr) => {
        if (err) {
          console.log(stdout);
          console.error(stderr);
        }
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
);

gulp.task('test', ['flow', 'transpile', 'flow-copy-source'], () =>
  gulp
    .src(['lib/**/test/**/*.unit.js', 'lib/**/test/**/*.e2e.js'])
    .pipe(mocha({ reporter: 'dot', timeout: 3000, grep: argv.grep }))
    .once('error', err => {
      console.error(err.stack);
      process.exit(1);
    })
    .once('end', () => {
      process.exit();
    })
);

gulp.task('build', ['flow', 'transpile', 'flow-copy-source']);
