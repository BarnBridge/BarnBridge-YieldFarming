import { task, HardhatUserConfig } from 'hardhat/config';
import * as config from './config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-typechain';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

task('accounts', 'Prints the list of accounts', async (_, { ethers }) => {
    const accounts = await ethers.getSigners()

    for (const account of accounts) {
        console.log(await account.getAddress())
    }
})

const cfg: HardhatUserConfig = {
    solidity: {
        version: '0.6.12',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        }
    },

    defaultNetwork: "hardhat",
    networks: config.networks,
    etherscan: config.etherscan,

    abiExporter: {
        only: ['Staking', 'YieldFarm', 'YieldFarmLP', 'YieldFarmBond', 'YieldFarmToken', 'CommunityVault'],
        clear: true,
    },

    gasReporter: {
        enabled: !!(process.env.REPORT_GAS),
    },
};

export default cfg;
