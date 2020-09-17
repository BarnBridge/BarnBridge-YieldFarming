const { expect } = require('chai');
const { ethers } = require('@nomiclabs/buidler');

describe('YieldFarm', function () {
    let yieldFarm
    let staking, erc20Mock
    let owner, user
    const barnBridge = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const usdc = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const susd = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const dai = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const barnYCurve = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    beforeEach (async function () {
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner

        user = userSigner

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, 1000)
        await staking.deployed()
        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')

        erc20Mock = await ERC20Mock.deploy()

        const YieldFarm = await ethers.getContractFactory('YieldFarm')
        yieldFarm = await YieldFarm.deploy(
            erc20Mock.address,
            usdc,
            susd,
            dai,
            barnYCurve,
            staking.address,
        )
        await yieldFarm.deployed()
    })
    it("should compute bonus", async function () {
        expect(await yieldFarm.computeBonus(10)).to.equal(25)
    })
})
