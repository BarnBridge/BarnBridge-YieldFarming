// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

contract Vesting is Ownable {

    using SafeMath for uint;

    uint constant NUMBER_OF_EPOCHS = 100;
    uint constant EPOCH_DURATION = 604800; // 1 week duration
    IERC20 _bond;

    uint private _lastClaimedEpoch;
    uint private _startTime;
    uint private _totalBalance;


    constructor(address newOwner, address bondTokenAddress, uint startTime, uint totalBalance) public {
        transferOwnership(newOwner);
        _bond = IERC20(bondTokenAddress);
        _startTime = startTime;
        _totalBalance = totalBalance;
    }


    function claim () public onlyOwner {
        uint balance;
        uint currentEpoch = getCurrentEpoch();
        if (currentEpoch > NUMBER_OF_EPOCHS + 1) {
            currentEpoch = NUMBER_OF_EPOCHS + 1;
        }

        if (currentEpoch > _lastClaimedEpoch) {
            balance = (currentEpoch - 1  - _lastClaimedEpoch) * _totalBalance / NUMBER_OF_EPOCHS;
        }
        _lastClaimedEpoch = currentEpoch - 1;
        if (balance > 0) {
            _bond.transfer(owner(), balance);
        }
    }

    function lastClaimedEpoch () public view returns (uint) {
        return _lastClaimedEpoch;
    }

    function totalDistributedBalance () public view returns (uint) {
        return _totalBalance;
    }

    function balance () public view returns (uint){
        return _bond.balanceOf(address (this));
    }


    function getCurrentEpoch () public view returns (uint){
        if (block.timestamp < _startTime) return 0;
        return (block.timestamp - _startTime) / EPOCH_DURATION + 1;
    }

}
