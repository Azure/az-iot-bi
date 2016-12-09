/* global describe, it */ 
'use strict';

var assert = require('assert');
var sinon = require('sinon');
var machineId = require('../../lib/machineId');
var os = require('os');
var execa = require('execa');

describe('lib/machineId', function () {
  describe('#default', function () {
    it('should return SHA256 hash value of hostname and username', sinon.test(function () {
      var env = process.env;
      env.LOGNAME = '';
      env.USER = '';
      env.LNAME = '';
      env.USERNAME = '';

      this.stub(os, 'hostname', () => 'hostname-for-test');
      this.stub(execa, 'sync', () => { return { stdout: 'username_0' }; });

      // SHA256 hash of 'hostname-for-test' + 'username_0'
      var expectedResult = 'cff056f58e63111ac6fbd0c03821a757073d48d28a18ff851d88e2638333ca8d';
      assert.equal(expectedResult, machineId());

      env.USERNAME = 'username_1';
      // SHA256 hash of 'hostname-for-test' + 'username_1'
      expectedResult = 'e25ca75066e109f20f150d366dd8b9bf0d62aad2f95dd13c6fee105eaca23f22';
      assert.equal(expectedResult, machineId());

      env.LNAME = 'username_2';
      // SHA256 hash of 'hostname-for-test' + 'username_2'
      expectedResult = 'cad797f5cf365e57d489c07452dd23b0710c533ce827a62899cf5a60c08a8721';
      assert.equal(expectedResult, machineId());

      env.USER = 'username_3';
      // SHA256 hash of 'hostname-for-test' + 'username_3'
      expectedResult = '3c519105df94cfce4d6fa85f49088613b4abb441728595bf6d6eb4c09751e388';
      assert.equal(expectedResult, machineId());

      env.LOGNAME = 'username_4';
      // SHA256 hash of 'hostname-for-test' + 'username_4'
      expectedResult = 'fb4ffb2f905927fd999c6591dace0d2638e7227a1040a076108b603b21639bc9';
      assert.equal(expectedResult, machineId());
    }));
  });
});
