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
      sinon.spy(appInsight, 'setup');
      sinon.spy(appInsight, 'setAutoCollectConsole');
      sinon.spy(appInsight, 'setAutoCollectExceptions');
      sinon.spy(appInsight, 'setAutoCollectPerformance');
      sinon.spy(appInsight, 'setAutoCollectRequests');
      sinon.spy(appInsight, 'setOfflineMode');
      sinon.spy(appInsight, 'start');

      assert.ok(wrapper.start(config.instrumentationKey));
      assert.ok(wrapper.isStarted());

      sinon.assert.calledOnce(isBIEnabledStub);
      assert.ok(appInsight.setup.calledOnce);
      assert.ok(appInsight.setAutoCollectConsole.calledOnce);
      assert.ok(appInsight.setAutoCollectExceptions.calledOnce);
      assert.ok(appInsight.setAutoCollectPerformance.calledOnce);
      assert.ok(appInsight.setAutoCollectRequests.calledOnce);
      assert.ok(appInsight.setOfflineMode.calledOnce);
      assert.ok(appInsight.start.calledOnce);

      isBIEnabledStub.restore();
      appInsight.setup.restore();
      appInsight.setAutoCollectConsole.restore();
      appInsight.setAutoCollectExceptions.restore();
      appInsight.setAutoCollectPerformance.restore();
      appInsight.setAutoCollectRequests.restore();
      appInsight.setOfflineMode.restore();
      appInsight.start.restore();
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
