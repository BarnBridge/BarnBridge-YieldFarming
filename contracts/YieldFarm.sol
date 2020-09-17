// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IStaking.sol";


contract YieldFarm is ReentrancyGuardUpgradeSafe {

    // lib
    using SafeMath for uint;

    // constants
    uint constant TOTAL_DISTRIBUTED_AMOUNT = 800000;

    uint NR_OF_EPOCHS = 24;

    uint EPOCH_DURATION = 604800; // 7 days * 24 hours * 60 mins * 60 seconds

    // structs

    struct Epoch {
        bool init;
        uint stakeEpoch;
        uint poolSize;
        mapping (address => bool) claimed;
    }


    // state variables
    IERC20 private _barn;
    address private _usdc;
    address private _susd;
    address private _dai;
    address private _barnYCurve;
    IStaking private _staking;
    mapping (uint => Epoch) epochs;


    uint epochStart;


    // modifiers




    // construct

    constructor(address barnBridgeAddress, address usdc, address susd, address dai, address barnYCurve, address stakeContract) public {
        _barn = IERC20(barnBridgeAddress);
        _usdc = usdc;
        _susd = susd;
        _dai = dai;
        _barnYCurve = barnYCurve;
        _staking = IStaking(stakeContract);
        epochStart = _staking.epoch1Start();
    }


    // public methods

    function harvest (uint[] calldata harvestEpochs) public nonReentrant {
        for(uint i=0; i<harvestEpochs.length; i++) {
            _harvest(harvestEpochs[i]);
        }
    }

    function getPoolSize (uint epochId) external view returns (uint) {
        return _getPoolSize(epochId);
    }

    function getEpochStake (address userAddress, uint epochId) external view returns (uint) {
        return _getUserBalancePerEpoch (userAddress, epochId);
    }



    // internal methods

    function _harvest (uint epochId) internal  {
        // check that epoch is finished
        assert (_getEpochId() > epochId);

        Epoch storage epoch = epochs[epochId];
        require (epoch.claimed[msg.sender] != true, "User already claimed");

        if (!epoch.init) { // first to harvest
            epoch.poolSize = _getPoolSize(epochId); // Staking will throw if it is not initialized and cannot initialize
            epoch.init = true;
        }
        // Give user interest
        uint userInterest = TOTAL_DISTRIBUTED_AMOUNT.mul(18).div(NR_OF_EPOCHS)
                .mul(_getUserBalancePerEpoch(msg.sender, epochId))
                .div(epoch.poolSize);
        epoch.claimed[msg.sender] = true;
        _barn.transfer(msg.sender, userInterest);

    }

    function _getPoolSize (uint epochId) internal view returns (uint) {
        uint valueUsdc = _staking.getEpochPoolSize(_usdc, epochId);
        uint valueSusd = _staking.getEpochPoolSize(_susd, epochId);
        uint valueDai = _staking.getEpochPoolSize(_dai, epochId);
        uint valueBarnYCurve = _staking.getEpochPoolSize(_barnYCurve, epochId);
        valueBarnYCurve = computeBonus(valueBarnYCurve);
        return valueUsdc.add(valueSusd).add(valueDai).add(valueBarnYCurve);
    }

    function _getUserBalancePerEpoch (address userAddress, uint epochId) internal view returns (uint){
        uint valueUsdc = _staking.getEpochUserBalance(userAddress, _usdc, epochId);
        uint valueSusd = _staking.getEpochUserBalance(userAddress, _susd, epochId);
        uint valueDai = _staking.getEpochUserBalance(userAddress, _dai, epochId);
        uint valueBarnYCurve = _staking.getEpochUserBalance(userAddress, _barnYCurve, epochId);
        valueBarnYCurve = computeBonus(valueBarnYCurve);
        return valueUsdc.add(valueSusd).add(valueDai).add(valueBarnYCurve);
    }

    function _getEpochId () internal view returns (uint epochId) {
        epochId = uint((block.timestamp - epochStart)/EPOCH_DURATION);
    }

    // pure functions
    function computeBonus (uint value) public pure returns (uint computedValue) {
        computedValue = value.mul(25).div(10);
    }
}
