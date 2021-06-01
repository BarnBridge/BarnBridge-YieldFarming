# BarnBridge Yield Farming
![](https://i.imgur.com/n2gJdiQ.png)

BarnBridge Liquidity Provider Yield Farming for BOND/USDC LPs on UniSwap. 
Previous Pools:
* USDC/DAI/sUSD The stablecoin staking pool ended after 25 epochs on Apr 12 2021, 00:00 UTC. Deposits are now disabled but you can still withdraw your tokens and collect any unclaimed rewards.
* The $BOND staking pool ended after 12 epochs on Feb 08 2021, 00:00 UTC. Deposits are now disabled, but you can still withdraw your tokens and collect any unclaimed rewards. To continue to stake $BOND proceed to the [DAO](https://app.barnbridge.com/governance)

Any questions? Please contact us on [Discord](https://discord.gg/FfEhsVk) or read our [Developer Guides](https://integrations.barnbridge.com/) for more information.

## Active Contracts
### YieldFarmLP.sol
Awards a total of 2000000 BOND over 100 Epochs to Uniswap BOND/USDC liquidity providers
[Contract](https://etherscan.io/address/0xC25c37c387C5C909a94055F4f16184ca325D3a76)

## Smart Contract Architecture
![](https://gblobscdn.gitbook.com/assets%2F-M_LfnzPLAW6BY3XlMxl%2F-M_PZIBaovfD7QrohlgL%2F-M_PZT78kbWBxzCWCnhd%2Fyf.png?alt=media&token=0480116b-33d1-45f0-ab8a-97c6a99f24be)

Check out more detailed smart contract Slither graphs with all the dependencies: [Yield Farming Slither Graphs](https://github.com/BarnBridge/sc-graphs/tree/main/BarnBridge-YieldFarming).

## Initial Setup
### Install NVM and the latest version of NodeJS 12.x
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash 
    # Restart terminal and/or run commands given at the end of the installation script
    nvm install 12
    nvm use 12
### Use Git to pull down the BarnBridge-SmartYieldBonds repository from GitHub
    git clone https://github.com/BarnBridge/BarnBridge-YieldFarming.git
    cd BarnBridge-YieldFarming
### Create config.ts using the sample template config.sample.ts
    cp config.sample.ts config.ts

## Updating the .env file
### Create an API key with Infura to deploy to Ethereum Public Testnet. In this guide, we are using Kovan.

1. Navigate to [Infura.io](https://infura.io/) and create an account
2. Log in and select "Get started and create your first project to access the Ethereum network"
3. Create a project and name it appropriately
4. Switch the Endpoint to Kovan and copy the last part of the HTTPS URL into the INFURA section section in the .env file
5. Finally, insert the mnemonic phrase for your testing wallet into the MNEMONIC section in the .env file. You can use a MetaMask instance, and switch the network to Rinkeby on the upper right. DO NOT USE YOUR PERSONAL METAMASK SEED PHRASE; USE A DIFFERENT BROWSER WITH AN INDEPENDENT METAMASK INSTALLATION
6. You'll need some Kovan-ETH (it is free) in order to pay the gas costs of deploying the contracts on the TestNet; you can use your GitHub account to authenticate to the [KovanFaucet](https://faucet.kovan.network/) and receive 2 Kovan-ETH for free every 24 hours

### Create an API key with Etherscan 
1. Navigate to [EtherScan](https://etherscan.io/) and create an account 
2. Log in and navigate to [MyAPIKey](https://etherscan.io/myapikey) 
3. Use the Add button to create an API key, and paste it into the ETHERSCAN section of the .env file.

## Installing

### Install NodeJS dependencies which include HardHat
    npm install
    
### Compile the contracts
    npm run compile
    
## Running Tests
    npm run test

## Running Code Coverage Tests
    npm run coverage

## Deplying to Kovan    
### Use the code in the scripts folder to deploy on Kovan

    npm run deploy-from-env
    
### OPTIONAL: Manually initialize Epoch passage
Update line 12 of the env-manualEpochInit.js file with the staking address given by your deploy-kovan.js execution, and run it

    npm run manual-epoch-init-env

## MainNet Contracts

 [Staking](https://etherscan.io/address/0xb0fa2beee3cf36a7ac7e99b885b48538ab364853#tokentxns)

 [Community Vault](https://etherscan.io/address/0xA3C299eEE1998F45c20010276684921EBE6423D9)

 [Yield Farm](https://etherscan.io/address/0xB3F7abF8FA1Df0fF61C5AC38d35e20490419f4bb#code)

 [Yield Farm LP](https://etherscan.io/address/0xC25c37c387C5C909a94055F4f16184ca325D3a76#code)

 [Yield Farm BOND](https://etherscan.io/address/0x3FdFb07472ea4771E1aD66FD3b87b265Cd4ec112#code)

## Discussion
For any concerns with the platform, open an issue on GitHub or visit us on [Discord](https://discord.gg/9TTQNUzg) to discuss.
For security concerns, please email info@barnbridge.com.

Copyright 2021 BarnBridge DAO


