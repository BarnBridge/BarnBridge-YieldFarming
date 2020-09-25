const { expect } = require('chai')
const { ethers } = require('@nomiclabs/buidler')

describe('CommunityVault', function () {
    let owner, user, communityVault, userAddr, ownerAddr, communityVaultAddr, creatorAccount, creatorAccountAddr
    let bondToken
    const distributedAmount = ethers.BigNumber.from(800000).mul(ethers.BigNumber.from(10).pow(18))
    let snapshotId

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, ownerSigner, userSigner] = await ethers.getSigners()
        creatorAccount = creator
        creatorAccountAddr = await creatorAccount.getAddress()
        owner = ownerSigner
        ownerAddr = await owner.getAddress()
        user = userSigner
        userAddr = await user.getAddress()

        const CommunityVault = await ethers.getContractFactory('CommunityVault', creator)

        // console.log(staking.address)
        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')

        bondToken = await ERC20Mock.deploy()
        communityVault = await CommunityVault.deploy(bondToken.address)
        communityVaultAddr = communityVault.address
    })
    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(communityVault.address).to.not.equal(0)
            expect(bondToken.address).to.not.equal(0)
        })
    })

    describe('Contract Tests', function () {
        it('Mint bond tokens in community vault address', async function () {
            await bondToken.mint(communityVaultAddr, distributedAmount)
            expect(await bondToken.balanceOf(communityVaultAddr)).to.be.equal(distributedAmount)
        })

        it('should fail if no owner tries to set allowance', async function () {
            expect(communityVault.connect(user).setAllowance(userAddr, distributedAmount)).to.be.revertedWith(
                'Ownable: caller is not the owner',
            )
        })

        it('should set allowance as owner', async function () {
            await bondToken.mint(communityVaultAddr, distributedAmount)
            await communityVault.connect(creatorAccount).setAllowance(userAddr, distributedAmount)
            expect(await bondToken.allowance(communityVaultAddr, userAddr)).to.be.equal(distributedAmount)
        })

        it('should transfer ownership', async function () {
            expect(await communityVault.owner()).to.be.equal(creatorAccountAddr)
            await expect(communityVault.connect(creatorAccount).transferOwnership(ownerAddr)).to.emit(
                communityVault, 'OwnershipTransferred')
            expect(await communityVault.owner()).to.be.equal(ownerAddr)
        })
    })

    describe('Events', function () {
        it('setAllowance emits SetAllowance', async function () {
            await bondToken.mint(communityVaultAddr, distributedAmount)
            await expect(communityVault.connect(creatorAccount).setAllowance(userAddr, distributedAmount))
                .to.emit(communityVault, 'SetAllowance')
        })
    })
})
