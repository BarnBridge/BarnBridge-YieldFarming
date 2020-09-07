const { ethers } = require('@nomiclabs/buidler')

async function main () {
    // We get the contract to deploy
    const Vault = await ethers.getContractFactory('Vault')
    const vault = await Vault.deploy('0x0') // todo: add the address of the owner here

    await vault.deployed()

    console.log('Vault deployed to:', vault.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
