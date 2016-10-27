'use strict';

// Work around: disable warning in Application Insights
require('applicationinsights/Library/Logging.js').disableWarnings = true;

var crypto = require('crypto');
var appInsight = require('applicationinsights');
var settings = require('./settings.js');
var os = require('os');
var getos = require('getos');
var getmacs = require('macaddress').all;
var async = require('async');

var propertyDict = {};
var _isStarted = false;

function initPkgInfo() {
  if (!propertyDict.currentPkgVersion) {
    require('pkginfo')(module, 'version');
    propertyDict.currentPkgVersion = module.exports.version || '';
  }
  if (!propertyDict.parentPkgName || !propertyDict.parentPkgVersion) {
    if (module.parent && module.parent.parent) {
      require('pkginfo')(module.parent.parent, 'name', 'version');
      propertyDict.parentPkgName = module.parent.parent.exports.name || '';
      propertyDict.parentPkgVersion = module.parent.parent.exports.version || '';
    } else {
      propertyDict.parentPkgName = '';
      propertyDict.parentPkgVersion = '';
    }
  }
}

/**
 * Machine Id is used to correlate data with AZ CLI.
 */
function initMachineId() {
  if (!propertyDict.machineId) {
    propertyDict.machineId = require('./machineId.js')();
  }
}

function initSubscriptionAndTenantId() {
  if (propertyDict.subscriptionId && propertyDict.tenantId) {
    return;
  }
  var subsInfo = settings.getSubscriptionAndTenantId();
  propertyDict.subscriptionId = subsInfo.subscriptionId;
  propertyDict.tenantId = subsInfo.tenantId;
}

function hasValidMacProperty(obj, key) {
  return obj &&
    obj.hasOwnProperty(key) &&
    obj[key].hasOwnProperty('mac') &&
    obj[key].mac != '00:00:00:00:00:00';
}

function initMac(callback) {
  if (propertyDict.mac) {
    callback(null);
    return;
  }
  try {
    getmacs(function (err, allMacs) {
      if (!err && !propertyDict.mac) {
        propertyDict.mac = [];
        for (var key in allMacs) {
          if (hasValidMacProperty(allMacs, key)) {
            var md5sum = crypto.createHash('md5');
            md5sum.update(allMacs[key].mac);
            propertyDict.mac.push(md5sum.digest('hex'));
          }
        }
      }
      callback(null);
    });
  } catch (err) {
    callback(null);
  }
}

function initOsDistro(callback) {
  if (propertyDict.osDist && propertyDict.osRelease) {
    callback(null);
    return;
  }
  getos(function (err, osDistro) {
    if (!err && (!propertyDict.osDist || !propertyDict.osRelease)) {
      propertyDict.osDist = osDistro.dist;
      propertyDict.osRelease = osDistro.release;
    }
    callback(null);
  });
}

function internalTrackEvent(eventName, properties) {
  // Add common properties
  properties.parentModuleName = propertyDict.parentPkgName;
  properties.parentModuleVersion = propertyDict.parentPkgVersion;
  properties.packageVersion = propertyDict.currentPkgVersion;
  properties.nodeVersion = process.version;
  properties.osArch = os.arch();
  properties.hostname = os.hostname();
  properties.osType = os.type();
  // Add machine Id
  properties.machineId = propertyDict.machineId;
  // Add subscription Id & tenant Id
  properties.subscriptionId = propertyDict.subscriptionId;
  properties.tenantId = propertyDict.tenantId;
  // Add MAC
  properties.mac = propertyDict.mac || [];
  // Add OS Distro
  properties.osPlatform = propertyDict.osDist || os.platform();
  properties.osRelease = propertyDict.osRelease || os.release();
  // Send event to application insights
  appInsight.client.trackEvent(eventName, properties);
  appInsight.client.sendPendingData();
}

module.exports.start = function (instrumentationKey) {
  // Skip asking user's approval for data collection for preview release
  if (!settings.isBIEnabled(true)) {
    return false;
  }
  appInsight.setup(instrumentationKey)
    .setAutoCollectConsole(false)
    .setAutoCollectExceptions(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectRequests(false)
    .setOfflineMode(true, 1)
    .start();
  _isStarted = true;
  return true;
};

module.exports.trackEvent = function (eventName, properties) {
  if (!_isStarted) return;
  if (!properties) {
    properties = {};
  }
  initPkgInfo();
  initMachineId();
  initSubscriptionAndTenantId();
  async.series([initOsDistro, initMac, function(callback) {
    internalTrackEvent(eventName, properties);
    callback(null);
  }]);
};

module.exports.sendPendingData = function () {
  if (!_isStarted) return;
  appInsight.client.sendPendingData();
};
