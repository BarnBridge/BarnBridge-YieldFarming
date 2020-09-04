const { expect, use } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

use(require('chai-bignumber')())

describe('Vault', function () {
    let vault
    let owner, user

    const DAIAddr = '0x6b175474e89094c44da98b954eedeac495271d0f'

    beforeEach(async function () {
        const [signer, anotherSigner, userSigner] = await ethers.getSigners()
        owner = anotherSigner._address
        user = userSigner._address

        const Vault = await ethers.getContractFactory('Vault', signer)

        vault = await Vault.deploy(owner)
        await vault.deployed()
    })

    it('Can deploy successfully', async function () {
        expect(vault.address).to.not.equal(0)
    })

    it('Transfers ownership to address provided', async function () {
        expect(await vault.owner()).to.equal(owner)
    })

    describe('stake', function () {
        it('can only be executed by owner', async function () {
            await expect(vault.stake(DAIAddr, 100, user)).to.be.reverted
        })
    })
})
