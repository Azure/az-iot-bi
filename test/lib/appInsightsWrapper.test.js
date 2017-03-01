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
    it('should start Application Insights and set internal flag to be true.', sinon.test(function () {
      var isBIEnabledStub = this.stub(settings, 'isBIEnabled', () => true);
      this.spy(appInsight, 'setup');
      this.spy(appInsight, 'setAutoCollectConsole');
      this.spy(appInsight, 'setAutoCollectExceptions');
      this.spy(appInsight, 'setAutoCollectPerformance');
      this.spy(appInsight, 'setAutoCollectRequests');
      this.spy(appInsight, 'setOfflineMode');
      this.spy(appInsight, 'start');

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
    }));
  });

  describe('#trackEvent(eventName, properties)', function () {
    it('should send event to Application Insights.', sinon.test(function () {
      this.stub(settings, 'isBIEnabled', () => true);
      this.stub(os, 'arch', () => 'fakeArch');
      this.stub(os, 'type', () => 'fakeType');
      this.stub(os, 'platform', () => 'fakePlatform');
      this.stub(os, 'release', () => 'fakeRelease');
      var getmacStub = this.stub(getmacs, 'all', (callback) => callback(null, {
        mac1: { 
          mac: '00:00:00:00:00:00' 
        }, 
        mac2: { 
          mac: '11:11:11:11:11:11' 
        }}));

      wrapper.start(config.instrumentationKey);

      var client = appInsight.client;
      var trackEventStub = this.stub(client, 'trackEvent', () => null);
      var sendPendingDataStub = this.stub(client, 'sendPendingData', () => null);

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
      assert.deepEqual(['568f198f2be672a1f5f38cae7f04ae341eb8efdd031d3b2c7c36ae7fcc5606df'], eventProperties['mac']);
    }));
  });

  describe('#sendPendingData()', function () {
    it('should send pending events to Application Insights.', sinon.test(function () {
      this.stub(settings, 'isBIEnabled', () => true);
      wrapper.start(config.instrumentationKey);
      var sendPendingDataStub = this.stub(appInsight.client, 'sendPendingData', () => null);

      wrapper.sendPendingData();
      sinon.assert.calledOnce(sendPendingDataStub);
    }));
  });
});
