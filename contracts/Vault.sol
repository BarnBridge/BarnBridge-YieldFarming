// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    mapping(address => mapping(address => uint256)) private balances;

    /*
     * Sets the owner to the `_owner` address supplied. This should be the main YieldFarming contract address.
     */
    constructor (address _owner) public {
        transferOwnership(_owner);
    }

    /*
     * Stores `amount` of `tokenAddress` tokens for the `user` into the vault
     */
    function deposit(address user, address tokenAddress, uint256 amount) public onlyOwner {
        require(amount > 0, "Vault: Amount must be > 0");

        IERC20 token = IERC20(tokenAddress);
        uint256 allowance = token.allowance(user, address(this));
        require(allowance >= amount, "Vault: Token allowance too small");

        balances[user][tokenAddress] = amount;

        token.transferFrom(user, address(this), amount);
    }

    /*
     * Returns the amount of `token` that the `user` has currently staked
     */
    function balanceOf(address user, address token) public view returns (uint256) {
        return balances[user][token];
    }

    /*
     * Removes the deposit of the user and sends the amount of `tokenAddress` back to the `user`
     */
    function withdraw(address user, address tokenAddress) public onlyOwner {
        require(balances[user][tokenAddress] > 0, "Vault: User has empty balance");

        uint256 amount = balances[user][tokenAddress];
        balances[user][tokenAddress] = 0;

        IERC20 token = IERC20(tokenAddress);
        token.transfer(user, amount);
    }
}
