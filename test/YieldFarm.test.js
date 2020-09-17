const { expect } = require('chai');
const { ethers } = require('@nomiclabs/buidler');

describe('YieldFarm', function () {
    let yieldFarm
    let staking, erc20Mock
    let owner, user, userAddr, ownerAddr
    let barnBridge, usdc, susd, dai, barnYCurve
    // let barnBridge = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let usdc = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let susd = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let dai = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    // let barnYCurve = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    let snapshotId
    const epochDuration = 1000

    const amount = ethers.BigNumber.from(100).mul(ethers.BigNumber.from(10).pow(18))
    beforeEach (async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner
        ownerAddr = await owner.getAddress()

        user = userSigner
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, epochDuration)
        await staking.deployed()
        // console.log(staking.address)
        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        barnBridge = await ERC20Mock.deploy()
        // console.log(erc20Mock.address)
        usdc = await ERC20Mock.deploy()
        // console.log(usdc.address)
        susd = await ERC20Mock.deploy()
        // console.log(susd.address)
        //
        dai = await ERC20Mock.deploy()
        // console.log(dai.address)
        //
        barnYCurve = await ERC20Mock.deploy()
        // console.log(barnYCurve.address)

        const YieldFarm = await ethers.getContractFactory('YieldFarm')
        yieldFarm = await YieldFarm.deploy(
            barnBridge.address,
            usdc.address,
            susd.address,
            dai.address,
            barnYCurve.address,
            staking.address,
        )
        await yieldFarm.deployed()
    })
    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })
    it("should be deployed", async function () {
        expect(staking.address).to.not.equal(0)
        expect(yieldFarm.address).to.not.equal(0)
    })
    it("should compute bonus", async function () {
        expect(await yieldFarm.computeBonus(10)).to.equal(25)
    })
    // describe("Harvest", async function () {
    //     console.log(this.usdc)

    it ("get epoch1 pool size", async function () {
        await depositUsdc(amount)
        await depositSUsd(amount)
        await depositDai(amount)
        await depositBarn(amount)
        moveAtEpoch(2)
        // await staking.manualEpochInit([usdc.address], 0)
        // await staking.manualEpochInit([usdc.address], 1)
        expect(await yieldFarm.getPoolSize(1)).to.equal(amount.mul(55).div(10))
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

    async function depositUsdc (x) {
        await usdc.mint(userAddr, x)
        await usdc.connect(user).approve(staking.address, x)
        return await staking.connect(user).deposit(usdc.address, x)
    }

    async function depositSUsd (x) {
        await susd.mint(userAddr, x)
        await susd.connect(user).approve(staking.address, x)
        return await staking.connect(user).deposit(susd.address, x)
    }

    async function depositDai (x) {
        await dai.mint(userAddr, x)
        await dai.connect(user).approve(staking.address, x)
        return await staking.connect(user).deposit(dai.address, x)
    }

    async function depositBarn (x) {
        await barnYCurve.mint(userAddr, x)
        await barnYCurve.connect(user).approve(staking.address, x)
        return await staking.connect(user).deposit(barnYCurve.address, x)
    }

})
