// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IStake.sol";

contract YieldFarm {

    // lib
    using SafeMath for uint;

    // constants
    uint constant totalDistributedAmount = 800000;
    uint8 nrOfEpochs = 24;

    enum YIELD_STATUS {NOT_STARTED, IN_PROGRESS, FINISHED}
    uint epochBlockLength = 44800; // 7 days * 24 hours * 60 mins * 60 seconds / 13.5 (number of blocks in an epoch)


    // structs

    struct Epoch {
        uint startBlock;
        uint endBlock;
        uint poolSize;
    }


    // state variables
    address private _barn;
    address private _usdc;
    address private _susd;
    address private _dai;
    address private _barnYCurve;
    IStake private _vault;
    mapping (uint8 => Epoch) epochs;
    uint8[24] epochIds; // epochs
    uint deployBlock; // deployed date
    uint epochsStartingBlock;
    uint epochsEndingBlock;


    // modifiers




    // construct

    constructor(address barnBridgeAddress, address usdc, address susd, address dai, address barnYCurve, address vault) public {
        _barn = barnBridgeAddress;
        _usdc = usdc;
        _susd = susd;
        _dai = dai;
        _barnYCurve = barnYCurve;
        _vault = IStake(vault);
        deployBlock = block.number;
        epochsStartingBlock = deployBlock.add(epochBlockLength); // start 1 week after deployment
        epochsEndingBlock = epochsStartingBlock.add(epochBlockLength.mul(nrOfEpochs)); // end after all 24 epochs
    }


    // public methods

    function harvest () public {

    }


    // internal methods

    function _getEpochId (uint blockNumber) internal view returns (uint8 epochId) {
        epochId = uint8((blockNumber.sub(epochsStartingBlock)).div(epochBlockLength));
    }
    function _getStatus () internal view returns (YIELD_STATUS status) {
        if (block.number < epochsStartingBlock) {
            status = YIELD_STATUS.NOT_STARTED;
        } else if (block.number < epochsEndingBlock) {
            status = YIELD_STATUS.IN_PROGRESS;
        } else {
            status = YIELD_STATUS.FINISHED;
        }
    }
    // pure functions
    function computeBonus (uint value) public pure returns (uint computedValue) {
        computedValue = value.mul(25).div(10);
    }



}
