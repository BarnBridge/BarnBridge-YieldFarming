// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IStaking.sol";


contract YieldFarm {

    // lib
    using SafeMath for uint;
    using SafeMath for uint128;

    // constants
    uint constant TOTAL_DISTRIBUTED_AMOUNT = 800000;
    uint NR_OF_EPOCHS = 24;

     // state variables

    // addreses
    address private _usdc;
    address private _susd;
    address private _dai;
    address private _communityVault;
    // contracts
    IERC20 private _bond;
    IStaking private _staking;


    uint[] private epochs = new uint[](NR_OF_EPOCHS + 1);
    uint private _totalAmountPerEpoch;
    uint128 public lastInitializedEpoch;
    mapping (address => uint128) lastEpochIdHarvested;
    uint epochDuration; // init from staking contract
    uint epochStart; // init from staking contract


    // modifiers
    // constructor
    constructor(address bondTokenAddress, address usdc, address susd, address dai, address stakeContract, address communityVault) public {
        _bond = IERC20(bondTokenAddress);
        _usdc = usdc;
        _susd = susd;
        _dai = dai;
        _staking = IStaking(stakeContract);
        _communityVault = communityVault;
        epochStart = _staking.epoch1Start();
        epochDuration = _staking.epochDuration();
        _totalAmountPerEpoch = TOTAL_DISTRIBUTED_AMOUNT.mul(10**18).div(NR_OF_EPOCHS);
    }

    // public methods
    function massHarvest () external returns (uint){
        uint totalDistributedValue;
        uint epochId = _getEpochId().sub(1);
        if (epochId > NR_OF_EPOCHS) {
            epochId = NR_OF_EPOCHS;
        }
        for(uint128 i = lastEpochIdHarvested[msg.sender] + 1; i <= epochId; i++) {
            // i = epochId
            totalDistributedValue += _harvest(i);
        }
        if (totalDistributedValue > 0) {
            _bond.transferFrom(_communityVault, msg.sender, totalDistributedValue);
        }
        return totalDistributedValue;
    }
    function harvest (uint128 epochId) external returns (uint){
        require (_getEpochId() > epochId, "This epoch is in the future");
        require(epochId <= NR_OF_EPOCHS, "Maximum number of epochs is 100");
        require (lastEpochIdHarvested[msg.sender].add(1) == epochId, "Epochs needs to be harvested in order");
        uint userReward = _harvest(epochId);
        if (userReward > 0) {
            _bond.transferFrom(_communityVault, msg.sender, userReward);
        }
        return userReward;
    }

    function initEpoch (uint128 epochId) external {
        _initEpoch(epochId);
    }

    // views
    function getPoolSize (uint128 epochId) external view returns (uint) {
        return _getPoolSize(epochId);
    }
    function getCurrentEpoch () external view returns (uint) {
        return _getEpochId();
    }
    function getEpochStake (address userAddress, uint128 epochId) external view returns (uint) {
        return _getUserBalancePerEpoch (userAddress, epochId);
    }

    function userLastEpochIdHarvested() external view returns (uint){
        return lastEpochIdHarvested[msg.sender];
    }

    // internal methods

    function _initEpoch (uint128 epochId) internal {
        require (lastInitializedEpoch.add(1) == epochId, "Epoch can be init only in order");
        lastInitializedEpoch = epochId;
        epochs[epochId] = _getPoolSize(epochId);
    }

    function _harvest (uint128 epochId) internal returns (uint) {
        if (lastInitializedEpoch < epochId) {
            _initEpoch(epochId);
        }
        // Give user reward
        lastEpochIdHarvested[msg.sender] = epochId;
        return _totalAmountPerEpoch
            .mul(_getUserBalancePerEpoch(msg.sender, epochId))
            .div(epochs[epochId]);
    }

    function _getPoolSize (uint128 epochId) internal view returns (uint) {
        uint valueUsdc = _staking.getEpochPoolSize(_usdc, epochId).mul(10**12); // because usdc has 6 decimals
        uint valueSusd = _staking.getEpochPoolSize(_susd, epochId);
        uint valueDai = _staking.getEpochPoolSize(_dai, epochId);
        return valueUsdc.add(valueSusd).add(valueDai);
    }

    function _getUserBalancePerEpoch (address userAddress, uint128 epochId) internal view returns (uint){
        uint valueUsdc = _staking.getEpochUserBalance(userAddress, _usdc, epochId).mul(10**12); // because usdc has 6 decimals
        uint valueSusd = _staking.getEpochUserBalance(userAddress, _susd, epochId);
        uint valueDai = _staking.getEpochUserBalance(userAddress, _dai, epochId);
        return valueUsdc.add(valueSusd).add(valueDai);
    }

    function _getEpochId () internal view returns (uint128 epochId) {
        if (block.timestamp < epochStart) {
            return 0;
        }
        epochId = uint128(block.timestamp.sub(epochStart).div(epochDuration).add(1));
    }
}
