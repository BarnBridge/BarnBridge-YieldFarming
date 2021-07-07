const { ethers } = require('hardhat')

async function main () {
    const _bond = '0xc40a66AFB908789341A58B8423F89fE2cb7Dc1f9'

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy(_bond)
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
