'use strict';

var config = require('./config.json');
var crypto = require('crypto');
var appInsight = require('applicationinsights');
var settings = require('./lib/settings.js');
var os = require('os');
var getmacs = require('macaddress');

// retrieve package info and parent package info
require('pkginfo')(module, 'version');
if (module.parent) {
  require('pkginfo')(module.parent, 'name', 'version');
}

var currentPkgVersion = module.exports.version || '';
var parentPkgName = module.parent && module.parent.exports.name ? module.parent.exports.name : '';
var parentPkgVersion = module.parent && module.parent.exports.version ? module.parent.exports.version : '';

var bi = {
  _isStarted: false
};

var cacheObj = {};

function hasValidMacProperty(obj, key) {
  return obj &&
    obj.hasOwnProperty(key) &&
    obj[key].hasOwnProperty('mac') &&
    obj[key].mac != '00:00:00:00:00:00';
}

function getSubscriptionId() {
  var profile = settings.readProfile();
  if (profile.subscriptions && profile.subscriptions.constructor === Array && profile.subscriptions.length > 0) {
    var subs = profile.subscriptions;
    for (var i = 0; i < subs.length; i++) {
      if (subs[i].hasOwnProperty('isDefault') && subs[i].isDefault === true) {
        return subs[i].id;
      }
    }
  }
}

bi.start = function () {
  if (!config.instrumentationKey) {
    console.error('No instrumentation key found. Failed to start az-iot-bi.');
    return false;
  }

  if (process.env.TEST) {
    console.log('process.env.TEST is found. Do not start az-iot-bi for test environment.');
    return false;
  }

  // Skip asking user's approval for data collection for preview release
  if (settings.isBIEnabled(true) === true) {
    appInsight.setup(config.instrumentationKey)
      .setAutoCollectConsole(false)
      .setAutoCollectExceptions(false)
      .setAutoCollectPerformance(false)
      .setAutoCollectRequests(false);
    // TODO:
    // Only in offline mode, failed events will be cached.
    // But offline mode will pause 60 seconds to send failed events.
    // The waiting interval is hard coded now.
    // PR https://github.com/Microsoft/ApplicationInsights-node.js/pull/116 
    // is to make the resend interval configurable.
    // Disable offline mode for now until above PR is merged and released.
    appInsight.setOfflineMode(false);
    appInsight.start();
    bi._isStarted = true;
    return true;
  }
  return false;
};

bi.trackEvent = function (eventName, properties) {
  if (!bi._isStarted) return;

  if (!properties) {
    properties = {};
  }

  // Add common properties
  properties.parentModuleName = parentPkgName;
  properties.parentModuleVersion = parentPkgVersion;
  properties.packageVersion = currentPkgVersion;
  properties.nodeVersion = process.version;
  properties.osArch = os.arch();
  properties.hostname = os.hostname();
  properties.osPlatform = os.platform();
  properties.osRelease = os.release();
  properties.osType = os.type();

  // Add subscription Id
  if (!cacheObj.subscriptionId) {
    cacheObj.subscriptionId = getSubscriptionId();
  }
  properties.subscriptionId = cacheObj.subscriptionId || '';

  // Add MAC addresses
  if (cacheObj.mac) {
    properties.mac = cacheObj.mac;
    appInsight.client.trackEvent(eventName, properties);
  } else {
    getmacs.all(function (err, all) {
      if (!err && !cacheObj.mac) {
        cacheObj.mac = [];
        for (var key in all) {
          if (hasValidMacProperty(all, key)) {
            // TODO:
            // Use MD5 for now. Will align with Azure-CLI later.
            var md5sum = crypto.createHash('md5');
            md5sum.update(all[key].mac);
            cacheObj.mac.push(md5sum.digest('hex'));
          }
        }
      }
      properties.mac = cacheObj.mac || [];
      appInsight.client.trackEvent(eventName, properties);
    });
  }
};

bi.flush = function () {
  if (!bi._isStarted) return;
  appInsight.client.sendPendingData();
}

module.exports = bi;
