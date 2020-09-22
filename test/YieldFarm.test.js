const { expect } = require('chai');
const { ethers } = require('@nomiclabs/buidler');

describe('YieldFarm', function () {
    let yieldFarm
    let staking
    let owner, user, communityVault, userAddr, ownerAddr, communityVaultAddr
    let bondToken, usdc, susd, dai, uniLP;
    const distributedAmount = ethers.BigNumber.from(800000).mul(ethers.BigNumber.from(10).pow(18))
    // let barnBridge = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let usdc = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let susd = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let dai = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let uniLP = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    let snapshotId
    const epochDuration = 1000

    const amount = ethers.BigNumber.from(100).mul(ethers.BigNumber.from(10).pow(18))
    beforeEach (async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        communityVault = owner = ownerSigner
        communityVaultAddr = ownerAddr = await owner.getAddress()

        user = userSigner
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, epochDuration)
        await staking.deployed()
        // console.log(staking.address)
        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        bondToken = await ERC20Mock.deploy()
        // console.log(erc20Mock.address)
        usdc = await ERC20Mock.deploy()
        // console.log(usdc.address)
        susd = await ERC20Mock.deploy()
        // console.log(susd.address)
        //
        dai = await ERC20Mock.deploy()
        // console.log(dai.address)
        //
        uniLP = await ERC20Mock.deploy()
        // console.log(barnYCurve.address)
        const YieldFarm = await ethers.getContractFactory('YieldFarm')
        yieldFarm = await YieldFarm.deploy(
            bondToken.address,
            usdc.address,
            susd.address,
            dai.address,
            uniLP.address,
            staking.address,
            communityVaultAddr,
        )
        await bondToken.mint(communityVaultAddr, distributedAmount)
        await bondToken.connect(communityVault).approve(yieldFarm.address, distributedAmount)
    })
    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })
    describe ("General Contract checks", function () {
        it("should be deployed", async function () {
            expect(staking.address).to.not.equal(0)
            expect(yieldFarm.address).to.not.equal(0)
            expect(bondToken.address).to.not.equal(0)
        })
        it ("Get epoch PoolSize and distribute tokens", async function () {
            await depositUsdc(amount)
            await depositSUsd(amount)
            await depositDai(amount)
            await depositUniLP(amount)
            moveAtEpoch(3)
            // await staking.manualEpochInit([usdc.address], 0)
            // await staking.manualEpochInit([usdc.address], 1)
            const totalAmount = amount.mul(55).div(10)
            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            expect(await yieldFarm.getEpochStake(userAddr, 1)).to.equal(totalAmount)
            expect(await bondToken.allowance(communityVaultAddr, yieldFarm.address)).to.equal(distributedAmount)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(3)
            await yieldFarm.connect(user).harvest(1)
            expect(await bondToken.balanceOf(userAddr)).to.equal(distributedAmount.div(24))
        })
    })
    describe ("Pure Functions", function () {
        it("should compute bonus", async function () {
            expect(await yieldFarm.computeBonus(10)).to.equal(25)
        })
    })

    describe ("Contract Tests", function () {
        it ("User harvest and mass Harvest", async function () {
            await depositUsdc(amount)
            await depositUniLP(amount, owner)
            const totalAmount = amount.mul(35).div(10)
            moveAtEpoch(8)
            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0) // no epoch initialized
            expect(yieldFarm.harvest(10)).to.be.revertedWith("This epoch is in the future")
            expect(yieldFarm.harvest(3)).to.be.revertedWith("Epochs needs to be harvested in order")
            await (await yieldFarm.connect(user).harvest(1)).wait()
            expect(await bondToken.balanceOf(userAddr)).to.equal(
                amount.mul(distributedAmount.div(24)).div(totalAmount),
            )
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(1)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1) // epoch 1 have been initialized
            await (await yieldFarm.connect(user).massHarvest()).wait()
            const totalDistributedAmount = amount.mul(distributedAmount.div(24)).div(totalAmount).mul(7)
            expect(await bondToken.balanceOf(userAddr)).to.equal(totalDistributedAmount)
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(7)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(7) // epoch 7 have been initialized
        })
        it ("init an uninit epoch", async function () {
            moveAtEpoch(5)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0) // no epoch initialized
            await yieldFarm.initEpoch(1)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1) // no epoch initialized
        })
        it ("harvest maximum 24 epochs", async function () {
            await depositUsdc(amount)
            const totalAmount = amount
            moveAtEpoch(30)
            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            await (await yieldFarm.connect(user).massHarvest()).wait()
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(24) // epoch 7 have been initialized
        })
        it ("gives epochid = 0 for previous epochs", async function () {
            moveAtEpoch(-2)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0) // epoch 7 have been initialized
        })
    })

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
        await setNextBlockTimestamp(getCurrentUnix() + epochDuration * epoch)
        await ethers.provider.send('evm_mine')
    }

    async function depositUsdc (x, u = user) {
        const ua = await u.getAddress()
        await usdc.mint(ua, x)
        await usdc.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(usdc.address, x)
    }

    async function depositSUsd (x, u = user) {
        const ua = await u.getAddress()
        await susd.mint(ua, x)
        await susd.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(susd.address, x)
    }

    async function depositDai (x, u = user) {
        const ua = await u.getAddress()
        await dai.mint(ua, x)
        await dai.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(dai.address, x)
    }

    async function depositUniLP (x, u = user) {
        const ua = await u.getAddress()
        await uniLP.mint(ua, x)
        await uniLP.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(uniLP.address, x)
    }

})
