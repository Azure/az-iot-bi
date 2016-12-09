/* global describe, it */ 
'use strict';

var assert = require('assert');
var utils = require('../../lib/utils')

describe('lib/utils', function () {
  describe('#getSha256Hash(input)', function () {
    it('should return SHA256 hash value', function () {
      var rawValue = '123456789abcdefghijklmnopqrstuvwxyz';
      var expectedResult = 'cc90ce38b21388dcfe9b906d3bbaaa6e779746397a854a31a080cb1629e424f4';
      assert.equal(expectedResult, utils.getSha256Hash(rawValue));
    });
  });

  describe('#getMd5Hash(input)', function () {
    it('should return MD5 hash value', function () {
      var rawValue = '123456789abcdefghijklmnopqrstuvwxyz';
      var expectedResult = 'bd4f9252ab20cb334b27af3b566433f4';
      assert.equal(expectedResult, utils.getMd5Hash(rawValue));
    });
  });

  describe('#sanitizePII(input)', function () {
    it('should sanitize PII in each property of input object and return the object', function () {
      var inputObj = {
        prop1: 'This property contains apple@boy.cat for testing.',
        prop2: 'This property contains 0.0.0.0 and 10.11.12.13 and 255.255.255.255 and 999.999.999.999 for testing.',
        prop3: 'This property contains no PII.',
        prop4: 1234,
        prop5: 'This property contains HostName=iot-hub.azure-devices.net;DeviceId=test-device;SharedAccessKeyName=iothubowner;SharedAccessKey=yJg53nhMLEjLq66z8+VcP82/UgGoY5abcdefQSuB9NnE for testing.', // eslint-disable-line
        prop6: 'This property contains [Fake/Home/Folder] and another [Fake/Home/Folder] for testing.'
      };
      var expectedResult = {
        prop1: 'This property contains [Email Address] for testing.',
        prop2: 'This property contains [IP Address] and [IP Address] and [IP Address] and 999.999.999.999 for testing.',
        prop3: 'This property contains no PII.',
        prop4: 1234,
        prop5: 'This property contains [Host Name];[Device Id];[Shared Access Policy];[Shared Access Key] for testing.',
        prop6: 'This property contains [Home Folder] and another [Home Folder] for testing.'
      };

      var oldUserProfile = process.env['USERPROFILE'];
      var oldHome = process.env['HOME'];
      process.env['USERPROFILE'] = '[Fake/Home/Folder]';
      process.env['HOME'] = '[Fake/Home/Folder]';

      var actualResult = utils.sanitizePII(inputObj)
      assert.deepEqual(expectedResult, actualResult);

      process.env['USERPROFILE'] = oldUserProfile || '';
      process.env['HOME'] = oldHome || '';
    });
  });
});
