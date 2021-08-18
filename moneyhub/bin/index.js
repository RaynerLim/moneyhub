const Moneyc = require('..')
const path = require('path')
const Config = require('../config')

const DEFAULT_CONFIG = path.join(__dirname,'.moneyc.json')
const DEFAULT_TESTNET_CONFIG = path.join(__dirname,'.moneyc.test.json')

//const uplinkName = "btp"
console.log(process.argv)
const yargs = require('yargs')
  .option('config', {
    alias: 'c',
    default: DEFAULT_CONFIG,
    description: 'JSON config file'
  })
  .option('unsafe-allow-extensions', {
    type: 'boolean',
    default: false,
    description: 'Whether to accept connections from arbitrary browser extensions (Warning: this is unsafe)'
  })
  .option('allow-origin', {
    type: 'string',
    description: 'Accept connections from the indicated origin'
  })
  .option('testnet', {
    alias: 't',
    type: 'boolean',
    default: true,
    description: 'Whether to use the testnet config file'
  })
  .option('admin-api-port', {
    type: 'number',
    description: 'Port on which to expose admin API (not exposed if unspecified)'
  })
  .command('local', 'Launch moneyc with no uplink into the network, for local testing', {}, argv => {
    console.log('launching local moneyc...')
    const moneyc = new Moneyc(argv)
    moneyc.startLocal().catch(onError)
  })
  
  Object.keys(Moneyc.uplinks).forEach((uplinkName) => {
    yargs.command({
      command: uplinkName + ':configure',
      describe: 'Generate a configuration file',
      builder: {
        force: {
          type: 'boolean',
          alias: 'f',
          default: false,
          description: 'Set to overwrite existing configuration'
        },
        advanced: {
          type: 'boolean',
          default: false,
          description: 'Set to specify extra config fields'
        }
      },
      handler: (argv) => {
        argv.config = getConfigFile(argv)
        Moneyc.buildConfig(uplinkName, argv).then(done).catch(onError)
      }
    })
  
    const uplink = Moneyc.uplinks[uplinkName]
    if (!uplink) return
    addUplinkCommand(uplinkName, {
      command: 'start',
      describe: 'Launch moneyc',
      builder: {
        quiet: {
          alias: 'q',
          type: 'boolean',
          default: false,
          description: 'Don\'t print the banner on startup.'
        }
      },
      handler: async (config, argv) => {
        if (!argv.quiet) {
          console.log("Moneyhub")
        }
        console.log('starting moneyc')
        const moneyc = new Moneyc(argv)
        await moneyc.startConnector(config)
      }
    })
  
    uplink.commands.forEach((cmd) => {
      console.log("Commands: ", cmd)
      addUplinkCommand(uplinkName, Object.assign({}, cmd, {
        handler: (config, argv) => cmd.handler(config, argv).then(done)
      }))
    })
  })
yargs
  .demandCommand()
  .strict()
  .argv

var argv = yargs.argv

function addUplinkCommand (uplinkName, cmd) {
  yargs.command({
    command: uplinkName + ':' + cmd.command,
    describe: cmd.describe,
    builder: cmd.builder,
    handler: (argv) => {
      const config = new Config(getConfigFile(argv))
      const uplinkData = config.getUplinkData(uplinkName)
      if (!uplinkData) {
        console.error('No configuration found for uplink=' + uplinkName + ' mode=' + (argv.testnet ? 'testnet' : 'prod'))
        process.exit(1)
      }
      cmd.handler(uplinkData, argv).catch(onError)
    }
  })
}

function done () {
  process.exit(0)
}

function onError (err) {
  console.error('fatal:', err)
  process.exit(1)
}

function getConfigFile (argv) {
  if (argv.testnet && argv.config === DEFAULT_CONFIG) {
    return DEFAULT_TESTNET_CONFIG
  }
  return argv.config
}


//createConfig()
console.log("Created Config:", argv)
// const DEFAULT_ALLOWED_ORIGINS = [
//     // minute extension for web monetization
//     'chrome-extension://fakjpmebfmpdbhpnddiokemempckoejk'
//   ]

// const allowedOrigins = DEFAULT_ALLOWED_ORIGINS
//       .concat(argv['allow-origin'] || [])
//       .concat(argv['unsafe-allow-extensions'] ? 'chrome-extension://.*' : [])
//     this.allowedOrigins = allowedOrigins
//     this.environment = argv.testnet ? 'test' : 'production'
//     this.adminApiPort = argv['admin-api-port']

// console.log("Before Build: ",argv)
// const moneyc = new MoneyC(argv)
// argv => {
//   argv.config = getConfigFile(argv)
//   moneyc.buildConfig('btp', argv).then(done).catch(onError)
//   console.log(argv)
// }

// console.log(argv)

// function getConfigFile (argv) {
//     if (argv.testnet && argv.config === DEFAULT_CONFIG) {
//       return DEFAULT_TESTNET_CONFIG
//     }
//     return argv.config
// }

// function done () {
//     process.exit(0)
// }

// function onError (err) {
//     console.error('fatal:', err)
//     process.exit(1)
// }

// argv.config = getConfigFile(argv)

// const MoneyC = new moneyc(argv)
// MoneyC.buildConfig('xrp', moneyc.argv)
// MoneyC.startConnector(moneyc.argv.config)