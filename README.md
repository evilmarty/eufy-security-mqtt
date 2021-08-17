# eufy-security-mqtt Gateway

Eufy Security to MQTT Gateway intended for use with Home Assistant or other
platforms that use the MQTT discovery mechanism.

Internally this gateway bridges [eufy-security-client](https://github.com/bropat/eufy-security-client)
with [MQTT](https://github.com/mqttjs/MQTT.js) to expose Eufy Security devices.

## Getting started

Ensure you have [node](https://nodejs.dev) and [npm](https://npmjs.org)
installed. Clone this repository and navigate to folder and run `npm install`

```shell
git clone git@github.com:evilmarty/eufy-security-mqtt.git
cd eufy-security-mqtt
npm install
```

After installation run `npm run help` for a list arguments.
A configuration file in JSON or YAML format of the arguments can be given.

### Examples

Running the gateway with inline arguments.
```shell
npm run start --username example --password hunter2 --mqtt-url mqtt://localhost:1883
```

Running the gateway with a config file.
```shell
npm run start --config config.yml
```

## Configuration

| Name | Type | Description |
| ---- | ---- | ----------- |
| **username** | string | Eufy Security username |
| **password** | string | Eufy Security password |
| mqttUrl | string | MQTT broker URL |
| mqttHost | string | MQTT hostname |
| mqttPort | number | MQTT port |
| mqttUser | string | MQTT username |
| mqttPass | string | MQTT password |
| mqttRetain | boolean | MQTT retain messages |
| hassTopicRoot | string | Home Assistant topic root |
| selfTopicRoot | string | Self topic root |
| reconnectPeriod | number | Reconnect period in milliseconds |
| country | string | Eufy Security country |
| language | string | Eufy Security language |
| persistentDir | string | Eufy Security persistent directory |
| logLevel | string | Log level |
| debug | boolean | Debug mode |
| experimental | boolean | Turn on experimental features |
