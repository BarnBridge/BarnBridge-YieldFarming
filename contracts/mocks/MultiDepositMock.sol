// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "../Vault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiDepositMock {
    function deposit(Vault vault, uint count, address user, IERC20 token, uint256 amount) public {
        for (uint i = 0; i < count; i++) {
            vault.deposit(user, token, amount);
        }
    }
}
