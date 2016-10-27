/**
 * This module is inspired by https://github.com/sindresorhus/username/blob/master/index.js .
 */
'use strict';

var execa = require('execa');
var os = require('os');
var utils = require('./utils.js');

function getEnvVar() {
  var env = process.env;
  return env.LOGNAME ||
    env.USER ||
    env.LNAME ||
    env.USERNAME;
}

function cleanWinCmd(x) {
  return x.replace(/^.*\\/, '');
}

function getUsername () {
  var envVar = getEnvVar();

  if (envVar) {
    return envVar;
  }

  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      return execa.sync('id', ['-un']).stdout;
    } else if (process.platform === 'win32') {
      return cleanWinCmd(execa.sync('whoami').stdout);
    }
  } catch (err) { } // eslint-disable-line
}

module.exports = function () {
  return utils.getSha256Hash(os.hostname() + getUsername());
};
