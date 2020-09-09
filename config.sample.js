module.exports = {
    networks: {
        // Needed for `solidity-coverage`
        coverage: {
            url: 'http://localhost:8555',
        },

        // Rinkeby
        rinkeby: {
            url: 'https://rinkeby.infura.io/v3/YOUR-INFURA-API-KEY',
            chainId: 4,
            accounts: {
                mnemonic: 'YOUR MNEMONIC HERE',
                path: 'm/44\'/60\'/0\'/0',
                initialIndex: 0,
                count: 10,
            },
            gas: 'auto',
            gasPrice: 1000000000, // 1 gwei
            gasMultiplier: 1.5,
        },

        // Mainnet
        mainnet: {
            url: 'https://mainnet.infura.io/v3/YOUR-INFURA-API-KEY',
            chainID: 1,
        },
    },
    // Use to verify contracts on Etherscan
    // https://buidler.dev/plugins/nomiclabs-buidler-etherscan.html
    etherscan: {
        apiKey: 'YOUR-ETHERSCAN-API-KEY',
    },
}
