pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "interfaces/IVault.sol";

contract YieldFarm {

    // lib
    using SafeMath for uint;

    // constants
    uint constant totalDistributedAmount = 800000;
    uint8 nrOfEpochs = 24;
    address constant usdc = address(0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48);
    address constant susd = address(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);
    address constant dai = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address constant barn_ycurve_token = address(0);

    enum STAKE_COIN {USDC, sUSD, DAI, BARN_YCURVE}
    enum YIELD_STATUS {NOT_STARTED, IN_PROGRESS, FINISHED}
    uint epochBlockLength = 44800; // 7 days * 24 hours * 60 mins * 60 seconds / 13.5 (number of blocks in an epoch)


    // structs


    // state variables
    IERC20 private _barnBridgeContract;
    IVault private _vault;
    uint8[24] epochIds; // epochs
    mapping (uint8 => uint) epochPoolSize; // total poolsize per epoch
    mapping (uint8 => mapping (address => uint)) epochAddressBalance; // total poolsize per address per epoch
    mapping (address => uint) addressTotalBalance; // total address balance
    uint deployBlock; // deployed date
    uint epochsStartingBlock;
    uint epochsEndingBlock;


    // modifiers




    // construct

    constructor(address barnBridgeAddress, address vault) {
        _barnBridgeContract = IERC20(barnBridgeAddress);
        _vault = IVault(vault);
        deployBlock = block.number;
        epochsStartingBlock = deployBlock.add(epochBlockLength);
        epochsEndingBlock = epochsStartingBlock.add(epochBlockLength.mul(nrOfEpochs));
    }


    // public methods
    function deposit(uint value, address addressStakeCoin) public {
        _deposit(value, addressStakeCoin);
    }
    // internal methods
    function _deposit(uint value, address addressStakeCoin) internal {
        uint amount = value;
        if (addressStakeCoin == barn_ycurve_token) {
            amount = computeBonus(amount);
        }
        addressTotalBalance.add(amount);
        _vault.deposit(msg.sender, IERC20(addressStakeCoin));
    }
    function _getEpochId (uint blockNumber) internal returns (uint8 epochId) {
        epochId = (blockNumber.sub(epochsStartingBlock)).div(epochBlockLength);
    }
    function _getStatus () internal returns (uint status) {
        if (block.number < epochStartingBlock) {
            status = YIELD_STATUS.NOT_STARTED;
        } else if (block < epochsEndingBlock) {
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
