const { ethers } = require('@nomiclabs/buidler')

async function main () {
    // We get the contract to deploy
    const Staking = await ethers.getContractFactory('Staking')
    const staking = await Staking.deploy(1600300800, 3600) // todo: add the epoch1Start and epoch duration

    await staking.deployed()

    console.log('Staking contract deployed to:', staking.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
