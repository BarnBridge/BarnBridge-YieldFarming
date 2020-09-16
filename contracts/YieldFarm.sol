// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IStaking.sol";

contract YieldFarm {

    // lib
    using SafeMath for uint;

    // constants
    uint constant TOTAL_DISTRIBUTED_AMOUNT = 800000;

    uint8 NR_OF_EPOCHS = 24;

    uint EPOCH_DURATION = 604800; // 7 days * 24 hours * 60 mins * 60 seconds

    // structs

    struct Epoch {
        bool init;
        uint8 stakeEpoch;
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
    mapping (uint8 => Epoch) epochs;
    uint8[24] epochIds; // epochs


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
        epochStart = _staking.getEpoch1Start();
    }


    // public methods

    function harvest (uint8[] epochs) public {

    }


    // internal methods

    function _harvest (uint8 epochId) internal {
        assert (_getEpochId() > epochId);
        Epoch storage epoch = epochs[epochId];
        require (epoch.claimed[msg.sender] != true, "User already claimed");
        if (epoch.init == false) {
            epoch.poolSize = _getPoolSize(epochId);
            epoch.init = true;
        }
        // Give user interest
        _barn.transfer(msg.sender, _getUserBalancePerEpoch(epochId, msg.sender));
        epoch.claimed[msg.sender] = true;

    }

    function _getPoolSize (uint8 epochId) internal view {
        uint valueUsdc = _staking.getEpochPoolSize(epochId, _usdc);
        uint valueSusd = _staking.getEpochPoolSize(epochId, _susd);
        uint valueDai = _staking.getEpochPoolSize(epochId, _dai);
        uint valueBarnYCurve = _staking.getEpochPoolSize(epochId, _barnYCurve);
        valueBarnYCurve = computeBonus(valueBarnYCurve);
        return valueUsdc.add(valueSusd).add(valueDai).add(valueBarnYCurve);
    }

    function _getUserBalancePerEpoch (uint8 epochId, address userAddress) internal view {
        uint valueUsdc = _staking.getEpochUserBalance(epochId, userAddress, _usdc);
        uint valueSusd = _staking.getEpochUserBalance(epochId, userAddress, _susd);
        uint valueDai = _staking.getEpochUserBalance(epochId, userAddress, _dai);
        uint valueBarnYCurve = _staking.getEpochUserBalance(epochId, userAddress, _barnYCurve);
        valueBarnYCurve = computeBonus(valueBarnYCurve);
        return valueUsdc.add(valueSusd).add(valueDai).add(valueBarnYCurve);
    }

    function _getEpochId () internal view returns (uint8 epochId) {
        epochId = uint8((block.timestamp - epochStart)/EPOCH_DURATION);
    }

    // pure functions
    function computeBonus (uint value) public pure returns (uint computedValue) {
        computedValue = value.mul(25).div(10);
    }
}
