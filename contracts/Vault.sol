// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    mapping (address => mapping (address => uint256)) private stakes;

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

    function stakeBalanceOf(address user, address token) public view returns (uint256) {
        return stakes[user][token];
    }
}
