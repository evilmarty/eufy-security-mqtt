const fs = require('fs')
const yargs = require('yargs/yargs')
const YAML = require('yaml')
const { hideBin } = require('yargs/helpers')
const Bridge = new require('./index')

const PARSERS = [JSON, YAML]

const argv =
  yargs(hideBin(process.argv))
    .scriptName('eufy-security-mqtt')
    .usage('$0', 'Run the Eufy Security MQTT gateway')
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
    .option('mqtt-url', {
      describe: 'MQTT broker URL',
      type: 'string',
    })
    .option('mqtt-host', {
      alias: 'h',
      describe: 'MQTT hostname',
      type: 'string',
    })
    .option('mqtt-port', {
      alias: 'P',
      describe: 'MQTT port',
      type: 'number',
    })
    .option('mqtt-username', {
      alias: 'mqtt-user',
      describe: 'MQTT username',
      type: 'string',
    })
    .option('mqtt-password', {
      alias: 'mqtt-pass',
      describe: 'MQTT password',
      type: 'string',
    })
    .option('mqtt-retain', {
      describe: 'MQTT retain messages',
      type: 'boolean',
      default: true,
    })
    .option('hass-topic-root', {
      alias: 't',
      describe: 'Home Assistant topic root',
      type: 'string',
      default: 'homeassistant',
    })
    .option('self-topic-root', {
      alias: 'T',
      describe: 'Self topic root',
      type: 'string',
      default: 'eufysecurity',
    })
    .option('reconnect-period', {
      alias: 'R',
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
      alias: 'D',
      describe: 'Eufy Security persistent directory',
      type: 'string',
      default: process.cwd(),
    })
    .option('log-level', {
      alias: 'l',
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
    .conflicts('mqtt-url', ['mqtt-host', 'mqtt-port'])
    .help()
    .config('config', configPath => {
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
    })
    .exitProcess()
    .parse()

new Bridge(argv)
