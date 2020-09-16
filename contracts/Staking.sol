// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Staking {
    // timestamp for the epoch 1
    // everything before that is considered epoch 0 which won't have a reward but allows for the initial stake
    uint256 public epoch1Start;

    // duration of each epoch
    uint256 epochDuration;

    mapping(address => mapping(address => uint256)) private balances;

    // for each token, we store the total pool size
    mapping(address => mapping(uint256 => uint256)) private poolSize;

    struct Checkpoint {
        uint256 epochId;
        uint256 balance;
    }

    // balanceCheckpoints[user][token][epochId]
    mapping(address => mapping(address => Checkpoint[])) private balanceCheckpoints;

    /*
     *
     */
    constructor (uint256 _epoch1Start, uint256 _epochDuration) public {
        epoch1Start = _epoch1Start;
        epochDuration = _epochDuration;
    }

    /*
     * Stores `amount` of `tokenAddress` tokens for the `user` into the vault
     */
    function deposit(address tokenAddress, uint256 amount) public {
        require(amount > 0, "Staking: Amount must be > 0");

        IERC20 token = IERC20(tokenAddress);
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Staking: Token allowance too small");

        balances[msg.sender][tokenAddress] += amount;

        token.transferFrom(msg.sender, address(this), amount);

        // epoch logic
        uint256 currentEpoch = getCurrentEpoch();

        // update the next epoch pool size
        poolSize[tokenAddress][currentEpoch + 1] = token.balanceOf(address(this));

        // update the user's balance for the next epoch to his current balance
        updateCheckpoints(balanceCheckpoints[msg.sender][tokenAddress], currentEpoch + 1, balances[msg.sender][tokenAddress]);
    }


    /*
     * Removes the deposit of the user and sends the amount of `tokenAddress` back to the `user`
     */
    function withdraw(address tokenAddress) public {
        require(balances[msg.sender][tokenAddress] > 0, "Staking: User has empty balance");

        uint256 amount = balances[msg.sender][tokenAddress];
        balances[msg.sender][tokenAddress] = 0;

        IERC20 token = IERC20(tokenAddress);
        token.transfer(msg.sender, amount);

        // epoch logic
        uint256 currentEpoch = getCurrentEpoch();

        if (!epochIsInitialized(tokenAddress, currentEpoch)) {
            address[] storage tokens;
            tokens.push(tokenAddress);
            manualEpochInit(tokens, currentEpoch);
        }

        // decrease the balance this user contributed to the poolSize at the beginning of the current epoch == the epoch balance of previous epoch
        poolSize[tokenAddress][currentEpoch] -= getEpochUserBalance(msg.sender, tokenAddress, currentEpoch - 1);

        // update the pool size of the next epoch to its current balance
        poolSize[tokenAddress][currentEpoch + 1] = token.balanceOf(address(this));

        // remove any contribution for the user in the current epoch
        updateCheckpoints(balanceCheckpoints[msg.sender][tokenAddress], currentEpoch, 0);

        // remove any contribution for the user in the next epoch
        updateCheckpoints(balanceCheckpoints[msg.sender][tokenAddress], currentEpoch + 1, 0);
    }

    function getEpochUserBalance(address user, address token, uint256 epochId) public view returns (uint256) {
        Checkpoint[] storage checkpoints = balanceCheckpoints[user][token];

        // if there are no checkpoints, it means the user never deposited any tokens, so the balance is 0
        if (checkpoints.length == 0 || epochId < checkpoints[0].epochId) {
            return 0;
        }

        uint min = 0;
        uint max = checkpoints.length - 1;

        // shortcut for blocks newer than the latest checkpoint == current balance
        if (epochId >= checkpoints[max].epochId) {
            return checkpoints[max].balance;
        }

        // binary search of the value in the array
        while (max > min) {
            uint mid = (max + min + 1) / 2;
            if (checkpoints[mid].epochId <= epochId) {
                min = mid;
            } else {
                max = mid - 1;
            }
        }

        return checkpoints[min].balance;
    }

    function manualEpochInit(address[] memory tokens, uint256 epochId) public {
        for (uint i = 0; i < tokens.length; i++) {
            require(!epochIsInitialized(tokens[0], epochId), "Staking: epoch already initialized");
            require(epochIsInitialized(tokens[0], epochId - 1), "Staking: previous epoch not initialized");

            poolSize[tokens[i]][epochId] = poolSize[tokens[i]][epochId - 1];
        }
    }

    /*
  * Returns the amount of `token` that the `user` has currently staked
  */
    function balanceOf(address user, address token) public view returns (uint256) {
        return balances[user][token];
    }

    function getCurrentEpoch() public view returns (uint256) {
        if (block.timestamp < epoch1Start) {
            return 0;
        }

        return (block.timestamp - epoch1Start) / epochDuration + 1;
    }

    function getEpochPoolSize(address token, uint256 epochId) public view returns (uint256) {
        require(epochIsInitialized(token, epochId), "Staking: epoch not initialized");

        return poolSize[token][epochId];
    }

    function epochIsInitialized(address token, uint256 epochId) internal view returns (bool) {
        return poolSize[token][epochId] > 0;
    }


    function updateCheckpoints(Checkpoint[] storage checkpoints, uint256 epochId, uint256 value) internal {
        if ((checkpoints.length == 0) || (checkpoints[checkpoints.length - 1].epochId < epochId)) {
            Checkpoint storage newCheckPoint;
            newCheckPoint.epochId = epochId;
            newCheckPoint.balance = value;

            checkpoints.push(newCheckPoint);
        } else {
            checkpoints[checkpoints.length - 1].balance = value;
        }
    }
}
