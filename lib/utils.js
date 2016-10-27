'use strict';

var crypto = require('crypto');

module.exports.getSha256Hash = function (inputValue) {
  var sha256 = crypto.createHash('sha256');
  sha256.update(inputValue);
  return sha256.digest('hex');
};

module.exports.getMd5Hash = function (inputValue) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(inputValue);
  return md5sum.digest('hex');
};
