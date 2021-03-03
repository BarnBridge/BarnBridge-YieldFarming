import { ethers } from "hardhat";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { moveAtEpoch, setNextBlockTimestamp, tenPow18, getCurrentUnix } from "./helpers/helpers";
import { deployContract } from "./helpers/deploy";
import { expect } from "chai";
import { CommunityVault, ERC20Mock, ERC20Mock6Decimals, Staking, YieldFarm } from "../typechain";

describe("YieldFarm", function () {
    let staking: Staking;
    let bondToken: ERC20Mock, usdc: ERC20Mock6Decimals, susd: ERC20Mock, dai: ERC20Mock;
    let communityVault: CommunityVault;
    let yieldFarm: YieldFarm;
    let creator: Signer, owner: Signer, user: Signer;
    let ownerAddr: string, userAddr: string;

    const epochStart = Math.floor(Date.now() / 1000) + 1000;
    const epochDuration = 1000;

    const distributedAmount: BigNumber = BigNumber.from(800000).mul(tenPow18);
    const amount = BigNumber.from(100).mul(tenPow18) as BigNumber;
    const amountUSDC = amount.div(BigNumber.from(10).pow(12));

    let snapshotId: any;

    before(async function () {
        [creator, owner, user] = await ethers.getSigners();
        ownerAddr = await owner.getAddress();
        userAddr = await user.getAddress();

        staking = (await deployContract("Staking", [epochStart, epochDuration])) as Staking;

        bondToken = (await deployContract("ERC20Mock")) as ERC20Mock;
        usdc = (await deployContract("ERC20Mock6Decimals")) as ERC20Mock6Decimals;
        susd = (await deployContract("ERC20Mock")) as ERC20Mock;
        dai = (await deployContract("ERC20Mock")) as ERC20Mock;

        communityVault = (await deployContract("CommunityVault", [bondToken.address])) as CommunityVault;
        yieldFarm = (await deployContract("YieldFarm", [
            bondToken.address,
            usdc.address,
            susd.address,
            dai.address,
            staking.address,
            communityVault.address
        ])) as YieldFarm;

        await bondToken.mint(communityVault.address, distributedAmount);
        await communityVault.connect(creator).setAllowance(yieldFarm.address, distributedAmount);
    });

    beforeEach(async function () {
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
    });

    describe("General Contract checks", function () {
        it("should be deployed", async function () {
            expect(staking.address).to.not.equal(0);
            expect(yieldFarm.address).to.not.equal(0);
            expect(bondToken.address).to.not.equal(0);
        });
        it("Get epoch PoolSize and distribute tokens", async function () {
            await depositUsdc(amountUSDC);
            await depositSUsd(amount);
            await depositDai(amount);
            await moveAtEpoch(epochStart, epochDuration, 3);

            const totalAmount = amount.mul(3);
            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount);
            expect(await yieldFarm.getEpochStake(userAddr, 1)).to.equal(totalAmount);
            expect(await bondToken.allowance(communityVault.address, yieldFarm.address)).to.equal(distributedAmount);
            expect(await yieldFarm.getCurrentEpoch()).to.equal(3);

            await yieldFarm.connect(user).harvest(1);
            expect(await bondToken.balanceOf(userAddr)).to.equal(distributedAmount.div(25));
        });
    });

    describe("Contract Tests", function () {
        it("User harvest and mass Harvest", async function () {
            await depositUsdc(amountUSDC);
            await depositSUsd(amount, owner);
            const totalAmount = amount.mul(2);
            await moveAtEpoch(epochStart, epochDuration, 8);

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount);
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0); // no epoch initialized
            await expect(yieldFarm.harvest(10)).to.be.revertedWith("This epoch is in the future");
            await expect(yieldFarm.harvest(3)).to.be.revertedWith("Harvest in order");

            await (await yieldFarm.connect(user).harvest(1)).wait();
            expect(await bondToken.balanceOf(userAddr)).to.equal(
                amount.mul(distributedAmount.div(25)).div(totalAmount)
            );
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(1);
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1); // epoch 1 have been initialized

            await (await yieldFarm.connect(user).massHarvest()).wait();
            const totalDistributedAmount = amount.mul(distributedAmount.div(25)).div(totalAmount).mul(7);
            expect(await bondToken.balanceOf(userAddr)).to.equal(totalDistributedAmount);
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(7);
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(7); // epoch 7 have been initialized
        });

        it("Have nothing to harvest", async function () {
            await depositSUsd(amount);
            await moveAtEpoch(epochStart, epochDuration, 9);
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount);
            await yieldFarm.connect(owner).harvest(1);
            expect(await bondToken.balanceOf(await owner.getAddress())).to.equal(0);
            await yieldFarm.connect(owner).massHarvest();
            expect(await bondToken.balanceOf(await owner.getAddress())).to.equal(0);
        });

        it("harvest maximum 25 epochs", async function () {
            await depositUsdc(amountUSDC);
            const totalAmount = amount;
            await moveAtEpoch(epochStart, epochDuration, 30);

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount);
            await (await yieldFarm.connect(user).massHarvest()).wait();
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(25); // epoch 7 have been initialized
        });

        it("gives epochid = 0 for previous epochs", async function () {
            await moveAtEpoch(epochStart, epochDuration, -2);
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0); // epoch 7 have been initialized
        });

        it("it should return 0 if no deposit in an epoch", async function () {
            await moveAtEpoch(epochStart, epochDuration, 3);
            await yieldFarm.connect(owner).harvest(1);
            expect(await bondToken.balanceOf(await owner.getAddress())).to.equal(0);
        });
    });

    describe("Events", function () {
        it("Harvest emits Harvest", async function () {
            await depositUsdc(amountUSDC);
            await depositSUsd(amount, owner);
            await moveAtEpoch(epochStart, epochDuration, 9);

            await expect(yieldFarm.connect(user).harvest(1))
                .to.emit(yieldFarm, "Harvest");
        });

        it("MassHarvest emits MassHarvest", async function () {
            await depositUsdc(amountUSDC);
            await depositSUsd(amount, owner);
            await moveAtEpoch(epochStart, epochDuration, 9);

            await expect(yieldFarm.connect(user).massHarvest())
                .to.emit(yieldFarm, "MassHarvest");
        });
    });
    //
    // function getCurrentUnix() {
    //     return Math.floor(Date.now() / 1000);
    // }

    // async function setNextBlockTimestamp(timestamp:number) {
    //     const block = await ethers.provider.send("eth_getBlockByNumber", ["latest", false]);
    //     const currentTs = block.timestamp;
    //     const diff = timestamp - currentTs;
    //     await ethers.provider.send("evm_increaseTime", [diff]);
    // }
    //
    // async function moveAtEpoch(epochStart, epochDuration, epoch:number) {
    //     await setNextBlockTimestamp(getCurrentUnix() + epochDuration * epoch);
    //     await ethers.provider.send("evm_mine",[]);
    // }

    async function depositUsdc(x: BigNumber, u = user) {
        const ua = await u.getAddress();
        await usdc.mint(ua, x);
        await usdc.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(usdc.address, x);
    }

    async function depositSUsd(x: BigNumber, u = user) {
        const ua = await u.getAddress();
        await susd.mint(ua, x);
        await susd.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(susd.address, x);
    }

    async function depositDai(x: BigNumber, u = user) {
        const ua = await u.getAddress();
        await dai.mint(ua, x);
        await dai.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(dai.address, x);
    }
});
