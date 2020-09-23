const { ethers } = require('@nomiclabs/buidler')

async function main () {
    // We get the contract to deploy
    const Staking = await ethers.getContractFactory('Staking')
    // start at 2020-09-24 00:00:00; epoch duration 3 days
    const staking = await Staking.deploy(1600905600, 259200)
    await staking.deployed()

    console.log('Staking contract deployed to:', staking.address)

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy('0x64496f51779e400C5E955228E56fA41563Fb4dd8')
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)

    const YieldFarm = await ethers.getContractFactory('YieldFarm')
    const YieldFarmLP = await ethers.getContractFactory('YieldFarmLP')

    const _bond = '0x64496f51779e400C5E955228E56fA41563Fb4dd8'
    const _susd = '0x9ac3462b9A259bAEF295A8C90b2984738fd7AadD'
    const _usdc = '0x6ddF381aBf26a9c57FBc34fcb9aceb7A101c84de'
    const _dai = '0x95fD7265D5a4d8705d62A5840c5a0d69e019DCe4'

    const yf = await YieldFarm.deploy(_bond, _usdc, _susd, _dai, staking.address, cv.address)
    await yf.deployed()
    console.log('YF deployed to:', yf.address)

    const _unilp = '0x9f11cd3f75920f3ab86ecb12f4f56398c2f854b2'

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
