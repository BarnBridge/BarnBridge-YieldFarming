const { ethers } = require('@nomiclabs/buidler')
const BN = ethers.BigNumber

async function main () {
    const _bond = '0x64496f51779e400C5E955228E56fA41563Fb4dd8'
    const _usdc = '0x6ddF381aBf26a9c57FBc34fcb9aceb7A101c84de'
    const _susd = '0x9ac3462b9A259bAEF295A8C90b2984738fd7AadD'
    const _dai = '0x95fD7265D5a4d8705d62A5840c5a0d69e019DCe4'
    const _unilp = '0x9f11cd3f75920f3ab86ecb12f4f56398c2f854b2'

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

    // initialize stuff
    const tenPow18 = BN.from(10).pow(18)
    const bond = await ethers.getContractAt('ERC20', _bond)
    await bond.transfer(cv.address, BN.from(2800000).mul(tenPow18))

    await cv.setAllowance(yf.address, BN.from(800000).mul(tenPow18))
    await cv.setAllowance(yflp.address, BN.from(2000000).mul(tenPow18))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
