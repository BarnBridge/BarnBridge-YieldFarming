const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const _bond = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4'
    const _usdc = '0x4A69d0F05c8667B993eFC2b500014AE1bC8fD958'
    const _susd = '0xED159a31184ADADC5c28CE5D9e4822ea2b0B6ef9'
    const _dai = '0xEa8BE82DF1519D4a25E2539bcA0342a1203CD591'
    const _unilp = '0xe594D2B3BeA4454D841e5b616627dCA6A5D7aCF1'

    // We get the contract to deploy
    const Staking = await ethers.getContractFactory('Staking')
    // start at 2020-10-19 00:00:00; epoch duration 7 days
    const staking = await Staking.deploy(1603065600, 604800)
    await staking.deployed()

    console.log('Staking contract deployed to:', staking.address)

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy(_bond)
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)

    const YieldFarm = await ethers.getContractFactory('YieldFarm')
    const YieldFarmLP = await ethers.getContractFactory('YieldFarmLP')
    const YieldFarmBond = await ethers.getContractFactory('YieldFarmBond')

    const yf = await YieldFarm.deploy(_bond, _usdc, _susd, _dai, staking.address, cv.address)
    await yf.deployed()
    console.log('YF deployed to:', yf.address)

    const yflp = await YieldFarmLP.deploy(_bond, _unilp, staking.address, cv.address)
    await yflp.deployed()
    console.log('YF_LP deployed to:', yflp.address)

    const yfbond = await YieldFarmBond.deploy(_bond, staking.address, cv.address)
    await yfbond.deployed()
    console.log('YF_BOND deployed to:', yfbond.address)

    // initialize stuff
    const tenPow18 = BN.from(10).pow(18)
    const bond = await ethers.getContractAt('ERC20', _bond)
    await bond.transfer(cv.address, BN.from(2860000).mul(tenPow18))

    await cv.setAllowance(yf.address, BN.from(800000).mul(tenPow18))
    await cv.setAllowance(yflp.address, BN.from(2000000).mul(tenPow18))
    await cv.setAllowance(yfbond.address, BN.from(60000).mul(tenPow18))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
