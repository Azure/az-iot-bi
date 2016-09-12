'use strict';

var gulp = require('gulp-param')(require('gulp'), process.argv);
var fs = require('fs');

/*
  This task is used to update instrumentation key in config.json.
  Usage: gulp update-ikey --instrumentationKey <new instrumentation key>
*/
gulp.task('update-ikey', function(instrumentationKey) {
  if (instrumentationKey) {
    var config = require('./config.json');
    config.instrumentationKey = instrumentationKey;
    fs.writeFileSync('./config.json', JSON.stringify(config));
  }
});
