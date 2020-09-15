const { expect } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

const BN = ethers.BigNumber

describe('Staking', function () {
    let staking
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

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, 1000)
        await staking.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        erc20Mock = await ERC20Mock.deploy()
        await erc20Mock.deployed()
    })

    it('Can deploy successfully', async function () {
        expect(staking.address).to.not.equal(0)
    })

    describe('Deposit', function () {
        it('Reverts if amount is <= 0', async function () {
            await expect(
                staking.connect(user).deposit(erc20Mock.address, 0),
            ).to.be.revertedWith('Staking: Amount must be > 0')
        })

        it('Reverts if amount > allowance', async function () {
            await erc20Mock.mint(userAddr, amount)
            // no allowance

            await expect(
                staking.connect(user).deposit(erc20Mock.address, amount),
            ).to.be.revertedWith('Staking: Token allowance too small')
        })

        it('Saves users deposit in state', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)

            await staking.connect(user).deposit(erc20Mock.address, amount)

            const balance = await staking.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal(amount.toString())
        })

        it('Calls transferFrom when conditions are met', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)

            await staking.connect(user).deposit(erc20Mock.address, amount)

            expect(await erc20Mock.transferFromCalled()).to.be.true
        })

        it('Updates the pool size of the next epoch', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)

            await staking.connect(user).deposit(erc20Mock.address, amount)

            expect((await staking.getEpochPoolSize(erc20Mock.address, 1)).toString()).to.be.equal(amount.toString())
        })

        it('Updates the user balance of the next epoch', async function () {
            const snapshotId = await ethers.provider.send('evm_snapshot')
            await erc20Mock.mint(userAddr, amount.mul(10))
            await erc20Mock.connect(user).approve(staking.address, amount.mul(10))

            await staking.connect(user).deposit(erc20Mock.address, amount)

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 1)).toString(),
            ).to.be.equal(amount.toString())

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 0)).toString(),
            ).to.be.equal('0')

            // move forward to epoch 1
            // do one more deposit then check that the user balance is still correct
            await ethers.provider.send('evm_increaseTime', [1010])
            await ethers.provider.send('evm_mine')

            await staking.connect(user).deposit(erc20Mock.address, amount)

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 1)).toString(),
            ).to.be.equal(amount.toString())

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 2)).toString(),
            ).to.be.equal(amount.mul(2).toString())

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 0)).toString(),
            ).to.be.equal('0')

            await ethers.provider.send('evm_revert', [snapshotId])
        })
    })

    describe('Withdraw', function () {
        it('Reverts if user has no balance', async function () {
            await expect(
                staking.connect(user).withdraw(erc20Mock.address),
            ).to.be.revertedWith('Staking: User has empty balance')
        })

        it('Sets the balance of the user to 0', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)

            await staking.connect(user).deposit(erc20Mock.address, amount)

            // call withdraw
            await staking.connect(user).withdraw(erc20Mock.address)

            const balance = await staking.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal('0')
        })

        it('Calls the `transfer` function on token when all conditions are met', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)
            await staking.connect(user).deposit(erc20Mock.address, amount)

            // call withdraw
            await staking.connect(user).withdraw(erc20Mock.address)

            expect(await erc20Mock.transferCalled()).to.be.true
            expect(await erc20Mock.transferRecipient()).to.be.equal(userAddr)
            expect((await erc20Mock.transferAmount()).toString()).to.be.equal(amount.toString())
        })

        it('xxx', async function () {
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)

            // todo: figure out why time travel does not work as expected here

            // console.log(await staking.getCurrentEpoch())
            //
            // // epoch 0 -> deposit amount
            // // it will initialize epoch 0 and 1
            // await staking.connect(user).deposit(erc20Mock.address, amount)
            //
            // console.log(await staking.getCurrentEpoch())
            //
            // // move forward to epoch 2
            // await ethers.provider.send('evm_increaseTime', [2010])
            // await ethers.provider.send('evm_mine')
            //
            // console.log(await staking.getCurrentEpoch())
            //
            // expect(
            //     (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 2)).toString(),
            // ).to.be.equal('0')
        })
    })
})
