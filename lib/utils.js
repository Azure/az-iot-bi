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

var ipAddressPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
var emailAddressPattern = /\b(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})\b/ig;
var hostNamePattern = /\b(HostName=[^;\s]+)\b/ig;
var deviceIdPattern = /\b(DeviceId=[^;\s]+)\b/ig;
var sharedAccessPolicyPattern = /\b(SharedAccessKeyName=[^;\s]+)\b/ig;
var sharedAccessKeyPattern = /\b(SharedAccessKey=[^;\s]+)\b/ig;

function getHomePathPattern() {
  var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  return new RegExp(homePath.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'ig');
}

function sanitizePIIFromString(inputString) {
  if (isString(inputString)) {
    inputString = inputString.replace(ipAddressPattern, '[IP Address]');
    inputString = inputString.replace(emailAddressPattern, '[Email Address]');
    inputString = inputString.replace(hostNamePattern, '[Host Name]');
    inputString = inputString.replace(deviceIdPattern, '[Device Id]');
    inputString = inputString.replace(sharedAccessPolicyPattern, '[Shared Access Policy]');
    inputString = inputString.replace(sharedAccessKeyPattern, '[Shared Access Key]');
    inputString = inputString.replace(getHomePathPattern(), '[Home Folder]');
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
