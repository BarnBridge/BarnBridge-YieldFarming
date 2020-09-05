const { expect, use } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

use(require('chai-bignumber')())

describe('Vault', function () {
    let vault
    let erc20Mock
    let owner, user

    const DAIAddr = '0x6b175474e89094c44da98b954eedeac495271d0f'

    beforeEach(async function () {
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner
        user = userSigner

        const Vault = await ethers.getContractFactory('Vault', creator)

        vault = await Vault.deploy(await ownerSigner.getAddress())
        await vault.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        erc20Mock = await ERC20Mock.deploy()
        await erc20Mock.deployed()
    })

    it('Can deploy successfully', async function () {
        expect(vault.address).to.not.equal(0)
    })

    it('Transfers ownership to address provided', async function () {
        let ownerAddr = await owner.getAddress()
        expect(await vault.owner()).to.equal(ownerAddr)
    })

    describe('stake', function () {
        it('reverts if not executed by owner', async function () {
            let userAddr = await user.getAddress()
            await expect(vault.stake(DAIAddr, 100, userAddr)).to.be.reverted
        })

        it('succeeds if called by owner', async function() {
            let userAddr = await user.getAddress()

            await expect(vault.connect(owner).stake(DAIAddr, 100, userAddr)).to.not.be.reverted
        })

        // todo:
        // 1. save the staked value for the user
        // -- it should allow and keep track of multiple erc20 tokens
        // 2. call transferFrom on the erc20 token to transfer the amount to itself
        // -- should it check for allowance first or use a try-catch block?
        // 3. what should the function return?
    })
})
