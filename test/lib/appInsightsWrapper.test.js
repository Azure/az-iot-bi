/* global describe, it */ 
'use strict';

var assert = require('assert');
var sinon = require('sinon');
var wrapper = require('../../lib/appInsightsWrapper');
var appInsight = require('applicationinsights');
var settings = require('../../lib/settings.js');
var os = require('os');
var getmacs = require('macaddress');
var config = require('../../config.json');


describe('lib/appInsightsWrapper', function () {
  describe('#start()', function () {
    it('should start Application Insights and set internal flag to be true.', function () {
      var isBIEnabledStub = sinon.stub(settings, 'isBIEnabled', () => true);
      var aiSetupStub = sinon.stub(appInsight, 'setup', () => appInsight);
      var aiSetAutoCollectConsoleStub = sinon.stub(appInsight, 'setAutoCollectConsole', () => appInsight);
      var aiSetAutoCollectExceptionsStub = sinon.stub(appInsight, 'setAutoCollectExceptions', () => appInsight);
      var aiSetAutoCollectPerformanceStub = sinon.stub(appInsight, 'setAutoCollectPerformance', () => appInsight);
      var aiSetAutoCollectRequestsStub = sinon.stub(appInsight, 'setAutoCollectRequests', () => appInsight);
      var aiSetOfflineModeStub = sinon.stub(appInsight, 'setOfflineMode', () => appInsight);
      var aiStartStub = sinon.stub(appInsight, 'start', () => appInsight);

      assert.ok(wrapper.start());
      assert.ok(wrapper.isStarted());

      sinon.assert.calledOnce(isBIEnabledStub);
      sinon.assert.calledOnce(aiSetupStub);
      sinon.assert.calledOnce(aiSetAutoCollectConsoleStub);
      sinon.assert.calledOnce(aiSetAutoCollectExceptionsStub);
      sinon.assert.calledOnce(aiSetAutoCollectPerformanceStub);
      sinon.assert.calledOnce(aiSetAutoCollectRequestsStub);
      sinon.assert.calledOnce(aiSetOfflineModeStub);
      sinon.assert.calledOnce(aiStartStub);

      isBIEnabledStub.restore();
      aiSetupStub.restore();
      aiSetAutoCollectConsoleStub.restore();
      aiSetAutoCollectExceptionsStub.restore();
      aiSetAutoCollectPerformanceStub.restore();
      aiSetAutoCollectRequestsStub.restore();
      aiSetOfflineModeStub.restore();
      aiStartStub.restore();
    });
  });

  describe('#trackEvent(eventName, properties)', function () {
    it('should send event to Application Insights.', function () {
      var osArchStub = sinon.stub(os, 'arch', () => 'fakeArch');
      var osTypeStub = sinon.stub(os, 'type', () => 'fakeType');
      var osPlatformStub = sinon.stub(os, 'platform', () => 'fakePlatform');
      var osReleaseStub = sinon.stub(os, 'release', () => 'fakeRelease');
      var getmacStub = sinon.stub(getmacs, 'all', (callback) => callback(null, {
        mac1: { 
          mac: '00:00:00:00:00:00' 
        }, 
        mac2: { 
          mac: '11:11:11:11:11:11' 
        }}));

      wrapper.start(config.instrumentationKey);

      var client = appInsight.client;
      var trackEventStub = sinon.stub(client, 'trackEvent', () => null);
      var sendPendingDataStub = sinon.stub(client, 'sendPendingData', () => null);

      wrapper.trackEvent('test-event');

      var eventName = trackEventStub.args[0][0];
      var eventProperties = trackEventStub.args[0][1];

      sinon.assert.calledOnce(getmacStub);
      sinon.assert.calledOnce(trackEventStub);
      sinon.assert.calledOnce(sendPendingDataStub);

      assert.equal('test-event',eventName);
      assert.equal('Mocha', eventProperties['parentModuleName']);
      assert.ok(eventProperties['parentModuleVersion']);
      assert.ok(eventProperties['parentModuleGitHead']);
      assert.ok(eventProperties['packageVersion']);
      assert.ok(eventProperties['nodeVersion']);
      assert.equal('fakeArch', eventProperties['osArch']);
      assert.equal('fakeType', eventProperties['osType']);
      assert.ok(eventProperties['osPlatform']);
      assert.ok(eventProperties['osRelease']);
      assert.deepEqual(['845e2e0f73cece6f0ab64cb3118ca724'], eventProperties['mac']);

      osArchStub.restore();
      osTypeStub.restore();
      osPlatformStub.restore();
      osReleaseStub.restore();
      getmacStub.restore();
      trackEventStub.restore();
      sendPendingDataStub.restore();
    });
  });

  describe('#sendPendingData()', function () {
    it('should send pending events to Application Insights.', function () {
      wrapper.start(config.instrumentationKey);
      var sendPendingDataStub = sinon.stub(appInsight.client, 'sendPendingData', () => null);

      wrapper.sendPendingData();
      sinon.assert.calledOnce(sendPendingDataStub);

      sendPendingDataStub.restore();
    });
  });
});
