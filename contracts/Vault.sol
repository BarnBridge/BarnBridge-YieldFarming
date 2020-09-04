// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    /*
     * Sets the owner to the `_owner` address supplied. This should be the main YieldFarming contract address.
     */
    constructor (address _owner) public {
        transferOwnership(_owner);
    }

    /*
     * Stores `amount` of `tokenAddress` tokens for the `user` into the vault
     */
    function stake(IERC20 tokenAddress, uint256 amount, address user) public onlyOwner {

    }
}
