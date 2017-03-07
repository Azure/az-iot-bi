'use strict';

var config = require('./config.json');
var wrapper = require('./lib/appInsightsWrapper.js');
var bi = {};

bi.start = function (instrumentationKey, userBiSettingDir) {
  var aiKey = '';
  if (instrumentationKey) {
    aiKey = instrumentationKey;
  } else if (config.instrumentationKey) {
    aiKey = config.instrumentationKey;    
  } else {
    console.error('No instrumentation key found. Failed to start az-iot-bi.');
    return false;
  }

  if (process.env.TEST) {
    console.log('process.env.TEST is found. Do not start az-iot-bi for test environment.');
    return false;
  }
  return wrapper.start(aiKey, userBiSettingDir);
};

bi.trackEvent = function (eventName, properties) {
  wrapper.trackEvent(eventName, properties);
};

bi.flush = function () {
  wrapper.sendPendingData();
}

module.exports = bi;
