// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IStake {
    function getEpoch(uint timestamp) external view returns (uint epoch); // get epoch id
    function getEpochBalance(uint epoch, address token, address user) external returns(uint);
    function getEpochPoolSize(uint epoch, address coin) external returns (uint);
}
