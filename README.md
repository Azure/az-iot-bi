# Business Intelligence module for Azure IoT Happy Path

This module is providing Business Intelligence API for Azure IoT Happy Path.
It leverage [Visual Studio Application Insights NodeJS SDK](https://github.com/Microsoft/ApplicationInsights-node.js) behind the scene.
Telemetry data will be persisted for further analysis in our backend.

## API
Below APIs are exposed for public use.

`function start()` <br>
Call this function before tracking any event for proper setup and initialization. It is synchronous and returns boolean to indicate whether Application Insights is started.

`function trackEvent(eventName, properties)` <br>
Call this function with custom properties to submit event.

`function flush()` <br>
Send all pending events to backend.

## Example
Typical usage of package is shown as below.
```javascript
  var bi = require('az-iot-bi');
  bi.start()
  bi.trackEvent('test-event');
  bi.flush();
```