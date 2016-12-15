/*
  This module is inspired by https://github.com/Azure/azure-xplat-cli/blob/dev/lib/util/utilsCore.js
 */

'use strict';

var fs = require('fs');
var path = require('path');
var readlineSync = require('readline-sync');
var userHome = require('user-home');
var utils = require('./utils.js');

var biSetting = {};

var biSettingDirPath = path.join(userHome, '.iot-hub-getting-started');
var biSettingFilePath = path.join(biSettingDirPath, 'biSettings.json');
var azureDirPath = process.env.AZURE_CONFIG_DIR || path.join(userHome, '.azure');
var azureProfileFilePath = path.join(azureDirPath, 'azureProfile.json');

function readSetting(settingFilePath) {
  var settings = {};

  try {
    var fileContent = fs.readFileSync(settingFilePath, 'utf8');
    // Strip UTF8 BOM if exists
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    settings = JSON.parse(fileContent);
  } catch (err) {
    settings = {};
  }

  return settings;
}

biSetting.readSetting = function () {
  return readSetting(biSettingFilePath);
};

biSetting.writeSetting = function (settings) {
  try {
    var stats = fs.statSync(biSettingDirPath);
    if (stats && stats.isFile()) {
      try {
        fs.unlinkSync(biSettingDirPath);
      } catch (err) {
        // Swallow the error so that it doesn't block execution.
        return;
      }
    }
  } catch (err) {
    try {
      fs.mkdirSync(biSettingDirPath, 502);
    } catch (err) {
      // Swallow the error so that it doesn't block execution.
      return;
    }
  }

  try {
    fs.writeFileSync(biSettingFilePath, JSON.stringify(settings));
  } catch (err) {
    // Swallow the error so that it doesn't block execution.
  }
};

biSetting.isBIEnabled = function (skipCheck) {
  if (skipCheck === true) {
    return true;
  }

  var setting = biSetting.readSetting();
  if (typeof setting.isEnabled === 'boolean') {
    return setting.isEnabled;
  } else {
    var promptText = '\nMicrosoft would like to collect data about how users use Azure IoT samples and some problems they encounter. ' +
      'Microsoft uses this information to improve our tooling experience. Participation is voluntary and when you choose to participate ' +
      'your device automatically sends information to Microsoft about how you use Azure IoT samples. ' +
      '\n\nSelect y to enable data collection :(y/n, default is y) ';

    var options = {
      limit: ['y', 'n'],
      defaultInput: 'y'
    };

    var choice = readlineSync.question(promptText, options);
    if (choice === 'y') {
      console.log('\nYou choose to participate in Microsoft data collection.\n\n');
      setting.isEnabled = true;
      biSetting.writeSetting(setting);
      return true;
    } else {
      console.log('\nYou choose not to participate in Microsoft data collection.\n\n');
      setting.isEnabled = false;
      biSetting.writeSetting(setting);
      return false;
    }
  }
};

// Read Azure Profile file.
// This depends on the Azure Profile file used by azure-xplat-cli and azure-cli.
biSetting.getAzureSubscriptionInfo = function () {
  var subscriptionId = '';
  var tenantId = '';
  var azureId = '';
  var profile = readSetting(azureProfileFilePath);
  if (profile.subscriptions && profile.subscriptions.constructor === Array && profile.subscriptions.length > 0) {
    var subs = profile.subscriptions;
    for (var i = 0; i < subs.length; i++) {
      if (subs[i].hasOwnProperty('isDefault') && subs[i].isDefault === true) {
        subscriptionId = subs[i].id;
        tenantId = subs[i].tenantId;
        azureId = subs[i].user && subs[i].user.name ? utils.getSha256Hash(subs[i].user.name) : '';
        break;
      }
    }
  }
  return {
    subscriptionId: subscriptionId,
    tenantId: tenantId,
    azureId: azureId
  };
}

module.exports = biSetting;
