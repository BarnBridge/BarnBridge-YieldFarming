import 'dotenv/config';
import { NetworksUserConfig } from "hardhat/types";
import { EtherscanConfig } from "@nomiclabs/hardhat-etherscan/dist/src/types";

export const networks: NetworksUserConfig = {
    // Needed for `solidity-coverage`
    coverage: {
        url: "http://localhost:8555"
    },

    env_network: {
        url: process.env.PROVIDER,
        chainId: Number(process.env.CHAINID),
        accounts: {
            mnemonic: process.env.MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 0,
            count: 10
        },
        gas: "auto",
        gasPrice: 1000000000, // 1 gwei
        gasMultiplier: 1.5
    },

    // Mainnet
    mainnet: {
        url: process.env.PROVIDER,
        chainId: 1,
        accounts: ["0xaaaa"],
        gas: "auto",
        gasPrice: 50000000000,
        gasMultiplier: 1.5
    }
};

// Use to verify contracts on Etherscan
// https://buidler.dev/plugins/nomiclabs-buidler-etherscan.html
export const etherscan: EtherscanConfig = {
    apiKey: process.env.ETHERSCAN
};
