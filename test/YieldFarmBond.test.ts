import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { moveAtEpoch, tenPow18 } from "./helpers/helpers";
import { deployContract } from "./helpers/deploy";
import { expect } from "chai";
import { CommunityVault, ERC20Mock, Staking, YieldFarmBond } from "../typechain";

describe("YieldFarm Bond Pool", function () {
    let staking: Staking;
    let bondToken: ERC20Mock;
    let communityVault: CommunityVault;
    let yieldFarm: YieldFarmBond;
    let creator: Signer, user: Signer;
    let userAddr: string;

    const epochStart = Math.floor(Date.now() / 1000) + 1000;
    const epochDuration = 1000;
    const numberOfEpochs = 12;

    const distributedAmount: BigNumber = BigNumber.from(60000).mul(tenPow18);
    const amount = BigNumber.from(100).mul(tenPow18) as BigNumber;

    let snapshotId: any;

    before(async function () {
        [creator, user] = await ethers.getSigners();
        userAddr = await user.getAddress();

        staking = (await deployContract("Staking", [epochStart, epochDuration])) as Staking;
        bondToken = (await deployContract("ERC20Mock")) as ERC20Mock;

        communityVault = (await deployContract("CommunityVault", [bondToken.address])) as CommunityVault;
        yieldFarm = (await deployContract("YieldFarmBond", [
            bondToken.address,
            staking.address,
            communityVault.address
        ])) as YieldFarmBond;

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
            await depositBond(amount);
            await moveAtEpoch(epochStart, epochDuration, 6);
            const totalAmount = amount;

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount);
            expect(await yieldFarm.getEpochStake(userAddr, 1)).to.equal(totalAmount);
            expect(await bondToken.allowance(communityVault.address,
                yieldFarm.address)).to.equal(distributedAmount);
            expect(await yieldFarm.getCurrentEpoch()).to.equal(2); // epoch on yield is staking - 1

            await yieldFarm.connect(user).harvest(1);
            expect(await bondToken.balanceOf(userAddr)).to.equal(distributedAmount.div(numberOfEpochs));
        });
    });

    describe("Contract Tests", function () {
        it("User harvest and mass Harvest", async function () {
            await depositBond(amount);
            const totalAmount = amount;
            // initialize epochs meanwhile
            await moveAtEpoch(epochStart, epochDuration, 12);
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount);

            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0); // no epoch initialized
            await expect(yieldFarm.harvest(10)).to.be.revertedWith("This epoch is in the future");
            await expect(yieldFarm.harvest(3)).to.be.revertedWith("Harvest in order");
            await (await yieldFarm.connect(user).harvest(1)).wait();

            expect(await bondToken.balanceOf(userAddr)).to.equal(
                amount.mul(distributedAmount.div(numberOfEpochs)).div(totalAmount)
            );
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(1);
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1); // epoch 1 have been initialized

            await (await yieldFarm.connect(user).massHarvest()).wait();
            const totalDistributedAmount = amount.mul(
                distributedAmount.div(numberOfEpochs)).div(totalAmount).mul(7);
            expect(await bondToken.balanceOf(userAddr)).to.equal(totalDistributedAmount);
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(7);
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(7); // epoch 7 have been initialized
        });
        it("Have nothing to harvest", async function () {
            await depositBond(amount);
            await moveAtEpoch(epochStart, epochDuration, 10);
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount);
            await yieldFarm.connect(creator).harvest(1);
            expect(await bondToken.balanceOf(await creator.getAddress())).to.equal(0);
            await yieldFarm.connect(creator).massHarvest();
            expect(await bondToken.balanceOf(await creator.getAddress())).to.equal(0);
        });
        it("harvest maximum 12 epochs", async function () {
            await depositBond(amount);
            const totalAmount = amount;
            await moveAtEpoch(epochStart, epochDuration, 300);

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount);
            await (await yieldFarm.connect(user).massHarvest()).wait();
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(numberOfEpochs);
        });

        it("gives epochid = 0 for previous epochs", async function () {
            await moveAtEpoch(epochStart, epochDuration, -2);
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0);
        });
        it("it should return 0 if no deposit in an epoch", async function () {
            await moveAtEpoch(epochStart, epochDuration, 6);
            await yieldFarm.connect(user).harvest(1);
            expect(await bondToken.balanceOf(await user.getAddress())).to.equal(0);
        });
        it("it should be epoch1 when staking epoch is 5", async function () {
            await moveAtEpoch(epochStart, epochDuration, 5);
            expect(await staking.getCurrentEpoch()).to.equal(5);
            expect(await yieldFarm.getCurrentEpoch()).to.equal(1);
        });
    });

    describe("Events", function () {
        it("Harvest emits Harvest", async function () {
            await depositBond(amount);
            await moveAtEpoch(epochStart, epochDuration, 9);

            await expect(yieldFarm.connect(user).harvest(1)).to.emit(yieldFarm, "Harvest");
        });

        it("MassHarvest emits MassHarvest", async function () {
            await depositBond(amount);
            await moveAtEpoch(epochStart, epochDuration, 9);

            await expect(yieldFarm.connect(user).massHarvest()).to.emit(yieldFarm, "MassHarvest");
        });
    });

    async function depositBond(x: BigNumber, u = user) {
        const ua = await u.getAddress();
        await bondToken.mint(ua, x);
        await bondToken.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(bondToken.address, x);
    }
});
