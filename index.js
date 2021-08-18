const plugin = require('ilp-plugin')()
const SPSP = require('ilp-protocol-spsp')

const exec = require('child_process').exec;


const child = exec('"node" %CD%\\moneyhub\\bin\\index.js --testnet btp:configure',
    (error, stdout, stderr) => {
        console.log(`stdout btp: ${stdout}`);
        console.log(`stderr btp: ${stderr}`);
        if (error !== null) {
            console.log(`exec error: ${error}`);
        }else{
            const child2 = exec('"node" %CD%\\moneyhub\\bin\\index.js --testnet xrp:configure',
            (error, stdout, stderr) => {
                console.log(`stdout xrp: ${stdout}`);
                console.log(`stderr xrp: ${stderr}`);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
                } else {
                    console.log("Entering XRP start")
                    const child3 = exec('"node" %CD%\\moneyhub\\bin\\index.js --testnet xrp:start' ,(error, stdout, stderr) => {
                        console.log(`stdout xrp start: ${stdout}`);
                        console.log(`stderr xrp start: ${stderr}`);
                        if (error !== null) {
                            console.log(`exec error: ${error}`);
                        }
                    });
                }
            });
        }
});
var recipient = "rEvNsUhNEFfPRGtu2mG66nR8PwtmFi4r5f"
async function run () {
  console.log('paying $spsp.ilp-test.com...')
  await SPSP.pay(plugin, {
    receiver: 'https://s.altnet.rippletest.net:51234/account_lines',
    sourceAmount: '13000012',
    streamOpts:{
        params:[{ account: recipient.replace(/\?dt=\d+$/, ''), ledger_index: 'validated' }]
    }
  })
  console.log('paid!')
}

run().catch(e => console.error(e))
