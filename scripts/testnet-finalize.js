const { ethers } = require('hardhat')

async function main () {
    const _bond = '0xc40a66AFB908789341A58B8423F89fE2cb7Dc1f9'
    const _cv = '0xd7d55Fd7763A356aF99f17C9d6c21d933bC2e2F1'
    const _rewards = '0xb21FC0d3C8C7550A1e4f1eC8017c1f098Ceb1A76'

    const rewardsAmount = ethers.BigNumber.from(610000).mul(ethers.BigNumber.from(10).pow(18));

    // setup community vault
    const bond = await ethers.getContractAt('ERC20', _bond);
    await bond.transfer(_cv, rewardsAmount);

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
