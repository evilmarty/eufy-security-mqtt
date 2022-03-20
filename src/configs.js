import {
  ARM_AWAY,
  ARM_HOME,
  DEVICE_CLASS,
  DISARM,
  STATE_CLASS_MEASUREMENT,
  STATE_ON,
  STATE_OFF,
  STATUS_OFFLINE,
  STATUS_ONLINE,
  TYPE_NUMBER,
} from './constants.js'
import { deviceInfo } from './utils.js'

export class BaseConfig {
  constructor(component) {
    this.availability_topic = component.availabilityTopic
    this.device = deviceInfo(component.device)
    this.enabled_by_default = true
    this.name = component.property.label
    this.payload_available = STATUS_ONLINE
    this.payload_not_available = STATUS_OFFLINE
    this.unique_id = component.id
  }
}

export class StateConfig extends BaseConfig {
  constructor(component) {
    super(component)
    this.state_topic = component.stateTopic
  }
}

export class CommandConfig extends StateConfig {
  constructor(component) {
    super(component)
    this.command_topic = component.commandTopic
  }
}

export class BinarySensorConfig extends StateConfig {
  constructor(component) {
    super(component)
    this.device_class = DEVICE_CLASS[component.property.key]
    this.payload_on = STATE_ON
    this.payload_off = STATE_OFF
  }
}

export class SwitchConfig extends CommandConfig {
  constructor(component) {
    super(component)
    this.payload_on = STATE_ON
    this.payload_off = STATE_OFF
  }
}

export class SensorConfig extends StateConfig {
  constructor(component) {
    const { unit, states, type } = component.property
    super(component)
    this.device_class = DEVICE_CLASS[component.property.key]
    this.unit_of_measurement = unit
    if (type === TYPE_NUMBER && !states) {
      this.state_class = STATE_CLASS_MEASUREMENT
    }
  }
}

export class SelectConfig extends CommandConfig {
  constructor(component) {
    super(component)
    this.options = Object.values(component.property.states)
  }
}

export class AlarmConfig extends CommandConfig {
  constructor(component) {
    super(component)
    this.code_arm_required = false
    this.code_disarm_required = false
    this.payload_arm_away = ARM_AWAY
    this.payload_arm_home = ARM_HOME
    this.payload_disarm = DISARM
  }
}

export class CameraConfig extends BaseConfig {
  constructor(component) {
    super(component)
    this.topic = component.stateTopic
  }
}
