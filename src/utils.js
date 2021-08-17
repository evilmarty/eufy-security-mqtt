const { MANUFACTURER } = require('./constants')

exports.sleep = function(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

exports.id = function(device, property = {name: null, key: null}) {
  return [device.getStateChannel(), device.getSerial(), property.name || property.key]
    .filter(x => x)
    .join('_')
}

exports.topic = function(...parts) {
  return parts.join('/')
}

exports.deviceInfo = function(device) {
  const connections = device.getMACAddress && [['mac', device.getMACAddress()]]
  const via_device = device.getStationSerial && device.getStationSerial()
  return {
    connections,
    via_device,
    identifiers: device.getSerial(),
    manufacturer: MANUFACTURER,
    model: device.getModel(),
    name: device.getName(),
    sw_version: device.getSoftwareVersion(),
  }
}
