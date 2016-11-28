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

function isString(inputValue) {
  return inputValue && (typeof inputValue === 'string' || inputValue instanceof String);
}

function sanitizePIIFromString(inputString) {
  if (isString(inputString)) {
    var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    inputString = inputString.replace(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, '[IP Address]');  // eslint-disable-line
    inputString = inputString.replace(/\b(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})\b/ig, '[Email Address]');  // eslint-disable-line
    inputString = inputString.replace(/\b(HostName=[^;\s]+)\b/ig, '[Host Name]');
    inputString = inputString.replace(/\b(DeviceId=[^;\s]+)\b/ig, '[Device Id]');
    inputString = inputString.replace(/\b(SharedAccessKeyName=[^;\s]+)\b/ig, '[Shared Access Policy]');
    inputString = inputString.replace(/\b(SharedAccessKey=[^;\s]+)\b/ig, '[Shared Access Key]');
    inputString = inputString.replace(homePath, '[Home Folder]')
  }
  return inputString;
}

module.exports.sanitizePII = function (inputObject) {
  if (inputObject) {
    for (var property in inputObject) {
      if (inputObject.hasOwnProperty(property)) {
        inputObject[property] = sanitizePIIFromString(inputObject[property]);
      }
    }
  }
  return inputObject;
};
