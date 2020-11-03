const { ethers } = require('@nomiclabs/buidler')

async function main () {
    const tokens = [
        '0x6ddF381aBf26a9c57FBc34fcb9aceb7A101c84de',
        '0x9ac3462b9A259bAEF295A8C90b2984738fd7AadD',
        '0x95fD7265D5a4d8705d62A5840c5a0d69e019DCe4',
        '0x9f11cd3f75920f3ab86ecb12f4f56398c2f854b2',
    ]

    const _staking = '0x470D6Cd82918B90AF0d961Eb2620f8a2efcE5ac7'
    const s = await ethers.getContractAt('Staking', _staking)

    const currentEpoch = parseInt(await s.getCurrentEpoch())
    const initializedEpochs = {}

    for (const token of tokens) {
        for (let i = currentEpoch + 1; i >= 0; i--) {
            const ok = await s.epochIsInitialized(token, i)
            if (ok) {
                console.log(`${token} last initialized epoch: ${i}`)
                initializedEpochs[token] = i
                break
            }
        }
    }

    console.log(`Current epoch is: ${currentEpoch}`)
    for (const token of tokens) {
        for (let i = initializedEpochs[token]+1; i < currentEpoch; i++) {
            console.log(`${token}: trying to init epoch ${i}`)

            try {
                await s.manualEpochInit([token], i)
                console.log(`${token}: trying to init epoch ${i} -- done`)
            } catch (e) {
                console.log(`${token}: trying to init epoch ${i} -- error`)
            }
        }
    }

    console.log('Done')
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
