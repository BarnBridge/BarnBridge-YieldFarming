const { ethers } = require('@nomiclabs/buidler')

async function main () {
    const _bond = '0x0391D2021f89DC339F60Fff84546EA23E337750f'
    const _usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const _susd = '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51'
    const _dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    const _unilp = '0x6591c4BcD6D7A1eb4E537DA8B78676C1576Ba244'

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
