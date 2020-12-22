const { ethers } = require('@nomiclabs/buidler')

async function main () {
    const tokens = [
        '0x6ddF381aBf26a9c57FBc34fcb9aceb7A101c84de',
        '0x9ac3462b9A259bAEF295A8C90b2984738fd7AadD',
        '0x95fD7265D5a4d8705d62A5840c5a0d69e019DCe4',
        '0x9f11cd3f75920f3ab86ecb12f4f56398c2f854b2',
        '0x64496f51779e400C5E955228E56fA41563Fb4dd8',
    ]

    const _staking = '0x470D6Cd82918B90AF0d961Eb2620f8a2efcE5ac7'
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
