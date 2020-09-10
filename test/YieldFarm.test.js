const { expect } = require('chai');
const { ethers } = require('@nomiclabs/buidler');

describe('YieldFarm', function () {
    let yieldFarm
    beforeEach (async function () {
        const YieldFarm = await ethers.getContractFactory('YieldFarm')
        yieldFarm = await YieldFarm.deploy()
        await yieldFarm.deployed()
    })
    it("should compute bonus", async function () {
        expect(await yieldFarm.computeBonus(10)).to.equal(25)
    })
})
