const { ethers } = require('hardhat')

async function main () {
    const _bond = '0xd7d55Fd7763A356aF99f17C9d6c21d933bC2e2F1'
    const _cv = '0xCf7e717EF904EAb9023c7b16779C7a08527Ac37e'
    const _rewards = '0x7Ae75542b3fa0039198036783D2dDc80f70171AF'

    const rewardsAmount = ethers.BigNumber.from(610000).mul(ethers.BigNumber.from(10).pow(18));

    // setup community vault
    const bond = await ethers.getContractAt('ERC20Mock', _bond);
    await bond.mint(_cv, rewardsAmount);

    const cv = await ethers.getContractAt('CommunityVault', _cv);
    await cv.setAllowance(_rewards, rewardsAmount);

    console.log("transfered rewards and set allowance");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
