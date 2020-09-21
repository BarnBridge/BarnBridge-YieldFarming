const { expect } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

const BN = ethers.BigNumber

describe('Staking', function () {
    let staking
    let erc20Mock
    let owner, user
    let ownerAddr, userAddr
    const amount = BN.from(100).mul(BN.from(10).pow(18))
    let snapshotId

    const epochDuration = 604800
    let epoch1Start

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')

        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner
        ownerAddr = await owner.getAddress()

        user = userSigner
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        epoch1Start = getCurrentUnix() + 1000
        staking = await Staking.deploy(epoch1Start, epochDuration)
        await staking.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        erc20Mock = await ERC20Mock.deploy()
        await erc20Mock.deployed()
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
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
            await erc20Mock.mint(userAddr, amount.mul(10))
            await erc20Mock.connect(user).approve(staking.address, amount.mul(10))

            await staking.connect(user).deposit(erc20Mock.address, amount)

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 1)).toString(),
            ).to.be.equal(amount.toString())

            // move forward to epoch 1
            // do one more deposit then check that the user balance is still correct
            await moveAtEpoch(1)

            await staking.connect(user).deposit(erc20Mock.address, amount)

            expect(
                (await staking.getEpochUserBalance(userAddr, erc20Mock.address, 2)).toString(),
            ).to.be.equal(amount.mul(2).toString())
        })
    })

    describe('Withdraw', function () {
        it('Reverts if user has no balance', async function () {
            await expect(
                staking.connect(user).withdraw(erc20Mock.address, amount),
            ).to.be.revertedWith('Staking: balance too small')
        })

        it('Sets the balance of the user to 0', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)

            await staking.connect(user).deposit(erc20Mock.address, amount)

            // call withdraw
            await staking.connect(user).withdraw(erc20Mock.address, amount)

            const balance = await staking.balanceOf(userAddr, erc20Mock.address)

            expect(balance.toString()).to.be.equal('0')
        })

        it('Calls the `transfer` function on token when all conditions are met', async function () {
            // set-up the balance sheet
            await erc20Mock.mint(userAddr, amount)
            await erc20Mock.connect(user).approve(staking.address, amount)
            await staking.connect(user).deposit(erc20Mock.address, amount)

            // call withdraw
            await staking.connect(user).withdraw(erc20Mock.address, amount)

            expect(await erc20Mock.transferCalled()).to.be.true
            expect(await erc20Mock.transferRecipient()).to.be.equal(userAddr)
            expect((await erc20Mock.transferAmount()).toString()).to.be.equal(amount.toString())
        })

        describe('epoch logic', function () {
            beforeEach(async function () {
                await erc20Mock.mint(userAddr, amount.mul(10))
                await erc20Mock.mint(ownerAddr, amount.mul(10))
                await erc20Mock.connect(user).approve(staking.address, amount.mul(10))
                await erc20Mock.connect(owner).approve(staking.address, amount.mul(10))
            })

            it('deposit in epoch 0, deposit in epoch 1, deposit in epoch 2, withdraw in epoch 3', async function () {
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal('0')

                // epoch 0
                await setNextBlockTimestamp(getCurrentUnix() + 15)
                await deposit(user, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())

                await moveAtEpoch(1)
                await deposit(user, amount)

                expect(await getEpochPoolSize(2)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal(amount.mul(2).toString())

                await moveAtEpoch(2)
                await deposit(user, amount)

                expect(await getEpochPoolSize(3)).to.be.equal(amount.mul(3).toString())
                expect(await getEpochUserBalance(userAddr, 3)).to.be.equal(amount.mul(3).toString())

                await moveAtEpoch(3)
                await staking.connect(user).withdraw(erc20Mock.address, amount.mul(3))

                expect(await getEpochPoolSize(4)).to.be.equal('0')
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal('0')
            })

            it('deposit in epoch 0, withdraw in epoch 3', async function () {
                // epoch 0
                await setNextBlockTimestamp(getCurrentUnix() + 15)
                await deposit(user, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())

                await staking.manualEpochInit([erc20Mock.address], 2)

                await moveAtEpoch(3)
                await staking.connect(user).withdraw(erc20Mock.address, amount)

                expect(await getEpochPoolSize(4)).to.be.equal('0')
            })

            it('deposit in epoch 0, withdraw in epoch 0', async function () {
                // epoch 0
                await setNextBlockTimestamp(getCurrentUnix() + 15)
                await deposit(user, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())

                await staking.connect(user).withdraw(erc20Mock.address, amount)

                expect(await getEpochPoolSize(1)).to.be.equal('0')
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal('0')
            })

            it('deposit in epoch 3, withdraw in epoch 3', async function () {
                await staking.manualEpochInit([erc20Mock.address], 0)
                await staking.manualEpochInit([erc20Mock.address], 1)
                await staking.manualEpochInit([erc20Mock.address], 2)

                await moveAtEpoch(3)
                await deposit(user, amount)

                expect(await getEpochPoolSize(4)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal(amount.toString())

                await staking.connect(user).withdraw(erc20Mock.address, amount)

                expect(await getEpochPoolSize(4)).to.be.equal('0')
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal('0')
            })

            it('deposit in epoch 2, withdraw in epoch 3', async function () {
                await staking.manualEpochInit([erc20Mock.address], 0)
                await staking.manualEpochInit([erc20Mock.address], 1)

                await moveAtEpoch(2)
                await deposit(user, amount)

                expect(await getEpochPoolSize(3)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 3)).to.be.equal(amount.toString())

                await moveAtEpoch(3)
                await staking.connect(user).withdraw(erc20Mock.address, amount)

                expect(await getEpochPoolSize(4)).to.be.equal('0')
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal('0')
            })

            it('multiple users deposit', async function () {
                await setNextBlockTimestamp(getCurrentUnix() + 15)
                await deposit(owner, amount)
                await deposit(user, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochUserBalance(ownerAddr, 1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())
            })

            it('multiple users deposit epoch 0 then 1 withdraw epoch 1', async function () {
                await setNextBlockTimestamp(getCurrentUnix() + 15)
                await deposit(owner, amount)
                await deposit(user, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochUserBalance(ownerAddr, 1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())

                await moveAtEpoch(1)
                await staking.connect(user).withdraw(erc20Mock.address, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(ownerAddr, 1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal('0')
            })

            it('multiple users deposit epoch 0 then 1 withdraw epoch 2', async function () {
                await setNextBlockTimestamp(getCurrentUnix() + 15)
                await deposit(owner, amount)
                await deposit(user, amount)

                expect(await getEpochPoolSize(1)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochUserBalance(ownerAddr, 1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())

                await moveAtEpoch(2)
                await staking.connect(user).withdraw(erc20Mock.address, amount)
                expect(await getEpochPoolSize(1)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochPoolSize(2)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(ownerAddr, 1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(ownerAddr, 2)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 1)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal('0')
                expect(await getEpochUserBalance(userAddr, 3)).to.be.equal('0')
            })

            it('multiple deposits in same epoch', async function () {
                await staking.manualEpochInit([erc20Mock.address], 0)

                await moveAtEpoch(1)
                await deposit(user, amount)
                await deposit(user, amount)

                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochPoolSize(2)).to.be.equal(amount.mul(2).toString())
            })

            it('deposit epoch 2, deposit epoch 3, withdraw epoch 3', async function () {
                await moveAtEpoch(2)

                await staking.manualEpochInit([erc20Mock.address], 0)
                await staking.manualEpochInit([erc20Mock.address], 1)
                await staking.manualEpochInit([erc20Mock.address], 2)

                await deposit(user, amount)
                expect(await getEpochUserBalance(userAddr, 3)).to.be.equal(amount.toString())
                expect(await getEpochPoolSize(3)).to.be.equal(amount.toString())

                await moveAtEpoch(3)
                await deposit(user, amount)
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochPoolSize(4)).to.be.equal(amount.mul(2).toString())

                await staking.connect(user).withdraw(erc20Mock.address, amount.mul(2))
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal('0')
                expect(await getEpochPoolSize(4)).to.be.equal('0')
            })

            it('deposit epoch 1, deposit epoch 3, withdraw epoch 3', async function () {
                await staking.manualEpochInit([erc20Mock.address], 0)

                await moveAtEpoch(1)

                await deposit(user, amount)
                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal(amount.toString())
                expect(await getEpochPoolSize(2)).to.be.equal(amount.toString())

                await moveAtEpoch(3)
                await deposit(user, amount)
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal(amount.mul(2).toString())
                expect(await getEpochPoolSize(4)).to.be.equal(amount.mul(2).toString())

                await staking.connect(user).withdraw(erc20Mock.address, amount.mul(2))
                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 4)).to.be.equal('0')
                expect(await getEpochPoolSize(4)).to.be.equal('0')
            })

            it('deposit epoch 1, deposit epoch 4, deposit epoch 5, withdraw epoch 5', async function () {
                await staking.manualEpochInit([erc20Mock.address], 0)

                await moveAtEpoch(1)
                await deposit(user, amount)
                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal(amount.toString())
                expect(await getEpochPoolSize(2)).to.be.equal(amount.toString())

                await staking.manualEpochInit([erc20Mock.address], 3)

                await moveAtEpoch(4)
                await deposit(user, amount)

                await moveAtEpoch(5)
                await deposit(user, amount)
                expect(await getEpochUserBalance(userAddr, 2)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 3)).to.be.equal(amount.toString())
                expect(await getEpochUserBalance(userAddr, 6)).to.be.equal(amount.mul(3).toString())
                expect(await getEpochPoolSize(2)).to.be.equal(amount.toString())
                expect(await getEpochPoolSize(3)).to.be.equal(amount.toString())
                expect(await getEpochPoolSize(6)).to.be.equal(amount.mul(3).toString())

                await staking.connect(user).withdraw(erc20Mock.address, amount.mul(3))
                expect(await getEpochPoolSize(7)).to.be.equal('0')
                expect(await getEpochUserBalance(userAddr, 7)).to.be.equal('0')
            })
        })
    })

    describe('getEpochPoolSize', function () {
        beforeEach(async function () {
            await erc20Mock.mint(userAddr, amount.mul(10))
            await erc20Mock.connect(user).approve(staking.address, amount.mul(10))
        })

        it('Reverts if there\'s a gap', async function () {
            await moveAtEpoch(2)

            await expect(deposit(user, amount)).to.be.revertedWith('Staking: previous epoch not initialized')
        })

        it('Returns pool size when epoch is initialized', async function () {
            await staking.manualEpochInit([erc20Mock.address], 0)
            await moveAtEpoch(1)
            await deposit(user, amount)

            expect(await getEpochPoolSize(2)).to.be.equal(amount.toString())
        })

        it('Returns 0 when there was no action ever', async function () {
            expect(await getEpochPoolSize(0)).to.be.equal('0')
            expect(await getEpochPoolSize(2)).to.be.equal('0')
            expect(await getEpochPoolSize(5)).to.be.equal('0')
            expect(await getEpochPoolSize(79)).to.be.equal('0')
            expect(await getEpochPoolSize(1542)).to.be.equal('0')
        })

        it('Returns correct balance where there was an action at some point', async function () {
            await staking.manualEpochInit([erc20Mock.address], 0)
            await moveAtEpoch(1)
            await deposit(user, amount)

            expect(await getEpochPoolSize(79)).to.be.equal(amount.toString())
        })
    })

    describe('currentEpochMultiplier', function () {
        it('Returns correct value', async function () {
            // epoch size is 1 week = 604800 seconds

            await moveAtEpoch(1)

            expect(await staking.currentEpochMultiplier()).to.be.equal(10000)

            // after 100 seconds, multiplier should be 0.9998
            await increaseTimeBy(100)
            expect(await staking.currentEpochMultiplier()).to.be.equal(9998)

            // after 1h (100 + 3500), multiplier should be  0.9940
            await increaseTimeBy(3500)
            expect(await staking.currentEpochMultiplier()).to.be.equal(9940)

            // after 1 day (3600 + 82800), multiplier should be 0.8571
            await increaseTimeBy(82800)
            expect(await staking.currentEpochMultiplier()).to.be.equal(8571)

            // after 3.5 days (half time; 86400 + 216000), multiplier should be 0.5
            await increaseTimeBy(216000)
            expect(await staking.currentEpochMultiplier()).to.be.equal(5000)

            // after 6.9 days (596160 = 293760 + 3.5 days)
            await increaseTimeBy(293760)
            expect(await staking.currentEpochMultiplier()).to.be.equal(142)
        })
    })

    describe('computeNewMultiplier', function () {
        it('Returns correct value', async function () {
            expect(await staking.computeNewMultiplier(1000, 10000, 1000, 5000)).to.equal(7500)
        })
    })

    async function deposit (u, x) {
        return await staking.connect(u).deposit(erc20Mock.address, x)
    }

    async function getEpochPoolSize (epochId) {
        return (await staking.getEpochPoolSize(erc20Mock.address, epochId)).toString()
    }

    async function getEpochUserBalance (u, epochId) {
        return (await staking.getEpochUserBalance(u, erc20Mock.address, epochId)).toString()
    }

    // eslint-disable-next-line no-unused-vars
    async function getCurrentEpoch () {
        return (await staking.getCurrentEpoch()).toString()
    }

    // eslint-disable-next-line no-unused-vars
    async function currentBlockNumber () {
        return await ethers.provider.getBlockNumber()
    }

    function getCurrentUnix () {
        return Math.floor(Date.now() / 1000)
    }

    async function setNextBlockTimestamp (timestamp) {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
        const currentTs = block.timestamp
        const diff = timestamp - currentTs
        await ethers.provider.send('evm_increaseTime', [diff])
    }

    async function moveAtEpoch (epoch) {
        await setNextBlockTimestamp(epoch1Start + epochDuration * (epoch - 1))
        await ethers.provider.send('evm_mine')
    }

    async function increaseTimeBy (seconds) {
        await ethers.provider.send('evm_increaseTime', [seconds])
        await ethers.provider.send('evm_mine')
    }
})
