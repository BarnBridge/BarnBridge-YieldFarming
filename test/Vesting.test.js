const { expect } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

describe('Vesting', function () {
    let owner, user, userAddr
    let bondToken, vesting
    const distributedAmount = ethers.BigNumber.from(800000).mul(ethers.BigNumber.from(10).pow(18))
    let snapshotId

    const epochDuration = 604800
    const epoch1Start = getCurrentUnix() + 1000

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner
        user = userSigner
        userAddr = await user.getAddress()

        const Vesting = await ethers.getContractFactory('Vesting', creator)
        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')

        bondToken = await ERC20Mock.deploy()
        vesting = await Vesting.deploy(userAddr, bondToken.address, epoch1Start, distributedAmount)
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(vesting.address).to.not.equal(0)
            expect(bondToken.address).to.not.equal(0)
        })
        it('should have the owner set as userAddr', async function () {
            expect(await vesting.owner()).to.be.equal(userAddr)
        })
        it('should have current epoch 0', async function () {
            expect(await vesting.getCurrentEpoch()).to.be.equal(0)
            await moveAtEpoch(-1)
            expect(await vesting.getCurrentEpoch()).to.be.equal(0)
        })
        it('should have last claimed epoch 0', async function () {
            expect(await vesting.lastClaimedEpoch()).to.be.equal(0)
        })
        it('should have bond balance 0', async function () {
            expect(await vesting.balance()).to.be.equal(0)
        })
        it('should have totalDistributedBalance 0', async function () {
            expect(await vesting.totalDistributedBalance()).to.be.equal(distributedAmount)
        })
        it('should have claim function callable only by owner', async function () {
            expect(vesting.connect(owner).claim()).to.be.revertedWith('Ownable: caller is not the owner')
        })
        it('should have the epoch1', async function () {
            await moveAtEpoch(1)
            expect(await vesting.getCurrentEpoch()).to.be.equal(1)
        })
        it('should have the epoch 0', async function () {
            expect(await vesting.getCurrentEpoch()).to.be.equal(0)
        })
    })

    describe('Contract Tests', function () {
        it('should should deposit some tokens', async function () {
            await bondToken.mint(vesting.address, distributedAmount)
            expect(await vesting.balance()).to.be.equal(distributedAmount)
        })
        it('should mint for 1 week', async function () {
            await bondToken.mint(vesting.address, distributedAmount) // set tokens
            await moveAtEpoch(2)
            await vesting.connect(user).claim()
            expect(await bondToken.balanceOf(userAddr)).to.be.equal(distributedAmount.div(100))
            expect(await vesting.balance()).to.be.equal(distributedAmount.sub(distributedAmount.div(100)))
            expect(await vesting.lastClaimedEpoch()).to.be.equal(1)
        })
        it('should mint with default function', async function () {
            await bondToken.mint(vesting.address, distributedAmount) // set tokens
            await moveAtEpoch(3)
            await user.sendTransaction({
                to: vesting.address,
            })
            expect(await bondToken.balanceOf(userAddr)).to.be.equal((distributedAmount.div(100)).mul(2))
            expect(await vesting.balance()).to.be.equal(distributedAmount.sub(distributedAmount.div(100).mul(2)))
            expect(await vesting.lastClaimedEpoch()).to.be.equal(2)
        })
        it('should mint for 100 week', async function () {
            await bondToken.mint(vesting.address, distributedAmount.add(1)) // set tokens
            await moveAtEpoch(104)
            expect(await vesting.getCurrentEpoch()).to.be.equal(104)
            await vesting.connect(user).claim()
            expect(await bondToken.balanceOf(userAddr)).to.be.equal(distributedAmount.add(1))
            expect(await vesting.balance()).to.be.equal(0)
            expect(await vesting.lastClaimedEpoch()).to.be.equal(100)
        })
        it('should emit', async function () {
            await bondToken.mint(vesting.address, distributedAmount) // set tokens
            await moveAtEpoch(59)
            expect(vesting.connect(user).claim()).to.emit(bondToken, 'Transfer')
        })
        it('should not emit', async function () {
            await bondToken.mint(vesting.address, distributedAmount) // set tokens
            await moveAtEpoch(60)
            await vesting.connect(user).claim()
            expect(vesting.connect(user).claim()).to.not.emit(bondToken, 'Transfer')
        })
    })

    function getCurrentUnix () {
        return Math.floor(Date.now() / 1000)
    }

    async function setNextBlockTimestamp (timestamp) {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
        const currentTs = parseInt(block.timestamp)
        const diff = timestamp - currentTs
        await ethers.provider.send('evm_increaseTime', [diff])
    }

    async function moveAtEpoch (epoch) {
        await setNextBlockTimestamp(epoch1Start + epochDuration * (epoch - 1))
        await ethers.provider.send('evm_mine')
    }
})
