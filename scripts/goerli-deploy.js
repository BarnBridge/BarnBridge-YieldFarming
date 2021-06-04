const { ethers } = require('hardhat')

async function main() {
    console.log("starting");
    const _bond = '0xd7d55Fd7763A356aF99f17C9d6c21d933bC2e2F1'

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
