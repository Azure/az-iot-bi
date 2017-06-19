'use strict';

var config = require('./config.json');
var wrapper = require('./lib/appInsightsWrapper.js');
var bi = {};

bi.start = function () {
  if (!config.instrumentationKey) {
    console.error('No instrumentation key found. Failed to start az-iot-bi.');
    return false;
  }
  if (process.env.TEST) {
    console.log('process.env.TEST is found. Do not start az-iot-bi for test environment.');
    return false;
  }
  return wrapper.start(config.instrumentationKey);
};

bi.trackEvent = function (eventName, properties) {
  wrapper.trackEvent(eventName, properties);
};

bi.trackEventWithoutInternalProperties = function (eventName, properties) {
  wrapper.trackEventWithoutInternalProperties(eventName, properties);
};

bi.flush = function () {
  wrapper.sendPendingData();
};

bi.isBIEnabled = function () {
  return wrapper.isBIEnabled();
};

module.exports = bi;
