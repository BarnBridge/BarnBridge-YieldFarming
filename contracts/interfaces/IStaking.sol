// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IStaking {

    function getEpochId(uint timestamp) external view returns (uint); // get epoch id
    function getEpochUserBalance(address user, address token, uint epoch) external view returns(uint);
    function getEpochPoolSize(address token, uint epoch) external view returns (uint);
    function epoch1Start() external view returns (uint);
}
