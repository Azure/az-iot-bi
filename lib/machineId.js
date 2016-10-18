/**
 * This module is inspired by https://github.com/sindresorhus/username/blob/master/index.js .
 */
'use strict';

var crypto = require('crypto');
var execa = require('execa');
var os = require('os');

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
  var sha256 = crypto.createHash('sha256');
  sha256.update(os.hostname() + getUsername());
  return sha256.digest('hex');
};
