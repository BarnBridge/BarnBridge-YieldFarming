const config = require('./config')

usePlugin('@nomiclabs/buidler-waffle')
usePlugin("@nomiclabs/buidler-etherscan");
usePlugin('solidity-coverage')

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
    const accounts = await ethers.getSigners()

    for (const account of accounts) {
        console.log(await account.getAddress())
    }
})

// Some of the settings should be defined in `./config.js`.
// Go to https://buidler.dev/config/ for the syntax.
module.exports = {
    solc: {
        version: '0.6.12',
        optimizer: {
            enabled: true,
            runs: 1000,
        },
    },

    defaultNetwork: "buidlerevm",

    networks: config.networks,
    etherscan: config.etherscan,
}
