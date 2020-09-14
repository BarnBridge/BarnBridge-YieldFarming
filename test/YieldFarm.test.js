const { expect } = require('chai');
const { ethers } = require('@nomiclabs/buidler');


describe('YieldFarm', function () {
    let yieldFarm
    let vault
    let owner, user
    const barnBridge = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const usdc = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const susd = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const dai = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    const barnYCurve = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    beforeEach (async function () {
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        owner = ownerSigner
        ownerAddr = await owner.getAddress()

        user = userSigner
        userAddr = await user.getAddress()

        const Vault = await ethers.getContractFactory('Vault', creator)

        vault = await Vault.deploy(await ownerSigner.getAddress())
        await vault.deployed()
        const YieldFarm = await ethers.getContractFactory('YieldFarm')
        yieldFarm = await YieldFarm.deploy(barnBridge, usdc, susd, dai, barnYCurve, vault.address)
        await yieldFarm.deployed()
    })
    it("should compute bonus", async function () {
        expect(await yieldFarm.computeBonus(10)).to.equal(25)
    })
})
