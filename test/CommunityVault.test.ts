import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { tenPow18 } from "./helpers/helpers";
import { deployContract } from "./helpers/deploy";
import { expect } from "chai";
import { ERC20Mock, CommunityVault } from "../typechain";

describe("CommunityVault", function () {
    let bondToken: ERC20Mock;
    let communityVault: CommunityVault;
    let creator: Signer, owner: Signer, user: Signer;
    let creatorAddr: string, ownerAddr: string, userAddr: string;

    const distributedAmount: BigNumber = BigNumber.from(800000).mul(tenPow18);

    let snapshotId: any;

    before(async () => {
        [creator, owner, user] = await ethers.getSigners();
        creatorAddr = await creator.getAddress();
        ownerAddr = await owner.getAddress();
        userAddr = await user.getAddress();

        bondToken = (await deployContract("ERC20Mock")) as ERC20Mock;
        communityVault = (await deployContract("CommunityVault", [bondToken.address])) as CommunityVault;
    });

    beforeEach(async function () {
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
    });

    describe("General Contract checks", function () {
        it("should be deployed", async function () {
            expect(communityVault.address).to.not.equal(0);
            expect(bondToken.address).to.not.equal(0);
        });
    });

    describe("Contract Tests", function () {
        it("Mint bond tokens in community vault address", async function () {
            await bondToken.mint(communityVault.address, distributedAmount);
            expect(await bondToken.balanceOf(communityVault.address)).to.be.equal(distributedAmount);
        });

        it("should fail if no owner tries to set allowance", async function () {
            await expect(communityVault.connect(user).setAllowance(userAddr, distributedAmount)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("should set allowance as owner", async function () {
            await bondToken.mint(communityVault.address, distributedAmount);
            await communityVault.connect(creator).setAllowance(userAddr, distributedAmount);
            expect(await bondToken.allowance(communityVault.address, userAddr)).to.be.equal(distributedAmount);
        });

        it("should transfer ownership", async function () {
            expect(await communityVault.owner()).to.be.equal(creatorAddr);
            await expect(communityVault.connect(creator).transferOwnership(ownerAddr)).to.emit(
                communityVault, "OwnershipTransferred");
            expect(await communityVault.owner()).to.be.equal(ownerAddr);
        });
    });

    describe("Events", function () {
        it("setAllowance emits SetAllowance", async function () {
            await bondToken.mint(communityVault.address, distributedAmount);
            await expect(communityVault.connect(creator).setAllowance(userAddr, distributedAmount))
                .to.emit(communityVault, "SetAllowance");
        });
    });
});
