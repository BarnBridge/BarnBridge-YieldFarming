const { expect } = require('chai')
const { ethers, waffle } = require('@nomiclabs/buidler')

const BN = ethers.BigNumber

describe('Vault', function () {
    let vault
    let erc20Mock
    let admin, manager, user
    let adminAddr, managerAddr, userAddr

    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const MANAGER_ROLE = ethers.utils.solidityKeccak256(['string'], ['MANAGER_ROLE'])

    const amount = BN.from(100).mul(BN.from(10).pow(18))

    beforeEach(async function () {
        [admin, manager, user] = await ethers.getSigners()
        adminAddr = await admin.getAddress()
        managerAddr = await manager.getAddress()
        userAddr = await user.getAddress()

        const Vault = await ethers.getContractFactory('Vault', admin)

        vault = await Vault.deploy(adminAddr, [managerAddr])
        await vault.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        erc20Mock = await ERC20Mock.deploy()
        await erc20Mock.deployed()
    })

    it('Can deploy successfully', async function () {
        expect(vault.address).to.not.equal(0)
    })

    it('Sets up correct access-control roles', async function () {
        expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, adminAddr)).to.be.true
        expect(await vault.hasRole(MANAGER_ROLE, managerAddr)).to.be.true
    })

    it('Allows adding other managers', async function () {
        await vault.connect(admin).grantRole(MANAGER_ROLE, userAddr)

        expect(await vault.hasRole(MANAGER_ROLE, userAddr)).to.be.true
    })

    describe('Deposit', function () {
        it('Reverts if not executed by owner', async function () {
            await expect(
                vault.deposit(userAddr, erc20Mock.address, 100),
            ).to.be.revertedWith('Vault: caller is not vault manager')
        })

        it('Reverts if amount is <= 0', async function () {
            await expect(
                vault.connect(manager).deposit(userAddr, erc20Mock.address, 0),
            ).to.be.revertedWith('Vault: Amount must be > 0')
        })

        it('Reverts if amount > allowance', async function () {
            await erc20Mock.mint(userAddr, amount)
            // no allowance

            await expect(
                vault.connect(manager).deposit(userAddr, erc20Mock.address, amount),
            ).to.be.revertedWith('Vault: Token allowance too small')
        })

        it('Saves users deposit in state', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)

            const balance = await vault.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal(amount.toString())
        })

        it('Calls transferFrom when conditions are met', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)

            expect(await erc20Mock.transferFromCalled()).to.be.true
        })
    })

    describe('Withdraw', function () {
        it('Reverts if not executed by owner', async function () {
            await expect(
                vault.withdraw(erc20Mock.address, userAddr, amount),
            ).to.be.revertedWith('Vault: caller is not vault manager')
        })

        it('Reverts if user has no balance', async function () {
            await expect(
                vault.connect(manager).withdraw(erc20Mock.address, userAddr, amount),
            ).to.be.revertedWith('Vault: User has empty balance')
        })

        it('Sets the balance of the user to 0', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)
            await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)

            // call withdraw
            await vault.connect(manager).withdraw(userAddr, erc20Mock.address, amount)

            const balance = await vault.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal('0')
        })

        it('Calls the `transfer` function on token when all conditions are met', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)
            await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)

            // call withdraw
            await vault.connect(manager).withdraw(userAddr, erc20Mock.address, amount)

            expect(await erc20Mock.transferCalled()).to.be.true
            expect(await erc20Mock.transferRecipient()).to.be.equal(userAddr)
            expect((await erc20Mock.transferAmount()).toString()).to.be.equal(amount.toString())
        })
    })

    describe('balanceAtBlock', function () {
        it('Returns 0 when there was no deposit', async function () {
            const currentBlock = await ethers.provider.getBlockNumber()
            expect(
                (await vault.connect(manager).balanceAtBlock(userAddr, erc20Mock.address, currentBlock)).toString(),
            ).to.be.equal('0')
        })

        it('Returns 0 when block is smaller than first checkpoint', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            const blockBefore = await ethers.provider.getBlockNumber()

            await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)

            expect(
                (await vault.connect(manager).balanceAtBlock(userAddr, erc20Mock.address, blockBefore)).toString(),
            ).to.be.equal('0')
        })

        it('Returns amount when there\'s only one checkpoint', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(vault.address, amount)

            await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)
            const blockAfter = await ethers.provider.getBlockNumber()

            expect(
                (await vault.connect(manager).balanceAtBlock(userAddr, erc20Mock.address, blockAfter)).toString(),
            ).to.be.equal(amount.toString())
        })

        it('Returns correct balance when there are multiple checkpoints', async function () {
            const checkpoints = 10

            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount.mul(checkpoints))
            await erc20Mock.connect(user).approve(vault.address, amount.mul(checkpoints))

            const blockBefore = await ethers.provider.getBlockNumber()

            for (let i = 0; i < checkpoints; i++) {
                await vault.connect(manager).deposit(userAddr, erc20Mock.address, amount)
            }

            const blockAfter = await ethers.provider.getBlockNumber()

            const halfCheckpoints = checkpoints / 2
            const blockMiddle = blockBefore + halfCheckpoints

            expect(
                (
                    await vault.connect(manager)
                        .balanceAtBlock(userAddr, erc20Mock.address, blockMiddle)
                ).toString(),
            ).to.be.equal(amount.mul(halfCheckpoints).toString())

            expect(
                (await vault.connect(manager).balanceAtBlock(userAddr, erc20Mock.address, blockAfter)).toString(),
            ).to.be.equal(amount.mul(checkpoints).toString())
        })

        it('Works with multiple deposits in the same block', async function () {
            const MultiDepositMock = await ethers.getContractFactory('MultiDepositMock')
            const md = await MultiDepositMock.deploy()
            await md.deployed()

            const checkpoints = 10

            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount.mul(checkpoints))
            await erc20Mock.connect(user).approve(vault.address, amount.mul(checkpoints))

            await vault.connect(admin).grantRole(MANAGER_ROLE, md.address)
            await md.deposit(vault.address, checkpoints, userAddr, erc20Mock.address, amount)
            const blockAfter = await ethers.provider.getBlockNumber()

            expect(
                (await vault.connect(manager).balanceAtBlock(userAddr, erc20Mock.address, blockAfter)).toString(),
            ).to.be.equal(amount.mul(checkpoints).toString())
        })
    })
})
