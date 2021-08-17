const { ParamType, CommandType } = require('eufy-security-client')
const {
  BinarySensorComponent,
  SensorComponent,
  SwitchComponent,
  SelectComponent,
  AlarmComponent,
  CameraComponent,
} = require('./components')

const COMPONENTS = {
  [ParamType.GUARD_MODE]: AlarmComponent,
  'cover_path': CameraComponent,
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

function factory(gateway, device, property) {
  const constructor = match(property, gateway.options.experimental)
  return new constructor(gateway, device, property)
}

module.exports = factory
