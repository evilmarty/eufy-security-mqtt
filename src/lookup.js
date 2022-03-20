import { ParamType, CommandType } from 'eufy-security-client'
import {
  BinarySensorComponent,
  SensorComponent,
  SwitchComponent,
  SelectComponent,
  AlarmComponent,
  CameraComponent,
} from './components.js'

const COMPONENTS = {
  [ParamType.GUARD_MODE]: AlarmComponent,
  [CommandType.CMD_GET_DEV_STATUS]: null,
  [CommandType.CMD_GET_HUB_LAN_IP]: null,
  'cover_path': CameraComponent,
  'device_name': null,
  'device_model': null,
  'device_sn': null,
  'device_type': null,
  'main_hw_version': null,
  'main_sw_version': null,
  'station_name': null,
  'station_model': null,
  'station_sn': null,
  'wifi_mac': null,
}

function match({ key, type, writeable, states }, experimental = false) {
  if (key in COMPONENTS) {
    return COMPONENTS[key]
  }
  else if (type === 'boolean') {
    return (writeable && experimental) ? SwitchComponent : BinarySensorComponent
  }
  else {
    return SensorComponent
  }
}

export default function(gateway, device, property) {
  const constructor = match(property, gateway.options.experimental)
  if (typeof(constructor) === 'function') {
    return new constructor(gateway, device, property)
  }
}
