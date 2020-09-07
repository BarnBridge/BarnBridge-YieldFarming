const { expect } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

const BN = ethers.BigNumber

describe('Vault', function () {
    let vault
    let erc20Mock
    let owner, user
    let ownerAddr, userAddr
    const amount = BN.from(100).mul(BN.from(10).pow(18))

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

    describe('Stake', function () {
        it('Reverts if not executed by owner', async function () {
            await expect(vault.stake(erc20Mock.address, 100, userAddr)).to.be.reverted
        })

        it('Reverts if amount is <= 0', async function () {
            await expect(
                vault.connect(owner).stake(erc20Mock.address, 0, userAddr),
            ).to.be.revertedWith('Vault: Amount must be greater than 0.')
        })

        it('Reverts if amount > allowance', async function () {
            await erc20Mock.mint(userAddr, amount)
            // no allowance

            await expect(
                vault.connect(owner).stake(erc20Mock.address, amount, userAddr),
            ).to.be.revertedWith('Vault: Token allowance should be greater than or equal to the amount staked.')
        })

        it('Saves users stake in state', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(owner).stake(erc20Mock.address, amount, userAddr)

            const balance = await vault.stakeBalanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal(amount.toString())
        })

        it('Calls transferFrom when conditions are met', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(owner).stake(erc20Mock.address, amount, userAddr)

            expect(await erc20Mock.transferFromCalled()).to.be.true
        })
    })

    describe('Withdraw', function () {
        it('Reverts if not executed by owner', async function () {
            await expect(vault.withdraw(erc20Mock.address, userAddr)).to.be.reverted
        })

        it('Reverts if user has no stake', async function () {
            await expect(vault.connect(owner).withdraw(erc20Mock.address, userAddr)).to.be.reverted
        })

        it('Sets the stake of the user to 0', async function () {
            // set-up the stake
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)
            await vault.connect(owner).stake(erc20Mock.address, amount, userAddr)

            // call withdraw
            await vault.connect(owner).withdraw(erc20Mock.address, userAddr)

            const balance = await vault.stakeBalanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal('0')
        })

        it('Calls the `transfer` function on token when all conditions are met', async function () {
            // set-up the stake
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)
            await vault.connect(owner).stake(erc20Mock.address, amount, userAddr)

            // call withdraw
            await vault.connect(owner).withdraw(erc20Mock.address, userAddr)

            expect(await erc20Mock.transferCalled()).to.be.true
            expect(await erc20Mock.transferRecipient()).to.be.equal(userAddr)
            expect((await erc20Mock.transferAmount()).toString()).to.be.equal(amount.toString())
        })
    })
})
