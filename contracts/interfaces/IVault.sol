pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVault {
    function deposit(address, IERC20, uint256) public;
    function balanceOf(address, address) public view returns (uint256);
    function withdraw(address, IERC20) public;
    function getBalanceAtBlock(uint) returns(uint);
}
