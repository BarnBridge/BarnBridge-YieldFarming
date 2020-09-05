const { expect, use } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

const BigNumber = ethers.BigNumber

use(require('chai-bignumber')())

describe('Vault', function () {
    let vault
    let erc20Mock
    let owner, user
    let ownerAddr, userAddr

    beforeEach(async function () {
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner
        ownerAddr = await owner.getAddress()

        user = userSigner
        userAddr = await user.getAddress()

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
        expect(await vault.owner()).to.equal(ownerAddr)
    })

    describe('stake', function () {
        it('reverts if not executed by owner', async function () {
            await expect(vault.stake(erc20Mock.address, 100, userAddr)).to.be.reverted
        })

        it('should only allow amount greater than 0', async function () {
            await expect(
                vault.connect(owner).stake(erc20Mock.address, 0, userAddr),
            ).to.be.revertedWith('Vault: Amount must be greater than 0.')
        })

        it('should revert if amount > allowance', async function () {
            const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
            await erc20Mock.mint(userAddr, amount)
            // no allowance

            await expect(
                vault.connect(owner).stake(erc20Mock.address, amount, userAddr),
            ).to.be.revertedWith('Vault: Token allowance should be greater than or equal to the amount staked.')
        })

        it('saves users stake in state', async function () {
            const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(owner).stake(erc20Mock.address, amount, userAddr)

            const balance = await vault.stakeBalanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.equal(amount.toString())
        })

        it('should call transferFrom when conditions are met', async function () {
            const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(owner).stake(erc20Mock.address, amount, userAddr)

            expect(await erc20Mock.transferFromCalled()).to.be.true
        })
    })
})
