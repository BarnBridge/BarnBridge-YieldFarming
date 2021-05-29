const { ethers } = require('hardhat')

async function main () {
    const tokens = [
        '0x4A69d0F05c8667B993eFC2b500014AE1bC8fD958', // Kovan USDC test token
        '0xED159a31184ADADC5c28CE5D9e4822ea2b0B6ef9', // Kovan sUSD test token
        '0x95fD7265D5a4d8705d62A5840c5a0d69e019DCe4', // Kovan DAI test token
        '0xe594D2B3BeA4454D841e5b616627dCA6A5D7aCF1', // Kovan UniSwap V2 Pair
        '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4', // Kovan BOND test token
    ]

    const _staking = '0x90D5a6dFab1314D1f7248Ef5833B80051ed8b2b2' // Kovan BOND staking
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
