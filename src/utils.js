import { MANUFACTURER } from './constants.js'

export function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

export function id(device, property = {name: null, key: null}) {
  return [device.getStateChannel(), device.getSerial(), property.name || property.key]
    .filter(x => x)
    .join('_')
}

export function topic(...parts) {
  return parts.join('/')
}

export function deviceInfo(device) {
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
