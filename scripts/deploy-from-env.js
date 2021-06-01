const { ethers } = require('hardhat')
require('dotenv').config()
async function main () {
    const _bond = process.env.BOND
    const _usdc = process.env.USDC
    const _susd = process.env.SUSD
    const _dai = process.env.DAI
    const _unilp = process.env.UNILP
    const _epoch = process.env.EPOCH
    const _epochstart = process.env.EPOCHSTART

    // We get the contract to deploy
    const Staking = await ethers.getContractFactory('Staking')
    // start at 2021-06-01 00:00:00; epoch duration 7 days
    const staking = await Staking.deploy(_epochstart, _epoch)
    await staking.deployed()

    console.log('Staking contract deployed to:', staking.address)

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy(_bond)
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)

    const YieldFarm = await ethers.getContractFactory('YieldFarm')
    const YieldFarmLP = await ethers.getContractFactory('YieldFarmLP')

    const yf = await YieldFarm.deploy(_bond, _usdc, _susd, _dai, staking.address, cv.address)
    await yf.deployed()
    console.log('YF deployed to:', yf.address)

    const yflp = await YieldFarmLP.deploy(_bond, _unilp, staking.address, cv.address)
    await yflp.deployed()
    console.log('YF_LP deployed to:', yflp.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
