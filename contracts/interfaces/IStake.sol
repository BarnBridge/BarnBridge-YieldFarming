// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IStake {
    function getEpochId(uint timestamp) external view returns (uint); // get epoch id
    function getEpochUserBalance(uint epoch, address user, address token) external returns(uint);
    function getEpochPoolSize(uint epoch, address token) external returns (uint);
}
