// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct Checkpoint {
        uint blockNumber;
        uint256 value;
    }

    /*
     * `balances` is the map that tracks the account statement of each address
     * for each user, we store a mapping of token to balance checkpoints
     * the latest checkpoint will always represent the current balance of the account
     */
    mapping(address => mapping(address => Checkpoint[])) private balances;

    /*
     * Assigns the DEFAULT_ADMIN_ROLE to `_admin` and MANAGER_ROLE to each one of the `users` specified
     */
    constructor (address _admin, address[] memory users) public {
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);

        for (uint i = 0; i < users.length; i++) {
            _setupRole(MANAGER_ROLE, users[i]);
        }
    }

    /*
     * Stores `amount` of `tokenAddress` tokens for the `user` into the vault
     */
    function deposit(address user, IERC20 token, uint256 amount) public {
        require(hasRole(MANAGER_ROLE, msg.sender), "Vault: caller is not vault manager");
        require(amount > 0, "Vault: Amount must be > 0");

        uint256 allowance = token.allowance(user, address(this));
        require(allowance >= amount, "Vault: Token allowance too small");

        uint256 previousBalance = balanceAtBlock(user, address(token), block.number);
        updateCheckpoints(balances[user][address(token)], previousBalance + amount);

        token.transferFrom(user, address(this), amount);
    }

    /*
     * Removes the deposit of the user and sends the amount of `token` back to the `user`
     */
    function withdraw(address user, IERC20 token, uint256 amount) public {
        require(hasRole(MANAGER_ROLE, msg.sender), "Vault: caller is not vault manager");

        uint256 previousBalance = balanceAtBlock(user, address(token), block.number);

        require(
            previousBalance >= amount,
            "Vault: User has empty balance"
        );

        updateCheckpoints(balances[user][address(token)], previousBalance - amount);

        token.transfer(user, amount);
    }

    /*
     * Returns the balance of `token` deposited by `user` at a specific `blockNumber`
     */
    function balanceAtBlock(address user, address token, uint blockNumber) public view returns (uint256) {
        Checkpoint[] storage checkpoints = balances[user][token];

        // if there are no checkpoints, it means the user never deposited any tokens, so the balance is 0
        if (checkpoints.length == 0 || blockNumber < checkpoints[0].blockNumber) {
            return 0;
        }

        uint min = 0;
        uint max = checkpoints.length - 1;

        // shortcut for blocks newer than the latest checkpoint == current balance
        if (blockNumber >= checkpoints[max].blockNumber) {
            return checkpoints[max].value;
        }

        // binary search of the value in the array
        while (max > min) {
            uint mid = (max + min + 1) / 2;
            if (checkpoints[mid].blockNumber <= blockNumber) {
                min = mid;
            } else {
                max = mid - 1;
            }
        }

        return checkpoints[min].value;
    }

    /*
     * Returns the amount of `token` that the `user` has currently staked
     */
    function balanceOf(address user, address token) public view returns (uint256) {
        return balanceAtBlock(user, token, block.number);
    }

    function updateCheckpoints(Checkpoint[] storage checkpoints, uint256 _value
    ) internal {
        if ((checkpoints.length == 0)
            || (checkpoints[checkpoints.length - 1].blockNumber < block.number)) {
            Checkpoint storage newCheckPoint;
            newCheckPoint.blockNumber = block.number;
            newCheckPoint.value = _value;

            checkpoints.push(newCheckPoint);
        } else {
            Checkpoint storage oldCheckPoint = checkpoints[checkpoints.length - 1];
            oldCheckPoint.value = _value;
        }
    }
}
