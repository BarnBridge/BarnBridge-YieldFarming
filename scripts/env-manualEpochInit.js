const { ethers } = require('hardhat')
require('dotenv').config()
async function main () {
    const tokens = [
        process.env.USDC,
        process.env.SUSD,
        process.env.DAI,
        process.env.UNILP,
        process.env.BOND,
    ]

    const _staking = '0x90D5a6dFab1314D1f7248Ef5833B80051ed8b2b2' // BOND staking address given by deploy-from-env.js
    const s = await ethers.getContractAt('Staking', _staking)

    const currentEpoch = parseInt(await s.getCurrentEpoch())
    console.log(`Current epoch is: ${currentEpoch}`)

    const initializedEpochs = {}

    for (const token of tokens) {
        console.log(`Getting data for token ${token}`)
        for (let i = currentEpoch + 1; i >= 0; i--) {
            const ok = await s.epochIsInitialized(token, i)
            if (ok) {
                console.log(`${token} last initialized epoch: ${i}`)
                initializedEpochs[token] = i
                break
            }
        }

        if (initializedEpochs[token] === undefined) {
            initializedEpochs[token] = -1
        }
    }

    for (const token of tokens) {
        for (let i = initializedEpochs[token] + 1; i < currentEpoch; i++) {
            console.log(`${token}: trying to init epoch ${i}`)

            try {
                await s.manualEpochInit([token], i, {gasLimit: 100000})
                console.log(`${token}: trying to init epoch ${i} -- done`)
            } catch (e) {
                console.log(`${token}: trying to init epoch ${i} -- error`)
            }

            await sleep(1000)
        }
    }

    console.log('Done')
}

function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
