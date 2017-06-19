'use strict';

// Work around: disable warning in Application Insights
// For long term fix, Application Insights should expose API to mute warnings.
require('applicationinsights/Library/Logging.js').disableWarnings = true;

var appInsight = require('applicationinsights');
var settings = require('./settings.js');
var utils = require('./utils.js');
var os = require('os');
var getos = require('getos');
var getmacs = require('macaddress');
var async = require('async');

var propertyDict = {};
var _isStarted = false;

function initPkgInfo() {
  if (!propertyDict.currentPkgVersion) {
    require('pkginfo')(module, 'version');
    propertyDict.currentPkgVersion = module.exports.version || '';
  }
  if (!propertyDict.parentPkgName || !propertyDict.parentPkgVersion || !propertyDict.parentGitHead) {
    if (module.parent && module.parent.parent) {
      require('pkginfo')(module.parent.parent, 'name', 'version', 'gitHead');
      propertyDict.parentPkgName = module.parent.parent.exports.name || '';
      propertyDict.parentPkgVersion = module.parent.parent.exports.version || '';
      propertyDict.parentGitHead = module.parent.parent.exports.gitHead || '';
    } else {
      propertyDict.parentPkgName = '';
      propertyDict.parentPkgVersion = '';
      propertyDict.parentGitHead = '';
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

function initAzureSubscriptionInfo() {
  if (propertyDict.subscriptionId && propertyDict.tenantId && propertyDict.azureId) {
    return;
  }
  var subsInfo = settings.getAzureSubscriptionInfo();
  propertyDict.subscriptionId = subsInfo.subscriptionId;
  propertyDict.tenantId = subsInfo.tenantId;
  propertyDict.azureId = subsInfo.azureId;
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
    getmacs.all(function (err, allMacs) {
      if (!err && !propertyDict.mac) {
        propertyDict.mac = [];
        for (var key in allMacs) {
          if (hasValidMacProperty(allMacs, key)) {
            // Format MAC address to XX-XX-XX-XX-XX-XX
            var formattedMac = allMacs[key].mac.toUpperCase().replace(/:/g, '-');
            propertyDict.mac.push(utils.getSha256Hash(formattedMac));
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
  properties.parentModuleGitHead = propertyDict.parentGitHead;
  properties.packageVersion = propertyDict.currentPkgVersion;
  properties.nodeVersion = process.version;
  properties.osArch = os.arch();
  properties.osType = os.type();
  // Add machine Id
  properties.machineId = propertyDict.machineId;
  // Add subscription Id, tenant Id and Azure Id
  properties.subscriptionId = propertyDict.subscriptionId;
  properties.tenantId = propertyDict.tenantId;
  properties.azureId = propertyDict.azureId;
  // Add MAC
  properties.mac = propertyDict.mac || [];
  // Add OS Distro
  properties.osPlatform = propertyDict.osDist || os.platform();
  properties.osRelease = propertyDict.osRelease || os.release();
  // Send event to application insights
  appInsight.client.trackEvent(eventName, properties);
  appInsight.client.sendPendingData();
}

function isStarted () {
  return _isStarted;
}

module.exports.isStarted = isStarted;

module.exports.start = function (instrumentationKey) {
  appInsight.setup(instrumentationKey)
    .setAutoCollectConsole(false)
    .setAutoCollectExceptions(true)
    .setAutoCollectPerformance(false)
    .setAutoCollectRequests(false)
    .setOfflineMode(true, 1)
    .start();
  // Set maxBatchSize to 0 to avoid buffering
  appInsight.client.config.maxBatchSize = 0;
  if (!settings.isBIEnabled()) {
    return false;
  }
  _isStarted = true;
  return true;
};

module.exports.trackEvent = function (eventName, properties) {
  if (!isStarted()) return;
  if (properties) {
    properties = utils.sanitizePII(properties);
  } else {
    properties = {};
  }
  initPkgInfo();
  initMachineId();
  initAzureSubscriptionInfo();
  async.series([initOsDistro, initMac, function(callback) {
    internalTrackEvent(eventName, properties);
    callback(null);
  }]);
};

module.exports.trackEventWithoutInternalProperties = function (eventName, properties) {
  if (properties) {
    properties = utils.sanitizePII(properties);
  } else {
    properties = {};
  }
  appInsight.client.trackEvent(eventName, properties);
  appInsight.client.sendPendingData();
};

module.exports.sendPendingData = function () {
  if (!isStarted()) return;
  appInsight.client.sendPendingData();
};

module.exports.isBIEnabled = function () {
  return settings.isBIEnabled();
};
