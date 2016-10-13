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

function initSubscriptionAndTenantId() {
  if (propertyDict.subscriptionId && propertyDict.tenantId) {
    return;
  }
  var profile = settings.readProfile();
  if (profile.subscriptions && profile.subscriptions.constructor === Array && profile.subscriptions.length > 0) {
    var subs = profile.subscriptions;
    for (var i = 0; i < subs.length; i++) {
      if (subs[i].hasOwnProperty('isDefault') && subs[i].isDefault === true) {
        propertyDict.subscriptionId = subs[i].id;
        propertyDict.tenantId = subs[i].tenantId;
        return;
      }
    }
  }
  // No profile found
  propertyDict.subscriptionId = '';
  propertyDict.tenantId = '';
}

function hasValidMacProperty(obj, key) {
  return obj &&
    obj.hasOwnProperty(key) &&
    obj[key].hasOwnProperty('mac') &&
    obj[key].mac != '00:00:00:00:00:00';
}

function initMac(allMacs) {
  if (propertyDict.mac) {
    return;
  }
  propertyDict.mac = [];
  for (var key in allMacs) {
    if (hasValidMacProperty(allMacs, key)) {
      // TODO: Use MD5 for now. Will align with Azure-CLI later.
      var md5sum = crypto.createHash('md5');
      md5sum.update(allMacs[key].mac);
      propertyDict.mac.push(md5sum.digest('hex'));
    }
  }
}

function initOsDistro(osDistro) {
  if (propertyDict.osDist && propertyDict.osRelease) {
    return;
  }
  propertyDict.osDist = osDistro.dist;
  propertyDict.osRelease = osDistro.release;
}

var dummyFunc = function () { };

function initMacAndTrackEvent(eventName, properties) {
  getmacs().then(function (allMacs) {
    initMac(allMacs);
  }).catch(dummyFunc).finally(function () {
    internalTrackEvent(eventName, properties);
  });
}

function initOsDistroAndTrackEvent(eventName, properties) {
  getos().then(function (osDistro) {
    initOsDistro(osDistro);
  }).catch(dummyFunc).finally(function () {
    internalTrackEvent(eventName, properties);
  });
}

function initPropertiesAndTrackEvent(eventName, properties) {
  getmacs().then(function (allMacs) {
    initMac(allMacs);
    return getos();
  }).catch(function () {
    return getos();
  }).then(function (osDistro) {
    initOsDistro(osDistro);
  }).catch(dummyFunc).finally(function () {
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
  initSubscriptionAndTenantId();
  // Add MAC addresses & OS distro
  if (propertyDict.mac && propertyDict.osDist && propertyDict.osRelease) {
    internalTrackEvent(eventName, properties);
  } else if (propertyDict.mac) {
    initOsDistroAndTrackEvent(eventName, properties);
  } else if (propertyDict.osDist && propertyDict.osRelease) {
    initMacAndTrackEvent(eventName, properties);
  } else {
    initPropertiesAndTrackEvent(eventName, properties);
  }
};

module.exports.sendPendingData = function () {
  if (!_isStarted) return;
  appInsight.client.sendPendingData();
};
