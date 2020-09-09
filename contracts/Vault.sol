// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is AccessControl {
    mapping(address => mapping(address => uint256)) private balances;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /*
     *
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

        balances[user][address(token)] = amount;

        token.transferFrom(user, address(this), amount);
    }

    /*
     * Returns the amount of `token` that the `user` has currently staked
     */
    function balanceOf(address user, address token) public view returns (uint256) {
        return balances[user][token];
    }

    /*
     * Removes the deposit of the user and sends the amount of `token` back to the `user`
     */
    function withdraw(address user, IERC20 token) public {
        require(hasRole(MANAGER_ROLE, msg.sender), "Vault: caller is not vault manager");
        require(balances[user][address(token)] > 0, "Vault: User has empty balance");

        uint256 amount = balances[user][address(token)];
        balances[user][address(token)] = 0;

        token.transfer(user, amount);
    }
}
