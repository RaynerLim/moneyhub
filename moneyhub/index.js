'use strict'
const Connector = require('ilp-connector')
const Config = require('./config')

const DEFAULT_ALLOWED_ORIGINS = [
  // minute extension for web monetization
  'chrome-extension://fakjpmebfmpdbhpnddiokemempckoejk'
]

const uplinkModuleNames = {
  xrp: 'uplink-xrp',
//   eth: 'moneyd-uplink-eth',
//   coil: 'moneyd-uplink-coil',
//   http: 'moneyd-uplink-http',
  btp: 'uplink-btp'
}

const uplinks = {
  xrp: maybeRequire('./uplink-xrp/index'),
//   eth: maybeRequire('moneyd-uplink-eth'),
//   coil: maybeRequire('moneyd-uplink-coil'),
//   http: maybeRequire('moneyd-uplink-http'),
  btp: maybeRequire('./uplink-btp')
}

function maybeRequire (pkg) {
  try {
    return require(pkg)
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err
    return null
  }
}

class Moneyc {
  constructor (argv) {
    const allowedOrigins = DEFAULT_ALLOWED_ORIGINS
      .concat(argv['allow-origin'] || [])
      .concat(argv['unsafe-allow-extensions'] ? 'chrome-extension://.*' : [])
    this.allowedOrigins = allowedOrigins
    this.environment = argv.testnet ? 'test' : 'production'
    this.adminApiPort = argv['admin-api-port']
  }

  
  static async buildConfig (uplinkName, argv) {
    console.log("At BuildConfig: ",argv.config)
    const config = new Config(argv.config)
    if (config.getUplinkData(uplinkName) && !argv.force) {
      throw new Error('config already exists for uplinkName=' + uplinkName + ' file=' + argv.config)
    }

    const uplink = getUplink(uplinkName)
    console.log("At Uplink: ", uplinkName, argv)
    config.setUplinkData(uplinkName, await uplink.configure(argv))
    console.log("At Uplink 2: ", uplinkName, argv)
    return argv
  }

  startConnector (uplinkData) {
    return Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'ilp-store-memory',
      initialConnectTimeout: 60000,
      env: this.environment,
      adminApi: !!this.adminApiPort,
      adminApiPort: this.adminApiPort,
      accounts: {
        parent: uplinkData,
        local: {
          relation: 'child',
          plugin: 'ilp-plugin-mini-accounts',
          assetCode: uplinkData.assetCode,
          assetScale: uplinkData.assetScale,
          balance: {
            minimum: '-Infinity',
            maximum: 'Infinity',
            settleThreshold: '0'
          },
          options: {
            wsOpts: {
              host: process.env.MONEYC_BIND_IP || 'localhost',
              port: process.env.MONEYC_BIND_PORT || 7768
            },
            allowedOrigins: this.allowedOrigins
          }
        }
      }
    }).listen()
  }

  startLocal () {
    return Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'ilp-store-memory',
      initialConnectTimeout: 60000,
      ilpAddress: process.env.MONEYC_ILP_ADDRESS || 'g.moneyc',
      env: this.environment,
      adminApi: !!this.adminApiPort,
      adminApiPort: this.adminApiPort,
      accounts: {
        local: {
          relation: 'child',
          sendRoutes: false,
          receiveRoutes: false,
          plugin: 'ilp-plugin-mini-accounts',
          assetCode: 'XRP',
          assetScale: 9,
          options: {
            port: 8000,
            allowedOrigins: this.allowedOrigins
          }
        }
        // local: {
        //   relation: 'child',
        //   plugin: 'ilp-plugin-mini-accounts',
        //   assetCode: process.env.MONEYC_ASSET_CODE || 'XRP',
        //   assetScale: process.env.MONEYC_ASSET_SCALE || 9,
        //   balance: {
        //     minimum: '-Infinity',
        //     maximum: 'Infinity',
        //     settleThreshold: '0'
        //   },
        //   options: {
        //     port: 8000,
        //     // wsOpts: {
        //     //   host: process.env.MONEYC_BIND_IP || 'localhost',
        //     //   port: process.env.MONEYC_BIND_PORT || 7768
        //     // },
        //     allowedOrigins: this.allowedOrigins
        //   }
        // }
      }
    }).listen()
  }
}

function getUplink (uplinkName) {
  const uplink = uplinks[uplinkName]
  if (uplink) return uplink
  if (uplink === null) {
    console.error('Missing required plugin. To install, run:')
    console.error('')
    console.error('  $ npm install -g ' + uplinkModuleNames[uplinkName])
    console.error('')
    process.exit(1)
  }
  if (uplink === undefined) {
    console.error('Unknown uplink: "' + uplinkName + '"')
    process.exit(1)
  }
}

Moneyc.uplinks = uplinks
module.exports = Moneyc