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

    describe('Deposit', function () {
        it('Reverts if not executed by owner', async function () {
            await expect(
                vault.deposit(userAddr, erc20Mock.address, 100),
            ).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it('Reverts if amount is <= 0', async function () {
            await expect(
                vault.connect(owner).deposit(userAddr, erc20Mock.address, 0),
            ).to.be.revertedWith('Vault: Amount must be greater than 0')
        })

        it('Reverts if amount > allowance', async function () {
            await erc20Mock.mint(userAddr, amount)
            // no allowance

            await expect(
                vault.connect(owner).deposit(userAddr, erc20Mock.address, amount),
            ).to.be.revertedWith('Vault: Token allowance too small')
        })

        it('Saves users deposit in state', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(owner).deposit(userAddr, erc20Mock.address, amount)

            const balance = await vault.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal(amount.toString())
        })

        it('Calls transferFrom when conditions are met', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(owner).deposit(userAddr, erc20Mock.address, amount)

            expect(await erc20Mock.transferFromCalled()).to.be.true
        })
    })

    describe('Withdraw', function () {
        it('Reverts if not executed by owner', async function () {
            await expect(
                vault.withdraw(erc20Mock.address, userAddr),
            ).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it('Reverts if user has no balance', async function () {
            await expect(
                vault.connect(owner).withdraw(erc20Mock.address, userAddr),
            ).to.be.revertedWith('Vault: User has empty balance')
        })

        it('Sets the balance of the user to 0', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)
            await vault.connect(owner).deposit(userAddr, erc20Mock.address, amount)

            // call withdraw
            await vault.connect(owner).withdraw(userAddr, erc20Mock.address)

            const balance = await vault.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal('0')
        })

        it('Calls the `transfer` function on token when all conditions are met', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)
            await vault.connect(owner).deposit(userAddr, erc20Mock.address, amount)

            // call withdraw
            await vault.connect(owner).withdraw(userAddr, erc20Mock.address)

            expect(await erc20Mock.transferCalled()).to.be.true
            expect(await erc20Mock.transferRecipient()).to.be.equal(userAddr)
            expect((await erc20Mock.transferAmount()).toString()).to.be.equal(amount.toString())
        })
    })
})
