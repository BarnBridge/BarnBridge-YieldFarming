const { ethers } = require('@nomiclabs/buidler')
const BN = ethers.BigNumber

async function main () {
    const tenPow18 = BN.from(10).pow(18)

    const _smartYield = '0xD165c8CAE4D824E75588282821C57fB3b74c7f33'
    const _bond = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4'
    const _staking = '0x618bB8f9e76f2982B8783e6AA09bC930c65f0AC8'
    const _cv = '0xB56ccaD94c714c3Ad1807EB3f5d651C7633BB252'
    const distributedAmount = BN.from(60000).mul(tenPow18)
    const numberOfEpochs = 12
    const epochsDelayedFromStakingContract = 19

    const YieldFarmSmartYield = await ethers.getContractFactory('YieldFarmToken')

    const yfsy = await YieldFarmSmartYield.deploy(_smartYield, _bond, _staking, _cv, distributedAmount, numberOfEpochs, epochsDelayedFromStakingContract)
    await yfsy.deployed()
    console.log('YF_SMART_YIELD deployed to:', yfsy.address)

    // initialize stuff
    const bond = await ethers.getContractAt('ERC20', _bond)
    await bond.transfer(_cv, BN.from(60000).mul(tenPow18))

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.attach(_cv)
    await cv.setAllowance(yfsy.address, BN.from(60000).mul(tenPow18))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
