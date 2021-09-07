const fs = require('fs')
const yargs = require('yargs/yargs')
const YAML = require('yaml')
const { hideBin } = require('yargs/helpers')
const Gateway = new require('./index')

const PARSERS = [JSON, YAML]

function parseConfig(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8')
  let lastError = new Error('No parsers configured')
  for (const parser of PARSERS) {
    try {
      return parser.parse(content)
    }
    catch (error) {
      lastError = error
      if (!(error instanceof SyntaxError)) {
        throw error
      }
    }
  }
  throw lastError
}

const args =
  yargs(hideBin(process.argv))
    .scriptName('eufy-security-mqtt')
    .usage('$0', 'Run the Eufy Security MQTT gateway')
    .env('EUFY_SECURITY_MQTT')
    .option('username', {
      alias: 'u',
      demandOption: true,
      describe: 'Eufy Security username',
      type: 'string',
    })
    .option('password', {
      alias: 'p',
      demandOption: true,
      describe: 'Eufy Security password',
      type: 'string',
    })
    .option('mqtt.url', {
      alias: 'mqtt-url',
      describe: 'MQTT broker URL',
      type: 'string',
      conflicts: ['mqtt.host', 'mqtt.port'],
    })
    .option('mqtt.host', {
      alias: ['h', 'mqtt-host'],
      describe: 'MQTT hostname',
      type: 'string',
    })
    .option('mqtt.port', {
      alias: ['P', 'mqtt-port'],
      describe: 'MQTT port',
      type: 'number',
    })
    .option('mqtt.username', {
      alias: ['mqtt-user', 'mqtt-username'],
      describe: 'MQTT username',
      type: 'string',
    })
    .option('mqtt.password', {
      alias: ['mqtt-pass', 'mqtt-password'],
      describe: 'MQTT password',
      type: 'string',
    })
    .option('mqtt.retain', {
      alias: ['mqtt-retain'],
      describe: 'MQTT retain messages',
      type: 'boolean',
      default: false,
    })
    .option('hass-topic-root', {
      alias: ['t', 'hass_topic_root'],
      describe: 'Home Assistant topic root',
      type: 'string',
      default: 'homeassistant',
    })
    .option('self-topic-root', {
      alias: ['T', 'self_topic_root'],
      describe: 'Self topic root',
      type: 'string',
      default: 'eufysecurity',
    })
    .option('mqtt.reconnect-period', {
      alias: ['R', 'reconnect-period', 'mqtt.reconnect_period'],
      describe: 'Reconnect period in milliseconds',
      type: 'number',
      default: 1000,
    })
    .option('country', {
      alias: 'C',
      describe: 'Eufy Security country',
      type: 'string',
      default: 'US',
    })
    .option('language', {
      alias: 'L',
      describe: 'Eufy Security language',
      type: 'string',
      default: 'en',
    })
    .option('persistent-dir', {
      alias: ['D', 'persistent_dir'],
      describe: 'Eufy Security persistent directory',
      type: 'string',
      default: process.cwd(),
    })
    .option('log-level', {
      alias: ['l', 'log_level'],
      describe: 'Log level',
      type: 'string',
      default: 'info',
    })
    .option('debug', {
      describe: 'Debug mode',
      type: 'boolean',
      default: false,
    })
    .option('experimental', {
      describe: 'Turn on experimental features',
      type: 'boolean',
      default: false,
    })
    .option('hassio', {
      describe: 'Run as a Home Assistant add-on',
      type: 'boolean',
      default: false,
      conflicts: ['mqtt.url', 'mqtt.host', 'mqtt.port'],
    })
    .option('supervisor.url', {
      type: 'string',
      default: 'http://supervisor/services/mqtt',
      requiresArg: 'hassio',
      hidden: true,
    })
    .option('supervisor.token', {
      type: 'string',
      default: () => process.env.SUPERVISOR_TOKEN,
      requiresArg: 'hassio',
      hidden: true,
    })
    .help()
    .config('config', parseConfig)
    .exitProcess()

async function getServiceCredentials(options) {
  const fetch = require('node-fetch')
  const headers = { authorization: `Bearer ${options.supervisor.token}` }
  const res = await fetch(options.supervisor.url, { headers })
  const { result, data } = await res.json()

  if (result !== 'ok') {
    throw new Error(`Invalid supervisor response: ${data}`)
  }

  return {
    ...options,
    mqtt: {
      ...options.mqtt,
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
    },
  }
}

async function main() {
  let options = await args.parseAsync()

  if (options.hassio) {
    options = await getServiceCredentials(options)
  }
  const gateway = new Gateway(options)
}

main()
