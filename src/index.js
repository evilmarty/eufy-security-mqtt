const winston = require('winston')
const MQTT = require('async-mqtt')
const { EufySecurity, GuardMode, ParamType, CommandType } = require('eufy-security-client')
const { STATUS_ONLINE, STATUS_OFFLINE } = require('./constants')
const factory = require('./lookup')
const { id, topic, sleep } = require('./utils')

const DUMMY_COMPONENT = { id: '+', type: '+' }

class Gateway {
  constructor(options) {
    this.closed = false
    this.options = options
    this.components = {}
    this.listeners = {}

    this.logger = winston.createLogger({
      level: options.logLevel || 'info',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ]
    })

    this.eufyClient = new EufySecurity({
      country: options.country,
      language: options.language,
      persistentDir: options.persistentDir,
      username: options.username,
      password: options.password,
    }, options.debug ? this.logger : undefined)

    this.mqttClient = MQTT.connect(options.mqtt.url, {
      host: options.mqtt.host,
      port: options.mqtt.port,
      protocol: 'mqtt',
      username: options.mqtt.username,
      password: options.mqtt.password,
      clientId: `eufy-security-mqtt_${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: options.mqtt.reconnectPeriod,
      will: {
        topic: this.availabilityTopic,
        payload: STATUS_OFFLINE,
        retain: options.mqtt.retain,
      },
    })

    this.eufyClient.on('connect', () => {
      this.publishAvailability(true)
      this.logger.info('Connected to Eufy Security.')
    })

    this.eufyClient.on('close', () => {
      this.publishAvailability(false)
      this.logger.info('Disconnected from Eufy Security.')

      if (!this.close) {
        setTimeout(() => this.connect(), this.options.mqtt.reconnectPeriod)
      }
    })

    this.eufyClient.on('station added', async (station) => {
      this.logger.info(`Station ${station.getSerial()} - registered`)
      await this.registerDevice(station)
    })

    this.eufyClient.on('station removed', async (station) => {
      this.logger.info(`Station ${station.getSerial()} - deregistered`)
      await this.deregisterDevice(station)
    })

    this.eufyClient.on('station guard mode', async (station, guardMode, currentMode) => {
      this.logger.info(`Station ${station.getSerial()} - guard mode changed from ${GuardMode[guardMode]} to ${GuardMode[currentMode]}`)
    })

    this.eufyClient.on('station property changed', async (station, name, value) => {
      this.logger.debug(`Station ${station.getSerial()} - property ${name} changed`)
      this.updateComponent(station, name)
    })

    this.eufyClient.on('station rtsp url', (station, device, value, modified) => {
    })

    this.eufyClient.on('device added', async (device) => {
      this.logger.info(`Device ${device.getSerial()} - registered`)
      await this.registerDevice(device)
    })

    this.eufyClient.on('device removed', async (device) => {
      this.logger.info(`Device ${device.getSerial()} - deregistered`)
      await this.deregisterDevice(device)
    })

    this.eufyClient.on('device property changed', (device, name, value) => {
      this.logger.debug(`Device ${device.getSerial()} - property ${name} changed`)
      this.updateComponent(device, name)
    })

    this.eufyClient.on('device crying detected', (device, state) => {
    })

    this.eufyClient.on('device sound detected', (device, state) => {
    })

    this.eufyClient.on('device pet detected', (device, state) => {
    })

    this.eufyClient.on('device motion detected', (device, state) => {
    })

    this.eufyClient.on('device rings', (device, state) => {
    })

    this.eufyClient.on('device locked', (device, state) => {
    })

    this.eufyClient.on('device open', (device, state) => {
    })

    this.eufyClient.on('push message', (message) => {
      this.logger.debug(`Received push message - ${message}`)
    })

    this.mqttClient.on('connect', async () => {
      const { options } = this.mqttClient._client
      this.logger.info(`Connected to MQTT broker: ${options.protocol}://${options.hostname}:${options.port}`)

      await Promise.allSettled([
        this.mqttClient.subscribe(this.hassStatusTopic),
        this.mqttClient.subscribe(this.commandTopic(DUMMY_COMPONENT)),
        this.mqttClient.subscribe(this.availabilityTopic),
        this.mqttClient.subscribe(this.stateTopic(DUMMY_COMPONENT)),
        this.mqttClient.subscribe(this.configTopic(DUMMY_COMPONENT)),
      ])
      await Promise.allSettled([
        this.mqttClient.unsubscribe(this.availabilityTopic),
        this.mqttClient.unsubscribe(this.stateTopic(DUMMY_COMPONENT)),
        this.mqttClient.unsubscribe(this.configTopic(DUMMY_COMPONENT)),
      ])

      await this.connect()
    })

    this.mqttClient.on('close', () => {
      this.logger.info('Disconnected from MQTT broker.')
    })

    this.mqttClient.on('offline', () => {
    })

    this.mqttClient.on('message', (topic, message) => {
      this.logger.debug(`Received message from MQTT broker - ${topic} - ${message}`)

      if (topic == this.hassStatusTopic) {
        if (message == STATUS_ONLINE) {
          this.logger.info('Home Assistant is back online')
          this.publishAvailability(true)
          this.publishAllComponents()
        }
        else if (message == STATUS_OFFLINE) {
          this.logger.info('Home Assistant has gone offline')
        }
        else {
          this.logger.warn(`Home Assistant is in an unknown state: ${message}`)
        }
      }

      Object.values(this.components).forEach(component => {
        if (component.setValue && this.commandTopic(component) == topic) {
          try {
            component.setValue(message)
          }
          catch (error) {
            this.logger.error(`Error trying to update component state - ${component.id}`)
            this.logger.debug(error)
          }
        }
      })
    })

    this.mqttClient.on('error', (error) => {
      this.logger.error(error)
    })

    process.on('SIGINT', () => {
      if (this.closed) {
        process.exit()
      }
      else {
        this.close()
      }
    })
  }

  async connect() {
    if (this.eufyClient.isConnected()) {
      await this.publishAvailability(true)
      return
    }

    this.logger.info('Connecting to Eufy Security...')
    const connected = await this.eufyClient.connect()
    if (!connected) {
      this.logger.error('Could not connect to Eufy Security.')
      this.close()
      return
    }

    await this.publishAvailability(true)
  }

  close() {
    this.closed = true
    this.eufyClient.close()
    this.mqttClient.end()
  }

  get availabilityTopic() {
    return topic(this.options.selfTopicRoot, 'status')
  }

  stateTopic(component) {
    return topic(this.options.selfTopicRoot, 'state', component.id)
  }

  commandTopic(component) {
    return topic(this.options.selfTopicRoot, 'command', component.id)
  }

  configTopic(component) {
    return topic(this.options.hassTopicRoot, component.type, component.id, 'config')
  }

  get hassStatusTopic() {
    return topic(this.options.hassTopicRoot, 'status')
  }

  async publish(topic, data) {
    if (data === null || data === undefined) {
      return
    }

    const isBuffer = data instanceof Buffer
    const payload = isBuffer ? data : (typeof(data) === 'object' ? JSON.stringify(data) : String(data))
    const detail = isBuffer ? `(${data.length} bytes)` : payload

    try {
      await this.mqttClient.publish(topic, payload, { retain: this.options.mqtt.retain })
      this.logger.debug(`Published message - ${topic}: ${detail}`)
    }
    catch (error) {
      this.logger.debug(`Publish failed - ${topic}: ${detail}`)
      throw error
    }
  }

  async publishAllComponents() {
    await Promise.allSettled(
      Object.values(this.components).map(component => component.update())
    )
  }

  async publishAvailability(available) {
    await this.publish(this.availabilityTopic, available ? STATUS_ONLINE : STATUS_OFFLINE)
  }

  deviceComponents(device, createComponents = false) {
    const metadata = device.getPropertiesMetadata()
    return Object
      .values(metadata)
      .map(property => {
        const key = id(device, property)
        if (!(key in this.components) && createComponents) {
          this.components[key] = factory(this, device, property)
        }
        return this.components[key]
      })
      .filter(x => x)
  }

  async registerDevice(device) {
    const components = this.deviceComponents(device, true)

    await Promise.allSettled(
      components.map(component => this.publish(this.configTopic(component), component.config))
    )

    await sleep(1000)

    await Promise.allSettled(
      components.map(component => component.update())
    )

    await this.publishAvailability(true)
  }

  async deregisterDevice(device) {
    const components = this.deviceComponents(device, false)

    await Promise.allSettled(
      components.map(component => this.publish(this.configTopic(component), {}))
    )
  }

  async updateComponent(device, name) {
    const property = device.getPropertiesMetadata()[name]
    const component = property && this.components[id(device, property)]
    if (component) {
      await component.update()
    }
  }
}

module.exports = Gateway
