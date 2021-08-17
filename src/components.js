const fetch = require('node-fetch')
const { GuardMode, ParamType, CommandType } = require('eufy-security-client')
const {
  ARM_AWAY,
  ARM_HOME,
  DISARM,
} = require('./constants')
const {
  AlarmConfig,
  BatteryLowConfig,
  BinarySensorConfig,
  CameraConfig,
  SelectConfig,
  SensorConfig,
  SwitchConfig,
} = require('./configs')
const { id } = require('./utils')

class BaseComponent {
  constructorgateway, device, property) {
    this.gateway = gateway
    this.device = device
    this.property = property
  }

  get availabilityTopic() {
    return this.gateway.availabilityTopic
  }

  get stateTopic() {
    return this.gateway.stateTopic(this)
  }

  get commandTopic() {
    return this.gateway.commandTopic(this)
  }

  get id() {
    return id(this.device, this.property)
  }

  async update() {
    const value = await this.getValue()
    this.gateway.publish(this.stateTopic, value)
  }

  async getValue() {
    const { name, states } = this.property
    const { value } = this.device.getPropertyValue(name) || {}

    return states ? states[value] : value
  }
}

class BinarySensorComponent extends BaseComponent {
  type = 'binary_sensor'
  config = new BinarySensorConfig(this)

  async getValue() {
    const value = await super.getValue()
    return value ? this.config.payload_on : this.config.payload_off
  }
}

class SensorComponent extends BaseComponent {
  type = 'sensor'
  config = new SensorConfig(this)
}

class SwitchComponent extends BaseComponent {
  type = 'switch'
  config = new SwitchConfig(this)

  async getValue() {
    const value = await super.getValue()
    return value ? this.config.payload_on : this.config.payload_off
  }

  async setValue(value) {
    if (this.device.setParameters && this.property.key in ParamType) {
      const paramValue = value == this.config.payload_on ? 1 : 0
      this.gateway.logger.info(`Updating ${this.device.getStateChannel()} property ${this.property.name}: ${value}`)
      await this.device.setParameters([{ paramType: this.property.key, paramValue }])
    }
  }
}

class SelectComponent extends BaseComponent {
  type = 'select'
  config = new SelectConfig(this)
}

class AlarmComponent extends BaseComponent {
  type = 'alarm_control_panel'
  config = new AlarmConfig(this)

  async getValue() {
    const value = await super.getValue()
    switch (value) {
      case GuardMode.AWAY:
        return ARM_AWAY
      case GuardMode.HOME:
        return ARM_HOME
      case GuardMode.DISARMED:
        return DISARM
    }
  }

  async setValue(value) {
    let guardMode
    if (value == ARM_HOME) {
      guardMode = GuardMode.HOME
    }
    else if (value == ARM_AWAY) {
      guardMode = GuardMode.AWAY
    }
    else if (value == DISARM) {
      guardMode = GuardMode.DISARMED
    }
    else {
      this.gateway.logger.warn(`Received "${value}" for guard mode. Must be either "${ARM_AWAY}", "${ARM_HOME}", or "${DISARM}".`)
      return
    }

    try {
      this.gateway.logger.info(`Changing guard mode to ${GuardMode[guardMode]}`)
      await this.device.setGuardMode(guardMode)
    }
    catch (error) {
      this.gateway.logger.error(error)
    }
  }
}

class CameraComponent extends BaseComponent {
  type = 'camera'
  config = new CameraConfig(this)

  async getValue() {
    const value = await super.getValue()
    const res = await fetch(value)
    return await res.buffer()
  }
}

module.exports = {
  AlarmComponent,
  BinarySensorComponent,
  CameraComponent,
  SelectComponent,
  SensorComponent,
  SwitchComponent,
}
