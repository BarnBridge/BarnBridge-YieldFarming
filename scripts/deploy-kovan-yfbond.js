const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const _bond = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4'
    const _staking = '0x90D5a6dFab1314D1f7248Ef5833B80051ed8b2b2'
    const _cv = '0x96FcA2665f7696232B823726c497A2B9F7379aF1'

    const YieldFarmBOND = await ethers.getContractFactory('YieldFarmBond')

    const yfbond = await YieldFarmBOND.deploy(_bond, _staking, _cv)
    await yfbond.deployed()
    console.log('YF_BOND deployed to:', yfbond.address)

    // initialize stuff
    const tenPow18 = BN.from(10).pow(18)
    const bond = await ethers.getContractAt('ERC20', _bond)
    await bond.transfer(_cv, BN.from(60000).mul(tenPow18))

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.attach(_cv)
    await cv.setAllowance(yfbond.address, BN.from(60000).mul(tenPow18))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
