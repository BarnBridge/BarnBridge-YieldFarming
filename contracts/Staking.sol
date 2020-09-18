// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Staking {
    using SafeMath for uint256;

    // timestamp for the epoch 1
    // everything before that is considered epoch 0 which won't have a reward but allows for the initial stake
    uint256 public epoch1Start;

    // duration of each epoch
    uint256 public epochDuration;

    mapping(address => mapping(address => uint256)) private balances;

    struct Pool {
        uint256 size;
        bool set;
    }

    // for each token, we store the total pool size
    mapping(address => mapping(uint256 => Pool)) private poolSize;

    struct Checkpoint {
        uint256 epochId;
        uint256 balance;
    }

    // balanceCheckpoints[user][token][]
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

        balances[msg.sender][tokenAddress] = balances[msg.sender][tokenAddress].add(amount);

        token.transferFrom(msg.sender, address(this), amount);

        // epoch logic
        uint256 currentEpoch = getCurrentEpoch();
        uint256 nextEpoch = currentEpoch + 1;

        if (!epochIsInitialized(tokenAddress, currentEpoch)) {
            address[] memory tokens = new address[](1);
            tokens[0] = tokenAddress;
            manualEpochInit(tokens, currentEpoch);
        }

        // update the next epoch pool size
        Pool storage pNextEpoch = poolSize[tokenAddress][nextEpoch];
        pNextEpoch.size = token.balanceOf(address(this));
        pNextEpoch.set = true;

        Checkpoint[] storage checkpoints = balanceCheckpoints[msg.sender][tokenAddress];
        if (checkpoints.length == 0) {
            checkpoints.push(Checkpoint(currentEpoch, 0));
            checkpoints.push(Checkpoint(nextEpoch, balances[msg.sender][tokenAddress]));
        } else {
            uint256 last = checkpoints.length - 1;

            if (checkpoints[last].epochId < currentEpoch) {
                checkpoints.push(Checkpoint(currentEpoch, checkpoints[last].balance));
                checkpoints.push(Checkpoint(nextEpoch, balances[msg.sender][tokenAddress]));
            } else if (checkpoints[last].epochId == currentEpoch) {
                checkpoints.push(Checkpoint(nextEpoch, balances[msg.sender][tokenAddress]));
            } else {
                checkpoints[checkpoints.length - 1].balance = balances[msg.sender][tokenAddress];
            }
        }
    }

    /*
     * Removes the deposit of the user and sends the amount of `tokenAddress` back to the `user`
     */
    function withdraw(address tokenAddress, uint256 amount) public {
        require(balances[msg.sender][tokenAddress] >= amount, "Staking: balance too small");

        balances[msg.sender][tokenAddress] = balances[msg.sender][tokenAddress].sub(amount);

        IERC20 token = IERC20(tokenAddress);
        token.transfer(msg.sender, amount);

        // epoch logic
        uint256 currentEpoch = getCurrentEpoch();

        if (!epochIsInitialized(tokenAddress, currentEpoch)) {
            address[] memory tokens = new address[](1);
            tokens[0] = tokenAddress;
            manualEpochInit(tokens, currentEpoch);
        }

        // decrease the balance this user contributed to the poolSize at the beginning of the current epoch == the epoch balance of previous epoch
        uint256 epochStartBalance = getEpochUserBalance(msg.sender, tokenAddress, currentEpoch);
        uint256 epochBalanceLeft;
        if (amount >= epochStartBalance) {
            epochBalanceLeft = 0;
        } else {
            epochBalanceLeft = epochStartBalance - amount;
        }

        uint256 poolSizeDiff = epochStartBalance.sub(epochBalanceLeft);
        poolSize[tokenAddress][currentEpoch].size = poolSize[tokenAddress][currentEpoch].size.sub(poolSizeDiff);

        // update the pool size of the next epoch to its current balance
        Pool storage pNextEpoch = poolSize[tokenAddress][currentEpoch + 1];
        pNextEpoch.size = token.balanceOf(address(this));
        pNextEpoch.set = true;

        // remove any contribution for the user in the current epoch
        Checkpoint[] storage checkpoints = balanceCheckpoints[msg.sender][tokenAddress];
        uint256 last = checkpoints.length - 1;

        // note: it's impossible to have a withdraw and no checkpoints because the balance would be 0 and revert

        // there was a deposit in an older epoch (more than 1 behind [eg: previous 0, now 5]) but no other action since then
        if (checkpoints[last].epochId < currentEpoch) {
            checkpoints.push(Checkpoint(currentEpoch, epochBalanceLeft));
        }
        // there was a deposit in the `epochId - 1` epoch => we have a checkpoint for the current epoch
        else if (checkpoints[last].epochId == currentEpoch) {
            checkpoints[last].balance = epochBalanceLeft;
        }
        // there was a deposit in the current epoch
        else {
            // there was also a deposit in the previous epoch
            if (last >= 1 && checkpoints[last - 1].epochId == currentEpoch) {
                checkpoints[last - 1].balance = epochBalanceLeft;
            }

            checkpoints[last].balance = balances[msg.sender][tokenAddress];
        }
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
            Pool storage p = poolSize[tokens[i]][epochId];

            if (epochId == 0) {
                p.size = uint256(0);
                p.set = true;
            } else {
                require(!epochIsInitialized(tokens[0], epochId), "Staking: epoch already initialized");
                require(epochIsInitialized(tokens[0], epochId - 1), "Staking: previous epoch not initialized");

                p.size = poolSize[tokens[i]][epochId - 1].size;
                p.set = true;
            }
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

        return poolSize[token][epochId].size;
    }

    function epochIsInitialized(address token, uint256 epochId) internal view returns (bool) {
        return poolSize[token][epochId].set;
    }
}
