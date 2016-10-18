'use strict';

var crypto = require('crypto');
var appInsight = require('applicationinsights');
var settings = require('./settings.js');
var os = require('os');
var promise = require('bluebird');
var getos = promise.promisify(require('getos'));
var getmacs = promise.promisify(require('macaddress').all);

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

function setMac(allMacs) {
  if (propertyDict.mac) {
    return;
  }
  propertyDict.mac = [];
  for (var key in allMacs) {
    if (hasValidMacProperty(allMacs, key)) {
      var md5sum = crypto.createHash('md5');
      md5sum.update(allMacs[key].mac);
      propertyDict.mac.push(md5sum.digest('hex'));
    }
  }
}

function setOsDistro(osDistro) {
  if (propertyDict.osDist && propertyDict.osRelease) {
    return;
  }
  propertyDict.osDist = osDistro.dist;
  propertyDict.osRelease = osDistro.release;
}

function initPropertiesAndTrackEvent(eventName, properties) {
  getmacs().then(function (allMacs) {
    setMac(allMacs);
    return getos();
  }).catch(function () {
    return getos();
  }).then(function (osDistro) {
    setOsDistro(osDistro);
  }).catch(function () { }).finally(function () {
    internalTrackEvent(eventName, properties);
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
    .setOfflineMode(false)
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
  // Add MAC addresses & OS distro
  if (propertyDict.mac && propertyDict.osDist && propertyDict.osRelease) {
    internalTrackEvent(eventName, properties);
  } else {
    initPropertiesAndTrackEvent(eventName, properties);
  }
};

module.exports.sendPendingData = function () {
  if (!_isStarted) return;
  appInsight.client.sendPendingData();
};
