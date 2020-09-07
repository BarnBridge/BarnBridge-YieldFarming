// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    mapping(address => mapping(address => uint256)) private stakes;

    /*
     * Sets the owner to the `_owner` address supplied. This should be the main YieldFarming contract address.
     */
    constructor (address _owner) public {
        transferOwnership(_owner);
    }

    /*
     * Stores `amount` of `tokenAddress` tokens for the `user` into the vault
     */
    function stake(IERC20 token, uint256 amount, address user) public onlyOwner {
        require(amount > 0, "Vault: Amount must be greater than 0.");

        uint256 allowance = token.allowance(user, address(this));
        require(allowance >= amount, "Vault: Token allowance should be greater than or equal to the amount staked.");

        stakes[user][address(token)] = amount;

        token.transferFrom(user, address(this), amount);
    }

    /*
     * Returns the amount of `token` that the `user` has currently staked
     */
    function stakeBalanceOf(address user, address token) public view returns (uint256) {
        return stakes[user][token];
    }

    /*
     * Removes the stake of the user and sends the staked amount of `token` back to the `user`
     */
    function withdraw(IERC20 token, address user) public onlyOwner {
        require(stakes[user][address(token)] > 0, "Vault: User has no stake");

        uint256 stakedAmount = stakes[user][address(token)];
        stakes[user][address(token)] = 0;

        token.transfer(user, stakedAmount);
    }
}
