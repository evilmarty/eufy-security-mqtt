const winston = require('winston')
const mqtt = require('mqtt')
const { EufySecurity, GuardMode, ParamType, CommandType } = require('eufy-security-client')
const { STATUS_ONLINE, STATUS_OFFLINE } = require('./constants')
const factory = require('./lookup')
const { id, topic, sleep } = require('./utils')

class Gateway {
  constructor(options) {
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

    this.mqttClient = mqtt.connect(options.mqttUrl, {
      host: options.mqttHost,
      port: options.mqttPort,
      protocol: 'mqtt',
      username: options.mqttUser,
      password: options.mqttPass,
      clientId: `eufy-security-mqtt_${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: options.reconnectPeriod,
      will: {
        topic: this.availabilityTopic,
        payload: STATUS_OFFLINE,
        retain: options.mqttRetain,
      },
    })

    this.mqttClient.subscribe(topic(options.selfTopicRoot, 'command', '#'))

    this.eufyClient.on('connect', () => {
      this.publishAvailability(true)
      this.logger.info('Connected to Eufy Security.')
    })

    this.eufyClient.on('close', () => {
      this.publishAvailability(false)
      this.logger.info('Disconnected from Eufy Security.')
      this.mqttClient.end()
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
      this.logger.info('Connected to MQTT broker. Connecting to Eufy Security...')
      const connected = await this.eufyClient.connect()
      if (!connected) {
        this.logger.error('Could not connect to Eufy Security.')
        this.mqttClient.end()
      }
    })

    this.mqttClient.on('close', () => {
      this.logger.info('Disconnected from MQTT broker.')
      this.eufyClient.close()
      process.exit()
    })

    this.mqttClient.on('offline', () => {
    })

    this.mqttClient.on('message', (topic, message) => {
      this.logger.debug(`Received message from MQTT broker - ${topic} - ${message}`)
      const listeners = this.listeners[topic] || []
      listeners.forEach(listener => {
        listener.handler.call(listener.context, message)
      })
    })

    this.mqttClient.on('error', (error) => {
      this.logger.error(error)
    })

    process.on('SIGINT', () => {
      this.eufyClient.close()
    })
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

  publish(topic, data) {
    if (data === null || data === undefined) {
      return
    }

    const payload = data instanceof Buffer ? data : (typeof(data) === 'object' ? JSON.stringify(data) : String(data))

    return new Promise((resolve, reject) => {
      this.mqttClient.publish(topic, payload, { retain: this.options.mqttRetain }, (error) => {
        const detail = data instanceof Buffer ? `(${data.length} bytes)` : payload
        if (error) {
          this.logger.error(`Publish failed - ${topic}: ${detail}`)
          reject(error)
        } else {
          this.logger.debug(`Published message - ${topic}: ${detail}`)
          resolve(payload)
        }
      })
    })
  }

  async publishAvailability(available) {
    await this.publish(this.availabilityTopic, available ? STATUS_ONLINE : STATUS_OFFLINE)
  }

  async registerDevice(device) {
    const metadata = device.getPropertiesMetadata()
    const components = Object.values(metadata).map(property => {
      const key = id(device, property)
      if (!(key in this.components)) {
        this.components[key] = factory(this, device, property)
      }
      return this.components[key]
    })

    await Promise.allSettled(
      components.map(component => {
        if (component.setValue) {
          this.addListener(component.commandTopic, component.setValue, component)
        }
        return this.publish(this.configTopic(component), component.config)
      })
    )

    await sleep(1000)

    await Promise.allSettled(
      components.map(component => component.update())
    )
  }

  async deregisterDevice(device) {
    const metadata = device.getPropertiesMetadata()
    await Promise.allSettled(
      Object.values(metadata).forEach(property => {
        const component = this.components[id(device, property)]
        if (component) {
          if (component.setValue) {
            this.addListener(component.commandTopic, component.setValue, component)
          }
          return this.publish(this.configTopic(component), {})
        }
      })
    )
  }

  async updateComponent(device, name) {
    const property = device.getPropertyMetadata(name)
    const component = this.components[id(device, property)]
    if (component) {
      await component.update()
    }
  }

  addListener(topic, handler, context = null) {
    const listener = { handler, context }
    const listeners = this.listeners[topic] || []
    this.listeners[topic] = [ ...listeners, listener ]
  }

  removeListener(topic, handler) {
    const listeners = this.listeners[topic] || []
    this.listeners[topic] = listeners.filter(x => x.handler !== handler)
  }
}

module.exports = Gateway
